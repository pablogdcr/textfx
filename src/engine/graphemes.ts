import { graphemeSegments } from 'unicode-segmenter/grapheme';
import type { CharInfo } from './types';

export interface Word {
  wordIndex: number;
  chars: CharInfo[];
}

function hash01(str: string, salt: number): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function split(text: string): string[] {
  // Hermes 0.16 has no Intl.Segmenter; feature-detect so this upgrades for free.
  const Seg = (Intl as any)?.Segmenter;
  if (typeof Seg === 'function') {
    return Array.from(new Seg(undefined, { granularity: 'grapheme' }).segment(text), (s: any) => s.segment);
  }
  return Array.from(graphemeSegments(text), (s) => s.segment);
}

/**
 * Split text into whitespace-separated words of grapheme clusters.
 * `index` is the flat animatable-char index across all words (spaces excluded).
 */
export function splitWords(text: string): { words: Word[]; chars: CharInfo[] } {
  const words: Word[] = [];
  const chars: CharInfo[] = [];
  const rawWords = text.split(/\s+/).filter((w) => w.length > 0);
  let index = 0;
  for (let wi = 0; wi < rawWords.length; wi++) {
    const graphemes = split(rawWords[wi]);
    const word: Word = { wordIndex: wi, chars: [] };
    for (let ci = 0; ci < graphemes.length; ci++) {
      const info: CharInfo = {
        index: index,
        count: 0, // patched below
        char: graphemes[ci],
        wordIndex: wi,
        indexInWord: ci,
        seed: hash01(graphemes[ci], index * 31 + wi),
      };
      word.chars.push(info);
      chars.push(info);
      index++;
    }
    words.push(word);
  }
  for (const c of chars) c.count = chars.length;
  return { words, chars };
}

export function countGraphemes(text: string): number {
  return split(text).length;
}
