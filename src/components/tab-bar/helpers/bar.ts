import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

import { space } from '../../../theme/tokens';
import { layout, motion } from '../tokens';

export const rowInset = space[4];
export const inlinePad = layout.tabBarInlinePadding;
export const fullHeight = layout.tabBarHeight;
/** The room the bar has on a screen this wide: the screen, inset at its sides. The bar fits its tabs within it. */
export const barSpanFor = (width: number) => width - layout.tabBarSideInset * 2;
export const lensFullHeight = fullHeight - rowInset * 2;
export const lensCompactScaleY = (layout.tabBarCompactHeight - rowInset * 2) / lensFullHeight;
export const labelShift = layout.tabLabelHeight / 2;
export const modeHeight = layout.searchModeHeight;
export const modeInset = (fullHeight - modeHeight) / 2;
export const modeRadius = modeHeight / 2;
export const modeShrink = modeHeight / fullHeight;
export const fieldGlyphCenter =
  modeInset + modeHeight + layout.searchModeGap + layout.searchFieldInset + layout.searchFieldIconSize / 2;
/** The search field at the system's font scale, as iOS 27 fits it to its text size (layout.searchFieldGrowth). */
export const searchFieldFit = (fontScale: number) => {
  const { text: base, glyphUpTo, rate, base: lift, clearUpTo, clearRate } = layout.searchFieldGrowth;
  const text = base * fontScale;
  const clear = text <= clearUpTo ? text : Math.max(clearUpTo, text * clearRate);
  return {
    // How far the field reaches above its 48pt row, and how big its clear button is against its 17pt.
    rise: Math.max(0, rate * text + lift - modeHeight),
    glyph: text < glyphUpTo,
    clearScale: clear / base,
  };
};

export type SearchFieldFit = ReturnType<typeof searchFieldFit>;

export const tabBarGroup = 'tabbar';
export const screenGroup = 'default';
export const revealGroup = 'tabbar-reveal';

export const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

export const lerp = (from: number, to: number, progress: number) => {
  'worklet';
  return from + (to - from) * progress;
};

/** How far `at` is past `low` to `high`, signed, in points, up to the pull's reach (motion.pull). */
export const pastEdge = (at: number, low: number, high: number) => {
  'worklet';
  const past = at < low ? at - low : at > high ? at - high : 0;
  return Math.max(-motion.pull.reach, Math.min(motion.pull.reach, past));
};

/**
 * A pressed shape pulled toward a finger dragged off it (motion.pull): how much longer across (`x`) and down (`y`), and
 * how far its middle moves.
 */
export const pullBy = (
  pull: { x: number; y: number },
  press: number,
  { stretch, shift }: { stretch: number; shift: number },
) => {
  'worklet';
  const x = pull.x * press;
  const y = pull.y * press;
  const long = stretch * (Math.abs(x) - Math.abs(y));
  return { x: 1 + long, y: 1 - long, shiftX: x * shift, shiftY: y * shift };
};

export const tick = () => {
  performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
};
