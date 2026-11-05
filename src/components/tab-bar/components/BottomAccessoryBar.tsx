import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
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

import { AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { regularMaterial } from '../../../core/glass/material';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { glass } from '../../../theme/tokens';
import { AccessoryPlacementContext } from '../context/accessory';
import type { TabBarCollapseState } from '../context/collapse';
import { clamp01, fullHeight, lerp } from '../helpers/bar';
import { mirrored, unmirror } from '../helpers/mirror';
import { useGlassPress } from '../hooks/useGlassPress';
import { layout, motion } from '../tokens';

const { height, gap, inlineGap } = layout.accessory;
// The bar's top, from the accessory layer's: the accessory sits above it.
const barTop = gap + height;
// Minimized, the accessory sits in the bar's row, as tall as its circles.
const inlineTop = barTop + (fullHeight - height) / 2;
const circleInset = (fullHeight - layout.tabBarCompactHeight) / 2;
const inlineLeft = circleInset + layout.tabBarCompactHeight + inlineGap;

interface Props {
  children: ReactNode | undefined;
  span: number;
  left: number;
  bottom: number;
  // Whether a circle (search or a prominent tab) sits at the bar's right end: minimized, the accessory stops short of it.
  circle: boolean;
  // Whether the bar's search field is open, which the accessory steps aside for, as iOS's does.
  hidden: boolean;
  collapse: TabBarCollapseState | null;
  lift: SharedValue<number>;
  tintColor?: string;
}

/**
 * iOS 26's bottom accessory: a glass capsule across the bar's span, just above it, that drops into the bar's row
 * between its circles as the bar minimizes. As iOS does, it renders its content twice, once per placement
 * (`NativeTabs.BottomAccessory.usePlacement()`), and fades from one copy to the other on the way.
 */
export const BottomAccessoryBar = ({
  children,
  span,
  left,
  bottom,
  circle,
  hidden,
  collapse,
  lift,
  tintColor,
}: Props) => {
  const theme = useLucentTheme(tintColor);
  const glassStyle = regularMaterial(theme);
  const inlineRight = span - circleInset - (circle ? layout.tabBarCompactHeight + inlineGap : 0);
  const inlineWidth = inlineRight - inlineLeft;

  // Kept while it fades out, then let go.
  const [kept, setKept] = useState(children);
  if (children !== undefined && children !== kept) {
    setKept(children);
  }
  const showing = children !== undefined && !hidden;
  const presence = useSharedValue(0);
  useEffect(() => {
    presence.set(
      showing
        ? withTiming(1, { duration: motion.accessory.show })
        : withTiming(0, { duration: motion.accessory.hide }, (done) => {
            if (done && children === undefined) scheduleOnRN(setKept, undefined);
          }),
    );
  }, [showing, children, presence]);

  // Which copy takes touches and is read out: switched once the accessory has settled in its place.
  const [placement, setPlacement] = useState<'regular' | 'inline'>('regular');
  // Its way into the bar's row, as iOS 27 moves it (simulator): as the bar starts to gather, the content swaps to its
  // inline copy (swap), its near end slides along (slide) and its far end draws in (narrow), and it drops into the
  // row (drop), timed against the bar's gather (motion.accessory). Each edge only moves one way.
  // Expanding, all three spring straight back. Each runs 0 (above the bar) to 1 (in its row).
  const start = collapse?.target.get() ?? 0;
  const narrow = useSharedValue(start);
  const slide = useSharedValue(start);
  const drop = useSharedValue(start);
  const swap = useSharedValue(start);
  // Landed, it lets go of the bar's first shrink (motion.tuck) and grows into its place with a little give, as iOS's
  // does: 0 while shrunk, 1 let go.
  const land = useSharedValue(start);
  useAnimatedReaction(
    () => collapse?.target.get() ?? 0,
    (target, previous) => {
      if (previous === null || target === previous) return;
      const settled = (done?: boolean) => {
        'worklet';
        if (done) scheduleOnRN(setPlacement, target === 1 ? 'inline' : 'regular');
      };
      const { gatherAfter } = motion.tuck;
      const { narrow: narrowing, slide: sliding, drop: dropping, swap: swapping, expand } = motion.accessory;
      if (target === 1) {
        swap.set(withDelay(gatherAfter + swapping.after, withTiming(1, { duration: swapping.duration })));
        const easeOut = Easing.out(Easing.quad);
        narrow.set(
          withDelay(gatherAfter + narrowing.after, withTiming(1, { duration: narrowing.duration, easing: easeOut })),
        );
        slide.set(
          withDelay(gatherAfter + sliding.after, withTiming(1, { duration: sliding.duration, easing: easeOut })),
        );
        drop.set(withDelay(gatherAfter + dropping.after, withSpring(1, dropping.spring, settled)));
        land.set(0);
        land.set(withDelay(gatherAfter + motion.accessory.land.after, withSpring(1, motion.accessory.land.spring)));
      } else {
        swap.set(withTiming(0, { duration: swapping.duration }));
        land.set(0);
        narrow.set(withSpring(0, expand));
        slide.set(withSpring(0, expand));
        drop.set(withSpring(0, expand, settled));
      }
    },
  );
  const right = useSharedValue(inlineRight);
  useEffect(() => {
    right.set(withSpring(inlineRight, motion.accessory.expand));
  }, [inlineRight, right]);

  const press = useGlassPress();
  // The capsule's edges, from the layer's top left.
  const fallbackTuck = useSharedValue(0);
  const tuck = collapse?.tuck ?? fallbackTuck;
  const edges = useDerivedValue(() => {
    const swell = press.press.get();
    const top = lerp(0, inlineTop, drop.get());
    const left = lerp(0, inlineLeft, slide.get());
    const end = lerp(span, right.get(), narrow.get());
    return {
      left: left - motion.accessory.pressX * swell,
      right: end + motion.accessory.pressX * swell,
      top: top - motion.accessory.pressY * swell,
      bottom: top + height + motion.accessory.pressY * swell,
      // Its width without a finger on it, which the copies scale against.
      width: end - left,
    };
  });

  const glassProps = useAnimatedProps(() => {
    const { left: l, right: r, top: t, bottom: b } = edges.get();
    const pad = glass.pad;
    return { shapes: [l + pad, t + pad, r + pad, b + pad] };
  });
  // Minimizing, it shrinks a little with the bar first (motion.tuck), about their middle, which is the layer's.
  const layerStyle = useAnimatedStyle(() => ({
    opacity: presence.get(),
    transform: [{ translateY: lift.get() }, { scale: lerp(1, motion.tuck.scale, tuck.get() * (1 - land.get())) }],
  }));
  // Each copy rides the capsule at its own width, and swells with it under a finger.
  // (Each style reads its shared values itself: Reanimated tracks what an animated style's own function reads, not
  // what a helper it calls does.)
  const follow = (
    own: 'regular' | 'inline',
    capsule: { left: number; right: number; top: number; bottom: number; width: number },
    swapped: number,
  ) => {
    'worklet';
    const width = own === 'regular' ? span : inlineWidth;
    const restLeft = own === 'regular' ? 0 : inlineLeft;
    const restTop = own === 'regular' ? 0 : inlineTop;
    // A finger on it swells it, and the content with it.
    const scale = (capsule.right - capsule.left) / Math.max(capsule.width, 1);
    return {
      opacity: own === 'regular' ? 1 - clamp01(swapped) : clamp01(swapped),
      transform: [
        // Pinned to the capsule's leading end, as iOS's content is: the inline copy appears where it will rest and
        // rides that end in, rather than sitting in the middle of a capsule still drawing in.
        { translateX: capsule.left + (scale * width) / 2 - (restLeft + width / 2) },
        { translateY: (capsule.top + capsule.bottom) / 2 - (restTop + height / 2) },
        { scale },
      ],
    };
  };
  const regularStyle = useAnimatedStyle(() => follow('regular', edges.get(), swap.get()));
  const inlineStyle = useAnimatedStyle(() => follow('inline', edges.get(), swap.get()));
  if (kept === undefined) {
    return null;
  }
  const copy = (own: 'regular' | 'inline') => (
    <Animated.View
      key={own}
      pointerEvents="box-none"
      style={[
        styles.copy,
        own === 'regular' ? { left: 0, top: 0, width: span } : { left: inlineLeft, top: inlineTop, width: inlineWidth },
        own === 'regular' ? regularStyle : inlineStyle,
      ]}>
      <View
        // The app's content, in the app's direction, the right way round in the mirrored bar (helpers/mirror).
        style={[styles.fill, { direction: mirrored ? 'rtl' : 'ltr' }, unmirror]}
        pointerEvents={placement === own ? 'auto' : 'none'}
        importantForAccessibility={placement === own ? 'auto' : 'no-hide-descendants'}>
        {/* A finger on it swells the capsule. Watched with plain touches, not a Pressable, so the capsule isn't a control:
            TalkBack reads and focuses the content's own. */}
        <View
          style={styles.fill}
          onTouchStart={() => press.onPressIn()}
          onTouchEnd={press.onPressOut}
          onTouchCancel={press.onPressOut}>
          <AccessoryPlacementContext value={own}>{kept}</AccessoryPlacementContext>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <View pointerEvents={showing ? 'box-none' : 'none'} style={[styles.layer, { left, width: span, bottom }]}>
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, layerStyle]}>
        <AnimatedNativeGlassView
          style={styles.glass}
          pointerEvents="none"
          animatedProps={glassProps}
          {...glassStyle}
          continuous={1}
        />
        {copy('regular')}
        {copy('inline')}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    // Placed left to right, as the bar is; its content keeps the app's direction (copy).
    direction: 'ltr',
    height: barTop + fullHeight,
  },
  glass: {
    position: 'absolute',
    top: -glass.pad,
    left: -glass.pad,
    right: -glass.pad,
    bottom: -glass.pad,
  },
  copy: {
    position: 'absolute',
    height,
  },
  fill: {
    flex: 1,
  },
});

/** How far the accessory reaches above the bar's top. */
export const accessoryReach = barTop;
