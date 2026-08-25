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

function saidBrand() {
  const brand = document.createElement("span");
  brand.className = "sd-brand";
  const said = document.createElement("span");
  said.className = "sd-brand-said";
  said.textContent = "Said and ";
  const done = document.createElement("span");
  done.className = "sd-brand-done";
  done.textContent = "Done.";
  brand.append(said, done);
  return brand;
}

function run() {
  document.querySelectorAll(".sdoc").forEach((root) => {
    wrapMatches(root, /Said and Done\./, saidBrand);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", run);
} else {
  run();
}
