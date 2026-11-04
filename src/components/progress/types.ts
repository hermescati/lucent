import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Lucent's `ProgressView`, after SwiftUI's: `@expo/ui` has no universal one. A value draws a bar; without one, a
 * spinner, for work of unknown length.
 */
export interface ProgressViewProps {
  /** How far along, from 0 to 1. Leave it out for a spinner. */
  value?: number | null;
  /** What's in progress: below the spinner, or above the bar. */
  label?: string;
  /** The bar's fill. Without it, the app's accent (`LucentProvider`'s `tintColor`). The spinner stays grey, as on iOS. */
  tintColor?: string;
  /** Hidden, though still taking its room. */
  hidden?: boolean;
  testID?: string;
  /** Layout only: margins, alignment and size. */
  style?: StyleProp<ViewStyle>;
}
