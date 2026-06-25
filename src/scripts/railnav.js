// railnav.js — the dotted right-rail navigation.
//
// Builds one dot per <section data-nav-label>, highlights the dot for the
// section currently filling the viewport (IntersectionObserver), and
// smooth-scrolls to a section on dot click. Pure vanilla, no deps.

function initRailNav() {
  const sections = Array.from(
    document.querySelectorAll("section[data-nav-label]"),
  );
  if (sections.length === 0) return;

  const nav = document.createElement("nav");
  nav.className = "railnav";
  nav.setAttribute("aria-label", "Section navigation");

  const dots = new Map(); // section id -> button

  for (const section of sections) {
    const label = section.dataset.navLabel || section.id;
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "railnav__dot";
    dot.dataset.label = label;
    dot.setAttribute("aria-label", `Go to ${label}`);
    dot.addEventListener("click", () => {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    nav.appendChild(dot);
    dots.set(section.id, dot);
  }

  document.body.appendChild(nav);

  // Highlight the most-visible section. Track ratios so the active dot is the
  // section with the largest viewport coverage (robust across snap + tall
  // content sections).
  const ratios = new Map();
  const setActive = (id) => {
    for (const [sid, dot] of dots) {
      const active = sid === id;
      dot.classList.toggle("is-active", active);
      if (active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    }
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
      }
      let best = null;
      let bestRatio = 0;
      for (const [sid, r] of ratios) {
        if (r > bestRatio) {
          bestRatio = r;
          best = sid;
        }
      }
      if (best) setActive(best);
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
  );

  sections.forEach((s) => io.observe(s));
  setActive(sections[0].id);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initRailNav);
} else {
  initRailNav();
}
