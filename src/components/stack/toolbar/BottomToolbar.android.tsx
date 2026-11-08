import { useContext, useEffect, useState } from 'react';
import { StyleSheet, View, type ColorValue } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useToolbarOffset } from './offset.android';
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { useTabBarReach } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { BarFillContext } from '../header/BarCapsule.android';
import { BarItems, hasBareItem } from '../header/BarItems.android';
import { edgeGlass } from '../header/Header.android';
import { BarMeltContext, meltLook } from '../header/melt.android';
import { useSwipeMelt } from '../header/swipeMelt.android';
import { slotIsButton } from '../search/SearchBar.android';
import { SearchBubbleContext } from '../search/SearchField.android';
import { barMotion, searchMotion, toolbar } from '../tokens';
import type { LucentToolbarProps } from '../types';

interface Props {
  toolbar: LucentToolbarProps;
  tintColor?: string;
  routeKey: string;
  // Came in over another screen, so its buttons start gone and pop in as it slides in.
  pushed: boolean;
  // In search mode from its slot: it rides the keyboard up as its items blur away; `returning`, as search mode ends, it
  // comes back once the keyboard's down.
  searching?: boolean;
  returning?: boolean;
  // Stays down under the keyboard, as iOS's does while a field in the navigation bar has it.
  stayDown?: boolean;
  // The page's colour, which the solid fallback paints its edge in.
  background?: ColorValue;
}

// Room above and below the items inside the clip, for their shadows and a held item's growing glass.
const shadowRoom = 24;

/**
 * iOS 26's bottom toolbar: glass capsules floating over the bottom of the content, spread by flexible spacers. It draws
 * after the content, so the content's glass goes under it. Inside `NativeTabs` it sits in the tab bar's row, under the
 * bar, as iOS 27's does: hidden while the bar is full, its middle showing between the bar's two circles once it
 * minimizes, and its ends, under the circles, not at all. It rises above the keyboard unless `disableImePadding`, as
 * expo-router's Android toolbar does, all of it showing there. Through a push or a pop its buttons stay where they stand
 * while the pages slide, and blur and fade in or out with their screen, as the navigation bar's do.
 */
export const BottomToolbar = ({
  toolbar: props,
  tintColor,
  routeKey,
  pushed,
  searching = false,
  returning = false,
  stayDown = false,
  background,
}: Props) => {
  const { color, scheme, solid } = useLucentTheme();
  const rest = useToolbarOffset();
  const tabBar = useTabBarReach();
  const { height: keyboard, progress } = useReanimatedKeyboardAnimation();
  const followKeyboard = !props.disableImePadding && !stayDown;
  // `Stack.Toolbar`'s own `tintColor` changes nothing on iOS 27's glass toolbar (simulator): its plain items keep the
  // label colour, and only an item's own `tintColor` colours it.
  const tint = tintColor ?? color.text;
  // Its end items sit under the minimized bar's circles, as on iOS, where both are the same distance in.
  const side = tabBar ? tabBar.circle - toolbar.icon / 2 : toolbar.margin;
  // Between the circles' inner edges: what the minimized bar leaves showing.
  const between = tabBar ? tabBar.circle + tabBar.compact / 2 : side;
  // Centred on the tab bar's middle, which it minimizes about.
  const above = tabBar ? tabBar.middle - toolbar.height / 2 : rest;

  // keyboard-controller's height is negative while the keyboard is up.
  const typing = useDerivedValue(() => (followKeyboard ? -keyboard.get() + toolbar.aboveKeyboard : 0));
  // Clipped only to hide its ends under the minimized bar's circles; otherwise the clip spans the screen, so a held
  // item's glass can grow past its edges.
  const inset = useDerivedValue(() => (tabBar && typing.get() <= above ? between : 0));
  const clip = useAnimatedStyle(() => ({
    bottom: Math.max(above, typing.get()) - shadowRoom,
    left: inset.get(),
    right: inset.get(),
  }));
  // The row keeps its place inside the clip, so the items stay where they'd be without it.
  // Room on each side too, inside the blur that holds them, which cuts what it holds to its bounds: a held capsule
  // grows past its ends.
  const row = useAnimatedStyle(() => ({ marginHorizontal: side - inset.get() - shadowRoom }));
  const { melt: swipeMelt, holdStyle } = useSwipeMelt(pushed);
  // In search mode its items go as the keyboard comes up (a clock standing in without one), and come back as it goes.
  const bubble = useContext(SearchBubbleContext);
  const clock = useSharedValue(0);
  useEffect(() => {
    const { fallback, fallbackOver } = searchMotion.bottom;
    clock.set(searching ? withDelay(fallback, withTiming(1, { duration: fallbackOver })) : 0);
  }, [searching, clock]);
  const circle = slotIsButton(props);
  const away = useDerivedValue(() => {
    const { melt: going, toolbarBack } = searchMotion.bottom;
    // Out of the stack's field up ahead of time, they go as it grows out of their slot, and come back as its glass fades
    // or as the keyboard goes, whichever's later.
    if (bubble) {
      // Out of a magnifier's circle, the circle takes the field's place the frame it lands: the rest are back by then.
      if (circle && returning && bubble.up.get() <= 0.5) return 0;
      const field =
        interpolate(bubble.stretch.get(), going, [0, 1], Extrapolation.CLAMP) * Math.min(bubble.up.get(), 1);
      const typing = searching || returning ? interpolate(progress.get(), toolbarBack, [0, 1], Extrapolation.CLAMP) : 0;
      return Math.max(field, typing);
    }
    if (searching) return interpolate(Math.max(progress.get(), clock.get()), going, [0, 1], Extrapolation.CLAMP);
    return returning ? interpolate(progress.get(), toolbarBack, [0, 1], Extrapolation.CLAMP) : 0;
  });
  // The swipe's melt runs below 0 as its items come back (see `BarMeltContext`): the further gone of the two wins.
  const melt = useDerivedValue(() => {
    const swipe = swipeMelt.get();
    return Math.abs(swipe) >= away.get() ? swipe : away.get();
  });
  const meltBlur = useAnimatedProps(() => ({ radius: meltLook(melt.get()).blur }));
  // Faded and blurred, not swollen: grown about the middle of a row the screen's width, its ends would fly apart.
  const fade = useAnimatedStyle(() => ({ opacity: meltLook(melt.get()).opacity }));

  // With a bare item on it, what scrolls under it blurs and washes, as under the navigation bar (toolbar.edge).
  // Only while it shows: it's lifted glass, which draws what's behind it over whatever lies under it, the field above
  // the keyboard too, at any opacity. Search mode takes the toolbar away, and the edge with it.
  const bare = hasBareItem(props.children) && !searching && !returning;
  const [edgeMounted, setEdgeMounted] = useState(bare);
  if (bare && !edgeMounted) setEdgeMounted(true);
  const edgeIn = useSharedValue(0);
  useEffect(() => {
    if (!edgeMounted) return;
    edgeIn.set(
      withTiming(bare ? 1 : 0, { duration: toolbar.edge.fade }, (done) => {
        if (done && !bare) scheduleOnRN(setEdgeMounted, false);
      }),
    );
  }, [bare, edgeMounted, edgeIn]);
  const edgeStyle = useAnimatedStyle(() => ({
    // Solid, the page's colour up to the toolbar's top, fading to clear over the navigation bar's solid fade above it,
    // as that bar's edge does below it.
    height: above + toolbar.height + (solid ? barMotion.solidFade : toolbar.edge.above),
    opacity: Math.min(edgeIn.get() * 4, 1) * meltLook(melt.get()).opacity,
  }));
  const edgeProps = useAnimatedProps(() => ({
    blurRadius: edgeIn.get() * toolbar.edge.blur,
    tint: edgeIn.get() > 0 ? toolbar.edge.wash[scheme] : 'rgba(0, 0, 0, 0)',
  }));

  return (
    <>
      {edgeMounted ? (
        <AnimatedNativeGlassView
          {...edgeGlass}
          fallback={solid ? background : undefined}
          fallbackFade={barMotion.solidFade}
          fallbackFadeTop
          lift
          pointerEvents="none"
          animatedProps={edgeProps}
          style={[styles.edge, edgeStyle]}>
          {/* A hairline along its top, as along the navigation bar's edge's bottom (iOS 27 simulator: one device pixel).
            Solid, it fades instead, as that bar's does. */}
          {solid ? null : <Animated.View style={[styles.edgeLine, { backgroundColor: barMotion.edgeLine[scheme] }]} />}
        </AnimatedNativeGlassView>
      ) : null}
      {/* Its touches are taken by a cover in search mode, not by its own pointerEvents changing: a render that changes
        the views its items' blur and fade ride would put those back for a frame (synchronous UI props). */}
      <Animated.View pointerEvents="box-none" style={[styles.clip, clip, holdStyle]}>
        <AnimatedNativeGlassBlur pointerEvents="box-none" style={[styles.toolbar, row, fade]} animatedProps={meltBlur}>
          <BarMeltContext value={melt}>
            <BarFillContext value={typeof props.backgroundColor === 'string' ? props.backgroundColor : undefined}>
              <BarItems color={tint} bottom routeKey={routeKey}>
                {props.children}
              </BarItems>
            </BarFillContext>
          </BarMeltContext>
        </AnimatedNativeGlassBlur>
        {searching ? <View style={StyleSheet.absoluteFill} /> : null}
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  edge: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 2, elevation: 2 },
  edgeLine: { position: 'absolute', top: 0, left: 0, right: 0, height: StyleSheet.hairlineWidth },
  clip: {
    position: 'absolute',
    paddingVertical: shadowRoom,
    overflow: 'hidden',
    zIndex: 2,
    elevation: 2,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: shadowRoom,
  },
});
