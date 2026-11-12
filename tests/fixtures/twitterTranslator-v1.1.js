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

    async function translate(post, state) {
      const pieces = options.getPieces(post).map((piece) => piece.nodes);
      if (!pieces.length) return;
      const sources = pieces.map((nodes) => nodes.map(sourceFor));
      try {
        const results = await options.translate(sources);
        if (currentGeneration !== generation || !post.isConnected ||
            posts.get(post) !== state || !matches(post, state.snapshot)) return;

        // Resolve all results before writing so our observer sees one complete
        // snapshot, and cannot mistake our own changes for a React update.
        pieces.forEach((nodes, i) => nodes.forEach((node, j) => {
          const text = results && results[i] && results[i][j];
          if (typeof text !== "string" || !text) return;
          const translated = text + " ";
          translations.set(node, { original: sources[i][j], translated });
          node.data = translated;
        }));
        state.snapshot = snapshot(post);
        if (showOriginal.isEnabled) {
          showOriginal.add(post, state.snapshot.map(({ node }) => sourceFor(node)).join(""));
        }
      } catch (error) {
        console.error("TWP: could not translate an X post", error);
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
      dirty.forEach((post) => {
        const rect = post.getBoundingClientRect();
        // Include posts taller than the viewport, common after Show more.
        if (rect.height <= 0 || rect.width <= 0 || rect.bottom <= 0 ||
            rect.top >= window.innerHeight) return;
        dirty.delete(post);
        translate(post, posts.get(post));
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
