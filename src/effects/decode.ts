import { easeOutCubic, seg } from '../engine/anim';
import type { CharInfo, TextEffect } from '../engine/types';

const MATRIX_GREEN = { r: 25, g: 245, b: 143 };
const WHITE = { r: 245, g: 245, b: 247 };

function lockAt(c: CharInfo): number {
  'worklet';
  // golden-ratio scatter: deterministic shuffled lock order
  const f = (c.index * 0.6180339887) % 1;
  return 0.12 + 0.72 * f + c.seed * 0.06;
}

export const decode: TextEffect = {
  id: 'decode',
  label: 'Decode',
  duration: 2000,
  scramble: {
    glyphs: 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01<>#$%&',
    lockAt,
    fixedWidth: true,
    intervalMs: 45,
  },
  charStyle: (p, c) => {
    'worklet';
    const lock = lockAt(c);
    if (p < lock) {
      const flicker = 0.45 + 0.3 * Math.sin(p * 60 + c.seed * 40);
      return {
        opacity: flicker,
        color: `rgb(${MATRIX_GREEN.r},${MATRIX_GREEN.g},${MATRIX_GREEN.b})`,
        transform: [],
      };
    }
    const k = easeOutCubic(seg(p, lock, Math.min(1, lock + 0.12)));
    const r = Math.round(MATRIX_GREEN.r + (WHITE.r - MATRIX_GREEN.r) * k);
    const g = Math.round(MATRIX_GREEN.g + (WHITE.g - MATRIX_GREEN.g) * k);
    const b = Math.round(MATRIX_GREEN.b + (WHITE.b - MATRIX_GREEN.b) * k);
    return {
      opacity: 1,
      color: `rgb(${r},${g},${b})`,
      transform: [{ scale: 1 + 0.28 * (1 - k) }],
    };
  },
};
