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
import {
  DEMO_BETWEEN_MS,
  DEMO_DELETE_MS,
  DEMO_POST_EFFECT_MS,
  DEMO_PRE_EFFECT_MS,
  DEMO_REEL,
  DEMO_SNAP_PRE_EFFECT_MS,
  DEMO_START_DELAY_MS,
  DEMO_TYPE_MS,
} from '../demoReel';
import { EFFECTS } from '../effects';
import { decodeReveal } from '../effects/decodeReveal';
import { EffectShowcase, SHOWCASE_EFFECT_IDS } from './EffectShowcase';
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
  // Hands-free demo reel: auto-plays on launch for screen recording, loops until
  // the user taps the stage to take over.
  const [demo, setDemo] = useState(true);
  // chip the demo is currently on — lights/scrolls the rail even during the
  // type-in phases (and the in-input Decode reveal, which fires no Skia effect).
  const [demoChipId, setDemoChipId] = useState<string | null>(null);
  // finale wall: every text effect animating at once (keyboard hidden).
  const [showcase, setShowcase] = useState(false);
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

  // Director: drive the reel hands-free like a live demo — type the phrase in
  // letter-by-letter, fire the effect on it, fast-delete it, then the next beat.
  // Keyboard stays open throughout; the effect-play pipeline ([playId] above)
  // takes over once we bump playId.
  useEffect(() => {
    if (!demo) return;
    const byId = new Map(EFFECTS.map((e) => [e.id, e]));
    let cancelled = false;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        const t = setTimeout(() => {
          timers.delete(t);
          resolve();
        }, ms);
        timers.add(t);
      });

    const toEdit = () => {
      stop();
      setMode('edit');
      setShowEffect(false);
      setActive(null);
      setPlayData(null);
      inputRef.current?.focus();
    };

    const run = async () => {
      await wait(DEMO_START_DELAY_MS);
      for (let i = 0; !cancelled; i++) {
        const beat = DEMO_REEL[i % DEMO_REEL.length];
        const next = DEMO_REEL[(i + 1) % DEMO_REEL.length];

        if (beat.showcase) {
          // finale wall: clear the stage and show every effect at once. Keyboard
          // stays open (input keeps focus); the chip rail lights up all of them.
          stop();
          setMode('edit');
          setShowEffect(false);
          setActive(null);
          setPlayData(null);
          setText('');
          setDemoChipId(null);
          inputRef.current?.focus();
          setShowcase(true);
          await wait(beat.hold);
          if (cancelled) return;
          setShowcase(false);
          continue;
        }

        // the reveal beat plays the in-place left-to-right Decode on the full phrase
        const effect = beat.revealWhileTyping ? decodeReveal : (byId.get(beat.effectId) ?? null);
        if (!effect) continue;

        toEdit();
        setDemoChipId(beat.effectId); // light + scroll the rail to this beat's chip

        // bring the phrase up — reveal/hook beats set it instantly (the effect or
        // the snap is the entrance); the rest type it in letter by letter
        if (beat.snap || beat.revealWhileTyping) {
          setText(beat.text);
        } else {
          for (let n = 1; n <= beat.text.length && !cancelled; n++) {
            setText(beat.text.slice(0, n));
            await wait(DEMO_TYPE_MS);
          }
        }
        if (cancelled) return;
        await wait(beat.revealWhileTyping ? 0 : beat.snap ? DEMO_SNAP_PRE_EFFECT_MS : DEMO_PRE_EFFECT_MS);

        // fire the effect on the phrase
        setActive(effect);
        setMode('play');
        setPlayId((id) => id + 1);
        await wait(beat.hold);
        if (cancelled) return;
        await wait(DEMO_POST_EFFECT_MS);

        // delete out, letter by letter — unless the next beat snaps or the wall
        // takes over. That keeps the celebratory finale held until it hard-cuts.
        if (!next.snap && !next.showcase) {
          toEdit();
          for (let n = beat.text.length - 1; n >= 0 && !cancelled; n--) {
            setText(beat.text.slice(0, n));
            await wait(DEMO_DELETE_MS);
          }
          if (cancelled) return;
          await wait(DEMO_BETWEEN_MS);
        }
      }
    };
    run();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [demo, stop]);

  // Tapping the stage stops the demo and hands control back to the user.
  const stopDemoToEdit = useCallback(() => {
    setDemo(false);
    setDemoChipId(null);
    setShowcase(false);
    exitToEdit();
  }, [exitToEdit]);

  const tap = Gesture.Tap()
    .enabled(mode === 'play')
    .maxDistance(8)
    .onEnd(() => {
      scheduleOnRN(stopDemoToEdit);
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
                // kill the QuickType suggestion strip — it's noisy and outs the sim
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                keyboardType="ascii-capable"
                keyboardAppearance="dark"
                selectionColor={theme.accent}
                allowFontScaling={false}
                scrollEnabled={false}
                style={[styles.input, (showEffect || showcase) && styles.hidden]}
              />
              {showcase && <EffectShowcase />}
              {text === '' && mode === 'edit' && !demo && !showcase && <PlaceholderShimmer />}
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
          <EffectChips
            effects={EFFECTS}
            activeId={active?.id ?? demoChipId}
            activeIds={showcase ? SHOWCASE_EFFECT_IDS : undefined}
            onPress={onChipPress}
          />
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
