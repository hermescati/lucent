import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import Animated, {
  scrollTo,
  useAnimatedRef,
  useComposedEventHandler,
  type AnimatedRef,
  type useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { scheduleOnUI } from 'react-native-worklets';

import { registerFocusedScroll } from './helpers/reselect';
import { TabScrollMarker, useTabBarInset, useTabBarScroll } from './scroll';
import { HeaderScrollView, type HeaderScrollViewProps } from '../../core/header/HeaderScrollView';

// Back to the top on the UI thread, where the scroll view's animated ref is read.
const scrollToTop = (ref: AnimatedRef<Animated.ScrollView>) => {
  'worklet';
  scrollTo(ref, 0, 0, true);
};

export type TabScrollViewProps = Omit<HeaderScrollViewProps, 'bottomInset' | 'onScroll'> & {
  onScroll?: ReturnType<typeof useAnimatedScrollHandler>;
};

/**
 * A tab's scroll view: it minimizes the tab bar as it scrolls, clears the tab bar's reach, and goes back to the top when
 * its tab is tapped again; in a Lucent stack on Android, the header follows it too (`HeaderScrollView`).
 */
export const TabScrollView = ({ onScroll, scrollRef: givenRef, ...props }: TabScrollViewProps) => {
  // A caller's own ref, as a list's that scrolls itself while a row is dragged, or this one's.
  const ownRef = useAnimatedRef<Animated.ScrollView>();
  const scrollRef = givenRef ?? ownRef;
  const tabScroll = useTabBarScroll();
  const handler = useComposedEventHandler([tabScroll ?? null, onScroll ?? null]);

  useFocusEffect(useCallback(() => registerFocusedScroll(() => scheduleOnUI(scrollToTop, scrollRef)), [scrollRef]));

  return (
    <TabScrollMarker>
      <HeaderScrollView {...props} scrollRef={scrollRef} bottomInset={useTabBarInset()} onScroll={handler} />
    </TabScrollMarker>
  );
};
