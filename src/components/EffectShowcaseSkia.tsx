import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Glyphs, Group, matchFont } from '@shopify/react-native-skia';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { EFFECTS } from '../effects';
import type { CharInfo, EffectCtx, TextEffect } from '../engine/types';
import { theme } from '../theme';

// Single shared Skia font (system, matches the stage). matchFont is synchronous.
const FONT = matchFont({ fontFamily: 'System', fontSize: 30, fontWeight: '600' });
const LINE_H = 46;
const SEP_GAP = 26;
const DRIFT = 56;
const DEFAULT_COLOR = theme.text;

interface Cell {
  text: string;
  effectId: string;
}
interface Line {
  dir: 'left' | 'right';
  cells: Cell[];
}

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

export const SHOWCASE_EFFECT_IDS: string[] = Array.from(
  new Set(SHOWCASE_LINES.flatMap((l) => l.cells.map((c) => c.effectId))),
);

const byId = new Map(EFFECTS.map((e) => [e.id, e]));
const M = FONT.getMetrics();
const BASELINE_OFFSET = -((M.ascent + M.descent) / 2); // ascent is negative
const SEP_GLYPH = FONT.getGlyphIDs('•')[0];
const SEP_W = FONT.getGlyphWidths([SEP_GLYPH])[0] + SEP_GAP * 2;

// RN transforms use `rotate: "4deg"`; Skia wants radians (number). Normalise.
function normTransform(t: any): any[] {
  'worklet';
  if (!t || !t.length) return [];
  const out = [];
  for (let i = 0; i < t.length; i++) {
    const it = t[i];
    if (it.rotate !== undefined && typeof it.rotate === 'string') {
      out.push({ rotate: (parseFloat(it.rotate) * Math.PI) / 180 });
    } else {
      out.push(it);
    }
  }
  return out;
}

interface LaidGlyph {
  id: number;
  x: number;
  cx: number;
  info: CharInfo;
}
interface LaidCell {
  effect: TextEffect | null; // null = static separator dot
  cx: number; // cell centre (origin for container transforms)
  glyphs: LaidGlyph[];
}
interface LaidLine {
  dir: 'left' | 'right';
  width: number;
  cells: LaidCell[];
}

function hash01(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

function layoutLine(line: Line): LaidLine {
  const cells: LaidCell[] = [];
  let x = 0;
  line.cells.forEach((cell, ci) => {
    if (ci > 0) {
      cells.push({
        effect: null,
        cx: x + SEP_GAP,
        glyphs: [{ id: SEP_GLYPH, x: x + SEP_GAP, cx: x + SEP_GAP, info: blankInfo() }],
      });
      x += SEP_W;
    }
    const effect = byId.get(cell.effectId) ?? null;
    const ids = FONT.getGlyphIDs(cell.text);
    const widths = FONT.getGlyphWidths(ids);
    const count = cell.text.replace(/\s/g, '').length || ids.length;
    const start = x;
    const glyphs: LaidGlyph[] = [];
    let idx = 0;
    for (let i = 0; i < ids.length; i++) {
      const ch = cell.text[i];
      const w = widths[i];
      if (ch !== ' ') {
        glyphs.push({
          id: ids[i],
          x,
          cx: x + w / 2,
          info: { index: idx, count, char: ch, wordIndex: ci, indexInWord: i, seed: hash01(ch, idx * 31 + ci) },
        });
        idx++;
      }
      x += w;
    }
    cells.push({ effect, cx: (start + x) / 2, glyphs });
  });
  return { dir: line.dir, width: x, cells };
}

function blankInfo(): CharInfo {
  return { index: 0, count: 1, char: '•', wordIndex: 0, indexInWord: 0, seed: 0 };
}

function StaticGlyph({ g, baseY }: { g: LaidGlyph; baseY: number }) {
  return <Glyphs font={FONT} x={g.x} y={baseY} glyphs={[{ id: g.id, pos: { x: 0, y: 0 } }]} color={theme.textDim} />;
}

function GlyphNode({
  g,
  effect,
  progress,
  ctx,
  baseY,
}: {
  g: LaidGlyph;
  effect: TextEffect;
  progress: SharedValue<number>;
  ctx: EffectCtx;
  baseY: number;
}) {
  const fn = effect.charStyle;
  const style = useDerivedValue(() => (fn ? fn(progress.value, g.info, ctx) : {}) as any);
  const transform = useDerivedValue<any>(() => normTransform(style.value.transform));
  const opacity = useDerivedValue<number>(() => style.value.opacity ?? 1);
  const color = useDerivedValue<string>(() => style.value.color ?? DEFAULT_COLOR);
  const layers = effect.charLayers ?? [];
  return (
    <Group transform={transform} origin={{ x: g.cx, y: baseY }} opacity={opacity}>
      {layers.map((layer, li) => (
        <LayerGlyph key={li} g={g} layer={layer} progress={progress} ctx={ctx} baseY={baseY} />
      ))}
      <Glyphs font={FONT} x={g.x} y={baseY} glyphs={[{ id: g.id, pos: { x: 0, y: 0 } }]} color={color} />
    </Group>
  );
}

function LayerGlyph({
  g,
  layer,
  progress,
  ctx,
  baseY,
}: {
  g: LaidGlyph;
  layer: NonNullable<TextEffect['charLayers']>[number];
  progress: SharedValue<number>;
  ctx: EffectCtx;
  baseY: number;
}) {
  const transform = useDerivedValue<any>(() => normTransform(layer.charStyle(progress.value, g.info, ctx).transform));
  return (
    <Group transform={transform} origin={{ x: g.cx, y: baseY }}>
      <Glyphs font={FONT} x={g.x} y={baseY} glyphs={[{ id: g.id, pos: { x: 0, y: 0 } }]} color={layer.color} />
    </Group>
  );
}

function CellNode({
  cell,
  progress,
  ctx,
  baseY,
}: {
  cell: LaidCell;
  progress: SharedValue<number>;
  ctx: EffectCtx;
  baseY: number;
}) {
  const container = cell.effect?.containerStyle;
  const containerTransform = useDerivedValue<any>(() =>
    container ? normTransform(container(progress.value)) : [],
  );
  const glyphs = cell.glyphs.map((g, i) =>
    cell.effect ? (
      <GlyphNode key={i} g={g} effect={cell.effect} progress={progress} ctx={ctx} baseY={baseY} />
    ) : (
      <StaticGlyph key={i} g={g} baseY={baseY} />
    ),
  );
  if (container) {
    return (
      <Group transform={containerTransform} origin={{ x: cell.cx, y: baseY }}>
        {glyphs}
      </Group>
    );
  }
  return <>{glyphs}</>;
}

function MarqueeLine({ line, centerY, centerX }: { line: LaidLine; centerY: number; centerX: number }) {
  const tx = useSharedValue(0);
  const progress = useSharedValue(0);
  const ctx: EffectCtx = {
    rect: undefined,
    touch: useSharedValue({ x: 0, y: 0, active: 0 }),
    reveal: useSharedValue<number[]>([]),
  };

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.linear }), -1, false);
    tx.value = withTiming(line.dir === 'left' ? -DRIFT : DRIFT, { duration: 6000, easing: Easing.linear });
  }, [line.dir, progress, tx]);

  const x0 = centerX - line.width / 2;
  const baseY = centerY + BASELINE_OFFSET;
  const groupTransform = useDerivedValue<any>(() => [{ translateX: x0 + tx.value }]);

  return (
    <Group transform={groupTransform}>
      {line.cells.map((cell, i) => (
        <CellNode key={i} cell={cell} progress={progress} ctx={ctx} baseY={baseY} />
      ))}
    </Group>
  );
}

/** Finale wall, drawn in a single Skia canvas — one GPU pass instead of ~300 native text views. */
export function EffectShowcase() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const lines = useMemo(() => SHOWCASE_LINES.map(layoutLine), []);

  return (
    <View
      style={styles.fill}
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {size.h > 0 && FONT && (
        <Canvas style={{ width: size.w, height: size.h }}>
          {lines.map((line, i) => (
            <MarqueeLine
              key={i}
              line={line}
              centerX={size.w / 2}
              centerY={size.h / 2 + (i - (lines.length - 1) / 2) * LINE_H}
            />
          ))}
        </Canvas>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: -24,
    right: -24,
  },
});
