import { withSequence, useSharedValue, withSpring } from 'react-native-reanimated';

import { motion } from '../tokens';

export type GlassPress = ReturnType<typeof useGlassPress>;

/**
 * A glass shape's press, from 0 to 1 on the press spring. `full`: a quick tap still swells it all the way before it
 * settles back, as iOS's search field does under its clear button however briefly it's touched.
 */
export const useGlassPress = (full = false) => {
  const press = useSharedValue(0);

  return {
    press,
    onPressIn: () => press.set(withSpring(1, motion.springs.press)),
    onPressOut: () =>
      press.set(
        full && press.get() < 1
          ? withSequence(withSpring(1, motion.springs.press), withSpring(0, motion.springs.press))
          : withSpring(0, motion.springs.press),
      ),
  };
};
