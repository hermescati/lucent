import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { lensSlider, sliderMetrics, sliderMotion } from './tokens';
import type { SliderProps } from './types';
import { Lens } from '../../core/lens/Lens';
import { lensMotion } from '../../core/lens/tokens';
import { useLens, type LensBounds } from '../../core/lens/useLens';
import { useLucentTheme } from '../../theme/LucentProvider';

const { height, track, thumb, glass, grabSlop, dragFrom, failFrom } = sliderMetrics;
const half = thumb.width / 2;

interface Range {
  min: number;
  max: number;
  step: number;
}

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const snap = (value: number, { min, max, step }: Range) => {
  'worklet';
  const top = Math.max(min, max);
  const clamped = clamp(value, min, top);
  return step > 0 ? Math.min(top, min + Math.round((clamped - min) / step) * step) : clamped;
};

const positionOf = (value: number, { min, max }: Range, width: number) => {
  'worklet';
  const along = max > min ? (clamp(value, min, max) - min) / (max - min) : 0;
  return half + along * Math.max(0, width - thumb.width);
};

const valueAt = (position: number, range: Range, width: number) => {
  'worklet';
  const span = Math.max(1, width - thumb.width);
  return snap(range.min + ((position - half) / span) * (range.max - range.min), range);
};

export const Slider = ({ value, onValueChange, min = 0, max = 1, step = 0, disabled = false, testID }: SliderProps) => {
  const { color, solid } = useLucentTheme();
  const range = useSharedValue<Range>({ min, max, step });
  const width = useSharedValue(0);
  const bounds = useSharedValue<LensBounds>({ min: half, max: half });
  const lens = useLens(half, bounds, sliderMotion.lens);
  const current = useSharedValue(snap(value, { min, max, step }));
  const held = useSharedValue(false);
  const grab = useSharedValue(0);
  const edge = useSharedValue(0);
  const pull = useSharedValue(0);

  useEffect(() => {
    const next = { min, max, step };
    range.set(next);
    if (!held.get()) {
      const settled = snap(value, next);
      current.set(settled);
      lens.x.set(positionOf(settled, next, width.get()));
    }
  }, [value, min, max, step]);

  const layout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    width.set(next);
    bounds.set({ min: half, max: Math.max(half, next - half) });
    if (!held.get()) {
      lens.x.set(positionOf(current.get(), range.get(), next));
    }
  };

  const tick = () => performAndroidHapticsAsync(AndroidHaptics.Segment_Frequent_Tick);
  const changed = (next: number) => onValueChange(next);

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-dragFrom, dragFrom],
    failOffsetY: [-failFrom, failFrom],
    onBegin: (event) => {
      const at = lens.x.get();
      if (Math.abs(event.x - at) > half + grabSlop) {
        return;
      }
      held.set(true);
      grab.set(at - event.x);
      lens.press(event.x);
    },
    onUpdate: (event) => {
      if (!held.get()) {
        return;
      }
      const { min, max } = bounds.get();
      const raw = event.x + grab.get();
      const finger = clamp(raw, min, max);
      const next = valueAt(finger, range.get(), width.get());
      const excess = raw - finger;
      const { reach, from, softness, out, bump } = sliderMotion.overhang;
      const beyond = Math.max(0, Math.abs(excess) - from);
      const stretch = Math.sign(excess) * reach * (1 - Math.exp(-beyond / softness));
      const side = beyond > 0 ? Math.sign(excess) : 0;
      if (side !== edge.get()) {
        edge.set(side);
        if (side !== 0) {
          lens.kick(bump);
        }
      }
      pull.set(withSpring(stretch, out));
      const to = (range.get().step > 0 ? positionOf(next, range.get(), width.get()) : finger) + stretch;
      lens.x.set(withSpring(to, sliderMotion.follow));
      if (next !== current.get()) {
        current.set(next);
        scheduleOnRN(changed, next);
        if (range.get().step > 0) {
          scheduleOnRN(tick);
        }
      }
    },
    onFinalize: () => {
      if (!held.get()) {
        return;
      }
      held.set(false);
      edge.set(0);
      pull.set(withSpring(0, sliderMotion.overhang.back));
      lens.release(positionOf(current.get(), range.get(), width.get()));
    },
  });

  const trackStyle = useAnimatedStyle(() => {
    const { thin, shift } = sliderMotion.overhang;
    const amount = pull.get();
    return { transform: [{ translateX: amount * shift }, { scaleY: 1 - Math.abs(amount) * thin }] };
  });

  const shown = useDerivedValue(() => withSpring(current.get() > range.get().min ? 1 : 0, sliderMotion.fill));

  const fillStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [{ translateX: lens.x.get() - width.get() }],
  }));

  const shadowStyle = useAnimatedStyle(() => {
    // Drawn solid, the thumb never lifts into a lens (core/lens), so its shadow stays under it.
    if (solid) {
      return { opacity: 1, transform: [{ translateX: lens.x.get() }, { scaleX: 1 }, { scaleY: 1 }] };
    }
    const land = lens.land.get();
    return {
      opacity: lens.solid.get(),
      transform: [{ translateX: lens.x.get() }, { scaleX: 1 + land }, { scaleY: 1 - lensMotion.land.squash * land }],
    };
  });

  const adjust = (event: AccessibilityActionEvent) => {
    const direction =
      event.nativeEvent.actionName === 'increment' ? 1 : event.nativeEvent.actionName === 'decrement' ? -1 : 0;
    if (disabled || direction === 0) {
      return;
    }
    const amount = step > 0 ? step : (max - min) / sliderMetrics.accessibilitySteps;
    const next = snap(current.get() + direction * amount, range.get());
    if (next === current.get()) {
      return;
    }
    current.set(next);
    lens.x.set(positionOf(next, range.get(), width.get()));
    onValueChange(next);
  };

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        accessible
        accessibilityRole="adjustable"
        accessibilityState={{ disabled }}
        accessibilityValue={{ min, max, now: value }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={adjust}
        hitSlop={sliderMetrics.hitSlop}
        needsOffscreenAlphaCompositing={disabled}
        onLayout={layout}
        style={[styles.root, disabled && styles.disabled]}>
        <Animated.View style={[styles.track, { backgroundColor: color.sliderTrack }, trackStyle]}>
          <Animated.View style={[styles.fill, { backgroundColor: color.tint }, fillStyle]} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.shadow, { boxShadow: `0px 0px 10px ${color.sliderShadow}` }, shadowStyle]}
        />
        <Lens
          lens={lens}
          thumb={thumb}
          glass={glass}
          centerY={height / 2}
          color={color.sliderThumb}
          bend="pull"
          tune={lensSlider}
        />
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { height, justifyContent: 'center' },
  track: { height: track, borderRadius: track / 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: track / 2 },
  shadow: {
    position: 'absolute',
    left: -half,
    top: (height - thumb.height) / 2,
    width: thumb.width,
    height: thumb.height,
    borderRadius: thumb.height / 2,
  },
  disabled: { opacity: sliderMetrics.disabledOpacity },
});
