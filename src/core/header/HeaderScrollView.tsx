import { useState } from 'react';
import { StyleSheet, type ScrollViewProps } from 'react-native';
import Animated, {
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useComposedEventHandler,
  type AnimatedRef,
} from 'react-native-reanimated';

import {
  useHeaderInset,
  useHeaderScroll,
  useHeaderSnap,
  useHeaderStart,
  useSearchLift,
  useToolbarInset,
} from './scroll';

export type HeaderScrollViewProps = Omit<ScrollViewProps, 'onScroll'> & {
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
  /** Its animated ref, for a caller that scrolls it itself. */
  scrollRef?: AnimatedRef<Animated.ScrollView>;
  /** Another bar's reach over its bottom, as a tab bar's; it clears whichever of that and a bottom toolbar is taller. */
  bottomInset?: number;
};

const scrollEventThrottle = 16;

/**
 * A scroll view that a Lucent header follows on Android: it tells the header how far it has scrolled, sits under the
 * bar, collapses the large title and snaps it to an end, clears a bottom toolbar, and rises with a search focused in the
 * bar. On iOS, UIKit's bars do all of that themselves, and this is a plain scroll view.
 */
export const HeaderScrollView = ({
  onScroll,
  onLayout,
  onContentSizeChange,
  contentContainerStyle,
  scrollRef: givenRef,
  bottomInset = 0,
  ...props
}: HeaderScrollViewProps) => {
  const ownRef = useAnimatedRef<Animated.ScrollView>();
  const scrollRef = givenRef ?? ownRef;
  const inset = Math.max(bottomInset, useToolbarInset());
  const headerScroll = useHeaderScroll(scrollRef);
  const headerInset = useHeaderInset();
  // Past a search field that iOS starts hidden under the title.
  const start = useHeaderStart();
  // Focused, a search in the navigation bar rises into the bar's row and the content follows it up.
  const lift = useSearchLift();
  const liftStyle = useAnimatedStyle(() => ({ marginTop: lift ? -lift.get() : 0 }));
  const handler = useComposedEventHandler([headerScroll ?? null, onScroll ?? null]);
  // Content that scrolls, but not far enough to collapse the large title, gets the room at its end that it lacks, as
  // iOS gives it: the title collapses all the way rather than stopping partway.
  const snap = useHeaderSnap();
  const [viewport, setViewport] = useState(0);
  const [size, setSize] = useState({ height: 0, room: 0 });
  const natural = size.height - size.room;
  const room = snap > 0 && viewport > 0 && natural > viewport ? Math.max(viewport + snap - natural, 0) : 0;

  const content = StyleSheet.flatten(contentContainerStyle) ?? {};
  const basePadding = content.paddingBottom ?? content.paddingVertical ?? content.padding ?? 0;
  const baseTop = content.paddingTop ?? content.paddingVertical ?? content.padding ?? 0;
  const padded = [
    contentContainerStyle,
    (inset > 0 || room > 0) && typeof basePadding === 'number' ? { paddingBottom: basePadding + inset + room } : null,
    headerInset > 0 && typeof baseTop === 'number' ? { paddingTop: baseTop + headerInset } : null,
  ];

  return (
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
  );
};
