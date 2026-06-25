// copy.js — click-to-copy for [data-copy] widgets.
//
// Copies the element's data-copy string to the clipboard and flips the button
// label to a confirmation for a moment. Falls back to a hidden textarea +
// execCommand where the async clipboard API is unavailable.

function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  return new Promise((resolve, reject) => {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      resolve();
    } catch (e) {
      reject(e);
    } finally {
      ta.remove();
    }
  });
}

function initCopy() {
  const widgets = document.querySelectorAll("[data-copy]");
  widgets.forEach((widget) => {
    // The ENTIRE widget surface is clickable (not just the button) — the button
    // stays as the visual affordance. Listener on the widget, label still the
    // button's.
    const label = widget.querySelector("[data-copy-label]");
    widget.addEventListener("click", async () => {
      const text = widget.getAttribute("data-copy");
      try {
        await copyText(text);
        widget.classList.add("is-copied");
        const prev = label ? label.textContent : null;
        if (label) label.textContent = "copied ✓";
        setTimeout(() => {
          widget.classList.remove("is-copied");
          if (label) label.textContent = prev;
        }, 1600);
      } catch {
        /* clipboard blocked — no-op */
      }
    });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCopy);
} else {
  initCopy();
}
