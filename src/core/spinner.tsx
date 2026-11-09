import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** iOS 26's activity indicator, measured on the iPhone 18 Pro simulator, in points. */
export const spinner = {
  size: 20,
  spokes: 8,
  // From the middle: where each spoke starts and ends, and how thick it is.
  inner: 3.5,
  outer: 10,
  width: 2.6,
  // The spoke at the head of the turn, the three behind it fading off, and the rest.
  shade: [0.85, 0.69, 0.53, 0.38],
  rest: 0.3,
  // One turn, taken in a step per spoke.
  period: 1000,
  // Between the spinner and its label.
  gap: 5,
  // Grey in both schemes, as iOS's.
  color: '#8E8E93',
} as const;

const turn = 360 / spinner.spokes;

// The spokes, clockwise from the top; the head is the last, so the fade trails behind it as the spinner turns.
const shades = Array.from({ length: spinner.spokes }, (_, index) => {
  const behind = spinner.spokes - 1 - index;
  return spinner.shade[behind] ?? spinner.rest;
});

/** iOS's activity indicator: grey spokes that turn a spoke at a time. Shared by `ProgressView` and pull to refresh. */
export const Spinner = ({ color = spinner.color }: { color?: string }) => {
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

const styles = StyleSheet.create({
  spinner: { width: spinner.size, height: spinner.size },
  spoke: {
    position: 'absolute',
    left: spinner.size / 2 - spinner.width / 2,
    top: spinner.size / 2 - spinner.outer,
    width: spinner.width,
    height: spinner.outer - spinner.inner,
    borderRadius: spinner.width / 2,
  },
});
