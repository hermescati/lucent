import type { SharedValue } from 'react-native-reanimated';

import { createLucentContext } from '../../../theme/context';
import { bar, barMotion } from '../tokens';

/**
 * How far a bar's buttons have melted away, for the glass that draws them: 0 at rest, 1 gone. Going, it runs 0 to 1;
 * coming, -1 to 0, as they pop in a different way than they pop out.
 */
export const BarMeltContext = createLucentContext<SharedValue<number> | null>('BarMelt', null);

const smooth = (from: number, to: number, value: number) => {
  'worklet';
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * The melt's look. Going (`melt` 0 to 1): blurred first, then swelling and running together as it fades. Coming (-1 to
 * 0): each capsule grows out of a faint blob a little past its size, necked to its neighbours, and settles as the icons
 * sharpen (iOS 27 simulator, pushing to a screen with two buttons: 60% of its size by 16ms, 108% by 50 to 66ms, at rest
 * by about 200ms).
 */
export const meltLook = (melt: number) => {
  'worklet';
  if (melt < 0) {
    const gone = -melt;
    const { from, peak, at } = barMotion.meltCome;
    // The glass comes sharp and first; the icons on it come after, faint and blurred, and sharpen as it settles.
    return {
      opacity: 1 - smooth(at, 0.95, gone),
      scale: gone > at ? from + (peak - from) * smooth(0.95, at, gone) : 1 + (peak - 1) * smooth(0, at, gone),
      blur: 0,
      blend: bar.bridge + barMotion.meltBridge * smooth(0.15, at, gone),
      glyphOpacity: 1 - smooth(0.4, 0.9, gone),
      glyphBlur: barMotion.swipeBlur * smooth(0.05, 0.5, gone),
    };
  }
  return {
    glyphOpacity: 1,
    glyphBlur: 0,
    opacity: 1 - smooth(0.15, 0.8, melt),
    scale: 1 + barMotion.meltGrow * smooth(0.05, 0.55, melt),
    blur: barMotion.swipeBlur * Math.min(melt / 0.15, 1),
    blend: bar.bridge + barMotion.meltBridge * smooth(0.15, 0.55, melt),
  };
};
