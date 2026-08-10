// index-contracts.test.js — static contract guards for the root countdown
// teaser (F4, GOAL 1 estate freeze; owner spec I8). Same discipline as
// chat-contracts.test.js: read the source as TEXT, assert the invariants
// that would otherwise only surface as a visual regression. The countdown's
// own growth behavior is pinned separately in countdown.test.js (pure
// logic, no DOM needed).

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");

const index = read("src/pages/index.astro");
const base = read("src/layouts/Base.astro");

describe("the countdown teaser", () => {
  test("wires the countdown lib and the Resting wave background (flock retired, owner 2026-08-10)", () => {
    expect(index).toContain('from "../lib/countdown.js"');
    expect(index).toContain('from "../lib/resting-wave.js"');
    expect(index).toContain("initRestingWave");
    expect(index).not.toContain("initSkyFlock");
  });

  test("the display stays elastic over the real deadline; touch/click RESETS it (wave era: taps are the only bend)", () => {
    expect(index).toMatch(/REAL_DEADLINE_ISO/);
    expect(index).toMatch(/createElasticState/);
    expect(index).toMatch(/tickElastic/);
    expect(index).toMatch(/resetElastic/);
    expect(index).toContain('addEventListener("click", resetCountdown)');
    expect(index).not.toContain("grantTime");
    expect(index).not.toContain("applyElasticDelta");
  });

  test("no Milliseconds label; the four labels right-align to their groups (owner amendment)", () => {
    expect(index).not.toContain(">Milliseconds<");
    for (const label of ["Days", "Hours", "Minutes", "Seconds"]) {
      expect(index).toContain(`>${label}</span>`);
    }
    expect(index).toMatch(/\.countdown__label\s*{[^}]*justify-self:\s*end/);
  });

  test("the flock never follows the pointer (owner amendment: continuous 3-body physics, no follow)", () => {
    // "chaosBias" pinned the old chaotic-wander scheme; the owner's
    // continuous-physics rewrite replaced it with real mutual gravity
    // between the three bodies (GRAVITY_G) — pin that instead. The
    // no-pointer/no-gyro guarantee itself is unchanged.
    const flock = read("src/lib/sky-flock.js");
    expect(flock).not.toContain("pointermove");
    expect(flock).not.toContain("deviceorientation");
    expect(flock).toContain("GRAVITY_G");
    // The black-hole center (amendment 10): a chaos ellipse with a ±15°
    // trajectory cone — cards, not reversals.
    expect(flock).toContain("zoneStrength");
    expect(flock).toContain("Math.PI / 12");
  });

  test("the wave slides beneath the counter and taps always reach the box (wave era)", () => {
    expect(index).toMatch(/\.teaser__canvas\s*{[^}]*pointer-events:\s*none/);
    expect(index).not.toMatch(/obstacle:/);
    expect(index).not.toMatch(/onCollide:/);
    expect(index).not.toContain("countdown--flyover");
  });

  test("the reveal renders the wordmark law — gradient PITO (owner amendment 2026-08-06, uppercase mark), 1px underline, pure-white Studio — and claims nothing beyond the countdown (owner amendment 6 + wordmark law 2026-08-05, #128 halving)", () => {
    expect(index).toContain('<span class="countdown__brand-mark">PITO</span>');
    expect(index).toMatch(/class="countdown__brand-product">Studio<\/span/);
    expect(index).toContain('</span>{" "}<span');
    expect(index).toMatch(
      /\.countdown__brand\s*{[^}]*--wordmark: linear-gradient\([^)]*#ff6ec7 0%,[^)]*#5170ff 100%\s*\)/,
    );
    expect(index).toMatch(
      /\.countdown__brand-mark::after\s*{[^}]*height: 1px;[^}]*background: var\(--wordmark\);/,
    );
    expect(index).toMatch(/\.countdown__brand-product\s*{\s*color: #ffffff;/);
    // Still no launch-sign language — the countdown IS the whole claim.
    const body = index.slice(index.indexOf("---", 3) + 3);
    expect(body.toLowerCase()).not.toContain("studio is here");
  });

  test("a small banner points at /chat, labeled around the free chat", () => {
    expect(index).toContain("CrossNav");
    expect(index).toMatch(/href="\/chat"/);
    expect(index).toContain('position="bottom-right"');
    expect(index.toLowerCase()).toContain("free chat");
  });

  test("neon digits stay in the brand purple/blue family — never a rainbow ramp", () => {
    // The owner's ruling (G2.5): colorful neon is fine, a rainbow gradient
    // ramp is not. Pin that the countdown's glow uses the house tokens
    // (--pito-blue, the purple #bb9af7 already used by the ported sky/ring
    // palette) and never a CSS `hue-rotate`/multi-stop rainbow gradient.
    expect(index).toContain("var(--pito-blue)");
    expect(index).toContain("#bb9af7");
    expect(index).not.toContain("hue-rotate");
    expect(index).not.toMatch(/linear-gradient\(90deg,\s*red/i);
  });

  test("respects prefers-reduced-motion (sky-flock.js) while the countdown keeps ticking", () => {
    const skyFlock = read("src/lib/sky-flock.js");
    expect(skyFlock).toContain("prefers-reduced-motion");
    // The countdown's own tick loop must NOT be gated behind the media
    // query — the spec is explicit: it keeps ticking down regardless. It
    // runs its own unconditional requestAnimationFrame loop, entirely
    // separate from sky-flock's reduced-motion-gated wander loop (which is
    // where collisions — and only collisions — stop).
    expect(index).toMatch(/requestAnimationFrame\(tick\)/);
    expect(index).not.toMatch(/matchMedia\(["']\(prefers-reduced-motion/);
  });

  test("touch works and digits stay legible on mobile", () => {
    expect(index).toContain("touch-action: manipulation");
    expect(index).toContain("clamp(");
  });

  test("Base gets no explicit title/description here — the bare teaser defaults apply", () => {
    // The root route relies on Base.astro's own defaults (never described
    // as a product) rather than passing its own TITLE/DESCRIPTION consts,
    // unlike /chat and the parked /studio page.
    expect(index).not.toMatch(/const TITLE =/);
    expect(base).toContain('title = "pitomd.com"');
    // The default JSON-LD graph itself (not doc comments describing what
    // routes override it) must carry no SoftwareApplication/offer claim.
    const defaultGraph = base.slice(
      base.indexOf("const defaultJsonLd"),
      base.indexOf("const jsonLd ="),
    );
    expect(defaultGraph).not.toContain("SoftwareApplication");
    expect(defaultGraph).not.toContain("Offer");
  });
});

describe("sky-flock.js — the self-contained port (no Rails deps)", () => {
  const skyFlock = read("src/lib/sky-flock.js");

  test("carries no Rails/Stimulus/ActionCable import or wiring", () => {
    // Actual code patterns, not the header comment's prose (which is
    // allowed to NAME what was cut while explaining the cut).
    expect(skyFlock).not.toMatch(/from ["']@hotwired\/stimulus["']/);
    expect(skyFlock).not.toMatch(/extends Controller\b/);
    expect(skyFlock).not.toMatch(/addEventListener\(\s*["']turbo:/);
    expect(skyFlock).not.toMatch(/ActionCable\.createConsumer/);
    expect(skyFlock).not.toMatch(/static values\s*=/);
  });

  test("keeps the ported star-field identity hash + its pito credit (credited inline)", () => {
    // The flight-leg tempo law (easeInOutCubic, TEMPOS) died with the leg
    // system in the owner's continuous-physics rewrite — the star field's
    // identity hash and its "ported from pito" credit are what's still
    // ported, so that's what stays pinned.
    expect(skyFlock).toContain("fnv1a");
    expect(skyFlock).toMatch(/ported from pito/i);
  });

  test("is NOT one of the globally-wired script islands (imported by index.astro only)", () => {
    expect(existsSync(join(ROOT, "src/scripts/sky-flock.js"))).toBe(false);
    expect(base).not.toContain("scripts/sky-flock.js");
  });

  test("THREE_BODIES: a fixed trio with distinct scales, not a variable flockSize (owner rewrite: '3 boddies problem')", () => {
    expect(skyFlock).toContain("THREE_BODIES");
    expect(skyFlock).toMatch(/scale:\s*0\.5/);
    expect(skyFlock).toMatch(/scale:\s*0\.9/);
    expect(skyFlock).toMatch(/scale:\s*1\.9/);
  });

  test("the no-stick invariant survives the body-body bounce rewrite (owner: bounce off eachother too)", () => {
    expect(skyFlock).toContain("NO-STICK INVARIANT");
  });

  test("onCollide fires from exactly one call site — the box-bounce path only (body-body contact never adds time)", () => {
    const hits = skyFlock.match(/onCollide\?\.\(/g) || [];
    expect(hits).toHaveLength(1);
  });
});

describe("sitemap (F4: root + /chat only, /studio parked out)", () => {
  test("covers exactly / and /chat/, never /studio", () => {
    const sitemap = read("public/sitemap.xml");
    expect(sitemap).toContain("<loc>https://pitomd.com/</loc>");
    expect(sitemap).toContain("<loc>https://pitomd.com/chat/</loc>");
    expect(sitemap).not.toContain("/studio");
  });
});
