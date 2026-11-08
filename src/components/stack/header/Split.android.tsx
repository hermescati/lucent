import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { SplitScaleContext, useBarGlassRow } from './BarCapsule.android';
import { bar, islandSplit } from '../tokens';

interface Props {
  // Apart from its neighbour; false, it melts back into it.
  shown: boolean;
  // Splits off as it mounts, rather than showing there already: it came after what it splits off from.
  appear?: boolean;
  // How long after mounting it starts splitting off, for one that waits on something else first.
  delay?: number;
  // The side its neighbour is on.
  toward: 'start' | 'end';
  // Its width until it has measured its own: a circle's.
  size: number;
  // The row's gap between it and its neighbour, which its place takes in, so it closes to nothing.
  gap?: number;
  // Its spring, for one that comes off faster than the tab bar's circle: iOS 27's search close button is whole in about
  // 150ms.
  spring?: { duration: number; dampingRatio: number };
  // How small it starts, of its size: the tab bar's circle's by default.
  from?: number;
  // A neck that holds as it splits off, as iOS 27's search close button's does: for `at` ms the capsule stays `overlap`
  // into its neighbour, the gap between them closed, joined by a tight neck of `blend`, and then breaks at once, the gap
  // opening. Otherwise the neck thins and goes with the spring.
  neck?: { at: number; overlap: number; blend: number };
  // Its place's width as it opens, the gap included, for a neighbour that draws its glass up to it rather than laying
  // out beside it (`measure` reads a layout that animates a few frames late).
  place?: SharedValue<number>;
  // How far back melting its glyph is gone by, when it should stay longer than the standard's.
  glyphGoneBy?: number;
  // Drives it from the UI thread, ahead of `shown` catching up a render later: 1 splits it off, 0 melts it back in,
  // started on the frame it changes, as at a press.
  drive?: SharedValue<number>;
  // Its spring melting back in, when that's not the one it splits off on.
  meltSpring?: { duration: number; dampingRatio: number };
  // Melting back in over a set time instead, for one that has to be gone by a moment: a search field landing in its
  // capsule.
  meltTime?: number;
  // Melted back in, to be taken away.
  onGone?: () => void;
  children: ReactNode;
}

/**
 * Lucent's one way for glass to come apart and go back together, as the tab bar's search circle splits off the bar: a
 * capsule grows out of its neighbour's end from `islandSplit.from` of its size while its place opens beside it, on one
 * spring, the two necked by the row's glass halfway (`BarGlassRow`); melting back, it all runs the other way. Its glyph
 * shows early as it splits off and is gone by halfway as it melts. Out of a shared row, each keeps its own glass, with
 * no neck.
 */
export const Split = ({
  shown,
  appear = false,
  delay = 0,
  toward,
  size,
  gap = bar.groupGap,
  spring: springConfig = islandSplit.spring,
  from = islandSplit.from,
  neck,
  place,
  glyphGoneBy,
  drive,
  meltSpring = springConfig,
  meltTime,
  onGone,
  children,
}: Props) => {
  const apart = useSharedValue(shown && !appear ? 1 : 0);
  // 1 while a held neck lasts.
  const held = useSharedValue(0);
  const row = useBarGlassRow();
  // How long the row's glass follows its layout: the split's spring and its neck, or the melt's own timing.
  const followFor = (showing: boolean) => {
    'worklet';
    const moving = showing ? Math.max(springConfig.duration, neck?.at ?? 0) + delay : (meltTime ?? meltSpring.duration);
    return moving + 50;
  };
  const first = useRef(true);
  // The latest, without starting the spring over when a caller passes a new one.
  const goneRef = useRef(onGone);
  useEffect(() => {
    goneRef.current = onGone;
  });
  useLayoutEffect(() => {
    const mounting = first.current;
    first.current = false;
    if (mounting && !(appear && shown)) return;
    // Already on its way, started from `drive`.
    if (drive && drive.get() === (shown ? 1 : 0)) return;
    // Taken back before it came out: nothing to melt.
    if (!shown && apart.get() < 0.002) {
      apart.set(0);
      goneRef.current?.();
      return;
    }
    const spring = withSpring(shown ? 1 : 0, shown ? springConfig : meltSpring);
    apart.set(shown && delay > 0 ? withDelay(delay, spring) : spring);
    if (shown && neck) {
      held.set(1);
      held.set(withDelay(delay + neck.at, withTiming(0, { duration: islandSplit.neckBreak })));
    } else held.set(0);
    row?.follow(followFor(shown));
  }, [shown, appear, delay, apart, held, neck, springConfig, meltSpring, row]);
  useAnimatedReaction(
    () => [apart.get(), held.get()] as const,
    ([now, holding]) => {
      const thinning = islandSplit.blend * Math.sin(Math.PI * Math.min(Math.max(now, 0), 1));
      row?.splitBlend.set(neck && holding > 0 ? neck.blend * holding : thinning);
    },
  );
  useAnimatedReaction(
    () => drive?.get() ?? -1,
    (now, was) => {
      if (was === null || now === was || now < 0) return;
      if (now === 1) {
        const spring = withSpring(1, springConfig);
        apart.set(delay > 0 ? withDelay(delay, spring) : spring);
        if (neck) {
          held.set(1);
          held.set(withDelay(delay + neck.at, withTiming(0, { duration: islandSplit.neckBreak })));
        }
        row?.follow(followFor(true));
        return;
      }
      held.set(0);
      apart.set(
        meltTime ? withTiming(0, { duration: meltTime, easing: Easing.inOut(Easing.quad) }) : withSpring(0, meltSpring),
      );
      row?.follow(followFor(false));
    },
  );
  useAnimatedReaction(
    () => apart.get() < 0.002,
    (gone, wasGone) => {
      if (gone && !wasGone && !shown && onGone) scheduleOnRN(onGone);
    },
  );
  // Its own width, at rest: a circle's, or a back button's with its label.
  const own = useSharedValue(0);
  // Its place, the gap to its neighbour included: none, melted in. At rest, its own width.
  const opened = useDerivedValue(() => {
    // In its neighbour while the neck lasts, the gap closed.
    const holding = neck ? held.get() : 0;
    const into = (neck?.overlap ?? 0) * holding;
    return ((own.get() || size) - into + gap * (1 - holding)) * Math.max(apart.get(), 0);
  });
  useAnimatedReaction(
    () => opened.get(),
    (now) => place?.set(now),
  );
  const placeStyle = useAnimatedStyle(() => {
    const margin = toward === 'end' ? 'marginEnd' : 'marginStart';
    // Not measured yet, there with its screen: its own width, unset (Reanimated has no 'auto' on Android).
    if (apart.get() === 1 && own.get() === 0) return {};
    return { width: opened.get(), [margin]: -gap };
  });
  // Its size goes to the capsule, and its glyph's fade with it (`SplitScaleContext`): only the glyph fades, the row draws
  // the glass.
  const scale = useDerivedValue(() => from + (1 - from) * Math.min(Math.max(apart.get(), 0), 1));
  const glyph = useDerivedValue(() => {
    const now = Math.min(Math.max(apart.get(), 0), 1);
    const out = drive ? drive.get() === 1 : shown;
    const from = out ? islandSplit.iconFrom : (glyphGoneBy ?? islandSplit.iconMeltFrom);
    return Math.min(Math.max((now - from) / (1 - from), 0), 1);
  });
  const out = useDerivedValue<number>(() => ((drive ? drive.get() === 1 : shown) ? 1 : 0));
  const look = useMemo(() => ({ scale, glyph, apart, out }), [scale, glyph, apart, out]);
  return (
    <Animated.View
      pointerEvents={shown ? 'box-none' : 'none'}
      style={[styles.place, toward === 'end' ? styles.before : styles.after, { height: size }, placeStyle]}>
      <Animated.View
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          // At rest, or the first time: a capsule that splits off as it mounts measures its full width under its scale.
          if (apart.get() === 1 || own.get() === 0) own.set(width);
        }}>
        <SplitScaleContext value={look}>{children}</SplitScaleContext>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  place: { flexDirection: 'row', alignItems: 'center' },
  // Out at the far side from its neighbour, so it comes out of the neighbour's end.
  before: { justifyContent: 'flex-start' },
  after: { justifyContent: 'flex-end' },
});
