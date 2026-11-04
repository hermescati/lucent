import type { SharedValue } from 'react-native-reanimated';

import { createLucentContext } from '../../../theme/context';
import { bar, barMotion } from '../tokens';

/** How far a bar's buttons have melted away, 0 at rest to 1 gone, for the glass that draws them. */
export const BarMeltContext = createLucentContext<SharedValue<number> | null>('BarMelt', null);

const smooth = (from: number, to: number, value: number) => {
  'worklet';
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

/** The melt's look, `melt` 0 to 1: blurred first, then swelling and running together as it fades. */
export const meltLook = (melt: number) => {
  'worklet';
  return {
    opacity: 1 - smooth(0.15, 0.8, melt),
    scale: 1 + barMotion.meltGrow * smooth(0.05, 0.55, melt),
    blur: barMotion.swipeBlur * Math.min(melt / 0.15, 1),
    blend: bar.bridge + barMotion.meltBridge * smooth(0.15, 0.55, melt),
  };
};
