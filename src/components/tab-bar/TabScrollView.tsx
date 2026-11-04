import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
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
  useHeaderSnap,
  useHeaderStart,
  useSearchLift,
  useToolbarInset,
} from '../../core/header/scroll';

export type TabScrollViewProps = Omit<ScrollViewProps, 'onScroll'> & {
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
};

const scrollEventThrottle = 16;

export const TabScrollView = ({
  onScroll,
  onLayout,
  onContentSizeChange,
  contentContainerStyle,
  ...props
}: TabScrollViewProps) => {
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
  // Content that scrolls, but not far enough to collapse the large title, gets the room at its end that it lacks, as
  // iOS gives it: the title collapses all the way rather than stopping partway.
  const snap = useHeaderSnap();
  const [viewport, setViewport] = useState(0);
  const [size, setSize] = useState({ height: 0, room: 0 });
  const natural = size.height - size.room;
  const room = snap > 0 && viewport > 0 && natural > viewport ? Math.max(viewport + snap - natural, 0) : 0;

  useFocusEffect(
    useCallback(() => registerFocusedScroll(() => scrollRef.current?.scrollTo({ y: 0, animated: true })), [scrollRef]),
  );

  const content = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePadding = content.paddingBottom ?? content.paddingVertical ?? content.padding ?? 0;
  const baseTop = content.paddingTop ?? content.paddingVertical ?? content.padding ?? 0;
  const padded = [
    contentContainerStyle,
    (inset > 0 || room > 0) && typeof basePadding === 'number' ? { paddingBottom: basePadding + inset + room } : null,
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
        onLayout={(event) => {
          setViewport(event.nativeEvent.layout.height);
          onLayout?.(event);
        }}
        onContentSizeChange={(width, height) => {
          // Measured with the room given, which it takes back off to tell what the content needs.
          setSize((current) => (current.height === height && current.room === room ? current : { height, room }));
          onContentSizeChange?.(width, height);
        }}
        contentContainerStyle={padded}
      />
    </TabScrollMarker>
  );
};
