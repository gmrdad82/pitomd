// fx-webgl.js — the lazy-managed WebGL fx engine for [data-cursor="…"]
// sections whose mood is a GPU renderer. Since the 5.0.0 fx cull the mood is
// STAMPED IN THE MARKUP (a stable key per section, index.astro) — there is no
// runtime randomiser any more; variation derives from the section's identity,
// never from a draw at render.
//
// Two cursor-reactive WebGL2 backgrounds live here, one per RENDERERS key:
//   water      — height-field ripple sim, refracts the section's cover image
//                (ported from water.js verbatim; water.js itself is retired —
//                this file is its only remaining caller path).
//   plasma     — domain-warped fbm noise, warp pulled toward the cursor
//                (tmp/fx2-plasma.html, verbatim). NOT used by the index —
//                kept because /studio's fx contract is plasma / following
//                circle / duotone.
// The 5.0.0 cull deleted fluid, metaballs, halftone and lens outright.
//
// Every renderer is a factory `RENDERERS[key](gl, canvas, section)` that
// returns `{ frame(nowMs, mouse), resize(), destroy() }`. Only the GLSL is
// reused verbatim from the sources above; the JS wiring (uniform feed, image
// load, canvas sizing) is rebuilt here to share one clock, one pointer and
// one lazy create/destroy manager instead of each demo's own listeners.
//
// LAZY MANAGER (the perf discipline): a WebGL2 context is real GPU memory —
// only sections within `rootMargin: "400px 0px 400px 0px"` of the viewport
// get one, via IntersectionObserver. Scroll a section out and its context is
// explicitly lost (WEBGL_lose_context) and its canvas removed; scroll it back
// and a fresh instance is built. In practice that caps the page at roughly
// the ~2 sections that can be near-viewport at once, however many sections
// the page has. One shared requestAnimationFrame loop drives every live
// instance from one clock and one pointer position; there is no per-instance
// rAF, timer or listener.
//
// Degrade chain: prefers-reduced-motion or no WebGL2 → the whole engine
// no-ops (the static .cover-bed keeps covering everything). Per-section:
// water needs EXT_color_buffer_float for its float FBOs — missing it, that
// section is skipped (static cover stays); water also needs a .cover-bed —
// missing it, that section is skipped too (the markup only stamps water on
// cover-bearing sections, but the manager guards it regardless).

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Backgrounds don't need retina — DPR 1.0 renders every fx at CSS-pixel
// resolution, which on a hi-DPI display cuts the fragment count 2–4× vs a
// device-pixel canvas. The single biggest fx perf lever after the shared-rAF
// fps cap below.
const DPR_CAP = 1.0;

// Cap the fx target frame rate. Ambient GPU backgrounds read as smooth well
// below display refresh; 30fps roughly halves per-second GPU/CPU cost vs a
// 60Hz panel (and 4× vs 120Hz) with no perceptible change to the drift or the
// cursor trail. Bump toward 60 if a machine has headroom to spare.
const FX_FPS = 30;

// Hard ceiling on either canvas dimension (device px). Normal sections are one
// viewport tall so they never approach this; it's insurance against a section
// (e.g. a multi-viewport `.scrolly`) ever sizing a canvas past the GPU's max
// texture size, which renders blank and destroys the frame budget.
const CANVAS_MAX = 2600;

/* ── shared GL boilerplate ─────────────────────────────────────
   Identical setup across all six demos (compile/link/fullscreen-triangle);
   factored here once so every renderer below is just its shader source +
   its own uniform feed. */

function compileShader(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) || "shader compile failed";
    gl.deleteShader(sh);
    throw new Error(log);
  }
  return sh;
}

function linkProgram(gl, vertSrc, fragSrc) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl, gl.VERTEX_SHADER, vertSrc));
  gl.attachShader(prog, compileShader(gl, gl.FRAGMENT_SHADER, fragSrc));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(prog) || "program link failed";
    gl.deleteProgram(prog);
    throw new Error(log);
  }
  return prog;
}

// one fullscreen-triangle buffer, its "p" attribute bound on every program
// that shares it — mirrors water.js and all five tmp/ demos.
function bindFullscreenTriangle(gl, programs) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW,
  );
  for (const prog of programs) {
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  }
  return vao;
}

function uniformLocations(gl, prog, names) {
  const u = {};
  for (const name of names) u[name] = gl.getUniformLocation(prog, name);
  return u;
}

// resize the display canvas to the section's current box, DPR-capped.
function syncCanvasSize(canvas, section) {
  const rect = section.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  canvas.width = Math.max(
    1,
    Math.min(CANVAS_MAX, Math.round(rect.width * dpr)),
  );
  canvas.height = Math.max(
    1,
    Math.min(CANVAS_MAX, Math.round(rect.height * dpr)),
  );
}

// the shared pointer, in every shader's own convention: a 0..1 fraction of
// the section's box, y-up (so `uv * canvas.{width,height}` lands exactly on
// gl_FragCoord for the demos that compare against it directly). Returns null
// when the pointer isn't over this section's box (or isn't on the page).
function localMouseUv(section, mouse) {
  if (!mouse) return null;
  const rect = sectionRects.get(section);
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  return [
    (mouse.x - rect.left) / rect.width,
    1 - (mouse.y - rect.top) / rect.height,
  ];
}

// Live sections' rects, cached: frame() runs inside the shared rAF while
// pointer.js is writing styles in ITS rAF, so a getBoundingClientRect here
// forced a full reflow every frame the cursor moved (the "water lags on
// mouse move" jank). Rects only change on scroll/resize — measure there
// (rAF-batched, same pattern as pointer.js) and let frame() read the cache.
const sectionRects = new Map();
function measureSectionRect(section) {
  sectionRects.set(section, section.getBoundingClientRect());
}
let remeasureQueued = false;
function queueRemeasure() {
  if (remeasureQueued || sectionRects.size === 0) return;
  remeasureQueued = true;
  requestAnimationFrame(() => {
    remeasureQueued = false;
    for (const section of sectionRects.keys()) measureSectionRect(section);
  });
}
window.addEventListener("scroll", queueRemeasure, { passive: true });
window.addEventListener("resize", queueRemeasure, { passive: true });

/* ── shared cover-image helpers (water) ────────────────────────
   coverPath ported verbatim from water.js; the texture upload is the same
   flip-Y + linear + clamp setup water.js and the fx4/fx5 demos each did
   inline. */

function coverPath(section) {
  const coverBed = section.querySelector(".cover-bed");
  if (!coverBed) return null;
  const raw = getComputedStyle(coverBed).getPropertyValue("--cover");
  const match = raw && raw.match(/url\((['"]?)(.*?)\1\)/);
  return match ? match[2] : null;
}

function uploadCoverTexture(gl, img) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/* ══ water — height-field ripple sim over the cover (water.js, verbatim) ══ */

const WATER_VERT = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const WATER_SIM_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_prev;
uniform vec2 u_texel;
uniform vec4 u_drop;   /* x,y = uv; z = radius (uv); w = strength */
in vec2 uv; out vec4 o;
void main(){
  vec2 h = texture(u_prev, uv).rg;   /* r = height, g = previous height */
  float sum =
    texture(u_prev, uv + vec2( u_texel.x, 0.0)).r +
    texture(u_prev, uv - vec2( u_texel.x, 0.0)).r +
    texture(u_prev, uv + vec2(0.0,  u_texel.y)).r +
    texture(u_prev, uv - vec2(0.0,  u_texel.y)).r;
  /* damping 0.985 -> 0.96 -> 0.94 (owner-tuned twice): waves die fast, the
     field settles quickly — which also lets the idle freeze in water()'s
     frame() kick in sooner */
  float next = (sum * 0.5 - h.g) * 0.94;
  if (u_drop.w != 0.0) {
    float d = distance(uv, u_drop.xy);
    next += u_drop.w * exp(-d * d / (u_drop.z * u_drop.z));
  }
  o = vec4(next, h.r, 0.0, 1.0);
}`;

const WATER_DRAW_FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_height;
uniform sampler2D u_image;
uniform vec2 u_texel;
uniform vec2 u_cover;  /* cover-fit scale for the image */
in vec2 uv; out vec4 o;
void main(){
  float hx = texture(u_height, uv + vec2(u_texel.x, 0.0)).r -
             texture(u_height, uv - vec2(u_texel.x, 0.0)).r;
  float hy = texture(u_height, uv + vec2(0.0, u_texel.y)).r -
             texture(u_height, uv - vec2(0.0, u_texel.y)).r;
  vec2 refr = vec2(hx, hy) * 0.06;
  vec2 iuv = (uv - 0.5) * u_cover + 0.5 + refr;
  vec3 col = texture(u_image, iuv).rgb;
  float spec = pow(clamp(1.0 - abs(hx * 14.0 + hy * 10.0), 0.0, 1.0), 24.0);
  col += (hx + hy) * 1.4 + spec * 0.05;
  o = vec4(col, 1.0);
}`;

function water(gl, canvas, section) {
  const SIM_MAX = 128; // sim grid resolution (256 → 192 → 160 → 128, owner-tuned for perf; bilinear draw smooths the coarser grid)

  const simProg = linkProgram(gl, WATER_VERT, WATER_SIM_FRAG);
  const drawProg = linkProgram(gl, WATER_VERT, WATER_DRAW_FRAG);
  const vao = bindFullscreenTriangle(gl, [simProg, drawProg]);

  const u = {
    simPrev: gl.getUniformLocation(simProg, "u_prev"),
    simTexel: gl.getUniformLocation(simProg, "u_texel"),
    simDrop: gl.getUniformLocation(simProg, "u_drop"),
    drawHeight: gl.getUniformLocation(drawProg, "u_height"),
    drawImage: gl.getUniformLocation(drawProg, "u_image"),
    drawTexel: gl.getUniformLocation(drawProg, "u_texel"),
    drawCover: gl.getUniformLocation(drawProg, "u_cover"),
  };

  function makeSimTex(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RG16F,
      w,
      h,
      0,
      gl.RG,
      gl.HALF_FLOAT,
      null,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tex;
  }
  function makeFbo(tex) {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      tex,
      0,
    );
    return fb;
  }

  const rect0 = section.getBoundingClientRect();
  const aspect0 = rect0.height > 0 ? rect0.width / rect0.height : 1;
  let simW, simH;
  if (aspect0 >= 1) {
    simW = SIM_MAX;
    simH = Math.max(32, Math.round(SIM_MAX / aspect0));
  } else {
    simH = SIM_MAX;
    simW = Math.max(32, Math.round(SIM_MAX * aspect0));
  }

  let texA = makeSimTex(simW, simH);
  let texB = makeSimTex(simW, simH);
  let fbA = makeFbo(texA);
  let fbB = makeFbo(texB);

  syncCanvasSize(canvas, section);

  let destroyed = false;
  let ready = false;
  let imageTex = null;
  const img = new Image();
  const path = coverPath(section);
  if (path) {
    img.addEventListener(
      "load",
      () => {
        if (destroyed) return;
        imageTex = uploadCoverTexture(gl, img);
        ready = true;
      },
      { once: true },
    );
    img.src = path;
  }

  // continuous cursor wake only — a drop is injected only while the pointer
  // is actually moving over the section, never on idle frames (mirrors
  // water.js's "no ambient rain, no seed ripple" rule, adapted from
  // event-driven pointermove to position-diffing since frame() is sampled
  // once per shared rAF tick rather than per pointer event).
  const drop = { x: 0, y: 0, r: 0.012, s: 0 };
  const DROP_MIN_MS = 66; // splat cap ~15/s — a fast sweep pumped 30/s ("too much water")
  const SETTLE_MS = 2000; // at 0.94 damping the field is visually flat well before this
  let lastUv = null;
  let lastStep = 0;
  let lastDropAt = null; // null = just created/resized: run until the first settle

  function coverScale() {
    const iw = img.naturalWidth || 1920;
    const ih = img.naturalHeight || 1080;
    const scale = Math.max(canvas.width / iw, canvas.height / ih);
    return [canvas.width / (iw * scale), canvas.height / (ih * scale)];
  }

  function frame(now, mouse) {
    if (destroyed || !ready) return;

    const uv = localMouseUv(section, mouse);
    if (uv && uv[0] >= 0 && uv[0] <= 1 && uv[1] >= 0 && uv[1] <= 1) {
      // lastUv only advances when a splat fires, so a slow drag accumulates
      // distance toward the threshold instead of slipping under it each frame
      if (
        lastUv &&
        (Math.abs(uv[0] - lastUv[0]) > 0.003 ||
          Math.abs(uv[1] - lastUv[1]) > 0.003) &&
        (lastDropAt === null || now - lastDropAt > DROP_MIN_MS)
      ) {
        drop.x = uv[0];
        drop.y = uv[1];
        drop.s = 0.22;
        lastUv = uv;
        lastDropAt = now;
      } else if (!lastUv) {
        lastUv = uv;
      }
    } else {
      lastUv = null;
    }

    // cap sim steps at ~60fps of sim work even on 120Hz+ displays
    if (now - lastStep < 15) return;
    // Idle freeze — the fixed-cost fix ("slow even when the mouse is still"):
    // once no new energy has arrived for SETTLE_MS the field is flat, so skip
    // sim+draw entirely (the canvas keeps its last presented frame) until the
    // next splat or a resize wakes it. Settled water costs zero GPU.
    if (lastDropAt === null) lastDropAt = now;
    else if (now - lastDropAt > SETTLE_MS) return;
    lastStep = now;

    gl.bindVertexArray(vao);

    gl.useProgram(simProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbB);
    gl.viewport(0, 0, simW, simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(u.simPrev, 0);
    gl.uniform2f(u.simTexel, 1 / simW, 1 / simH);
    gl.uniform4f(u.simDrop, drop.x, drop.y, drop.r, drop.s);
    drop.s = 0;
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    [texA, texB] = [texB, texA];
    [fbA, fbB] = [fbB, fbA];

    gl.useProgram(drawProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.uniform1i(u.drawHeight, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, imageTex);
    gl.uniform1i(u.drawImage, 1);
    gl.uniform2f(u.drawTexel, 1 / simW, 1 / simH);
    const [cx, cy] = coverScale();
    gl.uniform2f(u.drawCover, cx, cy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    syncCanvasSize(canvas, section);
    // resizing clears the canvas — wake for one settle cycle to repaint
    lastDropAt = null;
  }

  function destroy() {
    destroyed = true;
  }

  return { frame, resize, destroy };
}

/* ══ plasma — domain-warped fbm (tmp/fx2-plasma.html, verbatim) ══ */

const PLASMA_VERT = `#version 300 es
in vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const PLASMA_FRAG = `#version 300 es
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

out vec4 outColor;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Octave count per fbm call — was 5. Perf budget (owner: halve plasma's
// per-pixel cost): main() below issues 3 fbm calls/pixel (was 5 — the old
// "r" re-warp pair collapsed into reusing q, see below), so
// 3 calls * OCTAVES(4) = 12 octave-units/pixel (was 5 calls * 5 octaves = 25).
const int OCTAVES = 4;

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < OCTAVES; i++) {
    sum += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  float shortSide = min(u_res.x, u_res.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / shortSide;
  vec2 mouseUv = (u_mouse - 0.5 * u_res) / shortSide;

  // domain warp: warp the sample coordinate by a second fbm field
  vec2 q = vec2(
    fbm(uv + u_time * 0.05),
    fbm(uv + vec2(1.7, 9.2) + u_time * 0.04)
  );
  vec2 warped = uv + q * 0.6;

  // pull the warp toward the cursor with a soft falloff
  float dist = length(uv - mouseUv);
  float pull = exp(-dist * 2.2);
  warped = mix(warped, mouseUv, pull * 0.5);

  // re-warp: reuse q instead of a second fbm-pair "r" field (previously 2
  // more fbm calls: r.x/r.y from warped, phase +/-4.0, at 0.03 * u_time) —
  // folds the same warp field back in, still reads as a domain-warped
  // re-warp for 2 fewer fbm calls per pixel.
  float n = fbm(warped * 1.2 + q * 1.4);

  vec3 dark = vec3(0.02, 0.02, 0.04);
  vec3 blue = vec3(0.318, 0.439, 1.0);
  vec3 purple = vec3(0.541, 0.424, 1.0);

  vec3 col = mix(dark, blue, smoothstep(0.15, 0.65, n));
  col = mix(col, purple, smoothstep(0.55, 0.95, n));

  float core = smoothstep(0.82, 1.05, n) + pull * 0.35;
  col += core * vec3(0.75, 0.8, 1.0) * 0.6;

  outColor = vec4(col, 1.0);
}`;

function plasma(gl, canvas, section) {
  const prog = linkProgram(gl, PLASMA_VERT, PLASMA_FRAG);
  const vao = bindFullscreenTriangle(gl, [prog]);
  const u = uniformLocations(gl, prog, ["u_res", "u_time", "u_mouse"]);

  syncCanvasSize(canvas, section);
  gl.viewport(0, 0, canvas.width, canvas.height);

  let destroyed = false;
  let t0 = null;
  let lastUv = [0.5, 0.5];

  function frame(now, mouse) {
    if (destroyed) return;
    if (t0 === null) t0 = now;
    const elapsed = (now - t0) / 1000;
    const uv = localMouseUv(section, mouse);
    if (uv) lastUv = uv;

    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform2f(u.u_res, canvas.width, canvas.height);
    gl.uniform1f(u.u_time, elapsed);
    gl.uniform2f(
      u.u_mouse,
      lastUv[0] * canvas.width,
      lastUv[1] * canvas.height,
    );
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    syncCanvasSize(canvas, section);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function destroy() {
    destroyed = true;
  }

  return { frame, resize, destroy };
}

/* ══ duotone — dual-tone dot grid of the cover (/studio only) ══
   "duotone" is the owner's name for the dual-tone halftone dot grid: the
   halftone renderer this file used to ship, carrying the owner-tuned
   purple→pito-blue diagonal (the same effect pito's now-retired fx registry
   shipped as `duotone`, ported FROM here in the first place). The 5.0.0 cull
   removed halftone from the index; the effect returns under the owner's own
   name because /studio's fx contract (H3) is plasma / following circle /
   duotone. Only /studio's author-pinned data-cursor="duotone" sections
   reach it — the index markup never stamps this key. */

const DUOTONE_VERT = `#version 300 es
in vec2 p;
void main() {
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const DUOTONE_FRAG = `#version 300 es
precision highp float;

uniform sampler2D u_image;
uniform vec2 u_res;
uniform vec2 u_imgSize;
uniform vec2 u_mouse;
uniform float u_time;

out vec4 outColor;

void main() {
  float dist = distance(gl_FragCoord.xy, u_mouse);
  float t = 1.0 - smoothstep(0.0, 220.0, dist);
  float cellSize = mix(15.0, 5.0, t);

  vec2 cell = floor(gl_FragCoord.xy / cellSize);
  vec2 cellCenter = (cell + 0.5) * cellSize;

  float scale = max(u_res.x / u_imgSize.x, u_res.y / u_imgSize.y);
  vec2 dispSize = u_imgSize * scale;
  vec2 offset = (u_res - dispSize) * 0.5;
  vec2 uv = clamp((cellCenter - offset) / dispSize, 0.0, 1.0);

  vec3 texel = texture(u_image, uv).rgb;
  float lum = dot(texel, vec3(0.299, 0.587, 0.114));

  vec2 local = (gl_FragCoord.xy - cell * cellSize) / cellSize - 0.5;
  float r = length(local);
  float dotRadius = clamp(lum, 0.0, 1.0) * 0.44 + 0.03 * t;
  float mask = 1.0 - smoothstep(dotRadius - 0.08, dotRadius + 0.08, r);

  vec3 bg = vec3(0.039, 0.039, 0.071);
  /* dual-tone (owner-tuned): purple -> pito-blue across the diagonal instead
     of flat blue, still brightening toward the pointer */
  float g = clamp(
    (gl_FragCoord.x / u_res.x + gl_FragCoord.y / u_res.y) * 0.5, 0.0, 1.0);
  vec3 purple = vec3(0.545, 0.361, 0.965);
  vec3 blue = vec3(0.318, 0.439, 1.0);
  vec3 tone = mix(purple, blue, g) * mix(0.75, 1.2, t);
  vec3 col = mix(bg, tone, mask);

  outColor = vec4(col, 1.0);
}`;

function duotone(gl, canvas, section) {
  const prog = linkProgram(gl, DUOTONE_VERT, DUOTONE_FRAG);
  const vao = bindFullscreenTriangle(gl, [prog]);
  const u = uniformLocations(gl, prog, [
    "u_image",
    "u_res",
    "u_imgSize",
    "u_mouse",
    "u_time",
  ]);

  syncCanvasSize(canvas, section);
  gl.viewport(0, 0, canvas.width, canvas.height);

  let destroyed = false;
  let ready = false;
  let texture = null;
  let imgSize = [1, 1];

  // guard: renderers that sample a cover need a .cover-bed. The manager
  // checks NEEDS_COVER before ever calling this factory — this is pure
  // defense-in-depth, kept cheap (a no-op frame(), never drawing).
  const path = coverPath(section);
  if (path) {
    const img = new Image();
    img.addEventListener(
      "load",
      () => {
        if (destroyed) return;
        texture = uploadCoverTexture(gl, img);
        imgSize = [img.naturalWidth || 1, img.naturalHeight || 1];
        ready = true;
      },
      { once: true },
    );
    img.src = path;
  }

  let t0 = null;
  let lastUv = [0.5, 0.5];

  function frame(now, mouse) {
    if (destroyed || !ready) return;
    if (t0 === null) t0 = now;
    const elapsed = (now - t0) / 1000;
    const uv = localMouseUv(section, mouse);
    if (uv) lastUv = uv;

    gl.useProgram(prog);
    gl.bindVertexArray(vao);
    gl.uniform2f(u.u_res, canvas.width, canvas.height);
    gl.uniform1f(u.u_time, elapsed);
    gl.uniform2f(
      u.u_mouse,
      lastUv[0] * canvas.width,
      lastUv[1] * canvas.height,
    );
    gl.uniform2f(u.u_imgSize, imgSize[0], imgSize[1]);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(u.u_image, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function resize() {
    syncCanvasSize(canvas, section);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function destroy() {
    destroyed = true;
  }

  return { frame, resize, destroy };
}

/* ── the registry ───────────────────────────────────────────────
   The 5.0.0 fx cull (owner ruling): the index keeps exactly three fx —
   WATER (this engine), the FOLLOWING CIRCLE (the cursor ring, cursor.js)
   and CIRCLE RIPPLES (the ripple mood, cursor.js). fluid, metaballs,
   halftone and lens are deleted. PLASMA's and DUOTONE's renderers survive
   here because /studio's fx contract is plasma / following circle / duotone
   — the index markup never assigns them, only /studio's author-pinned
   sections do. */

const RENDERERS = { water, plasma, duotone };

// image-sampling renderers need a .cover-bed on the section; float-FBO
// renderers need EXT_color_buffer_float. Both are checked by the manager
// BEFORE a factory ever runs, so a section that can't support its assigned
// mood just never gets an fx instance — its static .cover-bed stays put.
const NEEDS_COVER = new Set(["water", "duotone"]);
const NEEDS_FLOAT = new Set(["water"]);

/* ── lazy manager ───────────────────────────────────────────────
   `active` maps a live section to its { key, gl, canvas, wrapper, instance }
   record. IntersectionObserver (with a generous rootMargin so contexts spin
   up just ahead of scroll, not exactly at the fold) drives create/destroy;
   one shared rAF loop drives every live instance's frame(); one shared
   ResizeObserver drives every live instance's resize(). */

const active = new Map();

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const record = active.get(entry.target);
    if (record) {
      measureSectionRect(entry.target);
      record.instance.resize();
    }
  }
});

function createInstance(section, key) {
  if (active.has(section)) return;
  const factory = RENDERERS[key];
  if (typeof factory !== "function") return;
  if (NEEDS_COVER.has(key) && !coverPath(section)) return;

  const canvas = document.createElement("canvas");
  canvas.className = "fx-canvas__c";
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) return;
  if (NEEDS_FLOAT.has(key) && !gl.getExtension("EXT_color_buffer_float"))
    return;

  let instance;
  try {
    instance = factory(gl, canvas, section);
  } catch (err) {
    console.error(`fx-webgl: "${key}" init failed`, err);
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "fx-canvas";
  wrapper.setAttribute("aria-hidden", "true");
  wrapper.appendChild(canvas);
  section.appendChild(wrapper);
  section.setAttribute("data-fx-active", key);

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    destroyInstance(section);
  });

  active.set(section, { key, gl, canvas, wrapper, instance });
  measureSectionRect(section);
  resizeObserver.observe(section);
  ensureLoop();
}

function destroyInstance(section) {
  const record = active.get(section);
  if (!record) return;
  active.delete(section);
  resizeObserver.unobserve(section);
  try {
    record.instance.destroy();
  } catch (err) {
    console.error(`fx-webgl: "${record.key}" destroy failed`, err);
  }
  record.gl.getExtension("WEBGL_lose_context")?.loseContext();
  record.wrapper.remove();
  sectionRects.delete(section);
  section.removeAttribute("data-fx-active");
}

const proximityObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const section = entry.target;
      const key = section.dataset.cursor;
      if (entry.isIntersecting) createInstance(section, key);
      else destroyInstance(section);
    }
  },
  { rootMargin: "400px 0px 400px 0px" },
);

/* ── one shared clock + one shared pointer ─────────────────────── */

let mouse = null;

// Touch has no cursor, so pointermove never fires and the cursor-reactive
// moods (water's ripples, plasma's warp pull) sit frozen at their
// default — the page feels dead there. On coarse pointers we stand in a
// slow autonomous Lissajous drift for `mouse` instead of real events.
const coarsePointer = !window.matchMedia("(pointer: fine)").matches;

window.addEventListener(
  "pointermove",
  (e) => {
    mouse = { x: e.clientX, y: e.clientY };
  },
  { passive: true },
);

document.addEventListener("pointerleave", () => {
  mouse = null;
});

let rafId = 0;
let lastFrameTs = 0;
const FRAME_INTERVAL = 1000 / FX_FPS;

function tick(now) {
  rafId = 0;
  if (document.hidden || active.size === 0) return;
  // rAF stays vsync-aligned but we only advance the fx at FX_FPS — on a 120Hz
  // panel that's one paint in four, a big GPU saving for an ambient background.
  if (now - lastFrameTs >= FRAME_INTERVAL) {
    lastFrameTs = now;
    if (coarsePointer) {
      // Incommensurate frequencies so the path never visibly repeats; a full
      // sweep takes tens of seconds — ambient drift, not a cursor stand-in.
      mouse = {
        x: innerWidth * (0.5 + 0.35 * Math.sin(now * 0.00013)),
        y: innerHeight * (0.5 + 0.35 * Math.sin(now * 0.00021 + 1.7)),
      };
    }
    for (const [section, record] of active) {
      try {
        record.instance.frame(now, mouse);
      } catch (err) {
        console.error(`fx-webgl: "${record.key}" frame failed`, err);
        destroyInstance(section);
      }
    }
  }
  if (active.size > 0) rafId = requestAnimationFrame(tick);
}

function ensureLoop() {
  if (!rafId && !document.hidden && active.size > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  } else {
    ensureLoop();
  }
});

/* ── bootstrap ──────────────────────────────────────────────────── */

function supportsWebgl2() {
  const probe = document.createElement("canvas");
  return !!probe.getContext("webgl2");
}

function initFxWebgl() {
  if (reduceMotion || !supportsWebgl2()) return;
  const sections = document.querySelectorAll("[data-cursor]");
  for (const section of sections) {
    if (typeof RENDERERS[section.dataset.cursor] === "function") {
      proximityObserver.observe(section);
    }
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initFxWebgl);
} else {
  initFxWebgl();
}
