import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, type ScrollViewProps } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useComposedEventHandler } from 'react-native-reanimated';

import { registerFocusedScroll } from './reselect';
import { TabScrollMarker, useTabBarInset, useTabBarScroll } from './scroll';

export type TabScrollViewProps = Omit<ScrollViewProps, 'onScroll'> & {
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
};

const scrollEventThrottle = 16;

export const TabScrollView = ({ onScroll, contentContainerStyle, ...props }: TabScrollViewProps) => {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const tabScroll = useTabBarScroll();
  const inset = useTabBarInset();
  const handler = useComposedEventHandler([tabScroll ?? null, onScroll ?? null]);

  useFocusEffect(
    useCallback(
      () => registerFocusedScroll(() => scrollRef.current?.scrollTo({ y: 0, animated: true })),
      [scrollRef],
    ),
  );

  const content = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePadding = content.paddingBottom ?? content.paddingVertical ?? content.padding ?? 0;
  const padded =
    inset > 0 && typeof basePadding === 'number' ? [contentContainerStyle, { paddingBottom: basePadding + inset }] : contentContainerStyle;

  return (
    <TabScrollMarker>
      <Animated.ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        scrollEventThrottle={scrollEventThrottle}
        {...props}
        onScroll={handler}
        contentContainerStyle={padded}
      />
    </TabScrollMarker>
  );
};
