import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import { useDerivedValue } from 'react-native-reanimated';

import { motion } from '../tokens';

export const useKeyboard = () => {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const shown = useDerivedValue(() => {
    const value = progress.get();
    return value > 0 && -height.get() / value >= motion.searchKeyboard.minHeight ? value : 0;
  });
  return { height, progress: shown };
};
