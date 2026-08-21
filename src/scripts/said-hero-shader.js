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
out vec4 outColor;

const vec3 FROM_C = vec3(0.059, 0.659, 0.941);
const vec3 TO_C = vec3(0.537, 0.682, 0.957);
const vec3 DEEP = vec3(0.024, 0.043, 0.078);

float edge_fade(float y, float h) {
  float margin = h * 0.22;
  float top = clamp(y / margin, 0.0, 1.0);
  float bottom = clamp((h - y) / margin, 0.0, 1.0);
  float near = min(top, bottom);
  return near * near * (3.0 - 2.0 * near);
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

  outColor = vec4(DEEP + color, 1.0);
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
