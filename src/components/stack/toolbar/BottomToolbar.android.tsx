import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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

import { useToolbarOffset } from './offset.android';
import { AnimatedNativeGlassBlur } from '../../../core/glass/NativeGlass';
import { useTabBarReach } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { BarItems } from '../header/BarItems.android';
import { BarMeltContext, meltLook } from '../header/melt.android';
import { useSwipeMelt } from '../header/swipeMelt.android';
import { searchMotion, toolbar } from '../tokens';
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
}: Props) => {
  const { color } = useLucentTheme();
  const rest = useToolbarOffset();
  const tabBar = useTabBarReach();
  const { height: keyboard, progress } = useReanimatedKeyboardAnimation();
  const followKeyboard = !props.disableImePadding && !stayDown;
  const tint = typeof props.tintColor === 'string' ? props.tintColor : (tintColor ?? color.text);
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
  const row = useAnimatedStyle(() => ({ marginHorizontal: side - inset.get() }));
  const { melt: swipeMelt, holdStyle } = useSwipeMelt(pushed);
  // In search mode its items go as the keyboard comes up (a clock standing in without one), and come back as it goes.
  const clock = useSharedValue(0);
  useEffect(() => {
    const { fallback, fallbackOver } = searchMotion.bottom;
    clock.set(searching ? withDelay(fallback, withTiming(1, { duration: fallbackOver })) : 0);
  }, [searching, clock]);
  const away = useDerivedValue(() => {
    const { melt: going, toolbarBack } = searchMotion.bottom;
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

  return (
    <Animated.View pointerEvents={searching ? 'none' : 'box-none'} style={[styles.clip, clip, holdStyle]}>
      <AnimatedNativeGlassBlur pointerEvents="box-none" style={[styles.toolbar, row, fade]} animatedProps={meltBlur}>
        <BarMeltContext value={melt}>
          <BarItems color={tint} bottom routeKey={routeKey}>
            {props.children}
          </BarItems>
        </BarMeltContext>
      </AnimatedNativeGlassBlur>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
  },
});
