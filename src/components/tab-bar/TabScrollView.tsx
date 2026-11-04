import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, type ScrollViewProps } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
} from 'react-native-reanimated';

import { registerFocusedScroll } from './helpers/reselect';
import { TabScrollMarker, useTabBarInset, useTabBarScroll } from './scroll';
import {
  useHeaderInset,
  useHeaderScroll,
  useHeaderStart,
  useSearchLift,
  useToolbarInset,
} from '../../core/header/scroll';

export type TabScrollViewProps = Omit<ScrollViewProps, 'onScroll'> & {
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
};

const scrollEventThrottle = 16;

export const TabScrollView = ({ onScroll, contentContainerStyle, ...props }: TabScrollViewProps) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const tabScroll = useTabBarScroll();
  // A bottom toolbar on Android floats over the same stretch as the tab bar; the content clears whichever reaches higher.
  const inset = Math.max(useTabBarInset(), useToolbarInset());
  // In a Lucent stack on Android, the header follows this scroll view and sits over its top.
  const headerScroll = useHeaderScroll(scrollRef);
  const headerInset = useHeaderInset();
  // Past a search field that iOS starts hidden under the title.
  const start = useHeaderStart();
  // Focused, a search in the navigation bar rises into the bar's row and the content follows it up.
  const lift = useSearchLift();
  const liftStyle = useAnimatedStyle(() => ({ marginTop: lift ? -lift.get() : 0 }));
  const handler = useComposedEventHandler([tabScroll ?? null, headerScroll ?? null, onScroll ?? null]);

  useFocusEffect(
    useCallback(() => registerFocusedScroll(() => scrollRef.current?.scrollTo({ y: 0, animated: true })), [scrollRef]),
  );

  const content = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePadding = content.paddingBottom ?? content.paddingVertical ?? content.padding ?? 0;
  const baseTop = content.paddingTop ?? content.paddingVertical ?? content.padding ?? 0;
  const padded = [
    contentContainerStyle,
    inset > 0 && typeof basePadding === 'number' ? { paddingBottom: basePadding + inset } : null,
    headerInset > 0 && typeof baseTop === 'number' ? { paddingTop: baseTop + headerInset } : null,
  ];

  return (
    <TabScrollMarker>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={scrollEventThrottle}
        contentOffset={start > 0 ? { x: 0, y: start } : undefined}
        {...props}
        style={[props.style, liftStyle]}
        onScroll={handler}
        contentContainerStyle={padded}
      />
    </TabScrollMarker>
  );
};
