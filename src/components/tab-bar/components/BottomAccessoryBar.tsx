import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, useManualGesture } from 'react-native-gesture-handler';
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

import { AnimatedNativeGlassView, NativeGlassBackdrop } from '../../../core/glass/NativeGlass';
import { regularMaterial } from '../../../core/glass/material';
import { glassPress } from '../../../core/glass/presets';
import { leanOf, shapePress, useShapePress } from '../../../core/glass/useShapePress';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { useSolidGlass } from '../../../theme/solid';
import { glass } from '../../../theme/tokens';
import { AccessoryPlacementContext } from '../context/accessory';
import type { TabBarCollapseState } from '../context/collapse';
import { accessoryGroup, clamp01, fullHeight, lerp, pastEdge } from '../helpers/bar';
import { mirrored, unmirror } from '../helpers/mirror';
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
  // Over the bar rather than under it: minimized, while it sits in the bar's row.
  over: boolean;
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
  over,
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

  const press = useShapePress();
  const solid = useSolidGlass();
  // The pressed copy's width, which the finger's place is measured against.
  const pressedWidth = useSharedValue(span);
  // A finger on it presses it as every glass shape is pressed (useShapePress, the native press's mechanics): it grows,
  // leans toward the finger and lights up under it, and dragged off, it pulls after the finger (motion.accessory.pull).
  // Watched without ever taking the touch, so the content's own buttons keep it, and the capsule isn't a control:
  // TalkBack reads and focuses the content's. Its own gesture also keeps the tab bar's, under it, from taking a press on
  // the minimized accessory.
  const useTouch = (width: number) =>
    useManualGesture({
      onTouchesDown: (event) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        pressedWidth.set(width);
        // The content is the right way round in the mirrored bar (helpers/mirror), so its x runs the other way.
        press.begin(mirrored ? width - touch.x : touch.x, touch.y);
      },
      onTouchesMove: (event) => {
        'worklet';
        const touch = event.allTouches[0];
        if (!touch) return;
        const x = mirrored ? width - touch.x : touch.x;
        press.move(x, touch.y, Math.hypot(pastEdge(x, 0, width), pastEdge(touch.y, 0, height)));
      },
      onTouchesUp: () => {
        'worklet';
        press.end();
      },
      onTouchesCancel: () => {
        'worklet';
        press.end();
      },
    });
  const regularTouch = useTouch(span);
  const inlineTouch = useTouch(inlineWidth);
  // The capsule's edges, from the layer's top left.
  const fallbackTuck = useSharedValue(0);
  const tuck = collapse?.tuck ?? fallbackTuck;
  const edges = useDerivedValue(() => {
    const top = lerp(0, inlineTop, drop.get());
    const left = lerp(0, inlineLeft, slide.get());
    const end = lerp(span, right.get(), narrow.get());
    const width = end - left;
    // Pressed, it grows by the same points every glass shape does along its longer side (glassPress.grow), which for
    // the accessory is iOS's: 260 by 47pt to 276 by 50.4 minimized, 362 by 49 to 377 by 51 above the bar.
    const pressed = press.press.get();
    const scale = 1 + (glassPress.grow / Math.max(width, height)) * pressed;
    // Solid, it only grows: no lean, pull or light.
    const held = solid ? 0 : pressed;
    const touchWidth = pressedWidth.get();
    const fingerX = press.x.get();
    const fingerY = press.y.get();
    const half = Math.max(touchWidth, height) / 2;
    const leanX = leanOf(fingerX - touchWidth / 2, half, held);
    const leanY = leanOf(fingerY - height / 2, half, held);
    const leanLong = shapePress.leanStretch * (Math.abs(leanX) - Math.abs(leanY));
    // Pulled after a finger dragged off it, less than a button is (motion.accessory.pull).
    const { side, up } = motion.accessory.pull;
    const pastX = pastEdge(fingerX, 0, touchWidth) * held;
    // Up or down it keeps going to the screen's edge, uncapped, so a finger at the top of a shorter screen still takes it
    // as far as iOS's goes at the top of its own.
    const pastY = (fingerY < 0 ? fingerY : fingerY > height ? fingerY - height : 0) * held;
    // Eased in from the end, so the pull picks up from the lean rather than jumping on at the edge, and only as much as
    // the drag runs sideways: a finger far above it that wanders past an end turns it a little, where one level with it
    // takes the whole side pull.
    const sideways = Math.abs(pastX) / Math.max(Math.hypot(pastX, pastY), 1);
    const aside = (1 - Math.exp(-((pastX / side.reach) ** 2))) * sideways;
    const long = side.stretch * aside - up.stretch * Math.abs(pastY);
    const middleX = left + width / 2 + leanX * shapePress.lean + Math.sign(pastX) * side.shift * aside;
    const middleY = top + height / 2 + leanY * shapePress.lean + pastY * up.shift;
    const halfWidth = (width * scale * (1 + leanLong)) / 2;
    const halfHeight = (height * scale * (1 - leanLong)) / 2;
    return {
      left: middleX - halfWidth,
      right: middleX + halfWidth,
      top: middleY - halfHeight,
      bottom: middleY + halfHeight,
      // Its width without a finger on it, which the copies scale against.
      width,
      // Stretched toward a finger dragged off it, as a whole (the glass's `shapePull`), and its content with it.
      pullX: 1 + long,
      pullY: 1 - long,
      // Where along it the finger is, 0 at its left end to 1 at its right.
      along: clamp01(fingerX / Math.max(touchWidth, 1)),
    };
  });

  const glassProps = useAnimatedProps(() => {
    const { left: l, right: r, top: t, bottom: b, pullX, pullY, along } = edges.get();
    const pad = glass.pad;
    // Lit where it's pressed, kept a corner's radius from its ends, as a capsule of buttons is.
    const radius = (b - t) / 2;
    return {
      shapes: [l + pad, t + pad, r + pad, b + pad],
      shapePull: pullX !== 1 || pullY !== 1 ? [0, pullX, pullY] : [-1, 1, 1],
      glowX: Math.min(Math.max(lerp(l, r, along), l + radius), r - radius) + pad,
      glowY: (t + b) / 2 + pad,
      glowSpread: glassPress.glowSpread,
      glowStrength: solid ? 0 : glassPress.wideGlow * press.glow.get(),
      glowShape: 0,
    };
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
    capsule: { left: number; right: number; top: number; bottom: number; width: number; pullX: number; pullY: number },
    swapped: number,
  ) => {
    'worklet';
    const width = own === 'regular' ? span : inlineWidth;
    const restLeft = own === 'regular' ? 0 : inlineLeft;
    const restTop = own === 'regular' ? 0 : inlineTop;
    // A finger on it grows and leans it, and the content with it.
    const scaleX = (capsule.right - capsule.left) / Math.max(capsule.width, 1);
    const scaleY = (capsule.bottom - capsule.top) / height;
    return {
      opacity: own === 'regular' ? 1 - clamp01(swapped) : clamp01(swapped),
      transform: [
        // Pinned to the capsule's leading end, as iOS's content is: the inline copy appears where it will rest and
        // rides that end in, rather than sitting in the middle of a capsule still drawing in.
        { translateX: capsule.left + (scaleX * width) / 2 - (restLeft + width / 2) },
        { translateY: (capsule.top + capsule.bottom) / 2 - (restTop + height / 2) },
        // Stretched with the capsule toward a dragged finger, as iOS's content is.
        { scaleX: scaleX * capsule.pullX },
        { scaleY: scaleY * capsule.pullY },
      ],
    };
  };
  const regularStyle = useAnimatedStyle(() => follow('regular', edges.get(), swap.get()));
  const inlineStyle = useAnimatedStyle(() => follow('inline', edges.get(), swap.get()));
  // The content shows only between the capsule's ends, as iOS's does: opening, the full copy pinned to the capsule's
  // leading end would otherwise poke out past its still-narrow far end. The clip is a layer-wide box squeezed onto the
  // capsule's span, pressed and pulled too, with what's in it squeezed back, all by transforms, so it moves in step with
  // the glass (a clip sized by layout trails it by a frame).
  const clipStyle = useAnimatedStyle(() => {
    const { left: l, right: r, pullX } = edges.get();
    const width = (r - l) * pullX;
    return {
      transform: [{ translateX: (l + r) / 2 - span / 2 }, { scaleX: Math.max(width, 1) / Math.max(span, 1) }],
    };
  });
  const unclipStyle = useAnimatedStyle(() => {
    const { left: l, right: r, pullX } = edges.get();
    const squeeze = Math.max((r - l) * pullX, 1) / Math.max(span, 1);
    return {
      transform: [{ translateX: (span / 2 - (l + r) / 2) / squeeze }, { scaleX: 1 / squeeze }],
    };
  });
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
        <GestureDetector gesture={own === 'regular' ? regularTouch : inlineTouch}>
          <View style={styles.fill}>
            <AccessoryPlacementContext value={own}>{kept}</AccessoryPlacementContext>
          </View>
        </GestureDetector>
      </View>
    </Animated.View>
  );

  return (
    <View
      pointerEvents={showing ? 'box-none' : 'none'}
      style={[styles.layer, { left, width: span, bottom, zIndex: over ? 1 : 0 }]}>
      {/* Its own backdrop, which the tab bar's lens shows through it when dragged up over it, as iOS's does. */}
      <NativeGlassBackdrop group={accessoryGroup} style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, layerStyle]}>
          <AnimatedNativeGlassView
            style={styles.glass}
            pointerEvents="none"
            animatedProps={glassProps}
            {...glassStyle}
            continuous={1}
          />
          <Animated.View pointerEvents="box-none" style={[styles.clip, clipStyle]}>
            <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, unclipStyle]}>
              {copy('regular')}
              {copy('inline')}
            </Animated.View>
          </Animated.View>
        </Animated.View>
      </NativeGlassBackdrop>
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
  clip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
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
