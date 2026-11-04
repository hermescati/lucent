import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { stepper, stepperColors, stepperLabel, stepperMotion } from './tokens';
import type { StepperProps } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';

type Colors = (typeof stepperColors)[keyof typeof stepperColors];

const Glyph = ({ plus, color }: { plus: boolean; color: string }) => (
  <View style={styles.glyph}>
    <View style={[styles.bar, { backgroundColor: color }]} />
    {plus ? <View style={[styles.bar, styles.upright, { backgroundColor: color }]} /> : null}
  </View>
);

interface SideProps {
  plus: boolean;
  enabled: boolean;
  colors: Colors;
  onStep: () => void;
}

/** One half: it steps on a tap, and keeps stepping while held. */
const Side = ({ plus, enabled, colors, onStep }: SideProps) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest step, for a hold that outlives the render it started in.
  const step = useRef(onStep);
  useEffect(() => {
    step.current = onStep;
  });
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (!enabled) stop();
  }, [enabled]);

  const repeat = () => {
    step.current();
    timer.current = setTimeout(repeat, stepperMotion.repeatEvery);
  };

  return (
    <Pressable
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={plus ? 'Increment' : 'Decrement'}
      accessibilityState={{ disabled: !enabled }}
      onPress={onStep}
      // Pressable leaves out the tap after a long press, so a hold steps only by repeating.
      onLongPress={repeat}
      delayLongPress={stepperMotion.repeatAfter}
      onPressOut={stop}
      style={({ pressed }) => [styles.side, pressed && { backgroundColor: colors.pressed }]}>
      <Glyph plus={plus} color={enabled ? colors.glyph : colors.glyphDisabled} />
    </Pressable>
  );
};

export const Stepper = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  hidden = false,
  testID,
  style,
}: StepperProps) => {
  const { scheme } = useLucentTheme();
  const colors = stepperColors[scheme];
  // The value it's shown, kept between renders so a held side steps from where it got to.
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);

  const stepBy = (delta: number) => {
    const next = Math.min(max, Math.max(min, current.current + delta));
    if (next === current.current) return;
    current.current = next;
    onValueChange(next);
  };

  const control = (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) => stepBy(event.nativeEvent.actionName === 'increment' ? step : -step)}
      style={[styles.capsule, { backgroundColor: colors.fill }]}>
      <Side plus={false} enabled={!disabled && value > min} colors={colors} onStep={() => stepBy(-step)} />
      <View style={[styles.divider, { backgroundColor: colors.divider }]} />
      <Side plus enabled={!disabled && value < max} colors={colors} onStep={() => stepBy(step)} />
    </View>
  );

  return (
    <View
      testID={testID}
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[label == null ? styles.bare : styles.row, hidden && styles.hidden, style]}>
      {label != null ? (
        <Text numberOfLines={1} style={[styles.label, { color: colors.label }]}>
          {label}
        </Text>
      ) : null}
      {control}
    </View>
  );
};

const styles = StyleSheet.create({
  bare: { flexDirection: 'row' },
  row: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  hidden: { opacity: 0 },
  label: {
    flexShrink: 1,
    fontSize: stepperLabel.fontSize,
    lineHeight: stepperLabel.lineHeight,
    includeFontPadding: false,
  },
  capsule: {
    width: stepper.width,
    height: stepper.height,
    borderRadius: stepper.height / 2,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  side: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
  divider: { width: stepper.dividerWidth, height: stepper.height - stepper.dividerInset * 2 },
  glyph: { width: stepper.glyph, height: stepper.glyph, alignItems: 'center', justifyContent: 'center' },
  bar: { position: 'absolute', width: stepper.glyph, height: stepper.stroke, borderRadius: stepper.stroke / 2 },
  upright: { transform: [{ rotate: '90deg' }] },
});
