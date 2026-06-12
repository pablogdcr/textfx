import type { TextEffect } from '../engine/types';

export const wave: TextEffect = {
  id: 'wave',
  label: 'Wave',
  duration: 2200,
  charStyle: (p, c) => {
    'worklet';
    const env = Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
    const phase = p * Math.PI * 5 - c.index * 0.55;
    return {
      transform: [
        { translateY: Math.sin(phase) * 10 * env },
        { rotate: `${Math.cos(phase) * 4 * env}deg` },
      ],
    };
  },
};
