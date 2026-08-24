const COPY_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';

const STYLE = `
.said-copy-wrap { position: relative; }
.said-copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border: 1px solid rgb(148 225 255 / 25%);
  border-radius: 7px;
  background: rgb(6 11 20 / 55%);
  color: #94e1ff;
  cursor: pointer;
  opacity: 0.55;
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

function toast(message) {
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

function decorate() {
  const style = document.createElement("style");
  style.textContent = STYLE;
  document.head.appendChild(style);

  document.querySelectorAll("pre").forEach((pre) => {
    if (pre.closest(".said-copy-wrap")) return;
    const wrap = document.createElement("div");
    wrap.className = "said-copy-wrap";
    pre.parentNode.insertBefore(wrap, pre);
    wrap.appendChild(pre);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "said-copy-btn";
    button.setAttribute("aria-label", "Copy to clipboard");
    button.innerHTML = COPY_ICON;
    button.addEventListener("click", async () => {
      try {
        await copyText(pre.textContent.trim());
        toast("Copied to your clipboard.");
      } catch {
        toast("The clipboard said no — select and copy by hand.");
      }
    });
    wrap.appendChild(button);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", decorate);
} else {
  decorate();
}
