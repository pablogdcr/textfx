/**
 * Worklet-safe analytic shaping helpers. Every effect is a pure function of
 * the master progress p in [0,1]; these turn p into springs, staggers, bounces.
 */

export function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Local progress for char `index` of `count` with per-char delay `spread` (fraction of total). */
export function stagger(p: number, index: number, count: number, spread: number): number {
  'worklet';
  const total = 1 + (count - 1) * spread;
  return clamp01((p * total - index * spread) / 1);
}

/** Remap p from [a,b] to [0,1], clamped. */
export function seg(p: number, a: number, b: number): number {
  'worklet';
  return clamp01((p - a) / (b - a));
}

export function smoothstep(edge0: number, edge1: number, x: number): number {
  'worklet';
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** Ease-out with back overshoot (analytic Easing.out(Easing.back)). */
export function backOut(t: number, s: number = 1.70158): number {
  'worklet';
  const u = t - 1;
  return u * u * ((s + 1) * u + s) + 1;
}

export function easeOutCubic(t: number): number {
  'worklet';
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeInCubic(t: number): number {
  'worklet';
  return t * t * t;
}

/** Damped oscillation settling to 0: e^(-decay*t) * sin(freq*t). */
export function damp(t: number, decay: number, freq: number): number {
  'worklet';
  return Math.exp(-decay * t) * Math.sin(freq * t);
}

/** Analytic underdamped spring from 1 to 0 (returns displacement). */
export function springTo0(t: number, decay: number = 8, freq: number = 14): number {
  'worklet';
  return Math.exp(-decay * t) * Math.cos(freq * t);
}

export function mix(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}
