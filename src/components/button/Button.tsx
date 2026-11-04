import { Host } from '@expo/ui';
import { Button as SwiftUIButton } from '@expo/ui/swift-ui';
import {
  accessibilityLabel as accessibilityLabelModifier,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  hidden as hiddenModifier,
  labelStyle,
  onAppear as onAppearModifier,
  onDisappear as onDisappearModifier,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { ReactElement } from 'react';

import type { ButtonProps, ButtonVariant } from './types';

// @expo/ui's variants map to these SwiftUI styles; the glass ones need iOS 26 and fall back to the closest style below it.
const buttonStyles = {
  filled: 'borderedProminent',
  outlined: 'bordered',
  text: 'plain',
  glass: 'glass',
  glassProminent: 'glassProminent',
} as const;

const fallbacks: Partial<Record<ButtonVariant, ButtonVariant>> = {
  glass: 'outlined',
  glassProminent: 'filled',
};

export const Button = ({
  label,
  children,
  onPress,
  variant = 'filled',
  icon,
  size = 'regular',
  destructive,
  tintColor,
  accessibilityLabel,
  disabled,
  hidden,
  onAppear,
  onDisappear,
  testID,
  modifiers,
  style,
}: ButtonProps) => {
  const shown = isLiquidGlassAvailable() ? variant : (fallbacks[variant] ?? variant);
  const iconOnly = !label && !children && !!icon?.sf;

  return (
    <Host matchContents style={style}>
      <SwiftUIButton
        label={children ? undefined : (label ?? accessibilityLabel ?? '')}
        systemImage={children ? undefined : icon?.sf}
        role={destructive ? 'destructive' : undefined}
        onPress={onPress}
        testID={testID}
        modifiers={[
          buttonStyle(buttonStyles[shown]),
          controlSize(size),
          // The accent otherwise comes from the tab bar, as with @expo/ui: `.tint()` recolours the whole style (grey bordered
          // buttons turn tinted) and would override the destructive red.
          ...(tintColor && !destructive ? [tint(tintColor)] : []),
          ...(iconOnly ? [labelStyle('iconOnly'), buttonBorderShape('circle')] : []),
          ...(accessibilityLabel ? [accessibilityLabelModifier(accessibilityLabel)] : []),
          ...(disabled ? [disabledModifier(true)] : []),
          ...(hidden ? [hiddenModifier(true)] : []),
          ...(onAppear ? [onAppearModifier(onAppear)] : []),
          ...(onDisappear ? [onDisappearModifier(onDisappear)] : []),
          ...(modifiers ?? []),
        ]}>
        {children as ReactElement | undefined}
      </SwiftUIButton>
    </Host>
  );
};
