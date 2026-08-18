"use strict";

/**
 * Firefox Translations (Bergamot) engine worker.
 *
 * This worker runs the same on-device neural machine translation engine that
 * powers Firefox's built-in "Translate page" feature, entirely inside the
 * extension. It uses the exact same public assets that Firefox uses:
 *
 *  - Model files:  Remote Settings collection "translations-models" (v1).
 *  - WASM engine:  Remote Settings collection "translations-wasm" (v1),
 *                  matching the vendored "bergamot-translator.js" glue
 *                  (release ${GLUE_RELEASE}).
 *
 * The v1 collection attachments are stored uncompressed and are verified with
 * their SHA-256 hash before use. The attachments are served with long-lived
 * immutable cache headers, so they are served by the browser's own HTTP disk
 * cache: models already downloaded by Firefox's built-in translations (or by
 * this extension) are reused without being downloaded again and without
 * taking additional storage space.
 *
 * Model translations are one-directional and one-to-one. When there is no
 * direct model for a language pair, the engine pivots through English (at most
 * once), exactly like Firefox does.
 *
 * Messages:
 *   { type: "translate", id, from, to, texts } ->
 *   { type: "translated", id, translations } | { type: "error", id, message }
 *
 * This worker must be loaded with the glue script, which is injected by
 * importing it with `importScripts()` before the first translation. The
 * "init" message configures the glue script location.
 */

/* global loadBergamot, importScripts */

const COLLECTION_SERVER =
  "https://firefox.settings.services.mozilla.com/v1/buckets/main/collections";
const ATTACHMENT_SERVER = "https://firefox-settings-attachments.cdn.mozilla.net";
const WASM_COLLECTION = "translations-wasm";
const MODELS_COLLECTION = "translations-models";
const GLUE_RELEASE = "v0.6.0";
const PIVOT_LANGUAGE = "en";

/**
 * The WASM engine has to be loaded with a recent version of the glue script
 * (bergamot-translator.js). Since the glue is vendored in the extension, only
 * WASM builds with the same release are compatible.
 */
const WASM_RELEASE = GLUE_RELEASE;

/**
 * Alignment used when copying each model file type into the WASM memory.
 * These values must match the alignment used by Firefox.
 */
const MODEL_FILE_ALIGNMENTS = {
  model: 256,
  lex: 64,
  vocab: 64,
  qualityModel: 64,
  srcvocab: 64,
  trgvocab: 64,
};

/**
 * Generate a config for the Marian translation service. It requires this
 * specific whitespace (12-space indentation), same as Firefox uses.
 * @param {Object<string, string>} config
 * @returns {string}
 */
function generateTextConfig(config) {
  const indent = "            ";
  let result = "\n";
  for (const key in config) {
    result += `${indent}${key}: ${config[key]}\n`;
  }
  return result + indent;
}

function hex(buffer) {
  return Array.from(new Uint8Array(buffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`);
  }
  return await response.json();
}

/**
 * Whether a Remote Settings record applies to Firefox Desktop on the release
 * channel. Firefox uses JEXL filter expressions to restrict records; the
 * extension runs on desktop release, so records that only target Android or
 * only target Nightly/Beta are ignored.
 * @param {Object} record
 * @returns {boolean}
 */
function isDesktopReleaseRecord(record) {
  const filter = record.filter_expression || "";
  if (filter === "") {
    return true;
  }
  // Only for Android (no desktop branch).
  if (
    filter.indexOf("env.appinfo.OS == 'Android'") !== -1 &&
    filter.indexOf("env.appinfo.OS != 'Android'") === -1
  ) {
    return false;
  }
  // Only for Nightly/local builds (no release branch).
  if (
    filter.indexOf("env.channel == 'default'") !== -1 &&
    filter.indexOf("env.channel != 'release'") === -1
  ) {
    return false;
  }
  return true;
}

const engine = {
  wasmPromise: null,
  module: null,
  service: null,
  glueScriptUrl: null,
  glueLoaded: false,
  modelsCollectionRecords: null,
  models: new Map(), // `${from}${to}` -> TranslationModel
};

/**
 * Downloads a file and verifies its SHA-256 hash.
 *
 * The attachments are served with long-lived immutable cache headers
 * (`Cache-Control: public, max-age=31536000, immutable`), so the browser's
 * HTTP disk cache is used directly: models that Firefox's built-in
 * translations already downloaded are reused, without any additional download
 * or storage. The content hash is always verified, and a stale cache entry
 * is bypassed with a revalidation fetch.
 * @param {string} url - attachment URL
 * @param {string} expectedHash - SHA-256 of the content
 * @returns {Promise<ArrayBuffer>}
 */
async function downloadFile(url, expectedHash) {
  let response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  let buffer = await response.arrayBuffer();
  if (hex(await crypto.subtle.digest("SHA-256", buffer)) === expectedHash) {
    return buffer;
  }

  // The cached copy is stale or corrupted, bypass the HTTP cache and retry.
  response = await fetch(url, { cache: "reload" });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  buffer = await response.arrayBuffer();
  const actualHash = hex(await crypto.subtle.digest("SHA-256", buffer));
  if (actualHash !== expectedHash) {
    throw new Error(
      `Content hash mismatch for ${url}: expected ${expectedHash}, got ${actualHash}`
    );
  }
  return buffer;
}

/**
 * Loads the WASM engine. The glue script must have been imported already
 * (message "init"), so the global `loadBergamot` factory is available.
 * @returns {Promise<Object>} the Emscripten module
 */
async function getEngineModule() {
  if (engine.module) {
    return engine.module;
  }
  if (engine.wasmPromise) {
    return engine.wasmPromise;
  }

  engine.wasmPromise = (async () => {
    if (!engine.glueLoaded) {
      throw new Error("The Bergamot glue script has not been loaded yet.");
    }

    const records = await fetchJson(
      `${COLLECTION_SERVER}/${WASM_COLLECTION}/records`
    );
    const record = records.data
      .filter(
        (r) =>
          r.name === "bergamot-translator" && r.release === WASM_RELEASE
      )
      .sort((a, b) => (a.version < b.version ? -1 : 1))
      .pop();
    if (!record) {
      throw new Error(`No Bergamot WASM build found for release ${WASM_RELEASE}.`);
    }

    const wasmBinary = await downloadFile(
      `${ATTACHMENT_SERVER}/${record.attachment.location}`,
      record.attachment.hash
    );

    const module = await new Promise((resolve, reject) => {
      try {
        const mod = loadBergamot({
          // Same initial memory used by Firefox.
          // https://firefox-source-docs.mozilla.org/toolkit/components/translations/index.html
          INITIAL_MEMORY: 41943040,
          print: (...args) => console.log(...args),
          printErr: (...args) => console.error(...args),
          onAbort: () => reject(new Error("The WASM engine aborted.")),
          onRuntimeInitialized: async () => {
            // Await at least one microtask so that the captured `mod` variable
            // is fully initialized.
            await Promise.resolve();
            resolve(mod);
          },
          wasmBinary,
        });
      } catch (error) {
        reject(error);
      }
    });

    engine.service = new module.BlockingService({ cacheSize: 0 });
    engine.module = module;
    return module;
  })();

  try {
    return await engine.wasmPromise;
  } catch (error) {
    engine.wasmPromise = null;
    throw error;
  }
}

/**
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
function isPivotingRequired(from, to) {
  return from !== PIVOT_LANGUAGE && to !== PIVOT_LANGUAGE;
}

/**
 * Returns the model files needed for a single direction, downloading and
 * verifying them when necessary.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<Object<string, ArrayBuffer>>} fileType -> buffer
 */
async function getModelFiles(from, to) {
  if (!engine.modelsCollectionRecords) {
    const records = await fetchJson(
      `${COLLECTION_SERVER}/${MODELS_COLLECTION}/records`
    );
    engine.modelsCollectionRecords = records.data;
  }

  const records = engine.modelsCollectionRecords.filter(
    (r) =>
      r.fromLang === from &&
      r.toLang === to &&
      isDesktopReleaseRecord(r)
  );

  // Keep the latest version of each file type.
  const filesByType = new Map();
  for (const record of records) {
    const current = filesByType.get(record.fileType);
    if (!current || record.version > current.version) {
      filesByType.set(record.fileType, record);
    }
  }

  const requiredTypes = ["model", "lex"];
  if (filesByType.has("vocab")) {
    requiredTypes.push("vocab");
  } else if (filesByType.has("srcvocab") && filesByType.has("trgvocab")) {
    requiredTypes.push("srcvocab", "trgvocab");
  } else {
    throw new Error(`Incomplete model files for ${from} to ${to}.`);
  }

  const files = {};
  const recordsByType = {};
  for (const fileType of requiredTypes) {
    const record = filesByType.get(fileType);
    if (!record) {
      throw new Error(`Missing model file "${fileType}" for ${from} to ${to}.`);
    }
    recordsByType[fileType] = record;
    files[fileType] = await downloadFile(
      `${ATTACHMENT_SERVER}/${record.attachment.location}`,
      record.attachment.hash
    );
  }
  return { files, records: recordsByType };
}

/**
 * Builds a Bergamot TranslationModel for a single direction.
 * @param {string} from
 * @param {string} to
 * @returns {Promise<Object>}
 */
async function getTranslationModel(from, to) {
  const key = `${from}${to}`;
  if (engine.models.has(key)) {
    return engine.models.get(key);
  }

  const module = await getEngineModule();
  const { files, records } = await getModelFiles(from, to);

  const alignedMemory = (buffer, fileType) => {
    const alignment = MODEL_FILE_ALIGNMENTS[fileType];
    const aligned = new module.AlignedMemory(buffer.byteLength, alignment);
    aligned.getByteArrayView().set(new Uint8Array(buffer));
    return aligned;
  };

  const alignedModel = alignedMemory(files.model, "model");
  const alignedShortlist = alignedMemory(files.lex, "lex");

  const vocabList = new module.AlignedMemoryList();
  if (files.vocab) {
    vocabList.push_back(alignedMemory(files.vocab, "vocab"));
  } else {
    vocabList.push_back(alignedMemory(files.srcvocab, "srcvocab"));
    vocabList.push_back(alignedMemory(files.trgvocab, "trgvocab"));
  }

  // Same decoder configuration used by Firefox. The config parser requires
  // this specific whitespace (12-space indentation). See:
  // https://firefox-source-docs.mozilla.org/toolkit/components/translations/index.html
  const modelConfig = generateTextConfig({
    "beam-size": "1",
    normalize: "1.0",
    "word-penalty": "0",
    "max-length-break": "128",
    "mini-batch-words": "1024",
    workspace: "128",
    "max-length-factor": "2.0",
    "skip-cost": "true", // no quality model
    "cpu-threads": "0",
    quiet: "true",
    "quiet-translation": "true",
    "gemm-precision": records.model.name.endsWith("intgemm8.bin")
      ? "int8shiftAll"
      : "int8shiftAlphaAll",
    alignment: "soft",
  });

  const translationModel = new module.TranslationModel(
    from,
    to,
    modelConfig,
    alignedModel,
    alignedShortlist,
    vocabList,
    null // no quality model
  );
  engine.models.set(key, translationModel);
  return translationModel;
}

/**
 * Translates a batch of texts with the engine.
 * @param {string} from
 * @param {string} to
 * @param {string[]} texts
 * @returns {Promise<string[]>}
 */
async function translateBatch(from, to, texts) {
  const module = await getEngineModule();
  const sourceTexts = texts.map((text) => text || "");

  // When no direct model exists for the pair, the translation pivots through
  // English (at most once), exactly like Firefox does: `from` -> "en" -> `to`.
  let model;
  let pivotModel = null;
  if (isPivotingRequired(from, to)) {
    model = await getTranslationModel(from, PIVOT_LANGUAGE);
    pivotModel = await getTranslationModel(PIVOT_LANGUAGE, to);
  } else {
    model = await getTranslationModel(from, to);
  }

  let vectorResponseOptions;
  let vectorSourceText;
  let vectorResponse = null;

  try {
    vectorResponseOptions = new module.VectorResponseOptions();
    for (let i = 0; i < sourceTexts.length; i++) {
      vectorResponseOptions.push_back({
        qualityScores: false,
        alignment: true,
        html: false,
      });
    }

    vectorSourceText = new module.VectorString();
    for (const text of sourceTexts) {
      vectorSourceText.push_back(text);
    }

    if (pivotModel) {
      vectorResponse = engine.service.translateViaPivoting(
        model,
        pivotModel,
        vectorSourceText,
        vectorResponseOptions
      );
    } else {
      vectorResponse = engine.service.translate(
        model,
        vectorSourceText,
        vectorResponseOptions
      );
    }

    const translations = [];
    for (let i = 0; i < vectorResponse.size(); i++) {
      translations.push(vectorResponse.get(i).getTranslatedText());
    }
    return translations;
  } finally {
    if (vectorResponse) {
      vectorResponse.delete();
    }
    if (vectorSourceText) {
      vectorSourceText.delete();
    }
    if (vectorResponseOptions) {
      vectorResponseOptions.delete();
    }
  }
}

self.onmessage = (event) => {
  const message = event.data;
  if (!message || typeof message.type !== "string") {
    return;
  }

  if (message.type === "init") {
    engine.glueScriptUrl = message.glueScriptUrl;
    try {
      if (engine.glueScriptUrl && !engine.glueLoaded) {
        importScripts(engine.glueScriptUrl);
        engine.glueLoaded = true;
      }
      self.postMessage({ type: "initialized" });
    } catch (error) {
      self.postMessage({
        type: "error",
        id: message.id,
        message: String((error && error.message) || error),
      });
    }
    return;
  }

  if (message.type === "translate") {
    translateBatch(message.from, message.to, message.texts)
      .then((translations) => {
        self.postMessage({ type: "translated", id: message.id, translations });
      })
      .catch((error) => {
        console.error(error);
        self.postMessage({
          type: "error",
          id: message.id,
          message: String((error && error.message) || error),
        });
      });
    return;
  }
};