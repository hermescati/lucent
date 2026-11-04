import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

interface Props extends ViewProps {
  // Watches for the screen coming in while true.
  armed: boolean;
  onEnter?: unknown;
}

const NativeScreenEnter = requireNativeView<Props>('Lucent', 'LucentScreenEnterView');

/**
 * Says when a screen Lucent pushes starts coming in, to a worklet, on the UI thread; see `ScreenEnterView.kt`. It also
 * takes react-native-screens' own animation off the screen, which Lucent slides in itself.
 */
export const AnimatedScreenEnter = Animated.createAnimatedComponent(NativeScreenEnter);
