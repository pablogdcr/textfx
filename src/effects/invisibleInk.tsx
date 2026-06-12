import { useMemo } from 'react';
import { Atlas, Skia, useClock, useRSXformBuffer } from '@shopify/react-native-skia';
import { useFrameCallback } from 'react-native-reanimated';
import { easeOutCubic } from '../engine/anim';
import { makeDotSprite, rsxformCentered } from '../engine/skiaUtils';
import type { OverlayProps, TextEffect } from '../engine/types';

const SPRITE = 10;
const MAX_PARTICLES = 1400;
const TOUCH_RADIUS = 64;
const CONCEAL_SECONDS = 2.4;

interface Particle {
  char: number;
  bx: number;
  by: number;
  scatX: number;
  scatY: number;
  driftPhase: number;
  driftFreq: number;
  driftR: number;
  blowAngle: number;
  size: number;
  alpha: number;
}

function InkOverlay({ progress, rects, touch, reveal }: OverlayProps) {
  const sprite = useMemo(() => makeDotSprite(SPRITE, 2), []);
  const clock = useClock();

  const particles = useMemo<Particle[]>(() => {
    const perChar = Math.max(
      6,
      Math.min(26, Math.floor(MAX_PARTICLES / Math.max(1, rects.length))),
    );
    const out: Particle[] = [];
    for (let ci = 0; ci < rects.length; ci++) {
      const r = rects[ci];
      for (let k = 0; k < perChar && out.length < MAX_PARTICLES; k++) {
        // average two uniforms for a center-weighted spread inside the glyph box
        const fx = (Math.random() + Math.random()) / 2;
        const fy = (Math.random() + Math.random()) / 2;
        out.push({
          char: ci,
          bx: r.x + fx * r.width,
          by: r.y + fy * r.height,
          scatX: (Math.random() - 0.5) * 110,
          scatY: (Math.random() - 0.5) * 110,
          driftPhase: Math.random() * Math.PI * 2,
          driftFreq: 0.6 + Math.random() * 1.6,
          driftR: 2 + Math.random() * 4,
          blowAngle: Math.random() * Math.PI * 2,
          size: 0.35 + Math.random() * 0.6,
          alpha: 0.35 + Math.random() * 0.65,
        });
      }
    }
    return out;
  }, [rects]);

  const centers = useMemo(() => {
    const cxs = rects.map((r) => r.x + r.width / 2);
    const cys = rects.map((r) => r.y + r.height / 2);
    return { cxs, cys };
  }, [rects]);

  // Per-char reveal levels: rise under the finger, decay back to concealed.
  useFrameCallback((frame) => {
    const dt = Math.min(0.05, (frame.timeSincePreviousFrame ?? 16) / 1000);
    const t = touch.value;
    const levels = reveal.value;
    let changed = false;
    for (let i = 0; i < centers.cxs.length; i++) {
      let level = levels[i] ?? 0;
      if (t.active === 1) {
        const dx = centers.cxs[i] - t.x;
        const dy = centers.cys[i] - t.y;
        if (dx * dx + dy * dy < TOUCH_RADIUS * TOUCH_RADIUS) {
          level = Math.min(1, level + dt * 7);
        }
      }
      level = Math.max(0, level - dt / CONCEAL_SECONDS);
      if (level !== levels[i]) {
        levels[i] = level;
        changed = true;
      }
    }
    // must be a fresh array — self-assigning the mutated reference never
    // notifies listeners, freezing char opacity once the finger lifts
    if (changed) reveal.value = [...levels];
  }, true);

  const sprites = useMemo(
    () => Array.from({ length: particles.length }, () => Skia.XYWHRect(0, 0, SPRITE, SPRITE)),
    [particles],
  );
  const colors = useMemo(
    () =>
      particles.map((pt) => {
        const c = new Float32Array(4);
        c[0] = 0.92;
        c[1] = 0.93;
        c[2] = 1.0;
        c[3] = pt.alpha;
        return c;
      }),
    [particles],
  );

  const transforms = useRSXformBuffer(particles.length, (xf, i) => {
    'worklet';
    const pt = particles[i];
    const p = progress.value;
    const time = clock.value / 1000;
    const level = reveal.value[pt.char] ?? 0;
    const mat = easeOutCubic(Math.min(1, p));
    // converge from scatter, then idle-drift with two incommensurate sines
    const driftX =
      Math.sin(time * pt.driftFreq + pt.driftPhase) * pt.driftR +
      Math.sin(time * pt.driftFreq * 1.7 + pt.driftPhase * 2.3) * pt.driftR * 0.6;
    const driftY =
      Math.cos(time * pt.driftFreq * 1.3 + pt.driftPhase) * pt.driftR +
      Math.cos(time * pt.driftFreq * 0.7 + pt.driftPhase * 1.7) * pt.driftR * 0.6;
    const blow = level * (26 + pt.driftR * 6);
    const px = pt.bx + pt.scatX * (1 - mat) + driftX + Math.cos(pt.blowAngle) * blow;
    const py = pt.by + pt.scatY * (1 - mat) + driftY + Math.sin(pt.blowAngle) * blow;
    const scale = pt.size * mat * (1 - level);
    rsxformCentered(xf, scale, 0, px, py, SPRITE, SPRITE);
  });

  return <Atlas image={sprite} sprites={sprites} transforms={transforms} colors={colors} colorBlendMode="modulate" />;
}

export const invisibleInk: TextEffect = {
  id: 'ink',
  label: 'Invisible Ink',
  duration: 1200,
  persistent: true,
  hidesBaseText: true,
  keyframes: [{ at: 0.1, haptic: 'light' }],
  charStyle: (_p, c, ctx) => {
    'worklet';
    const level = ctx.reveal.value[c.index] ?? 0;
    return {
      opacity: level,
      transform: [{ scale: 0.96 + 0.04 * level }],
    };
  },
  Overlay: InkOverlay,
};
