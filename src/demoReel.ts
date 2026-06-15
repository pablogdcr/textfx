/**
 * Hands-free demo reel for screen recording.
 *
 * Each beat plays out like a real person demoing the app, keyboard open:
 *   type the phrase letter-by-letter → play the effect → fast-delete it
 *   letter-by-letter → next beat. The reel auto-starts on launch and loops, so
 *   you just hit record. Tap the stage to take over manually.
 *
 * Two beats are special, for a stronger viral cut:
 *   - The first beat sets `snap: true` so the text appears instantly and the
 *     effect punches in frame one (hook), instead of a slow type-in.
 *   - The last beat is NOT deleted (the beat after it snaps), so the
 *     celebratory finale is held on screen and the loop hard-cuts back to the
 *     hook — the closing question is never reverse-typed away.
 *
 * Read top-to-bottom the phrases form one pitch that ends on the question:
 *   iOS text effects → Rebuilt in React Native → Pure JS + Skia
 *   → Buttery smooth 60fps → Worth open-sourcing?
 *
 * `effectId` must match an `id` in src/effects (see EFFECTS). Lines wrap and
 * centre automatically (the stage splits on whitespace and flex-wraps).
 * Whole loop lands ≈ 11.5s, inside a 9–12s post.
 */
export interface DemoBeat {
  text: string;
  effectId: string;
  /** How long the effect plays before the phrase is deleted (ms). */
  hold: number;
  /** Set the text instantly instead of typing it in (used for the hook). */
  snap?: boolean;
  /**
   * Present the full phrase and play the in-place Decode reveal on it (green
   * matrix scramble resolving to white, left-to-right). No type-in — the decode
   * is the entrance. `hold` covers the resolve plus a readable pause.
   */
  revealWhileTyping?: boolean;
  /**
   * Finale wall: hide the keyboard and show every text effect animating at once
   * (see EffectShowcase). No text/effectId — `hold` is how long the wall holds.
   */
  showcase?: boolean;
}

export const DEMO_REEL: DemoBeat[] = [
  { text: 'iOS text effects', effectId: 'slam', hold: 1000, snap: true },
  { text: 'Rebuilt in React Native', effectId: 'decode', hold: 1900, revealWhileTyping: true },
  { text: 'Buttery smooth 60fps', effectId: 'wave', hold: 1000 },
  { text: 'Pure JS + Skia', effectId: 'glitch', hold: 950 },
  { text: 'Worth open-sourcing? 🎉', effectId: 'fireworks', hold: 2200 },
  { text: '', effectId: '', hold: 5000, showcase: true },
];

/** Idle beat before the hook punches in, so the opening isn't abrupt. */
export const DEMO_START_DELAY_MS = 400;
/** Per-character cadence while typing a phrase in (fast, but legibly typed). */
export const DEMO_TYPE_MS = 30;
/** Per-character cadence while deleting a phrase out (snappier than typing). */
export const DEMO_DELETE_MS = 16;
/** Pause after a phrase is fully typed, before the effect fires. */
export const DEMO_PRE_EFFECT_MS = 160;
/** Shorter pause for a snapped (hook) beat, so the effect punches immediately. */
export const DEMO_SNAP_PRE_EFFECT_MS = 60;
/** Pause after the effect ends, before the delete starts. */
export const DEMO_POST_EFFECT_MS = 140;
/** Gap between one beat being cleared and the next being typed. */
export const DEMO_BETWEEN_MS = 120;
