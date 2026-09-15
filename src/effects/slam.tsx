import { useMemo } from 'react';
import { BlurMask, Circle } from '@shopify/react-native-skia';
import { useDerivedValue } from 'react-native-reanimated';
import { easeInCubic, easeOutCubic, seg } from '../engine/anim';
import { textBlockBounds } from '../engine/skiaUtils';
import type { OverlayProps, TextEffect } from '../engine/types';

const IMPACT = 0.22;

function SlamOverlay({ progress, rects, width, intensity = 1 }: OverlayProps) {
  const { cx, cy } = useMemo(() => textBlockBounds(rects), [rects]);
  const r = useDerivedValue(() => {
    const t = seg(progress.value, IMPACT, 0.75);
    return t <= 0 ? 0 : easeOutCubic(t) * width * 0.75;
  });
  const opacity = useDerivedValue(() => {
    const t = seg(progress.value, IMPACT, 0.75);
    // hold the ring brighter for the first half of its expansion, then fade —
    // a flat (1 - t) fade vanishes before the eye registers it on the busy wall
    return t <= 0 ? 0 : Math.min(1, 0.55 * intensity * (1 - t * t));
  });
  const strokeWidth = useDerivedValue(() => 22 * (1 - seg(progress.value, IMPACT, 0.75)) + 2);
  return (
    <Circle cx={cx} cy={cy} r={r} style="stroke" strokeWidth={strokeWidth} color="white" opacity={opacity}>
      <BlurMask blur={14} style="normal" />
    </Circle>
  );
}

export const slam: TextEffect = {
  id: 'slam',
  label: 'Slam',
  duration: 950,
  keyframes: [{ at: IMPACT, haptic: 'heavy' }],
  // The whole block drops as one rigid unit (like Apple's slam) — scaling
  // per-char would overlap translucent glyphs and read as a ghost duplicate.
  containerStyle: (p) => {
    'worklet';
    if (p < IMPACT) {
      const e = easeInCubic(seg(p, 0, IMPACT));
      return {
        opacity: Math.min(1, 0.35 + e * 0.9),
        transform: [{ translateY: -(1 - e) * 40 }, { scale: 3.1 - 2.1 * e }],
      };
    }
    const t = seg(p, IMPACT, 1);
    const shake = Math.exp(-7 * t) * Math.sin(34 * t) * 5;
    return { opacity: 1, transform: [{ translateY: shake }, { scale: 1 }] };
  },
  Overlay: SlamOverlay,
};
