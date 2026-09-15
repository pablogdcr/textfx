import type React from 'react';
import type { SharedValue } from 'react-native-reanimated';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CharInfo {
  index: number;
  count: number;
  char: string;
  wordIndex: number;
  indexInWord: number;
  /** Stable per-char pseudo-random in [0,1) for jitter/phase offsets. */
  seed: number;
}

/**
 * Shared-value context available to charStyle worklets beyond the master
 * progress: where the char sits on stage, current touch, per-char reveal
 * levels (Invisible Ink).
 */
export interface EffectCtx {
  rect: Rect | undefined;
  touch: SharedValue<{ x: number; y: number; active: number }>;
  reveal: SharedValue<number[]>;
}

export type CharStyleFn = (p: number, c: CharInfo, ctx: EffectCtx) => Record<string, unknown>;

export interface OverlayProps {
  progress: SharedValue<number>;
  /** Char rects in stage (window) coordinates, one per grapheme. */
  rects: Rect[];
  touch: SharedValue<{ x: number; y: number; active: number }>;
  reveal: SharedValue<number[]>;
  width: number;
  height: number;
  chars: CharInfo[];
  /** Visibility multiplier (default 1). The finale wall bumps this so a single
   *  cell's overlay still reads against ~20 others animating at once. */
  intensity?: number;
}

export interface ScrambleConfig {
  /** Pool of substitution glyphs. */
  glyphs: string;
  /** Master-progress time (0..1) at which a char locks to its real glyph. Worklet-safe pure fn. */
  lockAt: (c: CharInfo) => number;
  intervalMs?: number;
  /** Lock each char's box to its measured width so random glyphs don't reflow the line. */
  fixedWidth?: boolean;
}

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success';

export interface TextEffect {
  id: string;
  label: string;
  /** Master clock runs 0 -> 1 linearly over this duration (ms). All shaping is analytic. */
  duration: number;
  /** Invisible Ink: base chars start hidden, revealed by touch. */
  hidesBaseText?: boolean;
  /** Effect stays alive after progress reaches 1 (ink idle drift). */
  persistent?: boolean;
  scramble?: ScrambleConfig;
  charStyle?: CharStyleFn;
  /** Extra stacked Text layers per char (Glitch RGB split). */
  charLayers?: { color: string; charStyle: CharStyleFn }[];
  /** Worklet style applied to the whole text block (Slam shake). */
  containerStyle?: (p: number) => Record<string, unknown>;
  Overlay?: React.ComponentType<OverlayProps>;
  keyframes?: { at: number; haptic: HapticKind }[];
}
