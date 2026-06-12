import { mix, smoothstep } from '../engine/anim';
import type { TextEffect } from '../engine/types';

export const shimmer: TextEffect = {
  id: 'shimmer',
  label: 'Shimmer',
  duration: 1900,
  charStyle: (p, c) => {
    'worklet';
    const settle = smoothstep(0.85, 1, p);
    // two sweeps across reading order, entering/exiting off-text
    const pos = c.count > 1 ? c.index / (c.count - 1) : 0.5;
    const sp = -0.3 + ((p * 2) % 1) * 1.6;
    const d = pos - sp;
    const g = Math.exp(-(d * 5) * (d * 5));
    const live = 1 - settle;
    return {
      opacity: mix(0.5 + 0.5 * g, 1, settle),
      transform: [{ translateY: -2.5 * g * live }, { scale: 1 + 0.07 * g * live }],
    };
  },
};
