import { seg } from '../engine/anim';
import type { CharInfo, TextEffect } from '../engine/types';

const CLEAN_AT = 0.85;

function hash(step: number, seed: number): number {
  'worklet';
  const v = Math.sin(step * 12.9898 + seed * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function lockAt(c: CharInfo): number {
  'worklet';
  const f = (c.index * 0.7548776662) % 1;
  return 0.35 + 0.4 * f;
}

function layerStyle(p: number, c: CharInfo, sign: number) {
  'worklet';
  if (p >= CLEAN_AT) return { opacity: 0, transform: [] };
  const step = Math.floor(p * 24);
  const r = hash(step, c.seed);
  const burst = hash(step, c.seed + 3) > 0.35 ? 1 : 0;
  return {
    opacity: 0.8 * burst,
    transform: [
      { translateX: sign * (1.5 + r * 5) },
      { translateY: sign * (r - 0.5) * 2 },
    ],
  };
}

export const glitch: TextEffect = {
  id: 'glitch',
  label: 'Glitch',
  duration: 800,
  keyframes: [{ at: 0.0, haptic: 'light' }, { at: CLEAN_AT, haptic: 'medium' }],
  scramble: {
    glyphs: '█▓▒<>/\\#@%$&0231',
    lockAt,
    fixedWidth: true,
    intervalMs: 50,
  },
  charLayers: [
    { color: '#0AFFF0', charStyle: (p, c) => { 'worklet'; return layerStyle(p, c, 1); } },
    { color: '#FF2D78', charStyle: (p, c) => { 'worklet'; return layerStyle(p, c, -1); } },
  ],
  charStyle: (p, c) => {
    'worklet';
    if (p >= CLEAN_AT) {
      const k = seg(p, CLEAN_AT, 1);
      return { opacity: 1, transform: [{ scale: 1 + 0.06 * (1 - k) }] };
    }
    const step = Math.floor(p * 24);
    const jump = hash(step, c.seed + 7) > 0.75 ? (hash(step, c.seed + 11) - 0.5) * 7 : 0;
    const flicker = hash(step, c.seed + 5) > 0.92 ? 0.3 : 1;
    return {
      opacity: flicker,
      transform: [{ translateX: jump }],
    };
  },
};
