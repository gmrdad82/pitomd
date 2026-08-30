const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

const BLOCK_STYLE = `
.said-copy-wrap { position: relative; }
.said-copy-wrap pre { padding-right: 64px; }
.said-copy-wrap pre > code::after {
  content: "";
  display: inline-block;
  width: 64px;
}
.said-copy-fade {
  position: absolute;
  top: 1px;
  right: 1px;
  bottom: 1px;
  width: 84px;
  border-radius: 0 8px 8px 0;
  pointer-events: none;
}
.said-copy-btn {
  position: absolute;
  top: 0;
  right: 10px;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 9px;
  border: 1px solid rgb(148 225 255 / 30%);
  border-radius: 8px;
  background: rgb(6 11 20 / 88%);
  backdrop-filter: blur(6px);
  color: #94e1ff;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 140ms ease, filter 140ms ease;
}
.said-copy-wrap:hover .said-copy-btn { opacity: 1; }
.said-copy-btn:hover { filter: brightness(1.3); }
.said-copy-toast {
  position: fixed;
  left: 50%;
  bottom: 34px;
  transform: translateX(-50%) translateY(8px);
  padding: 9px 16px;
  border: 1px solid rgb(148 225 255 / 30%);
  border-radius: 9px;
  background: rgb(10 18 30 / 92%);
  color: #eceff4;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 0.85rem;
  opacity: 0;
  pointer-events: none;
  transition: opacity 180ms ease, transform 180ms ease;
  z-index: 90;
}
.said-copy-toast.is-up { opacity: 1; transform: translateX(-50%) translateY(0); }
`;

export function copyText(text) {
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

function initCopyWidgets() {
  const widgets = document.querySelectorAll("[data-copy]");
  widgets.forEach((widget) => {
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
        return;
      }
    });
  });
}

function blockToast(message) {
  let el = document.querySelector(".said-copy-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "said-copy-toast";
    document.body.appendChild(el);
  }
  el.textContent = message;
  requestAnimationFrame(() => el.classList.add("is-up"));
  clearTimeout(el._down);
  el._down = setTimeout(() => el.classList.remove("is-up"), 1700);
}

function initCopyBlocks({
  successMessage = "Copied to your clipboard.",
  errorMessage = "The clipboard said no — select and copy by hand.",
} = {}) {
  const style = document.createElement("style");
  style.textContent = BLOCK_STYLE;
  document.head.appendChild(style);

  document.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".said-copy-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "said-copy-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const fade = document.createElement("span");
    fade.className = "said-copy-fade";
    wrap.appendChild(fade);
    const paintFade = () => {
      const bg = getComputedStyle(pre).backgroundColor;
      if (bg && bg !== "rgba(0, 0, 0, 0)") {
        fade.style.background = `linear-gradient(90deg, transparent, ${bg} 55%)`;
      } else {
        fade.style.background = "none";
      }
    };
    paintFade();
    const place = () => {
      const wr = wrap.getBoundingClientRect();
      const pr = pre.getBoundingClientRect();
      const inset = wr.right - pr.right;
      button.style.right = `${inset + 10}px`;
      button.style.top = `${pr.top - wr.top + pr.height / 2}px`;
      fade.style.right = `${inset + 1}px`;
      fade.style.top = `${pr.top - wr.top + 1}px`;
      fade.style.bottom = "auto";
      fade.style.height = `${pr.height - 2}px`;
    };
    const button = document.createElement("button");
    requestAnimationFrame(place);
    new ResizeObserver(place).observe(pre);
    window.addEventListener("resize", place);
    button.type = "button";
    button.className = "said-copy-btn";
    button.setAttribute("aria-label", "Copy to clipboard");
    button.innerHTML = COPY_ICON;
    button.addEventListener("click", async () => {
      try {
        await copyText(pre.textContent.trim());
        blockToast(successMessage);
      } catch {
        blockToast(errorMessage);
      }
    });
    wrap.appendChild(button);
  });
}

export function initCopy(variant = "widgets", options = {}) {
  const run = () =>
    variant === "blocks" ? initCopyBlocks(options) : initCopyWidgets(options);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
}
