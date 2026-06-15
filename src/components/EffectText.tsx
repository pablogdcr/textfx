import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type LayoutRectangle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { splitWords } from '../engine/graphemes';
import type { CharInfo, EffectCtx, Rect, TextEffect } from '../engine/types';
import { stageText } from '../theme';
import { Char } from './Char';

export interface EffectTextHandle {
  /** Resolves once every char rect is measured and composed into window coordinates. */
  prepare(): Promise<{ rects: Rect[]; chars: CharInfo[] }>;
}

interface Props {
  text: string;
  effect: TextEffect | null;
  /** Increments on every play; restarts the scramble loop. */
  playId: number;
  progress: SharedValue<number>;
  touch: EffectCtx['touch'];
  reveal: EffectCtx['reveal'];
  /** Allow words to wrap across lines (true for the centred stage; false keeps a phrase on one line). */
  wrap?: boolean;
}

const SPACE_SAMPLE = 10;

function EffectTextInner(
  { text, effect, playId, progress, touch, reveal, wrap = true }: Props,
  ref: ForwardedRef<EffectTextHandle>,
) {
  const { words, chars } = useMemo(() => splitWords(text), [text]);
  const [spaceW, setSpaceW] = useState<number | null>(null);
  const [rects, setRects] = useState<Rect[] | null>(null);
  const [lockedWidths, setLockedWidths] = useState<number[] | null>(null);
  const [displayChars, setDisplayChars] = useState<string[] | null>(null);

  const containerRef = useRef<View>(null);
  const wordRects = useRef(new Map<number, LayoutRectangle>());
  const charRels = useRef(new Map<number, LayoutRectangle>());
  const pending = useRef<((r: { rects: Rect[]; chars: CharInfo[] }) => void)[]>([]);
  const measuring = useRef(false);

  const tryResolve = () => {
    if (pending.current.length === 0 || measuring.current) return;
    if (spaceW == null) return;
    if (charRels.current.size !== chars.length || wordRects.current.size !== words.length) return;
    measuring.current = true;
    requestAnimationFrame(() => {
      const node = containerRef.current;
      if (!node) {
        measuring.current = false;
        return;
      }
      node.measureInWindow((ox, oy) => {
        const composed: Rect[] = chars.map((c) => {
          const w = wordRects.current.get(c.wordIndex)!;
          const r = charRels.current.get(c.index)!;
          return { x: ox + w.x + r.x, y: oy + w.y + r.y, width: r.width, height: r.height };
        });
        setRects(composed);
        if (effect?.scramble?.fixedWidth) setLockedWidths(composed.map((r) => Math.ceil(r.width)));
        measuring.current = false;
        pending.current.splice(0).forEach((res) => res({ rects: composed, chars }));
      });
    });
  };

  useImperativeHandle(ref, () => ({
    prepare: () =>
      new Promise((resolve) => {
        pending.current.push(resolve);
        tryResolve();
      }),
  }));

  // Scramble loop: reads the shared master clock so glyph swaps stay in sync
  // with charStyle worklets without separate start-time bookkeeping.
  useEffect(() => {
    const scramble = effect?.scramble;
    if (!scramble || playId === 0) {
      setDisplayChars(null);
      return;
    }
    const glyphs = scramble.glyphs;
    const tick = () => {
      const p = progress.value;
      if (p >= 1) {
        setDisplayChars(null);
        clearInterval(interval);
        return;
      }
      setDisplayChars(
        chars.map((c) => {
          if (c.char.length > 1) return c.char; // emoji / astral clusters stay put
          if (p >= scramble.lockAt(c)) return c.char;
          return glyphs[Math.floor(Math.random() * glyphs.length)];
        }),
      );
    };
    const interval = setInterval(tick, scramble.intervalMs ?? 33);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playId, effect]);

  const containerAnim = useAnimatedStyle(() => {
    if (!effect?.containerStyle) return { transform: [] };
    return effect.containerStyle(progress.value) as any;
  });

  const onWordLayout = (wordIndex: number, e: LayoutChangeEvent) => {
    wordRects.current.set(wordIndex, e.nativeEvent.layout);
    tryResolve();
  };
  const onCharLayout = (index: number, e: LayoutChangeEvent) => {
    charRels.current.set(index, e.nativeEvent.layout);
    tryResolve();
  };

  return (
    <View>
      <Text
        allowFontScaling={false}
        style={[styles.char, styles.measurer]}
        onLayout={(e) => setSpaceW(e.nativeEvent.layout.width / SPACE_SAMPLE)}
      >
        {' '.repeat(SPACE_SAMPLE)}
      </Text>
      {spaceW != null && (
        <Animated.View
          ref={containerRef}
          style={[styles.row, { columnGap: spaceW }, !wrap && styles.nowrap, containerAnim]}
          collapsable={false}
        >
          {words.map((word) => (
            <View key={word.wordIndex} style={styles.word} onLayout={(e) => onWordLayout(word.wordIndex, e)}>
              {word.chars.map((c) => (
                <Char
                  key={c.index}
                  info={c}
                  displayChar={displayChars?.[c.index] ?? c.char}
                  effect={effect}
                  progress={progress}
                  touch={touch}
                  reveal={reveal}
                  rect={rects?.[c.index]}
                  lockedWidth={lockedWidths?.[c.index]}
                  onLayout={onCharLayout}
                />
              ))}
            </View>
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  char: {
    ...stageText,
    fontWeight: stageText.fontWeight as '600',
  },
  measurer: {
    position: 'absolute',
    opacity: 0,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  nowrap: {
    flexWrap: 'nowrap',
  },
  word: {
    flexDirection: 'row',
  },
});

export const EffectText = forwardRef(EffectTextInner);
