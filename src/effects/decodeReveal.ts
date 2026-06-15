import { easeOutCubic, seg } from '../engine/anim';
import type { CharInfo, TextEffect } from '../engine/types';

const GREEN = { r: 25, g: 245, b: 143 };
const WHITE = { r: 245, g: 245, b: 247 };

// Resolve in reading order (left → right) so the phrase "writes" itself in.
function lockAt(c: CharInfo): number {
  'worklet';
  const span = c.count > 1 ? c.index / (c.count - 1) : 0; // 0 (first) → 1 (last)
  return 0.06 + 0.66 * span;
}

/**
 * Demo Decode: shares the Decode id (so the chip highlights) but resolves
 * left-to-right. Plays in place on the full, already-laid-out phrase —
 * `fixedWidth` locks each char's box so the scramble never reflows or jitters,
 * and the line is centred from the first frame (no growth, no jump). Characters
 * flicker green while scrambling, then settle to white as the front sweeps past.
 */
export const decodeReveal: TextEffect = {
  id: 'decode',
  label: 'Decode',
  duration: 1300,
  scramble: {
    glyphs: 'アイウエオカキクケコサシスセソタチツテトナニヌネノ01<>#$%&',
    lockAt,
    fixedWidth: true,
    intervalMs: 40,
  },
  charStyle: (p, c) => {
    'worklet';
    const lock = lockAt(c);
    if (p < lock) {
      const flicker = 0.55 + 0.35 * Math.sin(p * 55 + c.seed * 40);
      return { opacity: flicker, color: `rgb(${GREEN.r},${GREEN.g},${GREEN.b})`, transform: [] };
    }
    const k = easeOutCubic(seg(p, lock, Math.min(1, lock + 0.1)));
    const r = Math.round(GREEN.r + (WHITE.r - GREEN.r) * k);
    const g = Math.round(GREEN.g + (WHITE.g - GREEN.g) * k);
    const b = Math.round(GREEN.b + (WHITE.b - GREEN.b) * k);
    return { opacity: 1, color: `rgb(${r},${g},${b})`, transform: [] };
  },
};
