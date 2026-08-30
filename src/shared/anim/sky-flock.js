function circleRectCollision(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
  let dx = cx - closestX;
  let dy = cy - closestY;
  const dist = Math.hypot(dx, dy);

  if (dist === 0) {
    const left = cx - rect.x;
    const right = rect.x + rect.width - cx;
    const top = cy - rect.y;
    const bottom = rect.y + rect.height - cy;
    const nearest = Math.min(left, right, top, bottom);
    if (nearest === left) return { nx: -1, ny: 0, penetration: r + nearest };
    if (nearest === right) return { nx: 1, ny: 0, penetration: r + nearest };
    if (nearest === top) return { nx: 0, ny: -1, penetration: r + nearest };
    return { nx: 0, ny: 1, penetration: r + nearest };
  }

  if (dist >= r) return null;
  return { nx: dx / dist, ny: dy / dist, penetration: r - dist };
}

const CELL = 22;
const DENSITY = 80;
const LAYERS = [
  { speed: 3, salt: 0 },
  { speed: 8, salt: 3691 },
];
const TINTS = [
  { r: 0xd8, g: 0xd8, b: 0xe8 },
  { r: 0x9d, g: 0xb8, b: 0xff },
  { r: 0xff, g: 0xe9, b: 0xa3 },
  { r: 0xbb, g: 0x9a, b: 0xf7 },
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

const BUTTERFLY_RADIUS = 13;

function massFor(scale) {
  return scale * scale;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

const DT_MAX_MS = 50;

const GRAVITY_G = 4.5e6;

const SOFTENING = 60;

const ANCHOR_K = 0.045;
const ANCHOR_R_FRAC = 0.34;
const ANCHOR_PERIOD_S = 30;
const ANCHOR_OMEGA = (2 * Math.PI) / ANCHOR_PERIOD_S;

const DRAG = 0.03;
const MAX_SPEED_BASE = 320;

const BOUNDS_MARGIN_FRAC = 0.03;
const BOUNDS_ACCEL = 0.6;
const HARD_ESCAPE_MARGIN_FRAC = 0.1;

const INIT_RADIUS_MIN_FRAC = 0.2;
const INIT_RADIUS_MAX_FRAC = 0.3;

function newFlockMember(body, anchorOrbit) {
  return {
    pair: body.pair,
    scale: body.scale,
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

function anchorCenterPx(rect, w, h) {
  if (rect && w > 0 && h > 0) {
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  }
  return { x: w / 2, y: h / 2 };
}

function rollAnchorOrbit(phase) {
  return {
    phase,
    wobblePhase: Math.random() * Math.PI * 2,
    dir: Math.random() < 0.5 ? 1 : -1,
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

    const orbitalSpeed = r * Math.sqrt(ANCHOR_K);
    const speed = orbitalSpeed * (0.75 + Math.random() * 0.5);
    member.vel = { x: tangent.x * speed, y: tangent.y * speed };
  });
}

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

const ZONE_ACCEL_MIN = 180;
const ZONE_ACCEL_MAX = 520;
const ZONE_EFFECT_MS = 1000;
const ZONE_CONE = Math.PI / 12;

const ZONE_CEILING = 1.9;

function zoneStrength(member, rect) {
  if (!rect) return 0;
  const a = rect.width / 4;
  const b = rect.height / 4;
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

      const deficit = minSep - dist;
      a.pos.x -= nx * deficit * (b.mass / totalMass);
      a.pos.y -= ny * deficit * (b.mass / totalMass);
      b.pos.x += nx * deficit * (a.mass / totalMass);
      b.pos.y += ny * deficit * (a.mass / totalMass);

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

export function initSkyFlock(
  canvas,
  { obstacle = null, onCollide = null, onHover = null } = {},
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

  function wander(now) {
    if (lastPhysicsNow === null) lastPhysicsNow = now;
    const dt = clamp(now - lastPhysicsNow, 0, DT_MAX_MS) / 1000;
    lastPhysicsNow = now;
    if (!(dt > 0) || !(w > 0 && h > 0)) return;

    const rect = typeof obstacle === "function" ? obstacle() : null;
    const center = anchorCenterPx(rect, w, h);
    const minWH = Math.min(w, h);

    if (nextKickAt === null) nextKickAt = now + 3000 + Math.random() * 4000;
    if (now >= nextKickAt) {
      launchCometKick(flock, now);
      nextKickAt = now + KICK_GAP_MIN_MS + Math.random() * KICK_GAP_SPREAD_MS;
    }

    for (const member of flock) {
      let ax = 0;
      let ay = 0;

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

          if (member.zoneSign < 0) mag = Math.min(mag, speed * 1.5);
          const dirX = member.vel.x / speed;
          const dirY = member.vel.y / speed;
          const cosA = Math.cos(member.zoneAngle);
          const sinA = Math.sin(member.zoneAngle);
          ax += (dirX * cosA - dirY * sinA) * mag * member.zoneSign;
          ay += (dirX * sinA + dirY * cosA) * mag * member.zoneSign;
        }
      }

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

      const anchor = anchorPositionPx(center, minWH, now, member.anchorOrbit);
      ax += ANCHOR_K * (anchor.x - member.pos.x);
      ay += ANCHOR_K * (anchor.y - member.pos.y);

      const minX = BOUNDS_MARGIN_FRAC * w;
      const maxX = (1 - BOUNDS_MARGIN_FRAC) * w;
      const minY = BOUNDS_MARGIN_FRAC * h;
      const maxY = (1 - BOUNDS_MARGIN_FRAC) * h;
      if (member.pos.x < minX) ax += BOUNDS_ACCEL * (minX - member.pos.x);
      else if (member.pos.x > maxX) ax -= BOUNDS_ACCEL * (member.pos.x - maxX);
      if (member.pos.y < minY) ay += BOUNDS_ACCEL * (minY - member.pos.y);
      else if (member.pos.y > maxY) ay -= BOUNDS_ACCEL * (member.pos.y - maxY);

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

      member.pos.x += member.vel.x * dt;
      member.pos.y += member.vel.y * dt;

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

    const overCount = flock.reduce((n, m) => n + (m.overBox ? 1 : 0), 0);
    const anyOver = overCount > 0;
    if (anyOver !== lastAnyOver) {
      lastAnyOver = anyOver;
      onHover?.(anyOver);
    }
    if (anyOver) {

      const period =
        overCount >= 3
          ? OVER_DELTA_STACKED_MS
          : overCount === 2
            ? OVER_DELTA_PAIR_MS
            : OVER_DELTA_PERIOD_MS;
      if (now - overDeltaAt >= period) {
        onCollide?.();
        overDeltaAt = now;

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
