import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { bar, label as labelText, progressColors, spinner } from './tokens';
import type { ProgressViewProps } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';

const turn = 360 / spinner.spokes;

// The spokes, clockwise from the top; the head is the last, so the fade trails behind it as the spinner turns.
const shades = Array.from({ length: spinner.spokes }, (_, index) => {
  const behind = spinner.spokes - 1 - index;
  return spinner.shade[behind] ?? spinner.rest;
});

/** iOS's activity indicator: grey spokes that turn a spoke at a time. */
const Spinner = ({ color }: { color: string }) => {
  const step = useSharedValue(0);
  useEffect(() => {
    step.set(withRepeat(withTiming(spinner.spokes, { duration: spinner.period, easing: Easing.linear }), -1));
    return () => cancelAnimation(step);
  }, [step]);
  const rotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.floor(step.get()) * turn}deg` }],
  }));
  return (
    <Animated.View style={[styles.spinner, rotation]}>
      {shades.map((opacity, index) => (
        <View key={index} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${index * turn}deg` }] }]}>
          <View style={[styles.spoke, { backgroundColor: color, opacity }]} />
        </View>
      ))}
    </Animated.View>
  );
};

export const ProgressView = ({ value, label, tintColor, hidden, testID, style }: ProgressViewProps) => {
  const { color, scheme } = useLucentTheme(tintColor);
  const colors = progressColors[scheme];
  const determinate = value != null;
  const fraction = determinate ? Math.min(Math.max(value, 0), 1) : 0;

  if (!determinate) {
    return (
      <View
        testID={testID}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityState={{ busy: true }}
        style={[styles.indeterminate, hidden && styles.hidden, style]}>
        <Spinner color={colors.spinner} />
        {label ? (
          <Text numberOfLines={1} style={[styles.label, styles.spinnerLabel, { color: colors.label }]}>
            {label}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={[styles.determinate, hidden && styles.hidden, style]}>
      {label ? (
        <Text numberOfLines={1} style={[styles.label, styles.barLabel, { color: colors.text }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.track, { backgroundColor: colors.track }]}>
        <View style={[styles.fill, { width: `${fraction * 100}%`, backgroundColor: color.tint }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
  indeterminate: { alignSelf: 'flex-start', alignItems: 'center' },
  determinate: { alignSelf: 'stretch' },
  spinner: { width: spinner.size, height: spinner.size },
  spoke: {
    position: 'absolute',
    left: spinner.size / 2 - spinner.width / 2,
    top: spinner.size / 2 - spinner.outer,
    width: spinner.width,
    height: spinner.outer - spinner.inner,
    borderRadius: spinner.width / 2,
  },
  label: { fontSize: labelText.fontSize, lineHeight: labelText.lineHeight, includeFontPadding: false },
  spinnerLabel: { marginTop: spinner.gap },
  barLabel: { marginBottom: bar.gap },
  track: { height: bar.height, borderRadius: bar.height / 2, overflow: 'hidden' },
  fill: { height: bar.height, borderRadius: bar.height / 2 },
});
