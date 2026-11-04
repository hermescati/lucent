import { requireNativeView } from 'expo';
import type { ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

/** One step of Android's back, as the activity hands it over: `x` in dp, `progress` 0 to 1. */
export interface BackStep {
  type: 'start' | 'progress' | 'cancel' | 'commit' | 'press';
  x?: number;
  progress?: number;
  fromRight?: boolean;
}

interface Props extends ViewProps {
  // Takes back from the activity while true.
  enabled: boolean;
  onBack?: unknown;
}

const NativePredictiveBack = requireNativeView<Props>('Lucent', 'LucentPredictiveBackView');

/** Android's back, given to a worklet as it goes; see `PredictiveBackView.kt`. */
export const AnimatedPredictiveBack = Animated.createAnimatedComponent(NativePredictiveBack);
