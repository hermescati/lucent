import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * After `@expo/ui`'s SwiftUI `ContentUnavailableView`, with the symbol as `sf` + `md` (Lucent's icon convention, as in
 * `NativeTabs.Trigger.Icon`). It fills the space it's given and centres its content, as SwiftUI's does.
 */
export interface ContentUnavailableViewProps {
  /** A short title that says why there's nothing here. */
  title?: string;
  /** An SF Symbol above the title, on iOS. */
  sf?: SFSymbol;
  /** Lucent. A Material Symbol above the title, on Android. */
  md?: AndroidSymbol;
  /** What happened, or what to do about it. */
  description?: string;
  /** Controls below the description, such as a `Button` that tries again. */
  actions?: ReactNode;
  testID?: string;
  /** Layout only: margins, alignment and size. */
  style?: StyleProp<ViewStyle>;
}
