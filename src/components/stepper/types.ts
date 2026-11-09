import type { StyleProp, ViewStyle } from 'react-native';

/**
 * Lucent's `Stepper`, after SwiftUI's: `@expo/ui` has no universal one. Minus and plus buttons that step `value`
 * between `min` and `max`; each side disables at its end.
 */
export interface StepperProps {
  /** Whole numbers on iOS, where `@expo/ui`'s stepper counts in integers; so are `min`, `max` and `step`. */
  value: number;
  onValueChange: (value: number) => void;
  /** @default 0 */
  min?: number;
  /** @default 100 */
  max?: number;
  /** @default 1 */
  step?: number;
  /** With a label, the stepper is a full-width row with the label at its leading edge, as in an iOS list. */
  label?: string;
  disabled?: boolean;
  /** Hidden, though still taking its room. */
  hidden?: boolean;
  testID?: string;
  /** Layout only: margins, alignment and size. */
  style?: StyleProp<ViewStyle>;
}
