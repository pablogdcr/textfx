import { memo } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { stageText } from '../theme';
import type { CharInfo, CharStyleFn, EffectCtx, Rect, TextEffect } from '../engine/types';

interface Props {
  info: CharInfo;
  displayChar: string;
  effect: TextEffect | null;
  progress: SharedValue<number>;
  touch: EffectCtx['touch'];
  reveal: EffectCtx['reveal'];
  rect: Rect | undefined;
  lockedWidth: number | undefined;
  onLayout: (index: number, e: LayoutChangeEvent) => void;
}

function useCharStyle(
  charStyle: CharStyleFn | undefined,
  progress: SharedValue<number>,
  info: CharInfo,
  ctx: EffectCtx,
) {
  return useAnimatedStyle(() => {
    if (!charStyle) return { opacity: 1, transform: [] };
    return charStyle(progress.value, info, ctx) as any;
  });
}

function CharInner({ info, displayChar, effect, progress, touch, reveal, rect, lockedWidth, onLayout }: Props) {
  const ctx: EffectCtx = { rect, touch, reveal };
  const baseStyle = useCharStyle(effect?.charStyle, progress, info, ctx);
  const layers = effect?.charLayers;

  const text = (
    <Animated.Text
      allowFontScaling={false}
      style={[styles.char, baseStyle]}
      onLayout={lockedWidth == null && !layers ? (e) => onLayout(info.index, e) : undefined}
    >
      {displayChar}
    </Animated.Text>
  );

  if (lockedWidth == null && !layers) return text;

  return (
    <View
      style={[styles.box, lockedWidth != null && { width: lockedWidth }]}
      onLayout={(e) => onLayout(info.index, e)}
    >
      {layers?.map((layer, i) => (
        <LayerText key={i} layer={layer} progress={progress} info={info} ctx={ctx} displayChar={displayChar} />
      ))}
      {text}
    </View>
  );
}

function LayerText({
  layer,
  progress,
  info,
  ctx,
  displayChar,
}: {
  layer: NonNullable<TextEffect['charLayers']>[number];
  progress: SharedValue<number>;
  info: CharInfo;
  ctx: EffectCtx;
  displayChar: string;
}) {
  const style = useCharStyle(layer.charStyle, progress, info, ctx);
  return (
    <Animated.Text allowFontScaling={false} style={[styles.char, styles.layer, { color: layer.color }, style]}>
      {displayChar}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  char: {
    ...stageText,
    fontWeight: stageText.fontWeight as '600',
  },
  box: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    textAlign: 'center',
  },
});

export const Char = memo(CharInner);
