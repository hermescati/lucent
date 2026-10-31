import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

import { space } from '../../../theme/tokens';
import { layout } from '../tokens';

export const rowInset = space[4];
export const inlinePad = layout.tabBarInlinePadding;
export const fullHeight = layout.tabBarHeight;
export const lensFullHeight = fullHeight - rowInset * 2;
export const lensCompactScaleY = (layout.tabBarCompactHeight - rowInset * 2) / lensFullHeight;
export const labelShift = layout.tabLabelHeight / 2;
export const modeHeight = layout.searchModeHeight;
export const modeInset = (fullHeight - modeHeight) / 2;
export const modeRadius = modeHeight / 2;
export const modeShrink = modeHeight / fullHeight;
export const fieldGlyphCenter =
  modeInset + modeHeight + layout.searchModeGap + layout.searchFieldInset + layout.searchFieldIconSize / 2;
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

export const tick = () => {
  performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
};
