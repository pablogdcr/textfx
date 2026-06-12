import { smoothstep, stagger } from '../engine/anim';
import type { TextEffect } from '../engine/types';

export const bounce: TextEffect = {
  id: 'bounce',
  label: 'Bounce',
  duration: 1800,
  charStyle: (p, c) => {
    'worklet';
    const lp = stagger(p, c.index, c.count, 0.04);
    if (lp <= 0 || lp >= 1) return { transform: [] };
    const decay = Math.exp(-3.2 * lp);
    const hop = Math.abs(Math.sin(lp * Math.PI * 2.5));
    // squash on landings: kicks in as the hop approaches the ground
    const squash = 0.2 * decay * (1 - smoothstep(0, 0.3, hop));
    return {
      transform: [
        { translateY: -26 * decay * hop },
        { scaleY: 1 - squash },
        { scaleX: 1 + squash * 0.6 },
      ],
    };
  },
};
