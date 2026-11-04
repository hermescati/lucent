import { useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { motion } from '../tokens';

export type GlassPress = ReturnType<typeof useGlassPress>;

/**
 * A glass shape's press, on the press spring: up to `peak` (1 unless a press says otherwise) and back to 0. `full`: a
 * quick tap still swells it all the way before it settles back, as iOS's search field does however briefly it's
 * touched.
 */
export const useGlassPress = (full = false) => {
  const press = useSharedValue(0);
  const top = useSharedValue(1);

  return {
    press,
    onPressIn: (peak = 1) => {
      top.set(peak);
      press.set(withSpring(peak, motion.springs.press));
    },
    onPressOut: () =>
      press.set(
        full && press.get() < top.get()
          ? withSequence(withSpring(top.get(), motion.springs.press), withSpring(0, motion.springs.press))
          : withSpring(0, motion.springs.press),
      ),
  };
};
