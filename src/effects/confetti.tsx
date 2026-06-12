import { useMemo } from 'react';
import { Atlas, Skia, useRSXformBuffer } from '@shopify/react-native-skia';
import { seg } from '../engine/anim';
import { makeRectSprite, rsxformCentered, textBlockBounds } from '../engine/skiaUtils';
import type { OverlayProps, TextEffect } from '../engine/types';

const COUNT = 240;
const W = 10;
const H = 7;
const DUR_S = 3.0;
const GRAVITY = 920;
const DRAG = 0.9;
const PALETTE = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F'];

function ConfettiOverlay({ progress, rects }: OverlayProps) {
  const sprite = useMemo(() => makeRectSprite(W, H), []);
  const { cx, cy } = useMemo(() => textBlockBounds(rects), [rects]);
  const seeds = useMemo(() => {
    const arr: number[][] = [];
    for (let i = 0; i < COUNT; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.1;
      const speed = 480 + Math.random() * 640;
      arr.push([
        Math.cos(angle) * speed, // vx
        Math.sin(angle) * speed, // vy
        (Math.random() - 0.5) * 13, // spin
        Math.random() * Math.PI * 2, // phase
        2 + Math.random() * 4, // flutter freq
        0.7 + Math.random() * 0.7, // scale
        Math.random() * 0.07, // delay (s)
      ]);
    }
    return arr;
  }, []);
  const sprites = useMemo(
    () => Array.from({ length: COUNT }, () => Skia.XYWHRect(0, 0, W, H)),
    [],
  );
  const colors = useMemo(
    () => Array.from({ length: COUNT }, (_, i) => Skia.Color(PALETTE[i % PALETTE.length])),
    [],
  );

  const transforms = useRSXformBuffer(COUNT, (xf, i) => {
    'worklet';
    const p = progress.value;
    const s = seeds[i];
    const t = Math.max(0, p * DUR_S - s[6]);
    const ek = (1 - Math.exp(-DRAG * t)) / DRAG;
    const px = cx + s[0] * ek + Math.sin(t * s[4] + s[3]) * 16 * Math.min(1, t);
    const py = cy + s[1] * ek + (GRAVITY * (t - ek)) / DRAG;
    const fade = 1 - seg(p, 0.82, 1);
    // paper tumbling reads as a scale pulse on a flat sprite
    const tumble = 0.55 + 0.45 * Math.sin(t * s[4] * 1.9 + s[3]);
    rsxformCentered(xf, s[5] * fade * tumble, s[3] + t * s[2], px, py, W, H);
  });

  return <Atlas image={sprite} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="modulate" />;
}

export const confetti: TextEffect = {
  id: 'confetti',
  label: 'Confetti',
  duration: 3000,
  keyframes: [{ at: 0.02, haptic: 'medium' }],
  charStyle: (p) => {
    'worklet';
    const k = seg(p, 0, 0.12);
    return { transform: [{ scale: 1 + 0.12 * Math.sin(k * Math.PI) }] };
  },
  Overlay: ConfettiOverlay,
};
