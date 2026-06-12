import { backOut, stagger } from '../engine/anim';
import type { TextEffect } from '../engine/types';

export const gentle: TextEffect = {
  id: 'gentle',
  label: 'Gentle',
  duration: 1200,
  charStyle: (p, c) => {
    'worklet';
    const lp = stagger(p, c.index, c.count, 0.07);
    const e = backOut(lp, 1.4);
    return {
      opacity: Math.min(1, lp * 2.5),
      transform: [{ translateY: (1 - e) * 8 }, { scale: 0.55 + 0.45 * e }],
    };
  },
};
