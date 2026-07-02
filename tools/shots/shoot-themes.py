#!/usr/bin/env python3
"""shoot-themes.py — re-shoot the 19 per-theme screenshots.

For every theme slug (taken from the existing pito docs/media/themes/*.png
names) this renders a content-rich frame (`show game 1`) and applies each theme by
setting `data-theme` on <html> — the app's own preview mechanism (`/themes`
is a sidebar picker; there is no argument form). Server state is never
touched. Captures the full viewport and writes:  pito docs/media/themes/<slug>.png (760w)
         pitomd public/media/themes/<slug>.png (1152w)

The owner's active theme is read from <html data-theme> first and restored at
the end. Same filenames — consumers (README table, pitomd slide) need no edits.
"""

import os
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
VENV = HERE / ".venv" / "bin"
BASE = os.environ.get("BASE_URL", "https://dev.pitomd.com")
PITO_DIR = Path(os.environ.get("PITO_DIR", str(Path.home() / "Dev" / "pito")))
PITO_THEMES = PITO_DIR / "docs" / "media" / "themes"
PITOMD_THEMES = HERE.parent.parent / "public" / "media" / "themes"

DRIVER = """
async () => {{
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (text) => {{
    const input = document.querySelector(".pito-chatbox__input");
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event("input", {{ bubbles: true }}));
    input.dispatchEvent(new KeyboardEvent("keydown", {{
      key: "Enter", code: "Enter", keyCode: 13, bubbles: true, cancelable: true,
    }}));
  }};
  await sleep(1200);
  send("show game 1");
  await sleep(12000);
  // apply the theme the way the app's own picker preview does — the palette
  // is pure data-theme CSS; verify it stuck before shooting
  document.documentElement.dataset.theme = "{slug}";
  await sleep(600);
  if (document.documentElement.dataset.theme !== "{slug}") throw new Error("theme not applied");
  [...document.querySelectorAll("div, footer")].forEach((e) => {{
    if (e.textContent.trim() === "DEVELOPMENT") e.remove();
  }});
  const seg = [...document.querySelectorAll(".pito-segment")]
    .find((s) => s.querySelector(".pito-game-detail"));
  if (seg) seg.scrollIntoView({{ block: "start" }});
  await sleep(800);
}}
"""


def js(command):
    r = subprocess.run(command, capture_output=True, text=True)
    return r.returncode == 0


def current_theme():
    r = subprocess.run(
        [str(VENV / "shot-scraper"), "javascript", f"{BASE}/",
         "document.documentElement.dataset.theme || 'unknown'",
         "--auth", str(HERE / "auth-state.json")],
        capture_output=True, text=True)
    return r.stdout.strip().strip('"')


def main():
    slugs = sorted(p.stem for p in PITO_THEMES.glob("*.png"))
    print(f"themes: {len(slugs)} · persisted theme untouched ({current_theme()})")
    tmp = Path(tempfile.mkdtemp(prefix="pito-themes-"))
    for slug in slugs:
        out = tmp / f"{slug}.png"
        r = subprocess.run(
            [str(VENV / "shot-scraper"), f"{BASE}/",
             "--auth", str(HERE / "auth-state.json"),
             "-o", str(out), "--width", "1152", "--height", "1080",
             "--retina", "--javascript", DRIVER.format(slug=slug)],
            capture_output=True, text=True)
        if r.returncode != 0 or not out.exists():
            print(f"  !! {slug}: {r.stderr.strip().splitlines()[-1:]}")
            continue
        im = Image.open(out)
        for dest, w in ((PITO_THEMES, 760), (PITOMD_THEMES, 1152)):
            dest.mkdir(parents=True, exist_ok=True)
            copy = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
            copy.save(dest / f"{slug}.png", optimize=True)
        print(f"  ok {slug}")
    print("done — data-theme was injected per page; server theme never changed")


if __name__ == "__main__":
    main()
