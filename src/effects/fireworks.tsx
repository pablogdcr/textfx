import { useMemo } from 'react';
import { Atlas, Skia, useRSXformBuffer } from '@shopify/react-native-skia';
import { clamp01 } from '../engine/anim';
import { makeDotSprite, rsxformCentered } from '../engine/skiaUtils';
import type { OverlayProps, TextEffect } from '../engine/types';

const ROCKETS = 3;
const SPARKS = 90;
const COUNT = ROCKETS * (1 + SPARKS);
const SPRITE = 18;
const DUR_S = 3.6;
const GRAVITY = 230;
const DRAG = 1.1;
const SPARK_LIFE = 1.5;
const ROCKET_COLORS = ['#FFD60A', '#64D2FF', '#FF375F'];

// rocket r: index r; sparks for rocket r: indices ROCKETS + r*SPARKS .. +SPARKS
const LAUNCH = [0.02, 0.18, 0.34];
const RISE = 0.13;

function FireworksOverlay({ progress, width, height }: OverlayProps) {
  const sprite = useMemo(() => makeDotSprite(SPRITE, 3), []);
  const rocketX = useMemo(() => [width * 0.28, width * 0.55, width * 0.74], [width]);
  const burstY = useMemo(() => [height * 0.24, height * 0.18, height * 0.3], [height]);
  const seeds = useMemo(() => {
    const arr: number[][] = [];
    for (let i = 0; i < ROCKETS * SPARKS; i++) {
      const theta = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 330;
      arr.push([
        Math.cos(theta) * speed,
        Math.sin(theta) * speed * 0.92,
        0.5 + Math.random() * 0.6, // size
        Math.random() * Math.PI * 2, // flicker phase
        6 + Math.random() * 9, // flicker freq
      ]);
    }
    return arr;
  }, []);
  const sprites = useMemo(
    () => Array.from({ length: COUNT }, () => Skia.XYWHRect(0, 0, SPRITE, SPRITE)),
    [],
  );
  const colors = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const rocket = i < ROCKETS ? i : Math.floor((i - ROCKETS) / SPARKS);
        return Skia.Color(ROCKET_COLORS[rocket]);
      }),
    [],
  );

  const transforms = useRSXformBuffer(COUNT, (xf, i) => {
    'worklet';
    const p = progress.value;
    if (i < ROCKETS) {
      // rocket: bright dot rising, gone after burst
      const k = clamp01((p - LAUNCH[i]) / RISE);
      if (k <= 0 || k >= 1) {
        xf.set(0, 0, -100, -100);
        return;
      }
      const rise = 1 - (1 - k) * (1 - k);
      const y = height + 20 + (burstY[i] - height - 20) * rise;
      const x = rocketX[i] + Math.sin(k * 9) * 4;
      rsxformCentered(xf, 0.5 + 0.3 * (1 - k), 0, x, y, SPRITE, SPRITE);
      return;
    }
    const rocket = Math.floor((i - ROCKETS) / SPARKS);
    const t = (p - (LAUNCH[rocket] + RISE)) * DUR_S;
    if (t <= 0 || t >= SPARK_LIFE) {
      xf.set(0, 0, -100, -100);
      return;
    }
    const s = seeds[i - ROCKETS];
    const ek = (1 - Math.exp(-DRAG * t)) / DRAG;
    const px = rocketX[rocket] + s[0] * ek;
    const py = burstY[rocket] + s[1] * ek + (GRAVITY * (t - ek)) / DRAG;
    const k = t / SPARK_LIFE;
    const flicker = 0.65 + 0.35 * Math.sin(t * s[4] + s[3]);
    const scale = s[2] * Math.pow(1 - k, 0.65) * flicker;
    rsxformCentered(xf, scale, 0, px, py, SPRITE, SPRITE);
  });

  return <Atlas image={sprite} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="modulate" />;
}

export const fireworks: TextEffect = {
  id: 'fireworks',
  label: 'Fireworks',
  duration: 3600,
  keyframes: [
    { at: LAUNCH[0] + RISE, haptic: 'medium' },
    { at: LAUNCH[1] + RISE, haptic: 'medium' },
    { at: LAUNCH[2] + RISE, haptic: 'heavy' },
  ],
  charStyle: (p) => {
    'worklet';
    // text breathes faintly with each burst
    let glow = 0;
    for (let r = 0; r < 3; r++) {
      const t = p - (LAUNCH[r] + RISE);
      if (t > 0) glow += Math.exp(-t * 9);
    }
    return { opacity: 0.82 + Math.min(0.18, glow * 0.3), transform: [] };
  },
  Overlay: FireworksOverlay,
};
