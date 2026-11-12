"use strict";

// X reuses React text nodes when expanding posts. Translate those nodes in
// place, and keep their identity intact even when original-text hover is on.
var twitterTranslator = (function () {
  const isTwitter = /(^|\.)(x|twitter)\.com$/.test(location.hostname);
  const selector = '[data-testid="tweetText"]';
  let generation = 0;
  let observer;
  let timer;
  let posts = new Map();
  let translations = new WeakMap();
  const dirty = new Set();

  function getPost(node) {
    if (!isTwitter || !node) return null;
    const element = node.nodeType === 1 ? node : node.parentElement;
    return element ? element.closest(selector) : null;
  }

  function snapshot(post) {
    const walker = document.createTreeWalker(post, NodeFilter.SHOW_TEXT);
    const result = [];
    while (walker.nextNode()) {
      result.push({ node: walker.currentNode, text: walker.currentNode.data });
    }
    return result;
  }

  function matches(post, previous) {
    const current = snapshot(post);
    return current.length === previous.length && current.every((entry, i) =>
      entry.node === previous[i].node && entry.text === previous[i].text
    );
  }

  function queue(post) {
    const previous = posts.get(post);
    if (previous && matches(post, previous.snapshot)) return;
    posts.set(post, {
      revision: previous ? previous.revision + 1 : 1,
      snapshot: snapshot(post),
      attempts: 0,
      retryAt: 0,
    });
    dirty.add(post);
  }

  function discover(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(selector)) queue(node);
    node.querySelectorAll(selector).forEach(queue);
  }

  function sourceFor(node) {
    const previous = translations.get(node);
    return previous && node.data === previous.translated
      ? previous.original : node.data;
  }

  function stop() {
    generation++;
    if (observer) observer.disconnect();
    clearInterval(timer);
    observer = null;
    timer = null;
    dirty.clear();
    posts.clear();
  }

  function restore() {
    stop();
    if (!isTwitter) return;
    document.querySelectorAll(selector).forEach((post) => {
      snapshot(post).forEach(({ node }) => {
        const previous = translations.get(node);
        // A React update is authoritative; never restore an obsolete post.
        if (previous && node.data === previous.translated) {
          node.data = previous.original;
        }
      });
    });
    translations = new WeakMap();
  }

  function start(options) {
    stop();
    if (!isTwitter) return;
    const currentGeneration = generation;
    let retriesInFlight = 0;

    async function translate(post, state, release = null) {
      let pieces;
      let sources;
      try {
        pieces = options.getPieces(post).map((piece) => piece.nodes);
        sources = pieces.map((nodes) => nodes.map(sourceFor));
      } catch (error) {
        if (release) release();
        console.error("TWP: could not collect an X post", error);
        return;
      }
      if (!pieces.length) {
        if (release) release();
        return;
      }
      const retrying = state.attempts > 0;
      if (retrying) retriesInFlight++;
      state.attempts++;
      function isCurrent() {
        return currentGeneration === generation && post.isConnected &&
          posts.get(post) === state && matches(post, state.snapshot);
      }
      function retry() {
        // Reuse the existing visibility/viewport loop; no extra polling timer.
        // Each text revision gets at most two additional Google attempts.
        if (!options.retryFailed || state.attempts >= 3 || !isCurrent()) return;
        state.retryAt = Date.now() + (state.attempts === 1 ? 1500 : 4000);
        dirty.add(post);
      }
      try {
        const results = await options.translate(sources, state.attempts > 1);
        if (!isCurrent()) return;

        // Resolve all results before writing so our observer sees one complete
        // snapshot, and cannot mistake our own changes for a React update.
        let incomplete = false;
        pieces.forEach((nodes, i) => nodes.forEach((node, j) => {
          if (options.isProtected && options.isProtected(node)) return;
          const text = results && results[i] && results[i][j];
          if (typeof text !== "string" || !text.trim()) {
            incomplete = true;
            return;
          }
          const translated = text + " ";
          translations.set(node, { original: sources[i][j], translated });
          if (node.data !== translated) node.data = translated;
        }));
        state.snapshot = snapshot(post);
        if (incomplete) retry();
        if (showOriginal.isEnabled) {
          showOriginal.add(post, state.snapshot.map(({ node }) => sourceFor(node)).join(""));
        }
      } catch (error) {
        retry();
        console.error("TWP: could not translate an X post", error);
      } finally {
        if (retrying) retriesInFlight--;
        if (release) release();
      }
    }

    function run() {
      if (document.visibilityState !== "visible") return;
      posts.forEach((_, post) => {
        if (!post.isConnected) {
          posts.delete(post);
          dirty.delete(post);
        }
      });
      const now = Date.now();
      dirty.forEach((post) => {
        const state = posts.get(post);
        if (state.retryAt > now || (state.attempts > 0 && retriesInFlight >= 2)) return;
        const rect = post.getBoundingClientRect();
        // Include posts taller than the viewport, common after Show more.
        if (rect.height <= 0 || rect.width <= 0 || rect.bottom <= 0 ||
            rect.top >= window.innerHeight) return;
        const release = state.attempts > 0 && options.acquireRecovery
          ? options.acquireRecovery() : null;
        if (state.attempts > 0 && options.acquireRecovery && !release) return;
        dirty.delete(post);
        translate(post, state, release);
      });
    }

    if (options.dynamic) {
      observer = new MutationObserver((mutations) => {
        const changed = new Set();
        mutations.forEach((mutation) => {
          const post = getPost(mutation.target);
          if (post) changed.add(post);
          mutation.addedNodes.forEach(discover);
        });
        changed.forEach(queue);
        run();
      });
      observer.observe(document.body, { childList: true, characterData: true, subtree: true });
    }
    document.querySelectorAll(selector).forEach(queue);
    timer = setInterval(run, 300);
    run();
  }

  return { isTwitter, getPost, start, restore };
})();
