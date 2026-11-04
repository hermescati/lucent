import { useTheme } from 'expo-router';
import type {
  NativeTabsBottomAccessoryProps,
  NativeTabsTriggerBadgeProps,
  NativeTabsTriggerLabelProps,
} from 'expo-router/native-tabs';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View, type ColorValue } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { FloatingTabBar } from './components/FloatingTabBar';
import { MoreList } from './components/MoreList';
import { TabIcon } from './components/TabIcon';
import { TabBarCollapseProvider, useTabBarCollapse } from './context/collapse';
import { SearchHostProvider, useSearchHost } from './context/search';
import { barSpanFor, fullHeight } from './helpers/bar';
import { MoreContext, splitEntries, useMore } from './helpers/more';
import { hrefFor, parseTriggers, triggerPart } from './helpers/triggers';
import { useTabBarOffset } from './hooks/useTabBarOffset';
import { barPresence, layout } from './tokens';
import type { LucentNativeTabsProps, LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from './types';
import { displayCornerRadius } from '../../core/display/corner.android';
import { InsideGlassBackdrop } from '../../core/glass/BackdropContext';
import { NativeGlassBackdrop } from '../../core/glass/NativeGlass';
import { pushMotion, pushSpring } from '../../core/motion/push';
import {
  InsideTabsContext,
  TabBarReachContext,
  TabSearchActiveContext,
  TabsTintContext,
} from '../../core/tabs/TabBarReach';

const Trigger = Object.assign(triggerPart<LucentNativeTabTriggerProps>('trigger'), {
  Label: triggerPart<NativeTabsTriggerLabelProps>('label'),
  Icon: triggerPart<LucentNativeTabsTriggerIconProps>('icon'),
  Badge: triggerPart<NativeTabsTriggerBadgeProps>('badge'),
  VectorIcon: triggerPart<object>('vectorIcon'),
});

const BottomAccessory = Object.assign((_: NativeTabsBottomAccessoryProps) => null, {
  usePlacement: (): 'regular' | 'inline' => 'regular',
});

const minimizeMode = (behavior: LucentNativeTabsProps['minimizeBehavior']) =>
  behavior === 'onScrollDown' || behavior === 'onScrollUp' ? behavior : null;

// Tells what floats above the bar, such as a stack's bottom toolbar, how far up the bar reaches as it minimizes.
const TabSearchActive = ({ children }: { children: ReactNode }) => (
  <TabSearchActiveContext value={useSearchHost().active}>{children}</TabSearchActiveContext>
);

const TabBarReachProvider = ({ shown, children }: { shown: boolean; children: ReactNode }) => {
  const offset = useTabBarOffset();
  const collapse = useTabBarCollapse();
  const { width } = useWindowDimensions();
  // Minimized, the bar is a circle at each end of its span, as wide as the bar is full high.
  const circle = (width - barSpanFor(width)) / 2 + fullHeight / 2;
  const reach = useDerivedValue(
    () => offset + fullHeight + (layout.tabBarCompactHeight - fullHeight) * (collapse?.progress.get() ?? 0),
  );
  return (
    <TabBarReachContext
      value={
        shown
          ? {
              reach,
              rest: offset + fullHeight,
              middle: offset + fullHeight / 2,
              circle,
              compact: layout.tabBarCompactHeight,
            }
          : null
      }>
      {children}
    </TabBarReachContext>
  );
};

// The tabs' screens, over More's list: a listed tab's screen slides over it and off it again as iOS's More pushes and
// pops it, its corners rounded to the display's as it moves, with the shadow it casts on the list. Under the list at
// rest, they stay in place, unseen and untouchable: moved off-screen, a screen first shown there lays its title out
// wrong and keeps showing the tab it replaced.
const MoreCover = ({ children }: { children: ReactNode }) => {
  const more = useMore();
  const { width, height } = useWindowDimensions();
  const radius = useMemo(() => displayCornerRadius(), []);
  const slide = more?.slide;
  const coverStyle = useAnimatedStyle(() => {
    const at = slide ? slide.get() : 1;
    const moving = at > 0 && at < 1;
    return {
      opacity: at > 0 ? 1 : 0,
      transform: [{ translateX: moving ? width * (1 - at) : 0 }],
      borderRadius: moving ? radius : 0,
    };
  });
  const shadowStyle = useAnimatedStyle(() => {
    const at = slide ? slide.get() : 1;
    return { opacity: at > 0 && at < 1 ? 1 : 0, transform: [{ translateX: width * (1 - at) }] };
  });
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[styles.shadow, { width, height, borderRadius: radius }, shadowStyle]}
      />
      <Animated.View
        pointerEvents={more?.open ? 'none' : 'auto'}
        style={[StyleSheet.absoluteFill, styles.cover, coverStyle]}>
        {children}
      </Animated.View>
    </>
  );
};

// The tabs' screens, behind the bar's glass. Memoised: they don't depend on the bar's tabs, and with every screen kept
// mounted, re-rendering them all as a tab comes or goes holds React for seconds, stalling the bar's animations.
const Screens = memo(({ background }: { background: ColorValue }) => (
  <InsideGlassBackdrop.Provider value>
    <NativeGlassBackdrop style={styles.fill}>
      <MoreList />
      <MoreCover>
        {/* The glass refracts what's drawn in here, so paint the navigation theme's background behind the screens, as
        iOS does, for screens without their own colour. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: background }]} />
        <TabSearchActive>
          <TabSlot detachInactiveScreens={false} />
        </TabSearchActive>
      </MoreCover>
    </NativeGlassBackdrop>
  </InsideGlassBackdrop.Provider>
));

const colorString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const NativeTabsRoot = ({
  children,
  tintColor,
  minimizeBehavior,
  hidden,
  badgeBackgroundColor,
  badgeTextColor,
}: LucentNativeTabsProps) => {
  const triggers = parseTriggers(children);
  const visible = triggers.filter((trigger) => !trigger.hidden);
  const {
    barTabs: primary,
    barSearch: search,
    overflow,
  } = splitEntries(
    visible.filter((trigger) => !trigger.search),
    visible.find((trigger) => trigger.search),
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreTop, setMoreTop] = useState<string | null>(null);
  const slide = useSharedValue(1);
  // How the screen over the list goes once the list is there to show: mounting it takes a moment.
  const uncover = useRef<'cut' | 'pop' | null>(null);
  const more =
    overflow.length > 0
      ? {
          overflow,
          entries: visible.map((trigger) => trigger.name),
          open: moreOpen,
          setOpen: (open: boolean) => {
            if (open && moreOpen) {
              slide.set(0);
            } else if (open) {
              uncover.current = 'cut';
            } else {
              uncover.current = null;
              slide.set(1);
            }
            setMoreOpen(open);
          },
          top: overflow.some((tab) => tab.name === moreTop) ? moreTop : null,
          slide,
          push: (name: string) => {
            setMoreTop(name);
            slide.set(
              withSpring(1, pushSpring, (done) => {
                if (done) scheduleOnRN(setMoreOpen, false);
              }),
            );
          },
          pop: () => {
            setMoreTop(null);
            if (moreOpen) {
              slide.set(withSpring(0, pushSpring));
              return;
            }
            uncover.current = 'pop';
            setMoreOpen(true);
          },
          listShown: () => {
            const how = uncover.current;
            uncover.current = null;
            if (how === 'cut') slide.set(0);
            if (how === 'pop') slide.set(withSpring(0, pushSpring));
          },
        }
      : null;
  const { colors } = useTheme();
  // Hidden, the bar stays mounted and fades, as iOS's does, rather than going and coming back whole.
  const shown = !hidden;
  const presence = useSharedValue(shown ? 1 : 0);
  useEffect(() => {
    presence.set(
      shown
        ? withTiming(1, { duration: barPresence.show, easing: Easing.out(Easing.quad) })
        : withTiming(0, { duration: barPresence.hide }),
    );
  }, [shown, presence]);
  const presenceStyle = useAnimatedStyle(() => ({ opacity: presence.get() }));

  return (
    <MoreContext value={more}>
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardProvider>
          <SearchHostProvider>
            <TabBarCollapseProvider minimize={minimizeMode(minimizeBehavior)}>
              <Tabs style={styles.fill}>
                <InsideTabsContext value>
                  <TabsTintContext value={colorString(tintColor)}>
                    <TabBarReachProvider shown={!hidden && primary.length > 0}>
                      <Screens background={colors.background} />
                    </TabBarReachProvider>
                  </TabsTintContext>
                </InsideTabsContext>
                {primary.length > 0 ? (
                  <Animated.View
                    pointerEvents={shown ? 'box-none' : 'none'}
                    importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
                    style={[StyleSheet.absoluteFill, presenceStyle]}>
                    {/* Hidden tabs' icons drawn once, out of sight: a symbol's first draw takes a few frames, which would
                  leave a tab added later showing its label before its icon. */}
                    <View style={styles.warm} pointerEvents="none" importantForAccessibility="no-hide-descendants">
                      {triggers
                        .filter((trigger) => trigger.hidden && !trigger.search)
                        .map((trigger) => (
                          <TabIcon
                            key={trigger.name}
                            icon={trigger.icon}
                            selected={false}
                            size={layout.tabIconSize}
                            color="black"
                          />
                        ))}
                    </View>
                    <FloatingTabBar
                      tabs={primary}
                      searchTab={search}
                      tintColor={colorString(tintColor)}
                      badgeColor={colorString(badgeBackgroundColor)}
                      badgeTextColor={colorString(badgeTextColor)}
                    />
                  </Animated.View>
                ) : null}
                <TabList style={styles.hidden}>
                  {triggers.map((trigger) => (
                    <TabTrigger key={trigger.name} name={trigger.name} href={hrefFor(trigger.name)} />
                  ))}
                </TabList>
              </Tabs>
            </TabBarCollapseProvider>
          </SearchHostProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </MoreContext>
  );
};

export const NativeTabs = Object.assign(NativeTabsRoot, { Trigger, BottomAccessory });

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  warm: {
    position: 'absolute',
    left: -1000,
    top: 0,
    flexDirection: 'row',
  },
  hidden: {
    display: 'none',
  },
  cover: {
    overflow: 'hidden',
  },
  shadow: {
    position: 'absolute',
    top: 0,
    left: 0,
    boxShadow: pushMotion.shadow,
  },
});
