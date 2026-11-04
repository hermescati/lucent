import { SymbolView } from 'expo-symbols';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ButtonColorContext } from './context';
import { buttonMetrics, buttonMotion, buttonPressed } from './tokens';
import type { ButtonProps } from './types';
import { NativeGlassView } from '../../core/glass/NativeGlass';
import { useGlassMaterial } from '../../core/glass/material';
import { glassPress } from '../../core/glass/presets';
import { useLucentTheme } from '../../theme/LucentProvider';

const onAccent = '#FFFFFF';

export const Button = ({
  label,
  children,
  onPress,
  variant = 'filled',
  icon,
  size = 'regular',
  destructive = false,
  tintColor,
  accessibilityLabel,
  disabled = false,
  hidden = false,
  onAppear,
  onDisappear,
  testID,
  style,
}: ButtonProps) => {
  const { color, scheme } = useLucentTheme(tintColor);
  const metrics = buttonMetrics[size];
  const iconOnly = !label && !children && !!icon?.md;
  const glass = variant === 'glass' || variant === 'glassProminent';
  const accent = destructive ? color.buttonDestructive : color.tint;
  const material = useGlassMaterial('regular');
  const [width, setWidth] = useState(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    onAppear?.();
    return () => onDisappear?.();
    // Mount and unmount only, like SwiftUI's onAppear and onDisappear.
  }, []);

  // iOS: prominent styles fill with the accent; bordered ones sit on the system fill with an accent label; plain and
  // glass labels use the text colour unless destructive. Disabled drops the accent everywhere.
  const fill = disabled
    ? variant === 'text' || glass
      ? undefined
      : color.buttonFill
    : variant === 'filled'
      ? accent
      : variant === 'outlined'
        ? color.buttonFill
        : undefined;
  const ink = disabled
    ? color.buttonDisabled
    : variant === 'filled' || variant === 'glassProminent'
      ? onAccent
      : variant === 'outlined' || destructive
        ? accent
        : color.text;

  // iOS washes the fill (lighter in dark mode, darker in light mode) and fades the label while the button is held.
  const look = buttonPressed[variant];
  const wash = look.wash[scheme];
  const labelPressed = look.label[scheme];
  const washStyle = useAnimatedStyle(() => ({ opacity: pressed.get() * wash }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: 1 - pressed.get() * (1 - labelPressed) }));
  const pressTo = (value: number, duration: number) => pressed.set(withTiming(value, { duration }));

  const height = iconOnly ? metrics.circle : metrics.height;
  // iOS's plain buttons hug their label, as tall as its line; the others are capsules, or circles around a lone icon.
  const shape =
    variant === 'text'
      ? null
      : {
          height,
          borderRadius: height / 2,
          ...(iconOnly ? { width: metrics.circle } : { paddingHorizontal: metrics.padding }),
        };

  const textStyle = [styles.label, { fontSize: metrics.fontSize, lineHeight: metrics.lineHeight }];
  // Custom content reads the label colour from `useButtonColor()`; bare text gets it directly.
  const content: ReactNode =
    children != null ? (
      <ButtonColorContext.Provider value={ink}>
        {typeof children === 'string' || typeof children === 'number' ? (
          <Text numberOfLines={1} style={[textStyle, { color: ink }]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </ButtonColorContext.Provider>
    ) : (
      <>
        {icon?.md ? <SymbolView name={{ android: icon.md }} size={metrics.icon} tintColor={ink} /> : null}
        {label ? (
          <Text numberOfLines={1} style={[textStyle, { color: ink }, icon?.md ? { marginLeft: metrics.gap } : null]}>
            {label}
          </Text>
        ) : null}
      </>
    );

  const pressable = (
    <Pressable
      onPress={onPress}
      disabled={disabled || hidden}
      onPressIn={() => pressTo(1, buttonMotion.pressIn)}
      onPressOut={() => pressTo(0, buttonMotion.pressOut)}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[styles.body, shape, fill ? { backgroundColor: fill } : null]}>
      {wash > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: height / 2, backgroundColor: scheme === 'dark' ? '#FFFFFF' : '#000000' },
            washStyle,
          ]}
        />
      ) : null}
      <Animated.View style={[styles.body, labelStyle]}>{content}</Animated.View>
    </Pressable>
  );

  return (
    // A row hugs the button's width, as SwiftUI's buttons size to their content.
    <View style={[styles.row, hidden ? styles.hidden : null, style]} pointerEvents={hidden ? 'none' : 'auto'}>
      {glass ? (
        // Glass has its own press: the native view lifts and glows under the finger without taking the touch.
        <NativeGlassView
          {...material}
          lift
          cornerRadius={height / 2}
          continuous={1}
          glassTint={variant === 'glassProminent' && !disabled ? accent : undefined}
          interactive={!disabled}
          pressGrow={glassPress.grow}
          pressGlow={
            (width >= glassPress.wideFrom ? glassPress.wideGlow : glassPress.glow) *
            (variant === 'glassProminent' ? glassPress.tintedGlow : 1)
          }
          pressGlowSpread={glassPress.glowSpread}
          onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {pressable}
        </NativeGlassView>
      ) : (
        pressable
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  hidden: { opacity: 0 },
  body: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  label: { includeFontPadding: false },
});
