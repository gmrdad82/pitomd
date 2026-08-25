const RE = /Said and Done\./g;

function brandTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (
        parent.closest(
          "pre, code, script, style, .sd-brand, .said-brand-lockup, h1",
        )
      )
        return NodeFilter.FILTER_REJECT;
      return RE.test(node.nodeValue)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    },
  });
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  for (const node of hits) {
    const parts = node.nodeValue.split(RE);
    const frag = document.createDocumentFragment();
    parts.forEach((part, at) => {
      frag.appendChild(document.createTextNode(part));
      if (at < parts.length - 1) {
        const brand = document.createElement("span");
        brand.className = "sd-brand";
        const said = document.createElement("span");
        said.className = "sd-brand-said";
        said.textContent = "Said and ";
        const done = document.createElement("span");
        done.className = "sd-brand-done";
        done.textContent = "Done.";
        brand.append(said, done);
        frag.appendChild(brand);
      }
    });
    node.parentNode.replaceChild(frag, node);
  }
}

function run() {
  document.querySelectorAll(".sdoc").forEach((root) => brandTextNodes(root));
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
