import type { TextEffect } from '../engine/types';
import { bounce } from './bounce';
import { confetti } from './confetti';
import { decode } from './decode';
import { fireworks } from './fireworks';
import { gentle } from './gentle';
import { glitch } from './glitch';
import { invisibleInk } from './invisibleInk';
import { loud } from './loud';
import { shimmer } from './shimmer';
import { slam } from './slam';
import { wave } from './wave';

export const EFFECTS: TextEffect[] = [
  gentle,
  slam,
  loud,
  invisibleInk,
  shimmer,
  glitch,
  decode,
  wave,
  bounce,
  confetti,
  fireworks,
];
