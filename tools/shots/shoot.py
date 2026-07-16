#!/usr/bin/env python3
"""shoot.py — reproducible marketing screenshots for pitomd + the pito README.

Drives the REAL pito app at dev.pitomd.com through its own chatbox (shot-scraper
+ headless Chromium + the auth-state.json minted by login.sh), captures each
mkt-NN surface, and writes size-optimized copies to BOTH repos:

    pitomd/public/media/mkt-*.png   (max width PITOMD_W, default 1400)
    pito/docs/media/mkt-*.png       (max width PITO_W,   default 1000)

Screenshots ONLY — the walkthrough GIFs are never touched.

Usage:  ./login.sh && ./shoot.py [only-these-shot-names…]
Env:    BASE_URL, PITO_DIR, PITOMD_W, PITO_W
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
VENV = HERE / ".venv" / "bin"
BASE = os.environ.get("BASE_URL", "https://dev.pitomd.com")
PITO_DIR = Path(os.environ.get("PITO_DIR", str(Path.home() / "Dev" / "pito")))
PITOMD_MEDIA = HERE.parent.parent / "public" / "media"
PITO_MEDIA = PITO_DIR / "docs" / "media"
PITOMD_W = int(os.environ.get("PITOMD_W", "1400"))
PITO_W = int(os.environ.get("PITO_W", "1000"))

# ── the in-page driver: type real commands, wait for streamed renders, tag
#    the crop target with #shot-target, drop the DEVELOPMENT banner ──────────
DRIVER = """
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const send = (text) => {
    const input = document.querySelector(".pito-chatbox__input");
    input.focus();
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Enter", code: "Enter", keyCode: 13, bubbles: true, cancelable: true,
    }));
  };
  const settle = async (ms) => { await sleep(ms); };
  __STEPS__
  [...document.querySelectorAll("div, footer, aside")].forEach((e) => {
    if (e.textContent.trim() === "DEVELOPMENT") e.remove();
  });
  const kill = document.createElement("style");
  kill.textContent = "[class*='development'], .dev-banner { display: none !important }";
  document.head.appendChild(kill);
  let target = __TAG__;
  // poll: streamed fills REPLACE nodes (Turbo) — keep re-resolving until the
  // target exists, has real size, its images are loaded, and its height is
  // stable for a beat; only then pin the id
  let stable = 0;
  let lastH = -1;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await sleep(500);
    target = __TAG__;
    const h = target ? target.offsetHeight : -1;
    const imgsDone = target
      ? [...target.querySelectorAll("img")].every((im) => im.complete)
      : false;
    stable = target && h > 100 && h === lastH && imgsDone ? stable + 1 : 0;
    lastH = h;
  }
  target = __TAG__;
  if (target) {
    target.id = "shot-target";
    // the scrollback auto-scrolls to the newest message — bring the crop
    // target back into the viewport or the capture paints background only
    target.scrollIntoView({ block: "start" });
  }
  await sleep(800);
}
"""

# Finds the LAST message segment whose subtree matches `sel` (or any segment).
SEG = ("[...document.querySelectorAll('.pito-segment')].reverse()"
       ".find((s) => s.offsetHeight > {MINH} && ({SEL}))")


def seg_with(sel, min_h=250):
    cond = f's.querySelector("{sel}")' if sel else "true"
    return SEG.replace("{SEL}", cond).replace("{MINH}", str(min_h))


def seg_first(sel, min_h=250):
    # first (oldest) matching segment — e.g. the analyze "basics" grid, which
    # renders before the enhanced deep-dive
    return (seg_with(sel, min_h)
            .replace(".reverse()", ""))


# name → shot spec.  steps: [(command, wait_ms)], tag: JS expr for the crop
# node (None = full viewport), viewport (w, h), pad: extra px around the crop.
SHOTS = {
    "mkt-12-chatbox": dict(
        steps=[("list games", 6000)], tag=None, viewport=(1280, 960)),
    "mkt-02-coverage": dict(
        steps=[("show game 1", 14000)], tag=seg_with(".pito-game-channels"),
        viewport=(1280, 1400), pad=14),
    "mkt-01-linkage": dict(
        steps=[("show vid 5", 15000)], tag=seg_with(".pito-video-detail"),
        viewport=(1280, 1400), pad=14),
    "mkt-03-price": dict(
        steps=[("show game 3", 15000)], tag=seg_with(".pito-game-detail"),
        viewport=(1280, 1600), pad=14),
    "mkt-05-footage": dict(
        steps=[("show game 1", 15000)], tag=seg_with(".pito-ttb"),
        viewport=(1280, 1600), pad=14),
    "mkt-04-releases": dict(
        steps=[("show game 3", 15000)], tag=seg_with(".pito-game-detail"),
        viewport=(1280, 1600), pad=14),
    "mkt-06-game-analytics": dict(
        steps=[("analyze game 1", 22000)], tag=seg_with(".pito-analytics-enhanced", min_h=500),
        viewport=(1280, 1700), pad=14),
    "mkt-07-heatmap": dict(
        steps=[("analyze game 1", 22000)],
        # crop the heatmap CELL itself (tight marketing crop) — the component
        # exposes pito-metric--heatmap on the cell, pito-heatmap__* children
        tag='(document.querySelector(".pito-heatmap__bars")?.closest(".pito-metric") || document.querySelector(".pito-heatmap__bars"))',
        viewport=(1280, 1700), pad=14),
    "mkt-08-schedule": dict(
        steps=[("schedule 5 slate", 8000)], tag=seg_with(None, min_h=120),
        viewport=(1280, 1400), pad=14),
    "mkt-13-similar": dict(
        steps=[("show game 1", 14000)],
        tag=seg_with('[class*=similar-game-card]'),
        viewport=(1280, 1600), pad=14),
    "mkt-14-shinies": dict(
        steps=[("shinies game 1", 8000)], tag=seg_with(None),
        viewport=(1280, 1200), pad=14),
    # Pixel Pro XL-class viewport (448×998 CSS), full frame — mobile proof.
    "mkt-11-mobile": dict(
        steps=[("show game 1", 12000)], tag=None, viewport=(448, 998)),
    # the public share page — URL resolved at runtime from the newest Share
    "mkt-09-share": dict(steps=[], tag=None, viewport=(1280, 960), url="__SHARE__"),
    # an older conversation, opened via the resume sidebar (data as it was)
    "mkt-10-snapshot": dict(
        steps=[("/resume", 3500)], tag=None, viewport=(1280, 960),
        extra_js="""
  const row = [...document.querySelectorAll("a, button, [role=option], li")]
    .find((e) => /Unnamed/.test(e.textContent) && e.offsetHeight > 0);
  if (row) { row.click(); await sleep(5000); }
""",
    ),
    # ── 3.0.0 additions — spec-authored against the DOCUMENTED design (the
    #    3.0.0 planning spec, config/pito/tools.yml's `search`/`nl` blocks)
    #    since the target instance isn't on 3.0.0 yet. No dedicated card class exists for
    #    search/NL results (they render through the same generic table_heading/
    #    table_rows card `list` already uses — Pito::Event::SystemComponent, no
    #    marketing-specific class), so these four target the SAME shared
    #    .pito-segment fallback every chat-driving shot above resolves through
    #    (seg_with) rather than a selector nobody can name yet.
    "mkt-15-search-exact": dict(
        # `search games for <title>` (config/pito/tools.yml search tool, `for`
        # clause) — exact ILIKE over games.title/alternative_names, rendered
        # through the same Game::List card `list games` uses
        # (lib/pito/chat/handlers/search.rb#build_payload). min_h lowered to
        # 120 (mirrors mkt-08-schedule's rationale): an exact-title hit list
        # for one franchise can be as short as 1-3 rows, and the default 250
        # floor would skip it for an older, taller segment. Nudge: if 3.0.0
        # ships a dedicated search-results card class, retarget to it instead.
        steps=[("search games for tekken", 8000)], tag=seg_with(None, min_h=120),
        viewport=(1280, 1400), pad=14),
    "mkt-16-search-conversations": dict(
        # `search conversations for <term>` — the search tool's conversations
        # noun, lexical branch (lib/pito/chat/handlers/search_conversations.rb
        # #search_lexical); a generic table_heading/table_rows payload
        # (Conversation / Snippet / # columns) with no dedicated card yet
        # (T4.6 in the 3.0.0 planning spec is still open) — same seg_with
        # fallback + lowered min_h for the same short-list reason. Nudge:
        # retarget once the dedicated conversation-hits card/copy lands.
        steps=[("search conversations for thumbnails", 8000)], tag=seg_with(None, min_h=120),
        viewport=(1280, 1400), pad=14),
    "mkt-17-did-you-mean": dict(
        # A free-text ask the grammar can't parse outright. Per the locked
        # 3.0.0 NL policy (the 3.0.0 planning spec L4/T6.8, NOT YET WIRED as
        # of this writing): below auto_run confidence — or ANY write-capable
        # tool — always confirms first ("did you mean `<cmd>`?"), never
        # auto-runs. Nudge: "show me my shooters" sits close to `list`'s own
        # nl_examples ("list some shooters"), so once the router is live it
        # may score ABOVE auto_run and skip straight to mkt-18's auto-run
        # behavior instead of asking — if so on capture day, swap in a more
        # mumbled phrasing (e.g. "shooter stuff maybe?") to land in the
        # [suggest, auto_run) confirm band. The confirm text itself is
        # composed by the cold LLM path (Pito::Nl::Mapper, Qwen3-0.6B
        # CPU-only completion via the nlmapper sidecar) — wait bumped well
        # past the read-only chat shots to give it room; tune down/up once
        # real latency is measured.
        steps=[("show me my shooters", 18000)], tag=seg_with(None, min_h=120),
        viewport=(1280, 1400), pad=14),
    "mkt-18-speak-your-language": dict(
        # High-confidence, read-only NL utterance — the "Speak your
        # language" proof shot (pitomd's own headline, src/pages/index.astro
        # "Speak your language."): once T6.8 lands, pito auto-runs the
        # mapper's composed command (`ls rpg games`-shaped) and shows it as
        # attribution ahead of the resulting list. Presumed to render INLINE
        # in the same reply (mirroring how the existing
        # grammar.typo_correction note prepends ahead of its own grid) rather
        # than as a separate preceding segment — unconfirmed since the
        # wiring isn't shipped; if capture day shows two segments instead of
        # one, retarget to the LATER (list) segment and shoot the attribution
        # line separately. Same cold-path wait rationale as mkt-17 (the
        # Mapper composes the command regardless of which side of auto_run
        # the router lands on).
        steps=[("what rpgs do I have", 18000)], tag=seg_with(None, min_h=120),
        viewport=(1280, 1400), pad=14),
    # the notifications sidebar, proving an unlinked import's link suggestion
    "mkt-19-link-suggestion": dict(
        # Opened the same way mkt-10-snapshot opens the resume sidebar: a
        # slash command typed into the chatbox (`/notifications`, the
        # documented slash equivalent of Ctrl+/ —
        # lib/pito/slash/handlers/notifications.rb) rather than the raw
        # keydown, since DRIVER's `send()` only types+Enters into the
        # chatbox. NOT driven via `url=` (mkt-09-share's pattern): GET
        # /notifications only renders the sidebar on the turbo_stream format
        # a live SPA request carries — a fresh full-page load hits the
        # controller's `format.html { redirect_to root_path }` branch and
        # never shows the panel at all (app/controllers/
        # notifications_controller.rb). Full-viewport, uncropped, same as
        # mkt-10 — no dedicated sidebar-crop precedent exists to target
        # instead. EXPECTS a recent unlinked video import to have already
        # fired Pito::Notifications::Source::LinkSuggestion on dev (Phase 5 of
        # the 3.0.0 plan) — if the panel comes up empty on capture
        # day, run a manual game/vid import first so a real suggestion row
        # exists to shoot.
        steps=[("/notifications", 3500)], tag=None, viewport=(1280, 960)),
}


def share_url():
    out = subprocess.run(
        ["bin/rails", "runner", "puts Share.order(:created_at).last&.uuid"],
        capture_output=True, text=True, cwd=PITO_DIR)
    uuid = (out.stdout.strip().splitlines() or [""])[-1]
    return f"{BASE}/share/{uuid}" if uuid else None


def build_js(spec):
    steps = "".join(
        f'  send({json.dumps(cmd)});\n  await settle({wait});\n'
        for cmd, wait in spec["steps"])
    steps += spec.get("extra_js", "")
    tag = spec["tag"] or "null"
    return DRIVER.replace("__STEPS__", steps).replace("__TAG__", f"({tag})")


def capture(name, spec, master_dir):
    url = spec.get("url") or f"{BASE}/"
    if url == "__SHARE__":
        url = share_url()
        if not url:
            print(f"  !! {name}: no Share exists — skipped")
            return None
    out = master_dir / f"{name}.png"
    w, h = spec["viewport"]
    cmd = [str(VENV / "shot-scraper"), url, "--auth", str(HERE / "auth-state.json"),
           "-o", str(out), "--width", str(w), "--height", str(h),
           "--retina", "--javascript", build_js(spec)]
    if spec["tag"]:
        cmd += ["-s", "#shot-target", "--padding", str(spec.get("pad", 12))]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not out.exists():
        print(f"  !! {name}: {r.stderr.strip().splitlines()[-1:] or r.stdout}")
        return None
    return out


def place(master, name):
    for dest_dir, max_w in ((PITOMD_MEDIA, PITOMD_W), (PITO_MEDIA, PITO_W)):
        dest_dir.mkdir(parents=True, exist_ok=True)
        im = Image.open(master)
        if im.width > max_w:
            im = im.resize((max_w, round(im.height * max_w / im.width)),
                           Image.LANCZOS)
        im.save(dest_dir / f"{name}.png", optimize=True)
    print(f"  ok {name}: master {Image.open(master).size} -> "
          f"pitomd {PITOMD_W}w + pito {PITO_W}w")


def main():
    only = set(sys.argv[1:])
    master_dir = Path(tempfile.mkdtemp(prefix="pito-shots-"))
    print(f"masters in {master_dir}")
    for name, spec in SHOTS.items():
        if only and name not in only:
            continue
        print(f"- {name}")
        master = capture(name, spec, master_dir)
        if master:
            place(master, name)
    print("done — GIFs untouched; only mkt-*.png were written")


if __name__ == "__main__":
    main()
