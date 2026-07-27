// sky-flock.js — the countdown teaser's living background.
//
// A SELF-CONTAINED port of pito (Rails)'s fx sky (app/javascript/fx/sky.js)
// onto a single vanilla-JS canvas, with every Rails/Stimulus/ActionCable
// dependency cut: no dominance IntersectionObserver (no chat scrollback
// here), no cable-push impulses (no live messages here), no enforcer
// renderers, no config.toml knobs — just the resting sky pass plus its
// three-body flock, running forever, because on this page the sky IS the
// whole scene.
//
// The star field below (identity hashes, tempos, color pairs) is copied
// near-verbatim from the pito source, credited inline. The FLOCK'S MOTION
// is not a port — it's an ORIGINAL continuous-physics integrator (owner
// amendment, this rewrite): "let's try 1 more time to make the body move
// differently. They should simulate 3 body problem with each attracting and
// moving in orbits around them as a system but as they orbit around the
// counter they get decentralized and if possible they don't wait after each
// collision. I want a continuous rotating, orbitating trajectory each around
// the other body but counter will push them and gets its numbers modified."
// Every earlier motion scheme this file has carried — eased Bézier flight
// legs, a chaotic-wander bias, an orbit-intro blend that decayed to 0, kick
// windows and pair cooldowns after a bounce — is GONE. In its place: real
// gravity between the three bodies (fading out near each pair's separation
// floor), a weak spring toward a point that itself orbits the counter,
// drag, a hard per-pair minimum-separation constraint (amendment 9: no
// body-body bouncing — blocked approaches turn into orbital grazes), and
// the counter as a fly-over destabilizer zone. Nothing ever pauses the
// motion for even one frame. See "Three body motion" below for the model.
//
// Lives in src/lib/ (not src/scripts/): it's imported as an ES module by
// the one page that uses it (index.astro), not wired globally in
// Base.astro like the fx islands — chat-contracts.test.js's "every
// src/scripts file is loaded by Base.astro" guard only applies to that
// global-script-tag convention.
//
// THE COUNTER (amendment 8, supersedes rule 4's solid obstacle): the box
// is a FLY-OVER ZONE now. Bodies pass above it — each one surging on its
// own fresh-rolled acceleration while over it — and while any body
// overlaps the box, the caller's `onCollide` (the page's signed gentle
// delta) fires once per second. Overlap detection is countdown.js's
// circleRectCollision (pure geometry, tested without a canvas — see
// countdown.test.js) against the box's current bounding rect.

import { circleRectCollision } from "./countdown.js";

// ── Sky (ported from pito app/javascript/fx/sky.js) ─────────────────────

const CELL = 22;
const DENSITY = 80;
const LAYERS = [
  { speed: 3, salt: 0 },
  { speed: 8, salt: 3691 },
];
const TINTS = [
  { r: 0xd8, g: 0xd8, b: 0xe8 }, // near-white
  { r: 0x9d, g: 0xb8, b: 0xff }, // blue-white
  { r: 0xff, g: 0xe9, b: 0xa3 }, // warm yellow
  { r: 0xbb, g: 0x9a, b: 0xf7 }, // purple
];
const SIZES = [
  { radius: 0.9, ceiling: 0.45, flare: false },
  { radius: 1.5, ceiling: 0.6, flare: false },
  { radius: 2.4, ceiling: 0.8, flare: true },
  { radius: 3.4, ceiling: 1.0, flare: true },
];
const SKY_BG = { r: 0x16, g: 0x16, b: 0x1a };

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function tintFor(h) {
  const v = h % 10;
  if (v <= 3) return TINTS[0];
  if (v <= 6) return TINTS[1];
  if (v <= 8) return TINTS[2];
  return TINTS[3];
}

function sizeFor(h) {
  const v = h % 50;
  if (v < 35) return 0;
  if (v < 45) return 1;
  if (v < 49) return 2;
  return 3;
}

function starAt(row, col, density = DENSITY) {
  const h = fnv1a(`${row}:${col}`);
  if (h % density !== 0) return null;
  const sub = fnv1a(`${row}/${col}`);
  return {
    offset: ((h >>> 16) % 997) / 997,
    tint: tintFor(sub >>> 12),
    size: sizeFor(sub >>> 4),
    period: 0.6 + (sub % 97) / 97,
    jx: ((h >>> 8) % 100) / 100,
    jy: ((h >>> 4) % 100) / 100,
  };
}

function pulseAt(star, phase) {
  const breath =
    (Math.sin((phase * 0.13 * star.period + star.offset) * 2 * Math.PI) + 1) /
    2;
  const depth = 0.35 + 0.65 * breath;
  return depth * SIZES[star.size].ceiling;
}

function lerpColor(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function layerStars(layer, widthPx, heightPx, phase, tilt, cell, density) {
  const tiltX = tilt.x * layer.speed;
  const tiltY = tilt.y * layer.speed;
  const drift = phase * layer.speed;
  const base = Math.floor(drift);
  const fracPx = (drift - base) * cell;
  const cols = Math.ceil(widthPx / cell) + 1;
  const rows = Math.ceil(heightPx / cell);
  const stars = [];
  for (let row = 0; row < rows; row++) {
    const saltedRow = row + layer.salt;
    for (let col = 0; col < cols; col++) {
      const star = starAt(saltedRow, col + base, density);
      if (!star) continue;
      stars.push({
        star,
        x: (col + star.jx) * cell - fracPx + tiltX,
        y: (row + star.jy) * cell + tiltY,
      });
    }
  }
  return stars;
}

function drawSky(ctx, widthPx, heightPx, phase, tilt = { x: 0, y: 0 }) {
  for (const layer of LAYERS) {
    for (const { star, x, y } of layerStars(
      layer,
      widthPx,
      heightPx,
      phase,
      tilt,
      CELL,
      DENSITY,
    )) {
      const pulse = pulseAt(star, phase);
      const c = lerpColor(SKY_BG, star.tint, pulse);
      const { radius, flare } = SIZES[star.size];
      ctx.fillStyle = `rgb(${c.r} ${c.g} ${c.b})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      if (flare && pulse > 0.5) {
        const reach = radius * 3 * pulse;
        ctx.strokeStyle = `rgb(${c.r} ${c.g} ${c.b} / ${(0.35 * pulse).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - reach, y);
        ctx.lineTo(x + reach, y);
        ctx.moveTo(x, y - reach);
        ctx.lineTo(x, y + reach);
        ctx.stroke();
      }
    }
  }
}

// ── Trail (amendment 11 — the three-body figure's own ink) ──────────────
//
// The owner's reference is the classic chaotic three-body plot: each body
// draws a LONG thin line of its trajectory, looping and curling. So the
// trail is no longer a comet of fading discs (the old butterfly_trail
// port) — it's a polyline of the last few seconds of real motion, in the
// body's own color, fading toward the tail. The trajectories themselves
// paint the figure on the sky.

// (owner tune: "a bit faded, like 0.7 from what the fading they have
// now but with longer trail, like 2x trail size")
const TRAIL_MAX_POINTS = 360;
const TRAIL_MIN_STEP_PX = 2;
const TRAIL_ALPHA_HEAD = 0.32;
const TRAIL_WIDTH_BASE = 1.6;

function drawTrail(ctx, trail, { widthPx, heightPx, r, pair }) {
  if (trail.length < 2) return;
  const [C1] = pair;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = TRAIL_WIDTH_BASE * (0.6 + (r / BUTTERFLY_RADIUS) * 0.5);
  for (let i = 1; i < trail.length; i++) {
    const a = trail[i - 1];
    const b = trail[i];
    const alpha = (i / trail.length) * TRAIL_ALPHA_HEAD;
    ctx.strokeStyle = `rgb(${C1[0]} ${C1[1]} ${C1[2]} / ${alpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(a.x * widthPx, a.y * heightPx);
    ctx.lineTo(b.x * widthPx, b.y * heightPx);
    ctx.stroke();
  }
  ctx.restore();
}

// THREE BODIES (owner rewrite: "exactly 3 butterflies, similar to 3 boddies
// problem, each with a distinct color... 3 different sizes... therefor
// different mass"). A fixed trio replaces the old variable-size flock —
// distinct neon identities in the owner's explicit palette (yellow / red /
// green — never a rainbow ramp). `scale` drives everything downstream: the
// rendered + collision radius (BUTTERFLY_RADIUS * scale, see newFlockMember),
// the mass (massFor below), and how hard/far each one bounces.
const THREE_BODIES = [
  {
    name: "yellow",
    scale: 0.5,
    pair: [
      [255, 209, 102],
      [255, 180, 84],
    ],
  },
  {
    name: "red",
    scale: 0.9,
    pair: [
      [255, 92, 92],
      [255, 122, 158],
    ],
  },
  {
    name: "green",
    scale: 1.9,
    pair: [
      [158, 206, 106],
      [122, 220, 180],
    ],
  },
];

// The butterfly's BASE physical radius unit for both collision (owner rule
// 4: no overlap with the countdown box, ever) and rendering (drawFlock
// below). Each body's ACTUAL radius is `scale * BUTTERFLY_RADIUS` (see
// newFlockMember) — one constant so collision and rendering always agree.
const BUTTERFLY_RADIUS = 13;

// mass = scale² (the disk's AREA, not its linear size) — so the 1.9x green
// body genuinely dominates a collision against the 0.5x yellow one rather
// than merely edging it out.
function massFor(scale) {
  return scale * scale;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

// ── Three body motion (owner rewrite, this session — see file header for
// the verbatim spec) ─────────────────────────────────────────────────────
//
// A continuous velocity/force integrator. Every body carries a real
// position (px) and velocity (px/s); every frame accumulates an
// acceleration from three sources — mutual gravity, a weak anchor spring,
// a soft bounds steer — then integrates with symplectic Euler (velocity
// first, then position from the NEW velocity) so the motion is always
// "live": nothing eases toward a target, nothing waits, nothing pauses
// after a collision. Body-body contact is resolved as an instantaneous
// impulse on top of this same per-frame integration, never as a separate
// mode; the counter is a fly-over zone, not a collider (amendment 8).

// dt is clamped to this many milliseconds before it's used anywhere (a
// stalled tab / dev-tools breakpoint must never inject one giant catch-up
// step that flings a body across the screen on resume).
const DT_MAX_MS = 50;

// PAIRWISE ATTRACTION — accel on a body = GRAVITY_G * otherMass / dist²,
// softened so a close pass slings instead of exploding. GRAVITY_G is tuned
// against the LIGHTEST pair (yellow+red, mass 0.25+0.81=1.06): two bodies
// starting ~200px apart complete a mutual two-body orbit (T = 2π√(r³/(G·
// Σm))) in ≈ 8.1s, comfortably inside the owner's "6-12s" target. Heavier
// pairs orbit faster at the same separation (real gravity: more mass, more
// pull) — yellow+green (mass 3.86) comes out around 4.2s, which reads as a
// quicker, tighter orbit rather than breaking the "always visibly
// orbiting" feel the owner asked for.
const GRAVITY_G = 4.5e6;
// Softening radius (owner: "soft ~ 60px") — distance is floored to this
// before squaring, so two bodies passing very close never divide by a
// near-zero number and rocket off-screen.
const SOFTENING = 60;

// COUNTER ANCHOR, DECENTRALIZED — a weak spring pulling each body toward a
// point that itself orbits the box (or canvas) center, one slow revolution
// every ANCHOR_PERIOD_S seconds, at ANCHOR_R_FRAC * min(w,h) out from
// center, each body offset by its own phase so the three don't chase a
// single shared point. ANCHOR_K is deliberately tiny — at a typical anchor
// offset (~300px) it produces roughly 36px/s² of pull, well under gravity's
// pull at anything closer than a few hundred px (e.g. ~100-4500px/s² at
// contact range depending on the pair) — so mutual attraction visibly wins
// close-in, and the anchor only reels a body back once it has drifted far
// enough that gravity has faded. That's the "orbit the counter but get
// decentralized" behavior verbatim.
// (Amendment 8 retune: "Make somehow the 3 bodies move over the entire
// viewport more so don't attract them so much to the center" — the spring
// is a third of its old strength and the anchor ring reaches well past
// the box, so the trio roams the whole viewport and only drifts back.)
const ANCHOR_K = 0.045;
const ANCHOR_R_FRAC = 0.34;
const ANCHOR_PERIOD_S = 30;
const ANCHOR_OMEGA = (2 * Math.PI) / ANCHOR_PERIOD_S;

// DRAG + speed clamp — mild global damping so gravity + the anchor spring
// don't compound into an ever-accelerating system, and a hard ceiling
// scaled by 1/√mass so the light yellow body can dart while the heavy green
// one merely cruises (same mass-scaling principle the old bounce code
// used, now applied continuously instead of just after a collision).
// (amendment 11) near-conservative: barely-there damping. The old 0.15
// bled the system's angular momentum in seconds — that, plus the gravity
// fade, was exactly how the trio kept freezing into its triangle. The
// speed clamp below is the real safety net now.
const DRAG = 0.03;
const MAX_SPEED_BASE = 320;

// Soft bounds steer (owner spec item 8): felt only past this fraction of
// the viewport; BOUNDS_ACCEL is small enough to feel like a gentle current,
// not a wall. HARD_ESCAPE_MARGIN_FRAC is the safety net for the case a body
// genuinely leaves the screen (e.g. an extreme slingshot) — position is
// clamped there and the outward velocity component is zeroed, never a
// teleport back to center.
const BOUNDS_MARGIN_FRAC = 0.03;
const BOUNDS_ACCEL = 0.6;
const HARD_ESCAPE_MARGIN_FRAC = 0.1;

// Initial triangle radius band (owner: "on every refresh they somehow
// orbit") — each body starts 0.2-0.3 * min(w,h) out from center.
const INIT_RADIUS_MIN_FRAC = 0.2;
const INIT_RADIUS_MAX_FRAC = 0.3;

function newFlockMember(body, anchorOrbit) {
  return {
    pair: body.pair,
    scale: body.scale,
    // Own radius for BOTH collision (box + body-body) and rendering.
    radius: body.scale * BUTTERFLY_RADIUS,
    mass: massFor(body.scale),
    anchorOrbit,
    pos: { x: 0, y: 0 },
    vel: { x: 0, y: 0 },
    trail: [],
    overBox: false,
    inZone: false,
    zoneSign: 1,
    zoneMag: 0,
    zoneAngle: 0,
    zoneRolledAt: 0,
    kick: null,
  };
}

// Anchor/orbit center: the countdown box's center when present, else canvas
// center.
function anchorCenterPx(rect, w, h) {
  if (rect && w > 0 && h > 0) {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  return { x: w / 2, y: h / 2 };
}

// (Amendment 9, second round: "the orbits should be elipsoidal and
// asymetric so the movement is more natural".) Each body's anchor no
// longer rides a shared circle: it traces its OWN ellipse — per-body
// radii, a per-body rotation of the ellipse itself, an off-center bias,
// its own speed and direction — and sweeps it non-uniformly (the sine
// wobble on the angle makes it hurry through one side of the ellipse and
// linger on the other, a cheap Kepler impression). Three different
// asymmetric ellipses = three uneven, natural-looking orbits.
function rollAnchorOrbit(phase) {
  return {
    phase,
    wobblePhase: Math.random() * Math.PI * 2,
    dir: Math.random() < 0.5 ? 1 : -1,
    // (amendment 10) wider spreads than the first cut — the owner's
    // "too glued together" screenshot came from three anchors living too
    // close: bigger off-center bias + a broader speed range pull the
    // three ellipses visibly apart.
    speedMul: 0.6 + Math.random() * 0.9,
    rxFrac: ANCHOR_R_FRAC * (0.8 + Math.random() * 0.55),
    ryFrac: ANCHOR_R_FRAC * (0.45 + Math.random() * 0.4),
    tilt: Math.random() * Math.PI,
    cxOffFrac: (Math.random() * 2 - 1) * 0.14,
    cyOffFrac: (Math.random() * 2 - 1) * 0.14,
  };
}

function anchorPositionPx(center, minWH, nowMs, orbit) {
  const t =
    ANCHOR_OMEGA * orbit.speedMul * orbit.dir * (nowMs / 1000) + orbit.phase;
  // non-uniform sweep: hurries one side, lingers on the other
  const angle = t + 0.45 * Math.sin(2 * t + orbit.wobblePhase);
  const ex = Math.cos(angle) * orbit.rxFrac * minWH;
  const ey = Math.sin(angle) * orbit.ryFrac * minWH;
  const cosT = Math.cos(orbit.tilt);
  const sinT = Math.sin(orbit.tilt);
  return {
    x: center.x + orbit.cxOffFrac * minWH + ex * cosT - ey * sinT,
    y: center.y + orbit.cyOffFrac * minWH + ex * sinT + ey * cosT,
  };
}

// INITIAL CONDITIONS ("on every refresh they somehow orbit"): a triangle
// around the box/canvas center with jitter, each body given a TANGENTIAL
// velocity — perpendicular to its own center offset — so the system starts
// already turning rather than needing a run-up. The spin direction
// (cw/ccw) is rolled ONCE per page load for the system as a WHOLE (all
// three bodies agree on a shared sense of rotation); each body then gets
// its own magnitude jitter on top so they don't read as three clones.
function placeInitialConditions(flock, w, h) {
  const minWH = Math.min(w, h) || 1;
  const center = { x: w / 2, y: h / 2 };
  const systemSpin = Math.random() < 0.5 ? 1 : -1;
  const baseAngle = Math.random() * Math.PI * 2;

  flock.forEach((member, i) => {
    const angle =
      baseAngle +
      i * ((Math.PI * 2) / flock.length) +
      (Math.random() * 2 - 1) * 0.35;
    const radiusFrac =
      INIT_RADIUS_MIN_FRAC +
      Math.random() * (INIT_RADIUS_MAX_FRAC - INIT_RADIUS_MIN_FRAC);
    const r = radiusFrac * minWH;
    member.pos = {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r,
    };

    const tangent = {
      x: -Math.sin(angle) * systemSpin,
      y: Math.cos(angle) * systemSpin,
    };
    // Orbital speed for a circular orbit under a linear spring of constant
    // ANCHOR_K at radius r is v = r*sqrt(k) — sizes the initial push to
    // roughly match the anchor spring's own orbit speed at that radius, per
    // spec item 5 ("sized to put them near orbital speed"). Per-body
    // magnitude jitter on top (±25%) so the three don't move in lockstep.
    const orbitalSpeed = r * Math.sqrt(ANCHOR_K);
    const speed = orbitalSpeed * (0.75 + Math.random() * 0.5);
    member.vel = { x: tangent.x * speed, y: tangent.y * speed };
  });
}

// ── The fly-over zone (owner amendment 8 — supersedes rule 4's bounce) ──
//
// "Rather than not letting colliding with the counter, let the 3 bodies
// orbiting each other, go above the counter and while going above it
// accelerate the movement of the 3 bodies not uniform, each one getting
// random acceleration and while the bodies are over the counter, change
// the [display] by adding or subtracting days, hours, minutes or seconds
// to the counter every second."
//
// The box is no longer a solid obstacle. A body whose circle overlaps the
// box rect is "over" it — that drives the hover dress and the stacked
// display-delta cadence (wander()'s flock-level timer, still this
// module's single onCollide call site). The counter LAYER sits above the
// flock (owner ruling), so bodies visually slide beneath the box while
// the overlap physics does the work; the canvas keeps pointer-events off
// so taps always reach the countdown.
// Stacked cadence (owner): the more bodies over the box, the faster the
// display bends — 1 body: every second; 2: every half second; 3: every
// 10ms, effectively every frame.
const OVER_DELTA_PERIOD_MS = 1000;
const OVER_DELTA_PAIR_MS = 500;
const OVER_DELTA_STACKED_MS = 10;

function updateOverBox(member, rect) {
  const over =
    rect !== null &&
    circleRectCollision(member.pos.x, member.pos.y, member.radius, rect) !==
      null;
  member.overBox = over;
  return over;
}

// ── The black-hole center (owner amendment 10 — the destabilizer) ───────
//
// "the center of the counter is like a horizontal elipse 50% of the
// height and 50% of the width so that's like the part where their
// movement gets chaotic-ized. something like a black hole that can
// affect you as you get close to it's center."
//
// The chaos zone is an ellipse centered on the box, spanning half the
// box's width and half its height. zoneStrength() is 0 outside it and
// climbs toward 1 at the exact center — the black-hole falloff: the
// deeper a body flies, the harder its card plays.
//
// The card (rollZoneEffect): each body in the zone holds its OWN effect —
// accelerate OR brake, along its CURRENT trajectory rotated by at most
// ±15° ("don't change their direction like in reverse... 15 to the left
// and 15 to the right"), with a curved sine envelope over the effect's
// life ("not linear but with a curve push / momentuum" — the force swells,
// peaks and fades, it never steps). A brake can slow a body hard but caps
// out before reversing it. Cards are dealt on zone ENTRY and RE-DEALT for
// every body still inside each time the counter changes (the
// once-per-second delta — "every time the counter changes these
// accelerations and slow downs can happen again").
const ZONE_ACCEL_MIN = 180;
const ZONE_ACCEL_MAX = 520;
const ZONE_EFFECT_MS = 1000;
const ZONE_CONE = Math.PI / 12; // ±15°
// speed ceiling multiplier for a body riding an accelerate card
const ZONE_CEILING = 1.9;

function zoneStrength(member, rect) {
  if (!rect) return 0;
  const a = rect.width / 4; // the ellipse spans 50% of the width...
  const b = rect.height / 4; // ...and 50% of the height, centered
  if (!(a > 0) || !(b > 0)) return 0;
  const nx = (member.pos.x - (rect.x + rect.width / 2)) / a;
  const ny = (member.pos.y - (rect.y + rect.height / 2)) / b;
  const d = Math.hypot(nx, ny);
  return d >= 1 ? 0 : 1 - d;
}

function rollZoneEffect(member, now) {
  member.zoneSign = Math.random() < 0.5 ? 1 : -1;
  member.zoneMag =
    ZONE_ACCEL_MIN + Math.random() * (ZONE_ACCEL_MAX - ZONE_ACCEL_MIN);
  member.zoneAngle = (Math.random() * 2 - 1) * ZONE_CONE;
  member.zoneRolledAt = now;
}

// ── Comet kicks (amendment 11 — "Don't let them reach equilibrium :)") ──
//
// Even near-conservative three-body systems can luck into quasi-periodic
// rosettes. Every so often one random body takes a curved-envelope burst
// pointed away from the other two's barycenter (±30° of jitter): the
// formation stretches, gravity has to reel the runaway back, and the
// figure re-draws itself from a fresh configuration. Never a teleport —
// a swelling, fading push, same momentum language as the zone cards.
const KICK_GAP_MIN_MS = 7000;
const KICK_GAP_SPREAD_MS = 9000;
const KICK_ACCEL_MIN = 300;
const KICK_ACCEL_MAX = 560;
const KICK_DURATION_MS = 800;

function launchCometKick(flock, now) {
  const member = flock[Math.floor(Math.random() * flock.length)];
  const others = flock.filter((m) => m !== member);
  const bx = (others[0].pos.x + others[1].pos.x) / 2;
  const by = (others[0].pos.y + others[1].pos.y) / 2;
  let dx = member.pos.x - bx;
  let dy = member.pos.y - by;
  const d = Math.hypot(dx, dy) || 1;
  const jitter = (Math.random() * 2 - 1) * (Math.PI / 6);
  const cosJ = Math.cos(jitter);
  const sinJ = Math.sin(jitter);
  const ux = (dx / d) * cosJ - (dy / d) * sinJ;
  const uy = (dx / d) * sinJ + (dy / d) * cosJ;
  const mag =
    (KICK_ACCEL_MIN + Math.random() * (KICK_ACCEL_MAX - KICK_ACCEL_MIN)) /
    Math.sqrt(member.mass);
  member.kick = {
    start: now,
    until: now + KICK_DURATION_MS,
    ax: ux * mag,
    ay: uy * mag,
  };
}

// ── Minimum separation (owner amendment 9 — supersedes the elastic
// body-body bounce) ─────────────────────────────────────────────────────
//
// "They should not bounce each other. There's got to be a minimal boundry
// from which they can't pass so they always will look like they are
// orbiting on uneven orbits one to the other."
//
// THE NO-STICK INVARIANT APPLIES BETWEEN BODIES TOO — this is what keeps
// the small bodies from clumping against the big one. Each pair has a
// hard distance floor scaled from the two radii (so the GLOW circles keep
// daylight between them, not just the cores). Crossing it is resolved as
// a CONSTRAINT, not a collision: positions are projected back to the
// floor in the same frame (split inversely by mass — the light body gives
// way) and only the CLOSING component of the pair's relative velocity is
// cancelled (momentum-conserving, mass-split), while the tangential
// component sails on untouched. A too-close pass therefore reads as a
// graze on an uneven orbit — never a bounce, never a clump. Body
// proximity never calls onCollide — only the counter's fly-over timer
// does (see wander()).
const MIN_SEP_RADII_FACTOR = 3;
const MIN_SEP_FLOOR_PX = 90;

function minSeparation(a, b) {
  return Math.max(
    (a.radius + b.radius) * MIN_SEP_RADII_FACTOR,
    MIN_SEP_FLOOR_PX,
  );
}

function enforceMinSeparation(flock) {
  for (let i = 0; i < flock.length; i++) {
    for (let j = i + 1; j < flock.length; j++) {
      const a = flock[i];
      const b = flock[j];
      let dx = b.pos.x - a.pos.x;
      let dy = b.pos.y - a.pos.y;
      let dist = Math.hypot(dx, dy);
      const minSep = minSeparation(a, b);
      if (dist >= minSep) continue;
      if (dist === 0) {
        dx = 1;
        dy = 0;
        dist = 1;
      }
      const nx = dx / dist;
      const ny = dy / dist;
      const totalMass = a.mass + b.mass;

      // Project the pair back onto the floor, heavier body moving less.
      const deficit = minSep - dist;
      a.pos.x -= nx * deficit * (b.mass / totalMass);
      a.pos.y -= ny * deficit * (b.mass / totalMass);
      b.pos.x += nx * deficit * (a.mass / totalMass);
      b.pos.y += ny * deficit * (a.mass / totalMass);

      // Cancel ONLY the closing speed (post-constraint relative normal
      // velocity = 0; total momentum unchanged) — tangential motion is
      // untouched, which is exactly what turns a blocked approach into
      // an orbital graze instead of a bounce.
      const rvx = b.vel.x - a.vel.x;
      const rvy = b.vel.y - a.vel.y;
      const closing = rvx * nx + rvy * ny;
      if (closing < 0) {
        a.vel.x += nx * closing * (b.mass / totalMass);
        a.vel.y += ny * closing * (b.mass / totalMass);
        b.vel.x -= nx * closing * (a.mass / totalMass);
        b.vel.y -= ny * closing * (a.mass / totalMass);
      }
    }
  }
}

// ── Engine shell (new — small on purpose) ────────────────────────────────
//
// No dominance, no enforcers, no cable-push: this page has exactly one fx
// pass (the sky + its flock), always on. Respects prefers-reduced-motion
// (one static frame), document.hidden (pauses the clock), and resize/DPR.
export function initSkyFlock(
  canvas,
  {
    // obstacle() -> { x, y, width, height } | null — the countdown box's
    // current bounding rect, in the same px space this module already
    // renders in (canvas is `position: fixed; inset: 0`, so page/client
    // coordinates ARE canvas coordinates — no conversion needed). Return
    // null/undefined to disable collision entirely (e.g. no box on screen).
    obstacle = null,
    // onCollide() — called once per second while any body is over the
    // obstacle (the fly-over timer, amendment 8). The page uses this to
    // bend the display. Body proximity never fires it (owner spec 5e).
    onCollide = null,
    // onHover(active) — called when the "any body over the box" state
    // flips (owner: while a butterfly is over, "make the counter look
    // like this" — the page mirrors its :hover styling onto the box).
    onHover = null,
  } = {},
) {
  if (!canvas || typeof canvas.getContext !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const dprCap = 1.5;
  let w = 0;
  let h = 0;
  let phase = 0;
  let running = false;
  let raf = null;
  let last = null;
  let lastPhysicsNow = null;
  // -Infinity so the first frame a body enters the box fires immediately.
  let overDeltaAt = -Infinity;
  let lastAnyOver = false;
  let nextKickAt = null;
  let positionsInitialized = false;

  const flock = THREE_BODIES.map((body, i) =>
    newFlockMember(
      body,
      rollAnchorOrbit((i * (Math.PI * 2)) / THREE_BODIES.length),
    ),
  );

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    const newW = window.innerWidth;
    const newH = window.innerHeight;
    canvas.width = Math.round(newW * dpr);
    canvas.height = Math.round(newH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (!positionsInitialized) {
      placeInitialConditions(flock, newW, newH);
      positionsInitialized = true;
    } else if (w > 0 && h > 0 && (newW !== w || newH !== h)) {
      // On resize, scale positions proportionally rather than re-rolling
      // the system — a body mid-orbit stays mid-orbit relative to the new
      // viewport instead of jumping.
      const sx = newW / w;
      const sy = newH / h;
      for (const member of flock) {
        member.pos.x *= sx;
        member.pos.y *= sy;
      }
    }
    w = newW;
    h = newH;
    if (!running) renderFrame();
  }

  // One physics step: gravity + anchor spring + bounds steer, integrated
  // with symplectic Euler (dt clamped to [0, DT_MAX_MS]), then box and
  // body-body collisions resolved against the newly-integrated positions.
  function wander(now) {
    if (lastPhysicsNow === null) lastPhysicsNow = now;
    const dt = clamp(now - lastPhysicsNow, 0, DT_MAX_MS) / 1000;
    lastPhysicsNow = now;
    if (!(dt > 0) || !(w > 0 && h > 0)) return;

    const rect = typeof obstacle === "function" ? obstacle() : null;
    const center = anchorCenterPx(rect, w, h);
    const minWH = Math.min(w, h);

    // Comet-kick scheduler (amendment 11): fire the first one early so a
    // fresh page never settles, then every 7-16s at random.
    if (nextKickAt === null) nextKickAt = now + 3000 + Math.random() * 4000;
    if (now >= nextKickAt) {
      launchCometKick(flock, now);
      nextKickAt = now + KICK_GAP_MIN_MS + Math.random() * KICK_GAP_SPREAD_MS;
    }

    for (const member of flock) {
      let ax = 0;
      let ay = 0;

      // (owner amendment 10) the black-hole center: a body inside the
      // chaos ellipse plays its card — accelerate or brake along its own
      // trajectory (±15° at most, never a reversal), swelling and fading
      // on a sine envelope, harder the closer it flies to the center.
      updateOverBox(member, rect);
      const zs = zoneStrength(member, rect);
      const inZone = zs > 0;
      if (inZone && !member.inZone) rollZoneEffect(member, now);
      member.inZone = inZone;
      if (inZone) {
        const speed = Math.hypot(member.vel.x, member.vel.y);
        if (speed > 1) {
          const env = Math.sin(
            Math.PI * Math.min(1, (now - member.zoneRolledAt) / ZONE_EFFECT_MS),
          );
          let mag = member.zoneMag * env * zs;
          // a brake fades as the body slows — it can never flip one into
          // reverse ("don't change their direction like in reverse")
          if (member.zoneSign < 0) mag = Math.min(mag, speed * 1.5);
          const dirX = member.vel.x / speed;
          const dirY = member.vel.y / speed;
          const cosA = Math.cos(member.zoneAngle);
          const sinA = Math.sin(member.zoneAngle);
          ax += (dirX * cosA - dirY * sinA) * mag * member.zoneSign;
          ay += (dirX * sinA + dirY * cosA) * mag * member.zoneSign;
        }
      }

      // An active comet kick: a swelling, fading burst (same sine
      // envelope as the zone cards) — never a step, never a teleport.
      if (member.kick) {
        if (now >= member.kick.until) {
          member.kick = null;
        } else {
          const kEnv = Math.sin(
            (Math.PI * (now - member.kick.start)) / KICK_DURATION_MS,
          );
          ax += member.kick.ax * kEnv;
          ay += member.kick.ay * kEnv;
        }
      }

      // (a) Pairwise gravitational attraction — the 3-body system itself.
      // (amendment 11) FULL STRENGTH all the way to the separation floor
      // — the owner wants the true chaotic three-body figure, and its
      // curlicues are drawn by close passes. The old close-range fade
      // made the trio settle into a static triangle (drag bled the
      // orbital momentum, the fade zeroed the pull at the floor —
      // equilibrium). Now the constraint alone guards the distance while
      // gravity keeps whipping bodies around each other at the floor:
      // a blocked approach becomes a tight loop, never a resting place.
      for (const other of flock) {
        if (other === member) continue;
        const dx = other.pos.x - member.pos.x;
        const dy = other.pos.y - member.pos.y;
        const distSq = Math.max(dx * dx + dy * dy, SOFTENING * SOFTENING);
        const dist = Math.sqrt(distSq);
        const accel = (GRAVITY_G * other.mass) / distSq;
        ax += (accel * dx) / dist;
        ay += (accel * dy) / dist;
      }

      // (b) Counter anchor, decentralized — see ANCHOR_K above.
      const anchor = anchorPositionPx(center, minWH, now, member.anchorOrbit);
      ax += ANCHOR_K * (anchor.x - member.pos.x);
      ay += ANCHOR_K * (anchor.y - member.pos.y);

      // (8) Soft bounds steer — only felt past the [0.03,0.97] margin,
      // never a teleport.
      const minX = BOUNDS_MARGIN_FRAC * w;
      const maxX = (1 - BOUNDS_MARGIN_FRAC) * w;
      const minY = BOUNDS_MARGIN_FRAC * h;
      const maxY = (1 - BOUNDS_MARGIN_FRAC) * h;
      if (member.pos.x < minX) ax += BOUNDS_ACCEL * (minX - member.pos.x);
      else if (member.pos.x > maxX) ax -= BOUNDS_ACCEL * (member.pos.x - maxX);
      if (member.pos.y < minY) ay += BOUNDS_ACCEL * (minY - member.pos.y);
      else if (member.pos.y > maxY) ay -= BOUNDS_ACCEL * (member.pos.y - maxY);

      // (c) Drag, then the mass-scaled speed clamp.
      member.vel.x = (member.vel.x + ax * dt) * (1 - DRAG * dt);
      member.vel.y = (member.vel.y + ay * dt) * (1 - DRAG * dt);
      const maxSpeed =
        (MAX_SPEED_BASE / Math.sqrt(member.mass)) *
        (member.inZone && member.zoneSign > 0 ? ZONE_CEILING : 1);
      const speed = Math.hypot(member.vel.x, member.vel.y);
      if (speed > maxSpeed) {
        member.vel.x *= maxSpeed / speed;
        member.vel.y *= maxSpeed / speed;
      }

      // Symplectic Euler: position advances from the velocity just solved.
      member.pos.x += member.vel.x * dt;
      member.pos.y += member.vel.y * dt;

      // Hard escape clamp — a safety net past the soft steer above; should
      // rarely fire. No reflect, just clamp + zero the outward component.
      const hardMinX = -HARD_ESCAPE_MARGIN_FRAC * w;
      const hardMaxX = (1 + HARD_ESCAPE_MARGIN_FRAC) * w;
      const hardMinY = -HARD_ESCAPE_MARGIN_FRAC * h;
      const hardMaxY = (1 + HARD_ESCAPE_MARGIN_FRAC) * h;
      if (member.pos.x < hardMinX) {
        member.pos.x = hardMinX;
        if (member.vel.x < 0) member.vel.x = 0;
      } else if (member.pos.x > hardMaxX) {
        member.pos.x = hardMaxX;
        if (member.vel.x > 0) member.vel.x = 0;
      }
      if (member.pos.y < hardMinY) {
        member.pos.y = hardMinY;
        if (member.vel.y < 0) member.vel.y = 0;
      } else if (member.pos.y > hardMaxY) {
        member.pos.y = hardMaxY;
        if (member.vel.y > 0) member.vel.y = 0;
      }

      // Ink the trajectory: a new trail point whenever the body has
      // actually moved (distance-gated so a slow body doesn't waste its
      // history on near-duplicate points).
      const lastPoint = member.trail[member.trail.length - 1];
      if (
        !lastPoint ||
        Math.hypot(
          member.pos.x - lastPoint.x * w,
          member.pos.y - lastPoint.y * h,
        ) > TRAIL_MIN_STEP_PX
      ) {
        member.trail.push({ x: member.pos.x / w, y: member.pos.y / h });
        if (member.trail.length > TRAIL_MAX_POINTS) member.trail.shift();
      }
    }

    enforceMinSeparation(flock);

    // The every-second bend (owner amendment 8): while ANY body is over
    // the counter, the display takes one signed gentle delta per second —
    // the single onCollide call site of this module. Leaving the box
    // re-arms an immediate fire on the next entry. The same any-over
    // state drives onHover, edge-triggered (owner: the counter wears its
    // hover look for exactly as long as a body is over it).
    const overCount = flock.reduce((n, m) => n + (m.overBox ? 1 : 0), 0);
    const anyOver = overCount > 0;
    if (anyOver !== lastAnyOver) {
      lastAnyOver = anyOver;
      onHover?.(anyOver);
    }
    if (anyOver) {
      // (owner) the cadence stacks with the traffic: one body over bends
      // the display every second, two every half second, all three at
      // 10ms — a frame-rate machine gun. The elastic tick re-normalizes
      // after every bend, so the real deadline never moves an inch.
      const period =
        overCount >= 3
          ? OVER_DELTA_STACKED_MS
          : overCount === 2
            ? OVER_DELTA_PAIR_MS
            : OVER_DELTA_PERIOD_MS;
      if (now - overDeltaAt >= period) {
        onCollide?.();
        overDeltaAt = now;
        // (amendment 10) every counter change re-deals the chaos cards
        // for every body still inside the black-hole center.
        for (const m of flock) {
          if (m.inZone) rollZoneEffect(m, now);
        }
      }
    } else {
      overDeltaAt = -Infinity;
    }
  }

  function drawFlock() {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    flock.forEach((member) => {
      const [C1, C2] = member.pair;
      const px = member.pos.x;
      const py = member.pos.y;
      // Each body's own radius — the trail + glow + disk all scale with it
      // (owner: "their glow circles should reflect this").
      const r = member.radius;
      drawTrail(ctx, member.trail, {
        widthPx: w,
        heightPx: h,
        r,
        pair: [C1, C2],
      });
      const glow = ctx.createRadialGradient(px, py, r * 0.3, px, py, r * 1.35);
      glow.addColorStop(0, `rgb(${C1[0]} ${C1[1]} ${C1[2]} / 0.05)`);
      glow.addColorStop(0.8, `rgb(${C2[0]} ${C2[1]} ${C2[2]} / 0.1)`);
      glow.addColorStop(1, "rgb(0 0 0 / 0)");
      ctx.beginPath();
      ctx.arc(px, py, r * 1.35, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      const diskR = Math.max(2, r * 0.3);
      const disk = ctx.createRadialGradient(px, py, 0, px, py, diskR);
      disk.addColorStop(0, `rgb(${C1[0]} ${C1[1]} ${C1[2]} / 0.85)`);
      disk.addColorStop(1, `rgb(${C2[0]} ${C2[1]} ${C2[2]} / 0.25)`);
      ctx.beginPath();
      ctx.arc(px, py, diskR, 0, Math.PI * 2);
      ctx.fillStyle = disk;
      ctx.fill();
    });
    ctx.restore();
  }

  function renderFrame() {
    const now = performance.now();
    if (!reduced.matches) wander(now);
    ctx.clearRect(0, 0, w, h);
    drawSky(ctx, w, h, phase);
    drawFlock();
  }

  function start() {
    if (running) return;
    if (reduced.matches) return renderFrame();
    running = true;
    last = null;
    const tick = (now) => {
      if (!running) return;
      raf = requestAnimationFrame(tick);
      if (last === null) last = now;
      const elapsed = now - last;
      last = now;
      phase += 0.047 * (elapsed / 16);
      renderFrame();
    };
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  const controller = new AbortController();
  const { signal } = controller;
  window.addEventListener("resize", resize, { signal, passive: true });
  document.addEventListener(
    "visibilitychange",
    () => (document.hidden ? stop() : start()),
    { signal },
  );
  reduced.addEventListener?.("change", () => {
    stop();
    reduced.matches ? renderFrame() : start();
  });

  resize();
  start();

  return {
    destroy() {
      controller.abort();
      stop();
    },
  };
}
