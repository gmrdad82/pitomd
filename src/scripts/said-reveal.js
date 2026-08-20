const frames = document.querySelectorAll(".said-reveal");
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  frames.forEach((el) => el.classList.add("lit"));
} else {
  const watcher = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("lit");
          watcher.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.18 },
  );
  frames.forEach((el) => watcher.observe(el));
}
