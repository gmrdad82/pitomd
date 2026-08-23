const canvases = document.querySelectorAll(".fx-aurora");
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_mark;
uniform vec2 u_mark_c;
uniform float u_mark_s;
uniform float u_mark_dim;
out vec4 outColor;

const vec3 FROM_C = vec3(0.059, 0.659, 0.941);
const vec3 TO_C = vec3(0.537, 0.682, 0.957);
const vec3 DEEP = vec3(0.024, 0.043, 0.078);
const vec3 INK_C = vec3(0.925, 0.937, 0.957);

float edge_fade(float y, float h) {
  float margin = h * 0.22;
  float top = clamp(y / margin, 0.0, 1.0);
  float bottom = clamp((h - y) / margin, 0.0, 1.0);
  float near = min(top, bottom);
  return near * near * (3.0 - 2.0 * near);
}

float sd_seg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float t = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * t);
}

float sd_lines(vec2 m) {
  float d = sd_seg(m, vec2(228.0, 298.0), vec2(642.0, 298.0));
  d = min(d, sd_seg(m, vec2(228.0, 448.0), vec2(522.0, 448.0)));
  d = min(d, sd_seg(m, vec2(228.0, 598.0), vec2(382.0, 598.0)));
  return d - 28.0;
}

float sd_check(vec2 m) {
  float d = sd_seg(m, vec2(460.0, 640.0), vec2(600.0, 780.0));
  d = min(d, sd_seg(m, vec2(600.0, 780.0), vec2(840.0, 400.0)));
  return d - 36.0;
}

float check_pulse(vec2 m, float prog) {
  vec2 a = vec2(460.0, 640.0);
  vec2 b = vec2(600.0, 780.0);
  vec2 c = vec2(840.0, 400.0);
  float l1 = length(b - a);
  float l2 = length(c - b);
  float total = l1 + l2;
  float h1 = clamp(dot(m - a, b - a) / dot(b - a, b - a), 0.0, 1.0);
  float h2 = clamp(dot(m - b, c - b) / dot(c - b, c - b), 0.0, 1.0);
  float d1 = length(m - a - (b - a) * h1);
  float d2 = length(m - b - (c - b) * h2);
  float s1 = h1 * l1 / total;
  float s2 = (l1 + h2 * l2) / total;
  float p1 = exp(-16.0 * (s1 - prog) * (s1 - prog));
  float p2 = exp(-16.0 * (s2 - prog) * (s2 - prog));
  float w1 = 1.0 / (d1 + 24.0);
  float w2 = 1.0 / (d2 + 24.0);
  return (p1 * w1 + p2 * w2) / (w1 + w2);
}

void main() {
  float w = max(u_res.x, 1.0);
  float h = max(u_res.y, 1.0);
  float uu = gl_FragCoord.x / w;
  float y = h - gl_FragCoord.y;
  float tau = 6.2831853;
  float t = u_time;
  float p = 18.0;

  vec3 color = vec3(0.0);
  float cover_total = 0.0;

  for (int l = 0; l < 2; l++) {
    float dir = 1.0;
    float ph = 0.0;
    float peak = 0.20;
    float swing = 0.24;
    float girth = 0.28;
    if (l == 1) {
      dir = -1.0;
      ph = 2.9;
      peak = 0.12;
      swing = 0.18;
      girth = 0.22;
    }
    float a = sin(uu * 3.1 + dir * tau * t / p + ph);
    float b = sin(uu * 7.7 - dir * 2.0 * tau * t / p + 1.7 + ph);
    float c = sin(uu * 1.3 + dir * tau * t / p + 4.2 + ph * 1.3);
    float center = h * (0.5 + swing * a + 0.12 * b);
    float thickness = h * (girth + 0.13 * c);
    float spread = (y - center) / max(thickness, 1.0);
    float prof = max(1.0 - spread * spread, 0.0);
    float cover = pow(prof, 1.6) * peak * edge_fade(y, h);
    vec3 tint = mix(FROM_C, TO_C, clamp(uu * 0.8 + 0.1 + 0.1 * a, 0.0, 1.0));
    color += tint * cover * (1.0 - cover_total);
    cover_total += cover * (1.0 - cover_total);
  }

  if (u_mark > 0.5) {
    float S = max(u_mark_s, 1e-4);
    vec2 m = (vec2(gl_FragCoord.x, y) - u_mark_c) / S + vec2(512.0, 512.0);
    float shimmer = 0.6 + 0.4 * clamp(cover_total * 3.5, 0.0, 1.0);
    float hem = smoothstep(1.0, 0.86, y / h) * smoothstep(0.0, 0.04, y / h);
    float dimmed = u_mark_dim * hem;
    vec2 light_step = vec2(-2.4, -2.4);

    float dl = sd_lines(m);
    float ink_mask = smoothstep(2.0, -2.0, dl);
    float ink_lit = smoothstep(2.0, -2.0, sd_lines(m + light_step));
    float ink_rim = clamp(ink_mask - ink_lit, 0.0, 1.0);
    float ink_shade = clamp(ink_lit - ink_mask, 0.0, 1.0);
    color += INK_C * (ink_mask * 0.085 + ink_rim * 0.14) * shimmer * dimmed;
    color -= vec3(ink_shade * 0.06 * shimmer * dimmed);

    float dc = sd_check(m);
    float check_mask = smoothstep(2.0, -2.0, dc);
    float check_lit = smoothstep(2.0, -2.0, sd_check(m + light_step));
    float check_rim = clamp(check_mask - check_lit, 0.0, 1.0);
    float prog = fract(t / 6.0) * 1.5 - 0.25;
    float pulse = check_pulse(m, prog);
    float bloom = exp(-max(dc, 0.0) / 110.0);
    float lift = (0.55 + 0.45 * shimmer) * dimmed;
    color += FROM_C
      * (check_mask * (0.14 + 0.3 * pulse) + check_rim * 0.14 + bloom * (0.03 + 0.13 * pulse))
      * lift;
  }

  outColor = vec4(max(DEEP + color, vec3(0.0)), 1.0);
}`;

for (const canvas of canvases) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    powerPreference: "low-power",
  });
  if (!gl) continue;

  const compile = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return sh;
  };
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) continue;

  gl.useProgram(program);
  const uRes = gl.getUniformLocation(program, "u_res");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uMark = gl.getUniformLocation(program, "u_mark");
  const uMarkC = gl.getUniformLocation(program, "u_mark_c");
  const uMarkS = gl.getUniformLocation(program, "u_mark_s");
  const uMarkDim = gl.getUniformLocation(program, "u_mark_dim");
  gl.uniform1f(uMark, "mark" in canvas.dataset ? 1 : 0);
  const slot = canvas.parentElement?.querySelector(".said-mark-slot") ?? null;

  const wash = "markWash" in canvas.dataset;
  const placeMark = () => {
    const box = canvas.getBoundingClientRect();
    const dpr = box.width > 0 ? canvas.width / box.width : 1;
    if (wash) {
      gl.uniform2f(uMarkC, canvas.width * 0.5, canvas.height * 0.444);
      gl.uniform1f(uMarkS, (canvas.height * 1.62) / 1024);
      gl.uniform1f(uMarkDim, 0.3);
      return;
    }
    gl.uniform1f(uMarkDim, 1);
    if (slot) {
      const at = slot.getBoundingClientRect();
      const cx = (at.left + at.width / 2 - box.left) * dpr;
      const cy = (at.top + at.height / 2 - box.top) * dpr;
      const span =
        Math.min(at.height * 3.1, Math.min(box.width, box.height) * 0.6) * dpr;
      gl.uniform2f(uMarkC, cx, cy);
      gl.uniform1f(uMarkS, span / 1024);
    } else {
      gl.uniform2f(uMarkC, canvas.width * 0.5, canvas.height * 0.44);
      gl.uniform1f(
        uMarkS,
        (1.15 * Math.min(canvas.width, canvas.height)) / 1024,
      );
    }
  };

  const size = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const w = Math.floor(canvas.clientWidth * dpr);
    const h = Math.floor(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };

  let raf = 0;
  let last = 0;
  let visible = true;
  const STEP = 1000 / 30;
  const frame = (ms) => {
    if (ms - last >= STEP) {
      last = ms;
      size();
      placeMark();
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ms / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (!reduced && visible) raf = requestAnimationFrame(frame);
  };

  const run = () => {
    cancelAnimationFrame(raf);
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (reduced) return;
      run();
    },
    { threshold: 0.01 },
  ).observe(canvas);

  document.addEventListener("visibilitychange", () => {
    if (reduced) return;
    run();
  });

  raf = requestAnimationFrame(frame);
}
