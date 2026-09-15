import { useEffect, useRef } from 'react';
import { ScrollView, StyleSheet, Text, type LayoutChangeEvent } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../theme';
import type { TextEffect } from '../engine/types';

interface Props {
  effects: TextEffect[];
  activeId: string | null;
  /** Extra ids to highlight simultaneously (the finale wall lights up many at once). */
  activeIds?: readonly string[];
  onPress: (effect: TextEffect) => void;
}

function Chip({
  effect,
  active,
  onPress,
  onLayout,
}: {
  effect: TextEffect;
  active: boolean;
  onPress: () => void;
  onLayout: (e: LayoutChangeEvent) => void;
}) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.9 : 1, { damping: 18, stiffness: 400 }) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
    >
      <Animated.View entering={FadeIn} exiting={FadeOut} key={`${effect.id}-${active ? 'active' : 'inactive'}`} style={[styles.chip, active && styles.chipActive, anim]}>
        <Text style={[styles.label, active && styles.labelActive]}>{effect.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function EffectChips({ effects, activeId, activeIds, onPress }: Props) {
  const scrollRef = useRef<ScrollView>(null);
  // chip x/width within the scroll content, and the visible viewport width,
  // so the active chip can be scrolled to centre when an effect fires.
  const layouts = useRef(new Map<string, { x: number; width: number }>());
  const viewportW = useRef(0);

  useEffect(() => {
    if (!activeId) return;
    const item = layouts.current.get(activeId);
    if (!item || viewportW.current === 0) return;
    const x = item.x + item.width / 2 - viewportW.current / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: true });
  }, [activeId]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
      onLayout={(e) => (viewportW.current = e.nativeEvent.layout.width)}
    >
      {effects.map((e) => (
        <Chip
          key={e.id}
          effect={e}
          active={e.id === activeId || (activeIds?.includes(e.id) ?? false)}
          onPress={() => onPress(e)}
          onLayout={(ev) => layouts.current.set(e.id, ev.nativeEvent.layout)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  content: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: theme.chipBg,
  },
  chipActive: {
    backgroundColor: theme.chipActiveBg,
  },
  label: {
    color: theme.text,
    fontSize: 15,
    fontWeight: '600',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
