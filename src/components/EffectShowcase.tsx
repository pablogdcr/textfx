import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { EFFECTS } from '../effects';
import { theme } from '../theme';
import { EffectText } from './EffectText';

interface Cell {
  text: string;
  effectId: string;
}
interface Line {
  dir: 'left' | 'right';
  cells: Cell[];
}

// Mix of hype + pitch. Each line is wide enough to overflow both edges so the
// gentle drift never reveals empty space (no duplicate copy needed). Glitch is
// used sparingly — its RGB layers cost 3× per character.
const SHOWCASE_LINES: Line[] = [
  { dir: 'left', cells: [
    { text: 'iOS effects', effectId: 'shimmer' },
    { text: 'Ship it', effectId: 'slam' },
    { text: 'all JS', effectId: 'glitch' },
    { text: '60fps', effectId: 'bounce' },
  ] },
  { dir: 'right', cells: [
    { text: 'So smooth', effectId: 'wave' },
    { text: 'No way', effectId: 'loud' },
    { text: 'pure Skia', effectId: 'gentle' },
    { text: 'Wow', effectId: 'bounce' },
  ] },
  { dir: 'left', cells: [
    { text: 'React Native', effectId: 'gentle' },
    { text: 'Open it?', effectId: 'slam' },
    { text: 'Insane', effectId: 'loud' },
    { text: 'one API', effectId: 'shimmer' },
  ] },
  { dir: 'right', cells: [
    { text: 'It works!', effectId: 'bounce' },
    { text: 'Need this', effectId: 'wave' },
    { text: 'Star it', effectId: 'slam' },
    { text: 'Reanimated', effectId: 'gentle' },
  ] },
  { dir: 'left', cells: [
    { text: 'no native code', effectId: 'wave' },
    { text: 'Skia', effectId: 'shimmer' },
    { text: '60fps?!', effectId: 'glitch' },
    { text: 'Take it', effectId: 'bounce' },
  ] },
];

/** Effects shown on the wall — their chips light up blue while it plays. */
export const SHOWCASE_EFFECT_IDS: string[] = Array.from(
  new Set(SHOWCASE_LINES.flatMap((l) => l.cells.map((c) => c.effectId))),
);

const DRIFT = 56; // px each line slides over the wall's lifetime (stays overflowing)
const CELL_STAGGER = 90; // delay between cells starting to loop
const LINE_STAGGER = 120; // delay between lines
const byId = new Map(EFFECTS.map((e) => [e.id, e]));

function ShowcaseCell({ cell, delay }: { cell: Cell; delay: number }) {
  const effect = byId.get(cell.effectId);
  const progress = useSharedValue(0);
  const touch = useSharedValue({ x: 0, y: 0, active: 0 });
  const reveal = useSharedValue<number[]>([]);
  useEffect(() => {
    if (!effect) return;
    progress.value = 0;
    // staggered start so the loops don't all reset in sync
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: effect.duration, easing: Easing.linear }), -1, false),
    );
  }, [effect, delay, progress]);
  if (!effect) return null;
  return (
    <View style={styles.cell}>
      <EffectText
        text={cell.text}
        effect={effect}
        playId={1}
        progress={progress}
        touch={touch}
        reveal={reveal}
        wrap={false}
      />
    </View>
  );
}

function MarqueeLine({ line, lineIndex }: { line: Line; lineIndex: number }) {
  const tx = useSharedValue(0);
  useEffect(() => {
    // a single slow drift over the wall's lifetime — content overflows enough
    // that this never exposes an empty edge
    tx.value = withTiming(line.dir === 'left' ? -DRIFT : DRIFT, {
      duration: 6000,
      easing: Easing.linear,
    });
  }, [line.dir, tx]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  return (
    <View style={styles.lineClip}>
      <Animated.View style={[styles.lineRow, anim]}>
        {line.cells.map((cell, i) => (
          <View key={i} style={styles.cellWrap}>
            <ShowcaseCell cell={cell} delay={lineIndex * LINE_STAGGER + i * CELL_STAGGER} />
            <Text style={styles.sep}>•</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

/**
 * Finale wall: short phrases overflowing both edges, several effects per line,
 * lines drifting in alternating directions and free to overlap. Lines mount
 * progressively (one per frame-ish) so the JS thread isn't blocked rendering the
 * whole wall at once. Keyboard stays open; the chip rail lights up every effect.
 */
export function EffectShowcase() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    if (count >= SHOWCASE_LINES.length) return;
    const t = setTimeout(() => setCount((c) => c + 1), 110);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <View style={styles.grid} pointerEvents="none">
      {SHOWCASE_LINES.slice(0, count).map((line, i) => (
        <MarqueeLine key={i} line={line} lineIndex={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -24, // bleed past the stage's horizontal padding to the screen edges
    right: -24,
    justifyContent: 'center',
    gap: 6,
  },
  lineClip: {
    width: '100%',
    alignItems: 'center', // overflow is NOT hidden — effects may overlap neighbours
  },
  lineRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
  },
  cellWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  cell: {
    flexShrink: 0,
    alignItems: 'center',
  },
  sep: {
    color: theme.textDim,
    fontSize: 30,
    fontWeight: '600',
    marginHorizontal: 14,
  },
});
