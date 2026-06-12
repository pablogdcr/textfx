import { useCallback, useRef } from 'react';
import { Easing, cancelAnimation, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import type { HapticKind, TextEffect } from './types';

const HAPTIC: Record<HapticKind, () => void> = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

/**
 * One linear master clock per stage. play() restarts it; all shaping is
 * analytic inside each effect's worklets, so replays are deterministic.
 */
export function useEffectDriver() {
  const progress = useSharedValue(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = useCallback(() => {
    cancelAnimation(progress);
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, [progress]);

  const play = useCallback(
    (effect: TextEffect, onDone?: () => void) => {
      stop();
      progress.value = 0;
      progress.value = withTiming(1, { duration: effect.duration, easing: Easing.linear });
      effect.keyframes?.forEach((k) => {
        timers.current.push(setTimeout(() => HAPTIC[k.haptic](), k.at * effect.duration));
      });
      if (onDone) {
        timers.current.push(setTimeout(onDone, effect.duration));
      }
    },
    [progress, stop],
  );

  return { progress, play, stop };
}
