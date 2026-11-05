import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { segmentedMetrics, segmentedMotion } from './tokens';
import { changeEvent, type SegmentedControlProps } from './types';
import { Lens } from '../../core/lens/Lens';
import { lensMotion } from '../../core/lens/tokens';
import { useLens, type LensBounds } from '../../core/lens/useLens';
import { useLucentTheme } from '../../theme/LucentProvider';

const { height, inset, insetX, grow, label, weight, dragFrom } = segmentedMetrics;
const thumbHeight = height - inset * 2;

const clamp = (value: number, min: number, max: number) => {
  'worklet';
  return Math.min(max, Math.max(min, value));
};

const segmentWidth = (width: number, count: number) => {
  'worklet';
  return Math.max(0, width - insetX * 2) / Math.max(1, count);
};

const centerOf = (index: number, width: number, count: number) => {
  'worklet';
  return insetX + segmentWidth(width, count) * (index + 0.5);
};

const indexAt = (x: number, width: number, count: number) => {
  'worklet';
  const along = (x - insetX) / Math.max(1, segmentWidth(width, count));
  return clamp(Math.floor(along), 0, count - 1);
};

const tapped = ({ x, y, travel }: { x: number; y: number; travel: number }, width: number) => {
  'worklet';
  return travel <= segmentedMetrics.tapSlop && x >= 0 && x <= width && y >= 0 && y <= height;
};

export const SegmentedControl = ({
  values = [],
  selectedIndex = -1,
  enabled = true,
  onChange,
  onValueChange,
  tintColor,
  style,
  testID,
}: SegmentedControlProps) => {
  const { color, solid } = useLucentTheme();
  const knob = tintColor ?? color.segmentedThumb;
  const count = values.length;
  const [selected, setSelected] = useState(selectedIndex);
  const [given, setGiven] = useState(selectedIndex);
  if (given !== selectedIndex) {
    setGiven(selectedIndex);
    setSelected(selectedIndex);
  }
  const [width, setWidth] = useState(0);
  const layoutWidth = useSharedValue(0);
  const total = useSharedValue(count);
  const shown = useSharedValue(selectedIndex);
  const bounds = useSharedValue<LensBounds>({ min: 0, max: 0 });
  const lens = useLens(0, bounds, segmentedMotion.lens);
  const grabbing = useSharedValue(false);
  const moved = useSharedValue(false);
  const hover = useSharedValue(-1);
  const touch = useSharedValue({ x: 0, y: 0, travel: 0 });
  const [over, setOver] = useState(-1);
  const glow = useSharedValue(1);
  const { dim } = segmentedMotion;

  useAnimatedReaction(
    () => lens.solid.get() > dim.at,
    (landed, previous) => {
      if (landed && previous === false) {
        glow.set(0);
        glow.set(withSpring(1, dim.spring));
      }
    },
  );

  const glowStyle = useAnimatedStyle(() => ({ opacity: 1 - dim.depth * 4 * glow.get() * (1 - glow.get()) }));

  useAnimatedReaction(
    () => (grabbing.get() && moved.get() ? indexAt(lens.x.get(), layoutWidth.get(), total.get()) : -1),
    (next, previous) => {
      if (next !== previous) {
        scheduleOnRN(setOver, next);
      }
    },
  );

  const place = (index: number, at: number, segments: number) => {
    total.set(segments);
    bounds.set({ min: centerOf(0, at, segments), max: centerOf(segments - 1, at, segments) });
    if (index >= 0 && !grabbing.get()) {
      lens.x.set(centerOf(index, at, segments));
    }
  };

  useEffect(() => {
    place(shown.get(), layoutWidth.get(), count);
  }, [count]);

  useEffect(() => {
    if (selectedIndex === shown.get()) {
      return;
    }
    const from = shown.get();
    shown.set(selectedIndex);
    if (from >= 0 && selectedIndex >= 0) {
      lens.slide(centerOf(selectedIndex, layoutWidth.get(), total.get()));
    } else {
      place(selectedIndex, layoutWidth.get(), total.get());
    }
  }, [selectedIndex]);

  const layout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    layoutWidth.set(next);
    setWidth(next);
    place(shown.get(), next, total.get());
  };

  const tick = () => performAndroidHapticsAsync(AndroidHaptics.Segment_Frequent_Tick);

  const commit = (index: number) => {
    setSelected(index);
    const value = values[index] ?? '';
    onValueChange?.(value);
    onChange?.(changeEvent(index, value));
  };

  const pan = usePanGesture({
    enabled: enabled && count > 0,
    minDistance: 0,
    onBegin: (event) => {
      moved.set(false);
      touch.set({ x: event.x, y: event.y, travel: 0 });
      const index = indexAt(event.x, layoutWidth.get(), total.get());
      grabbing.set(index === shown.get());
      if (grabbing.get()) {
        hover.set(index);
        lens.press(event.x);
      }
    },
    onUpdate: (event) => {
      touch.set({
        x: event.x,
        y: event.y,
        travel: Math.max(touch.get().travel, Math.hypot(event.translationX, event.translationY)),
      });
      if (!grabbing.get()) {
        return;
      }
      if (Math.abs(event.translationX) > dragFrom) {
        moved.set(true);
      }
      if (moved.get()) {
        lens.move(event.x);
        const over = indexAt(event.x, layoutWidth.get(), total.get());
        if (over !== hover.get()) {
          hover.set(over);
          scheduleOnRN(tick);
        }
      }
    },
    onFinalize: () => {
      const at = layoutWidth.get();
      const segments = total.get();
      let next = shown.get();
      if (grabbing.get()) {
        grabbing.set(false);
        if (moved.get()) {
          next = indexAt(lens.x.get(), at, segments);
        }
        lens.release(centerOf(next, at, segments));
      } else if (tapped(touch.get(), at)) {
        next = indexAt(touch.get().x, at, segments);
        if (shown.get() < 0) {
          lens.x.set(centerOf(next, at, segments));
        } else {
          lens.slide(centerOf(next, at, segments), segmentedMotion.tapForm);
        }
      }
      if (next !== shown.get()) {
        shown.set(next);
        scheduleOnRN(commit, next);
      }
    },
  });

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

  const choose = (index: number) => (event: AccessibilityActionEvent) => {
    if (!enabled || event.nativeEvent.actionName !== 'activate' || index === shown.get()) {
      return;
    }
    shown.set(index);
    lens.slide(centerOf(index, layoutWidth.get(), total.get()));
    commit(index);
  };

  const thumbWidth = segmentWidth(width, count);
  const thumb = { width: thumbWidth - segmentedMetrics.thumbInset * 2, height: thumbHeight };
  const glass = { width: thumbWidth + grow.x, height: thumbHeight + grow.y };
  const bold = over >= 0 ? over : selected;
  const visible = width > 0 && count > 0 && selected >= 0;

  const labels = (
    <View pointerEvents="box-none" style={styles.labels}>
      {values.map((value, index) => (
        <View
          key={index}
          accessible
          accessibilityRole="button"
          accessibilityLabel={value}
          accessibilityState={{ selected: index === selected, disabled: !enabled }}
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={choose(index)}
          style={styles.segment}>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.label,
              { color: color.text, fontWeight: index === bold ? weight.selected : weight.normal },
              index === bold && glowStyle,
            ]}>
            {value}
          </Animated.Text>
        </View>
      ))}
    </View>
  );

  return (
    <GestureDetector gesture={pan}>
      <View
        testID={testID}
        accessibilityRole="tablist"
        hitSlop={segmentedMetrics.hitSlop}
        needsOffscreenAlphaCompositing={!enabled}
        onLayout={layout}
        style={[styles.root, { backgroundColor: color.segmentedTrack }, !enabled && styles.disabled, style]}>
        {visible ? (
          <>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.shadow,
                { left: -thumb.width / 2, width: thumb.width, boxShadow: `0px 3px 8px ${color.segmentedShadow}` },
                shadowStyle,
              ]}
            />
            <Lens
              lens={lens}
              thumb={thumb}
              glass={glass}
              centerY={height / 2}
              color={knob}
              variant="thumb"
              bend="bulge">
              {labels}
            </Lens>
          </>
        ) : (
          labels
        )}
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  root: { height, borderRadius: height / 2 },
  labels: { ...StyleSheet.absoluteFill, flexDirection: 'row', paddingHorizontal: insetX },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  label: { fontSize: label.fontSize, lineHeight: label.lineHeight },
  shadow: { position: 'absolute', top: inset, height: thumbHeight, borderRadius: thumbHeight / 2 },
  disabled: { opacity: segmentedMetrics.disabledOpacity },
});
