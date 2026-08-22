/*
 * Strands — flowing neon strand background.
 *
 * Vanilla port of the reactbits.dev "Strands" component
 * (https://reactbits.dev/animations/strands, MIT). React and the optional
 * glass-orb pass removed; same shader, driven directly with ogl.
 *
 * Requires WebGL2. Falls back silently (the hero keeps its CSS gradient
 * atmosphere) when unavailable. Honors prefers-reduced-motion by rendering
 * a single static frame instead of animating.
 */
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';

const MAX_STRANDS = 12;
const MAX_COLORS = 8;

const VERT = /* glsl */ `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec3 uColors[${MAX_COLORS}];
uniform int uColorCount;
uniform int uStrandCount;
uniform float uSpeed;
uniform float uAmplitude;
uniform float uWaviness;
uniform float uThickness;
uniform float uGlow;
uniform float uTaper;
uniform float uSpread;
uniform float uHueShift;
uniform float uIntensity;
uniform float uOpacity;
uniform float uScale;
uniform float uSaturation;

out vec4 fragColor;

const float PI = 3.14159265;

vec3 spectrum(float t) {
  return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 samplePalette(float t) {
  t = fract(t);
  float scaled = t * float(uColorCount);
  int idx = int(floor(scaled));
  float blend = fract(scaled);
  int nextIdx = idx + 1;
  if (nextIdx >= uColorCount) nextIdx = 0;
  return mix(uColors[idx], uColors[nextIdx], blend);
}

vec3 strandColor(float t) {
  if (uColorCount > 0) return samplePalette(t);
  return spectrum(t);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  uv /= max(uScale, 0.0001);

  float e = 0.06 + uIntensity * 0.94;
  float env = pow(max(cos(uv.x * PI * 1.3), 0.0), uTaper);

  vec3 col = vec3(0.0);

  for (int i = 0; i < ${MAX_STRANDS}; i++) {
    if (i >= uStrandCount) break;

    float fi = float(i);
    float ph = fi * 1.7 * uSpread;
    float freq = (2.0 + fi * 0.35) * uWaviness;
    float spd = 1.4 + fi * 1.2;

    float tt = uTime * uSpeed;
    float w = sin(uv.x * freq + tt * spd + ph) * 0.60
            + sin(uv.x * freq * 1.1 - tt * spd * 0.7 + ph * 1.7) * 0.40;

    float amp = (0.1 + 0.02 * e) * env * uAmplitude;
    float y = w * amp;

    float d = abs(uv.y - y);
    float thick = (0.001 + 0.05 * e) * (0.35 + env) * uThickness;
    float g = thick / (d + thick * 0.45);
    g = g * g;

    float h = fi / float(uStrandCount) + uv.x * 0.30 + uTime * 0.04 + uHueShift;
    col += strandColor(h) * g * env;
  }

  col *= 0.45 + 0.7 * e;
  col = 1.0 - exp(-col * uGlow);

  float gray = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = max(mix(vec3(gray), col, uSaturation), 0.0);

  float lum = max(max(col.r, col.g), col.b);
  float alpha = clamp(lum, 0.0, 1.0) * uOpacity;

  fragColor = vec4(col * uOpacity, alpha);
}
`;

const DEFAULTS = {
  colors: ['#42effe', '#f900b9'],
  count: 5,
  speed: 0.5,
  amplitude: 1,
  waviness: 1,
  thickness: 0.7,
  glow: 2.6,
  taper: 3,
  spread: 1,
  hueShift: 0,
  intensity: 0.6,
  saturation: 1.5,
  opacity: 1,
  scale: 1.5,
};

function buildPalette(colors) {
  const filled = colors && colors.length ? colors : ['#ffffff'];
  const padded = [];
  for (let i = 0; i < MAX_COLORS; i++) {
    const hex = filled[i] ?? filled[filled.length - 1];
    const c = new Color(hex);
    padded.push([c.r, c.g, c.b]);
  }
  return padded;
}

export function initStrands(container, options = {}) {
  if (!container) return null;

  const opts = { ...DEFAULTS, ...options };

  let renderer;
  try {
    renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      webgl: 2,
      /* ogl defaults dpr to 1, which rendered this full-screen shader at
         half resolution on a retina display — soft, slightly muddy
         strands. Capped at 2 deliberately: this is a fragment shader
         covering the whole viewport, so cost scales with the SQUARE of
         the dpr. 2 is 4x the pixels of 1; letting a 3x phone through
         would be 9x, for a soft glow nobody can resolve that finely. */
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });
  } catch {
    return null;
  }

  const gl = renderer.gl;
  if (!gl) return null;

  gl.clearColor(0, 0, 0, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.canvas.style.backgroundColor = 'transparent';

  const geometry = new Triangle(gl);
  if (geometry.attributes.uv) delete geometry.attributes.uv;

  const program = new Program(gl, {
    vertex: VERT,
    fragment: FRAG,
    uniforms: {
      uTime: { value: 0 },
      uResolution: { value: [container.offsetWidth, container.offsetHeight] },
      uColors: { value: buildPalette(opts.colors) },
      uColorCount: { value: Math.min(opts.colors.length, MAX_COLORS) },
      uStrandCount: {
        value: Math.min(Math.max(Math.round(opts.count), 1), MAX_STRANDS),
      },
      uSpeed: { value: opts.speed },
      uAmplitude: { value: opts.amplitude },
      uWaviness: { value: opts.waviness },
      uThickness: { value: opts.thickness },
      uGlow: { value: opts.glow },
      uTaper: { value: opts.taper },
      uSpread: { value: opts.spread },
      uHueShift: { value: opts.hueShift },
      uIntensity: { value: opts.intensity },
      uOpacity: { value: opts.opacity },
      uScale: { value: opts.scale },
      uSaturation: { value: opts.saturation },
    },
  });

  const mesh = new Mesh(gl, { geometry, program });
  container.appendChild(gl.canvas);

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  /* Whether the rAF loop is currently ticking. Declared up here because
     resize() below has to know: when nothing is looping, resize() is the
     only thing that will ever repaint the canvas. */
  let loopRunning = false;

  /* ---- Sizing -------------------------------------------------------
   * This listened only for `window.resize`, which was a real bug: after
   * following a link back to the page (from /404, for instance) the hero
   * rendered as five tiny strands strung across the top, and a manual
   * refresh appeared to "fix" it.
   *
   * uResolution is measured once at init. If the container is not laid
   * out at that exact moment, the shader is handed a near-zero height,
   * sizes its strands against it, and nothing ever corrects the value —
   * because a link navigation never fires a window resize. Refreshing
   * only worked because a cold load happens to measure late enough. The
   * five blobs were literally uStrandCount strands drawn at the wrong
   * aspect.
   *
   * A ResizeObserver watches the element itself, so every cause of a
   * size change is covered: layout settling, fonts loading, a restored
   * page, and the mobile URL bar collapsing — which notably does NOT
   * reliably fire window.resize on iOS.
   */
  function resize() {
    const width = container.offsetWidth;
    const height = container.offsetHeight;

    /* Never commit a degenerate measurement — that is exactly the state
       that produced the tiled strands. Bailing leaves the last good size
       in place until a real one arrives. */
    if (width === 0 || height === 0) return;

    /* Re-read each time so dragging the window between a retina and a
       non-retina display is handled, not just the startup value. */
    renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setSize(width, height);

    /* uResolution must be in DEVICE pixels, not CSS pixels. The fragment
       shader does `(gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y`,
       and gl_FragCoord is in device pixels — so feeding it CSS pixels at
       dpr 2 would double the UV range and halve the size of every
       strand. That was survivable only while dpr was pinned to 1. */
    program.uniforms.uResolution.value = [
      width * renderer.dpr,
      height * renderer.dpr,
    ];

    /* When no loop is ticking, this is the ONLY thing that repaints, so
       without it a resize leaves the last frame stretched at the old
       size. Two ways to be in that state, and `!loopRunning` covers
       both: reduced motion never starts a loop at all, and the hero
       being scrolled out of view pauses it. */
    if (!loopRunning) renderer.render({ scene: mesh });
  }

  /* observe() fires once immediately, but resize() is also called
     directly so the first size is set synchronously rather than on the
     observer's first callback. */
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  let animateId = 0;
  let visibilityObserver = null;

  if (reducedMotion) {
    // one static, pretty frame — no animation loop
    program.uniforms.uTime.value = 12;
    renderer.render({ scene: mesh });
  } else {
    /* ---- The loop, and why it stops ---------------------------------
     * This shader used to run unconditionally for as long as the tab was
     * open. On a page this tall the hero is one screen of roughly nine,
     * so the overwhelming majority of a session was spent rendering a
     * full-screen fragment shader nobody could see. PageSpeed measured
     * the cost on a throttled mobile CPU: 31.5s of Total Blocking Time
     * and 20 long tasks of ~300ms each, the last of them starting 39
     * SECONDS into the trace. Almost none of that was script — it was
     * GPU and raster work, repeated forever.
     *
     * So the loop is gated on an IntersectionObserver: it ticks while
     * any part of the hero is on screen and stops when it is not.
     *
     * A hidden TAB is already handled for free — browsers do not fire
     * requestAnimationFrame in one — which is the other half of the same
     * problem and needs no code here.
     */

    /* uTime is accumulated rather than taken from the rAF timestamp.
       That timestamp is time since navigation, which keeps advancing
       while we are paused — so resuming with it would jump the animation
       forward by however long the reader spent further down the page,
       and the strands would visibly snap. Summing deltas instead means
       paused time simply does not exist to the shader, and scrolling
       back resumes exactly where it left off. */
    let clock = 0;
    let previous = 0;

    const update = (t) => {
      animateId = requestAnimationFrame(update);
      /* First frame of a run has no predecessor, so assume one frame at
         60fps. The clamp covers the other direction: returning to a
         backgrounded tab can hand us a delta of many seconds, and
         without it that would land as the very jump this accumulator
         exists to avoid. */
      const delta = previous ? Math.min(t - previous, 50) : 16.7;
      previous = t;
      clock += delta;
      program.uniforms.uTime.value = clock * 0.001;
      renderer.render({ scene: mesh });
    };

    const start = () => {
      if (loopRunning) return;
      loopRunning = true;
      previous = 0; // resume from a fresh delta, not one spanning the pause
      animateId = requestAnimationFrame(update);
    };

    const stop = () => {
      if (!loopRunning) return;
      loopRunning = false;
      cancelAnimationFrame(animateId);
      animateId = 0;
    };

    if (typeof IntersectionObserver === 'function') {
      /* Fires once on observe(), so the initial state is handled here
         too — including a deep link that lands past the hero, where the
         loop correctly never starts. */
      visibilityObserver = new IntersectionObserver(
        ([entry]) => (entry.isIntersecting ? start() : stop()),
        { threshold: 0 }
      );
      visibilityObserver.observe(container);
    } else {
      start();
    }
  }

  return function destroy() {
    cancelAnimationFrame(animateId);
    visibilityObserver?.disconnect();
    resizeObserver.disconnect();
    if (gl.canvas.parentNode === container) container.removeChild(gl.canvas);
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  };
}
