// guide-theme.js — the /guides light/dark toggle (owner restyle order,
// 2026-07-30). GuideLayout.astro already inlines a synchronous script that
// applies any SAVED override (localStorage) to <html data-guide-theme="…">
// before first paint, so there's no flash for a returning visitor; the
// system-preference default itself needs no JS at all — guide.css's
// `@media (prefers-color-scheme: dark)` block handles that on its own.
//
// This module only has two jobs, both deferred until after that first
// paint: show the toggle button's icon/label in sync with whatever theme
// is actually in effect (explicit override OR system default), and flip +
// persist an explicit choice on click.

const STORAGE_KEY = "pito-guide-theme";

function effectiveTheme() {
  const explicit = document.documentElement.getAttribute("data-guide-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function paint(btn, theme) {
  const icon = btn.querySelector("[data-guide-theme-icon]");
  const label = btn.querySelector("[data-guide-theme-label]");
  if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
  if (label) label.textContent = theme === "dark" ? "Light" : "Dark";
  btn.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
  );
}

function initGuideTheme() {
  const btn = document.querySelector("[data-guide-theme-toggle]");
  if (!btn) return;

  // Make the explicit-vs-system distinction concrete so the icon and the
  // next click both have one clear current value to work from.
  document.documentElement.setAttribute("data-guide-theme", effectiveTheme());
  paint(btn, effectiveTheme());

  btn.addEventListener("click", () => {
    const next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-guide-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // private-browsing / storage-disabled — the toggle still works for
      // this page view, it just won't be remembered next visit.
    }
    paint(btn, next);
  });
}

initGuideTheme();
