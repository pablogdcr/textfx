import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Canvas } from '@shopify/react-native-skia';
import type { SharedValue } from 'react-native-reanimated';
import type { CharInfo, EffectCtx, Rect, TextEffect } from '../engine/types';

interface Props {
  effect: TextEffect | null;
  playId: number;
  visible: boolean;
  rects: Rect[] | null;
  chars: CharInfo[] | null;
  progress: SharedValue<number>;
  touch: EffectCtx['touch'];
  reveal: EffectCtx['reveal'];
}

/** Full-window Skia layer; mounts the active effect's Overlay (particles, shockwaves). */
export function OverlayHost({ effect, playId, visible, rects, chars, progress, touch, reveal }: Props) {
  const { width, height } = useWindowDimensions();
  const Overlay = effect?.Overlay;
  if (!Overlay || !visible || !rects || !chars) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={styles.canvas}>
        <Overlay
          key={playId}
          progress={progress}
          rects={rects}
          touch={touch}
          reveal={reveal}
          width={width}
          height={height}
          chars={chars}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
  },
});
