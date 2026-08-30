const bar = document.querySelector(".sdoc-progress");
if (bar) {
  const paint = () => {
    const doc = document.documentElement;
    const span = doc.scrollHeight - doc.clientHeight;
    const gone = span > 0 ? (doc.scrollTop / span) * 100 : 0;
    bar.style.width = `${Math.min(100, Math.max(0, gone))}%`;
  };
  document.addEventListener("scroll", paint, { passive: true });
  paint();
}
