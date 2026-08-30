function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wrapMatches(root, regex, build) {
  const probe = new RegExp(regex.source);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (
        parent.closest(
          "pre, code, script, style, .sd-brand, .said-brand-lockup, .pito-word, h1",
        )
      )
        return NodeFilter.FILTER_REJECT;
      return probe.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  for (const node of hits) {
    const splitter = new RegExp(regex.source, "g");
    const parts = node.nodeValue.split(splitter);
    if (parts.length < 2) continue;
    const frag = document.createDocumentFragment();
    parts.forEach((part, at) => {
      frag.appendChild(document.createTextNode(part));
      if (at < parts.length - 1) frag.appendChild(build());
    });
    node.parentNode.replaceChild(frag, node);
  }
}

export function initBrandmark({ rootSelector, className, parts }) {
  const fullText = parts.map((part) => part.text).join("");
  const matchText = new RegExp(escapeRegExp(fullText));
  const build = () => {
    const brand = document.createElement("span");
    brand.className = className;
    for (const part of parts) {
      const el = document.createElement("span");
      el.className = part.className;
      el.textContent = part.text;
      brand.appendChild(el);
    }
    return brand;
  };
  const run = () => {
    document.querySelectorAll(rootSelector).forEach((root) => {
      wrapMatches(root, matchText, build);
    });
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}
