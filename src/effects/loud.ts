import { backOut, easeOutCubic, seg } from '../engine/anim';
import type { TextEffect } from '../engine/types';

const GROW_END = 0.22;
const RAGE_END = 0.72;

function envelope(p: number): number {
  'worklet';
  if (p < RAGE_END) return seg(p, 0, 0.12);
  return 1 - easeOutCubic(seg(p, RAGE_END, 1));
}

export const loud: TextEffect = {
  id: 'loud',
  label: 'Loud',
  duration: 1500,
  keyframes: [
    { at: 0.05, haptic: 'medium' },
    { at: 0.4, haptic: 'heavy' },
  ],
  charStyle: (p, c) => {
    'worklet';
    const amp = envelope(p);
    const scale =
      p < RAGE_END
        ? 1 + 0.85 * easeOutCubic(seg(p, 0, GROW_END))
        : 1 + 0.85 * (1 - backOut(seg(p, RAGE_END, 1), 2.0));
    const t = p * 42;
    const rot = Math.sin(t * 1.7 + c.seed * 6.28) * 5 * amp;
    const jx = Math.sin(t * 2.3 + c.seed * 12.5) * 2.5 * amp;
    const jy = Math.cos(t * 2.9 + c.seed * 9.1) * 2.5 * amp;
    return {
      transform: [
        { translateX: jx },
        { translateY: jy },
        { scale },
        { rotate: `${rot}deg` },
      ],
    };
  },
  containerStyle: (p) => {
    'worklet';
    const scale =
      p < RAGE_END
        ? 1 + 0.18 * easeOutCubic(seg(p, 0, GROW_END))
        : 1 + 0.18 * (1 - backOut(seg(p, RAGE_END, 1), 2.0));
    return { transform: [{ scale }] };
  },
};
