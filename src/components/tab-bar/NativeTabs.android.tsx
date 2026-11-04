import { useTheme } from 'expo-router';
import type {
  NativeTabsBottomAccessoryProps,
  NativeTabsTriggerBadgeProps,
  NativeTabsTriggerLabelProps,
} from 'expo-router/native-tabs';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { FloatingTabBar } from './components/FloatingTabBar';
import { TabBarCollapseProvider, useTabBarCollapse } from './context/collapse';
import { SearchHostProvider } from './context/search';
import { barSpanFor, fullHeight } from './helpers/bar';
import { hrefFor, parseTriggers, triggerPart } from './helpers/triggers';
import { useTabBarOffset } from './hooks/useTabBarOffset';
import { barPresence, layout } from './tokens';
import type { LucentNativeTabsProps, LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from './types';
import { InsideGlassBackdrop } from '../../core/glass/BackdropContext';
import { NativeGlassBackdrop } from '../../core/glass/NativeGlass';
import { InsideTabsContext, TabBarReachContext, TabsTintContext } from '../../core/tabs/TabBarReach';

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
  const primary = visible.filter((trigger) => !trigger.search);
  const search = visible.find((trigger) => trigger.search);
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
    <GestureHandlerRootView style={styles.fill}>
      <KeyboardProvider>
        <SearchHostProvider>
          <TabBarCollapseProvider minimize={minimizeMode(minimizeBehavior)}>
            <Tabs style={styles.fill}>
              <InsideTabsContext value>
                <TabsTintContext value={colorString(tintColor)}>
                  <TabBarReachProvider shown={!hidden && primary.length > 0}>
                    <InsideGlassBackdrop.Provider value>
                      <NativeGlassBackdrop style={styles.fill}>
                        {/* The glass refracts what's drawn in here, so paint the navigation theme's background behind the
                    screens, as iOS does, for screens without their own colour. */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
                        <TabSlot detachInactiveScreens={false} />
                      </NativeGlassBackdrop>
                    </InsideGlassBackdrop.Provider>
                  </TabBarReachProvider>
                </TabsTintContext>
              </InsideTabsContext>
              {primary.length > 0 ? (
                <Animated.View
                  pointerEvents={shown ? 'box-none' : 'none'}
                  importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
                  style={[StyleSheet.absoluteFill, presenceStyle]}>
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
  );
};

export const NativeTabs = Object.assign(NativeTabsRoot, { Trigger, BottomAccessory });

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
