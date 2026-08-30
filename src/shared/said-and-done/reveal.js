const cometizeText = (el, start) => {
  const text = el.textContent;
  el.textContent = "";
  let ci = start;
  for (const token of text.split(/([^\S\u00A0]+)/)) {
    if (token === "") continue;
    if (/^\s+$/.test(token)) {
      el.appendChild(document.createTextNode(token));
      continue;
    }
    const word = document.createElement("span");
    word.className = "cword";
    for (const ch of Array.from(token)) {
      const span = document.createElement("span");
      span.className = "cchar";
      span.style.setProperty("--i", ci++);
      span.textContent = ch;
      word.appendChild(span);
    }
    el.appendChild(word);
  }
  return ci;
};

const cometize = (el) => {
  if (el.children.length === 0) {
    cometizeText(el, 0);
    return;
  }
  let ci = 0;
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 1 && node.children.length === 0) {
      ci = cometizeText(node, ci);
    }
  }
};

const frames = document.querySelectorAll(
  ".said-reveal, .said-note, .said-comet",
);
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  frames.forEach((el) => el.classList.add("lit"));
} else {
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("lit");
          if (
            entry.target.classList.contains("said-note") ||
            entry.target.classList.contains("said-comet")
          ) {
            cometize(entry.target);
          }
          watcher.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 },
  );
  frames.forEach((el) => watcher.observe(el));
}
