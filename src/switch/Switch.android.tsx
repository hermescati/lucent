import { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { StyleSheet, Text, View, type AccessibilityActionEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { SwitchProps } from './types';
import { lensSwitch, lensSwitchFrost } from '../glass/presets';
import { Lens } from '../lens/Lens';
import { useLens, type LensBounds } from '../lens/useLens';
import { useLucentTheme } from '../theme/LucentProvider';
import { switchMetrics, switchMotion } from '../theme/tokens';

const { track, thumb, glass, inset, overhang, dragFrom, toneAt } = switchMetrics;
const off = inset + thumb.width / 2;
const on = track.width - off;

const { fillEdge, sweep } = switchMotion;
const fillLayers = [
  { reach: track.width + fillEdge * 2, opacity: 1 / 3 },
  { reach: track.width + fillEdge, opacity: 1 / 2 },
  { reach: track.width, opacity: 1 },
];

interface FillProps {
  tone: SharedValue<number>;
  color: string;
}

const Fill = ({ tone, color }: FillProps) => {
  const style = useAnimatedStyle(() => ({
    opacity: tone.get(),
    transform: [{ translateX: (tone.get() - 1) * sweep }],
  }));
  return (
    <Animated.View style={[styles.fill, style]}>
      {fillLayers.map(({ reach, opacity }) => (
        <View key={reach} style={[styles.fillLayer, { width: reach, backgroundColor: color, opacity }]} />
      ))}
    </Animated.View>
  );
};

export const Switch = ({ value, onValueChange, label, disabled = false, testID }: SwitchProps) => {
  const { color, scheme } = useLucentTheme();
  const bounds = useSharedValue<LensBounds>({ min: off - overhang, max: on + overhang });
  const lens = useLens(value ? on : off, bounds, { ...switchMotion.lens, solidSpring: switchMotion.solidSpring[scheme] });
  const tone = useSharedValue(value ? 1 : 0);
  const toneTarget = useSharedValue(value ? 1 : 0);
  const moved = useSharedValue(false);
  const shown = useSharedValue(value);
  const latest = useRef(value);

  const slideTo = (next: boolean) => {
    'worklet';
    shown.set(next);
    lens.slide(next ? on : off);
    toneTarget.set(next ? 1 : 0);
    tone.set(withSpring(next ? 1 : 0, next ? switchMotion.tone.on : switchMotion.tone.off));
  };

  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);

  useEffect(() => {
    if (shown.get() !== value) {
      slideTo(value);
    }
  }, [value]);

  // Like React Native's Switch: after asking for a change, re-render and check the value
  // the parent settled on. Checking on the next frame instead raced slow parent renders.
  const asked = useRef(false);
  const [, recheck] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    if (asked.current) {
      asked.current = false;
      if (shown.get() !== value) {
        slideTo(value);
      }
    }
  });

  const commit = (next: boolean) => {
    if (next === latest.current) {
      return;
    }
    asked.current = true;
    onValueChange(next);
    recheck();
  };

  const pan = usePanGesture({
    enabled: !disabled,
    minDistance: 0,
    onBegin: (event) => {
      moved.set(false);
      toneTarget.set(shown.get() ? 1 : 0);
      lens.press(event.x);
    },
    onUpdate: (event) => {
      if (Math.abs(event.translationX) > dragFrom) {
        moved.set(true);
      }
      if (moved.get()) {
        lens.move(event.x);
        const along = (lens.x.get() - off) / (on - off);
        const lit = along >= toneAt ? 1 : along <= 1 - toneAt ? 0 : null;
        if (lit !== null && lit !== toneTarget.get()) {
          toneTarget.set(lit);
          tone.set(withSpring(lit, switchMotion.drag));
        }
      }
    },
    onFinalize: () => {
      const nearOn = Math.abs(lens.x.get() - on) < Math.abs(lens.x.get() - off);
      const next = moved.get() ? nearOn : !shown.get();
      shown.set(next);
      lens.release(next ? on : off);
      if (toneTarget.get() !== (next ? 1 : 0)) {
        toneTarget.set(next ? 1 : 0);
        tone.set(withDelay(moved.get() ? 0 : switchMotion.tapDelay, withSpring(next ? 1 : 0, next ? switchMotion.tone.on : switchMotion.tone.off)));
      }
      scheduleOnRN(commit, next);
    },
  });


  const toggle = (event: AccessibilityActionEvent) => {
    if (disabled || event.nativeEvent.actionName !== 'activate') {
      return;
    }
    slideTo(!value);
    commit(!value);
  };

  const control = (
    <GestureDetector gesture={pan}>
      <View
        testID={label == null ? testID : undefined}
        accessible={label == null}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={toggle}
        hitSlop={switchMetrics.hitSlop}
        needsOffscreenAlphaCompositing={disabled}
        style={[styles.root, disabled && styles.disabled]}>
        <View style={[styles.track, { backgroundColor: color.switchOff }]}>
          <Fill tone={tone} color={color.switchOn} />
        </View>
        <Lens lens={lens} thumb={thumb} glass={glass} centerY={track.height / 2} color={color.switchThumb} tune={lensSwitch} frostTune={lensSwitchFrost[scheme]} hazeRadius={switchMotion.hazeRadius} hazeInset={switchMotion.hazeInset} hazeFlatten={1} frostAlpha={switchMotion.frostAlpha[scheme]} solidLead={switchMotion.solidLead} hazeMagnify={switchMotion.hazeMagnify} hazeMagnifyY={switchMotion.hazeMagnifyY} hazeBlurLead={switchMotion.hazeBlurLead} landGlass />
      </View>
    </GestureDetector>
  );

  if (label == null) {
    return control;
  }

  return (
    <View
      testID={testID}
      accessible
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={toggle}
      style={styles.row}>
      <Text style={[styles.label, { color: color.text }, disabled && styles.disabled]}>{label}</Text>
      {control}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: track.width, height: track.height },
  track: { flex: 1, borderRadius: track.height / 2, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: track.width + switchMotion.fillEdge * 2 },
  fillLayer: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: track.height / 2 },
  disabled: { opacity: switchMetrics.disabledOpacity },
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', gap: switchMetrics.labelGap },
  label: { flex: 1, fontSize: switchMetrics.labelSize },
});
