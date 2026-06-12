import { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { EFFECTS } from '../effects';
import { countGraphemes } from '../engine/graphemes';
import type { CharInfo, Rect, TextEffect } from '../engine/types';
import { useEffectDriver } from '../engine/useEffectDriver';
import { MAX_GRAPHEMES, stageText, theme } from '../theme';
import { EffectChips } from './EffectChips';
import { EffectText, type EffectTextHandle } from './EffectText';
import { OverlayHost } from './OverlayHost';

const FALLBACK_TEXT = 'Hello 👋';

/** Slow breathing placeholder so the idle opening frame of a capture feels alive. */
function PlaceholderShimmer() {
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [glow]);
  const anim = useAnimatedStyle(() => ({ opacity: 0.3 + 0.25 * glow.value }));
  return (
    <View style={[StyleSheet.absoluteFill, styles.placeholderWrap]} pointerEvents="none">
      <Animated.Text allowFontScaling={false} style={[styles.placeholder, anim]}>
        Type something…
      </Animated.Text>
    </View>
  );
}

export function TextStage() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [active, setActive] = useState<TextEffect | null>(null);
  const [playId, setPlayId] = useState(0);
  const [showEffect, setShowEffect] = useState(false);
  const [stageMode, setStageMode] = useState(false);
  const [playData, setPlayData] = useState<{ rects: Rect[]; chars: CharInfo[] } | null>(null);

  const { progress, play, stop } = useEffectDriver();
  const touch = useSharedValue({ x: 0, y: 0, active: 0 });
  const reveal = useSharedValue<number[]>([]);

  const inputRef = useRef<TextInput>(null);
  const effectTextRef = useRef<EffectTextHandle>(null);

  const onChangeText = (t: string) => {
    if (countGraphemes(t) <= MAX_GRAPHEMES) setText(t);
  };

  const exitToEdit = useCallback(() => {
    stop();
    setMode('edit');
    setShowEffect(false);
    setActive(null);
    setPlayData(null);
    inputRef.current?.focus();
  }, [stop]);

  const onChipPress = (effect: TextEffect) => {
    if (!text.trim()) setText(FALLBACK_TEXT);
    setActive(effect);
    setMode('play');
    setPlayId((id) => id + 1);
  };

  // Each play: wait for the char-rect registry, then start the master clock.
  useEffect(() => {
    if (playId === 0 || !active) return;
    let cancelled = false;
    (async () => {
      const data = await effectTextRef.current?.prepare();
      if (!data || cancelled) return;
      reveal.value = new Array(data.chars.length).fill(0);
      setPlayData(data);
      setShowEffect(true);
      play(active);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId]);

  const tap = Gesture.Tap()
    .enabled(mode === 'play')
    .maxDistance(8)
    .onEnd(() => {
      scheduleOnRN(exitToEdit);
    });
  const pan = Gesture.Pan()
    .enabled(mode === 'play' && !!active?.hidesBaseText)
    .minDistance(5)
    .onBegin((e) => {
      touch.value = { x: e.absoluteX, y: e.absoluteY, active: 1 };
    })
    .onUpdate((e) => {
      touch.value = { x: e.absoluteX, y: e.absoluteY, active: 1 };
    })
    .onFinalize((e) => {
      touch.value = { x: e.absoluteX, y: e.absoluteY, active: 0 };
    });
  const stageGesture = Gesture.Race(pan, tap);

  const displayedText = text.trim() ? text : FALLBACK_TEXT;

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={stageMode} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
          <Pressable onLongPress={() => setStageMode((s) => !s)} hitSlop={16}>
            <Text style={[styles.wordmark, stageMode && styles.wordmarkHidden]}>TextFX</Text>
          </Pressable>
          <GestureDetector gesture={stageGesture}>
            <View style={styles.stage}>
              <TextInput
                ref={inputRef}
                multiline
                autoFocus
                value={text}
                onChangeText={onChangeText}
                keyboardAppearance="dark"
                selectionColor={theme.accent}
                allowFontScaling={false}
                scrollEnabled={false}
                style={[styles.input, showEffect && styles.hidden]}
              />
              {text === '' && mode === 'edit' && <PlaceholderShimmer />}
              {mode === 'play' && (
                <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.effectWrap]}>
                  <View style={!showEffect && styles.hidden}>
                    <EffectText
                      ref={effectTextRef}
                      key={`${displayedText}-${active?.id}`}
                      text={displayedText}
                      effect={active}
                      playId={playId}
                      progress={progress}
                      touch={touch}
                      reveal={reveal}
                    />
                  </View>
                </View>
              )}
            </View>
          </GestureDetector>
          <EffectChips effects={EFFECTS} activeId={mode === 'play' ? (active?.id ?? null) : null} onPress={onChipPress} />
        </SafeAreaView>
      </KeyboardAvoidingView>
      <OverlayHost
        effect={active}
        playId={playId}
        visible={showEffect}
        rects={playData?.rects ?? null}
        chars={playData?.chars ?? null}
        progress={progress}
        touch={touch}
        reveal={reveal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  flex: {
    flex: 1,
  },
  wordmark: {
    alignSelf: 'center',
    marginTop: 8,
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  wordmarkHidden: {
    opacity: 0,
  },
  stage: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  input: {
    ...stageText,
    fontWeight: stageText.fontWeight as '600',
    textAlign: 'center',
    paddingVertical: 0,
  },
  effectWrap: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hidden: {
    opacity: 0,
  },
  placeholderWrap: {
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholder: {
    ...stageText,
    fontWeight: stageText.fontWeight as '600',
    color: theme.text,
    textAlign: 'center',
  },
});
