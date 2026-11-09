import { useTabTrigger } from 'expo-router/ui';
import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { TabIcon } from './TabIcon';
import { pushDimAt, pushMotion } from '../../../core/motion/push';
import { useTabsTint } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { typography } from '../../../theme/tokens';
import { useMore } from '../helpers/more';
import { layout } from '../tokens';

const { moreList } = layout;

interface NavState {
  index?: number;
  routes: { state?: NavState }[];
}

// Whether a tab's own navigators have a screen to go back from.
const canGoBack = (state: NavState | undefined): boolean =>
  state !== undefined && ((state.index ?? 0) > 0 || canGoBack(state.routes[state.index ?? 0]?.state));

/**
 * Android's Back, as More's two levels: from a tab under More (once its own stack is at its first screen) sliding back
 * to the list, as tapping More again does on iOS; from the list back to the tab it was opened over, at once. iOS shows More's list
 * without a navigation bar (react-native-screens hides it), so no back button and no Edit.
 */
const useMoreBack = () => {
  const more = useMore();
  const { getTrigger, switchTab } = useTabTrigger({ name: more?.overflow[0]?.name ?? '' });
  const focused = more?.entries.find((name) => getTrigger(name)?.isFocused);
  const listed = more?.overflow.some((tab) => tab.name === focused) ?? false;
  const stack = focused ? (getTrigger(focused)?.route?.state as NavState | undefined) : undefined;
  // The last tab shown outside More, to go back to from its list.
  const outside = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (focused && !listed) {
      outside.current = focused;
    }
  }, [focused, listed]);
  useEffect(() => {
    if (!more) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!more.open) {
        if (!listed || canGoBack(stack)) {
          return false;
        }
        more.pop();
        return true;
      }
      more.setOpen(false);
      if (listed) {
        const to = outside.current ?? more.entries.find((name) => !more.overflow.some((tab) => tab.name === name));
        if (to) {
          switchTab(to, {});
        }
      }
      return true;
    });
    return () => subscription.remove();
  }, [more, listed, stack, switchTab]);
};

/**
 * More's screen: the tabs that don't fit the bar, as iOS 27 lists them (simulator): plain rows under the status bar,
 * each its tab's icon in the tint, its label and a chevron, hairlines between and around them. Choosing one shows that
 * tab with More still selected in the bar; More again comes back here.
 */
export const MoreList = () => {
  useMoreBack();
  const more = useMore();
  const tint = useTabsTint();
  const { color, scheme } = useLucentTheme(tint);
  const insets = useSafeAreaInsets();
  const { switchTab, getTrigger } = useTabTrigger({ name: more?.overflow[0]?.name ?? '' });
  const { width } = useWindowDimensions();
  // A row's tab slides in once it's the one showing: switching takes the router a moment, and starting before then
  // would slide in the tab More was opened over.
  const pushing = useRef<string | null>(null);
  const focused = more?.entries.find((name) => getTrigger(name)?.isFocused);
  useEffect(() => {
    const name = pushing.current;
    if (name && name === focused && more) {
      pushing.current = null;
      // A frame on, so the tab's screen is drawn before it slides.
      requestAnimationFrame(() => requestAnimationFrame(() => more.push(name)));
    }
  }, [focused, more]);
  // Under a listed tab's screen sliding over it, the list goes 30% of the way left and darkens, as UIKit's does.
  const slide = more?.slide;
  const listStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -width * pushMotion.parallax * (slide ? slide.get() : 0) }],
  }));
  const dimStyle = useAnimatedStyle(() => ({ opacity: pushDimAt(1 - (slide ? slide.get() : 0)) }));
  if (!more?.open || more.overflow.length === 0) {
    return null;
  }
  const colors = moreList.colors[scheme];
  return (
    <Animated.View style={[StyleSheet.absoluteFill, listStyle]} onLayout={more.listShown}>
      <ScrollView
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + layout.tabBarHeight }}>
        <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        {more.overflow.map((tab) => (
          <Pressable
            key={tab.name}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            disabled={tab.disabled}
            onPress={() => {
              switchTab(tab.name, {});
              more.push(tab.name);
            }}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.pressed }]}>
            <View style={styles.icon}>
              <TabIcon icon={tab.icon} selected={false} size={moreList.iconSize} color={color.tint} />
            </View>
            <Text numberOfLines={1} style={[styles.label, { color: colors.label }]}>
              {tab.label}
            </Text>
            <Svg width={moreList.chevron.width} height={moreList.chevron.height} viewBox="0 0 7 12">
              <Path
                d="M1 1l5 5-5 5"
                stroke={colors.chevron}
                strokeWidth={moreList.chevron.stroke}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
            <View style={[styles.separator, styles.rowSeparator, { backgroundColor: colors.separator }]} />
          </Pressable>
        ))}
      </ScrollView>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, dimStyle]} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  dim: {
    backgroundColor: '#000000',
  },
  row: {
    height: moreList.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: moreList.chevronInset,
  },
  icon: {
    width: moreList.textInset,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.body,
    flex: 1,
    marginLeft: moreList.labelNudge,
  },
  separator: {
    height: moreList.separator,
    marginLeft: moreList.textInset,
    marginRight: moreList.separatorInset,
  },
  rowSeparator: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
});
