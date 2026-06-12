import { ScrollView, StyleSheet, Text } from 'react-native';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { theme } from '../theme';
import type { TextEffect } from '../engine/types';

interface Props {
  effects: TextEffect[];
  activeId: string | null;
  onPress: (effect: TextEffect) => void;
}

function Chip({ effect, active, onPress }: { effect: TextEffect; active: boolean; onPress: () => void }) {
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(pressed.value ? 0.9 : 1, { damping: 18, stiffness: 400 }) }],
  }));
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (pressed.value = 1)}
      onPressOut={() => (pressed.value = 0)}
    >
      <Animated.View style={[styles.chip, active && styles.chipActive, anim]}>
        <Text style={[styles.label, active && styles.labelActive]}>{effect.label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export function EffectChips({ effects, activeId, onPress }: Props) {
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="always"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {effects.map((e) => (
        <Chip key={e.id} effect={e} active={e.id === activeId} onPress={() => onPress(e)} />
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
