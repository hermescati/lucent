import type { ButtonProps as ExpoButtonProps } from '@expo/ui';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * `filled`, `outlined` and `text` are `@expo/ui`'s variants. `glass` and `glassProminent` (Lucent) are iOS 26's glass
 * buttons: clear glass, and glass tinted with the accent.
 */
export type ButtonVariant = 'filled' | 'outlined' | 'text' | 'glass' | 'glassProminent';

export type ButtonSize = 'small' | 'regular' | 'large';

/** An SF Symbol on iOS and a Material Symbol on Android, as in `NativeTabs.Trigger.Icon`. */
export interface ButtonIcon {
  sf?: SFSymbol;
  md?: AndroidSymbol;
}

export interface ButtonProps extends Omit<ExpoButtonProps, 'variant' | 'style'> {
  /** @default 'filled' */
  variant?: ButtonVariant;
  /** Lucent. Shown before the label; without a label the button is a circle. */
  icon?: ButtonIcon;
  /** Lucent. @default 'regular' */
  size?: ButtonSize;
  /** Lucent. Draws the button in red, for actions that delete or can't be undone. */
  destructive?: boolean;
  /** Lucent. Overrides the accent for this button. Without it, the button uses the app's accent (`LucentProvider`'s `tintColor`). */
  tintColor?: string;
  /** Lucent. Read by screen readers; needed for a button with only an icon. */
  accessibilityLabel?: string;
  /** Layout only: margins, alignment and size. */
  style?: StyleProp<ViewStyle>;
}
