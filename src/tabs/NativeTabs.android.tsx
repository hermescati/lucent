import type {
  NativeTabsBottomAccessoryProps,
  NativeTabsTriggerBadgeProps,
  NativeTabsTriggerLabelProps,
} from 'expo-router/native-tabs';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { FloatingTabBar } from './FloatingTabBar';
import { TabBarCollapseProvider } from './collapse';
import { SearchHostProvider } from './search';
import { hrefFor, parseTriggers } from './triggers';
import type { LucentNativeTabsProps, LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from './types';
import { GlassBackdrop } from '../glass/GlassBackdrop';

const Trigger = Object.assign((_: LucentNativeTabTriggerProps) => null, {
  Label: (_: NativeTabsTriggerLabelProps) => null,
  Icon: (_: LucentNativeTabsTriggerIconProps) => null,
  Badge: (_: NativeTabsTriggerBadgeProps) => null,
  VectorIcon: (_: object) => null,
});

const BottomAccessory = Object.assign((_: NativeTabsBottomAccessoryProps) => null, {
  usePlacement: (): 'regular' | 'inline' => 'regular',
});

const minimizeMode = (behavior: LucentNativeTabsProps['minimizeBehavior']) =>
  behavior === 'onScrollDown' || behavior === 'onScrollUp' ? behavior : null;

const colorString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const NativeTabsRoot = ({
  children,
  tintColor,
  minimizeBehavior,
  hidden,
  badgeBackgroundColor,
  badgeTextColor,
}: LucentNativeTabsProps) => {
  const triggers = parseTriggers(children, {
    Trigger,
    Label: Trigger.Label,
    Icon: Trigger.Icon,
    Badge: Trigger.Badge,
  });
  const visible = triggers.filter((trigger) => !trigger.hidden);
  const primary = visible.filter((trigger) => !trigger.search);
  const search = visible.find((trigger) => trigger.search);

  return (
    <GestureHandlerRootView style={styles.fill}>
      <KeyboardProvider>
        <SearchHostProvider>
          <TabBarCollapseProvider minimize={minimizeMode(minimizeBehavior)}>
            <Tabs style={styles.fill}>
              <GlassBackdrop style={styles.fill}>
                <TabSlot detachInactiveScreens={false} />
              </GlassBackdrop>
              {!hidden && primary.length > 0 ? (
                <FloatingTabBar
                  tabs={primary}
                  searchTab={search}
                  tintColor={colorString(tintColor)}
                  badgeColor={colorString(badgeBackgroundColor)}
                  badgeTextColor={colorString(badgeTextColor)}
                />
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
