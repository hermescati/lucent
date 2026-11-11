import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
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
  // Drawn a spoke at a time (pull to refresh), each spoke comes in this light and darkens as more come after it.
  drawnFrom: 0.25,
  drawnTo: 0.7,
} as const;

const turn = 360 / spinner.spokes;

// The spokes, clockwise from the top; the head is the last, so the fade trails behind it as the spinner turns.
const shades = Array.from({ length: spinner.spokes }, (_, index) => {
  const behind = spinner.spokes - 1 - index;
  return spinner.shade[behind] ?? spinner.rest;
});

const Spoke = ({
  index,
  color,
  scale,
  drawn,
  spinning,
}: {
  index: number;
  color: string;
  scale: number;
  drawn?: SharedValue<number>;
  spinning: boolean;
}) => {
  const look = useAnimatedStyle(() => {
    if (spinning || !drawn) return { opacity: shades[index] };
    // Drawn a spoke at a time: this one comes in as the count reaches it, and darkens as later ones come.
    const age = drawn.get() - index;
    const shown = Math.min(Math.max(age, 0), 1);
    const dark = Math.min(Math.max(age / spinner.spokes, 0), 1);
    return { opacity: shown * (spinner.drawnFrom + (spinner.drawnTo - spinner.drawnFrom) * dark) };
  });
  const size = spinner.size * scale;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${index * turn}deg` }] }]}>
      <Animated.View
        style={[
          styles.spoke,
          {
            left: size / 2 - (spinner.width * scale) / 2,
            top: size / 2 - spinner.outer * scale,
            width: spinner.width * scale,
            height: (spinner.outer - spinner.inner) * scale,
            borderRadius: (spinner.width * scale) / 2,
            backgroundColor: color,
          },
          look,
        ]}
      />
    </Animated.View>
  );
};

/**
 * iOS's activity indicator: grey spokes that turn a spoke at a time. Shared by `ProgressView` and pull to refresh, which
 * draws it larger and, with `drawn` and not yet `spinning`, a spoke at a time as the content comes down.
 */
export const Spinner = ({
  color = spinner.color,
  size = spinner.size,
  drawn,
  spinning = true,
}: {
  color?: string;
  size?: number;
  drawn?: SharedValue<number>;
  spinning?: boolean;
}) => {
  const step = useSharedValue(0);
  useEffect(() => {
    if (!spinning) return;
    step.set(0);
    step.set(withRepeat(withTiming(spinner.spokes, { duration: spinner.period, easing: Easing.linear }), -1));
    return () => cancelAnimation(step);
  }, [step, spinning]);
  const rotation = useAnimatedStyle(() => ({
    transform: [{ rotate: `${Math.floor(step.get()) * turn}deg` }],
  }));
  const scale = size / spinner.size;
  return (
    <Animated.View style={[{ width: size, height: size }, rotation]}>
      {shades.map((_, index) => (
        <Spoke key={index} index={index} color={color} scale={scale} drawn={drawn} spinning={spinning} />
      ))}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  spoke: { position: 'absolute' },
});
