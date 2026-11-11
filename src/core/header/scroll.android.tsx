import { useHeaderHeight } from 'expo-router/react-navigation';
import { useContext, useEffect, useMemo, useState, type ReactElement } from 'react';
import Animated, {
  makeMutable,
  scrollTo,
  useAnimatedScrollHandler,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

import { createLucentContext } from '../../theme/context';

/**
 * Each stack screen's scroll offset, by route key: the screen's scroll view writes it and the header reads it, to
 * collapse the large title and bring in the scroll edge. The two are siblings, so they meet here rather than in a context.
 */
const offsets = new Map<string, SharedValue<number>>();

export const headerOffset = (routeKey: string) => {
  let offset = offsets.get(routeKey);
  if (!offset) {
    offset = makeMutable(0);
    offsets.set(routeKey, offset);
  }
  return offset;
};

/**
 * How far a stack screen's content has moved up for a search in its navigation bar, by route key: focused, the field
 * rises into the bar's row, as on iOS, and the content follows it. The header writes it and the screen's scroll view
 * reads it.
 */
const lifts = new Map<string, SharedValue<number>>();

export const searchLift = (routeKey: string) => {
  let lift = lifts.get(routeKey);
  if (!lift) {
    lift = makeMutable(0);
    lifts.set(routeKey, lift);
  }
  return lift;
};

/**
 * How far below the navigation bar something the content pins under it reaches, by route key: a plain list's section
 * header, which iOS takes into the bar's scroll edge (measured). The content writes it and the header reads it.
 */
const reaches = new Map<string, SharedValue<number>>();

export const contentReach = (routeKey: string) => {
  let reach = reaches.get(routeKey);
  if (!reach) {
    reach = makeMutable(0);
    reaches.set(routeKey, reach);
  }
  return reach;
};

interface HeaderScroll {
  offset: SharedValue<number>;
  reach: SharedValue<number>;
  lift: SharedValue<number>;
  // The header sits over the content rather than above it, so scroll views inset themselves by its height.
  transparent: boolean;
  // How far a bottom toolbar reaches up from the screen's bottom edge, or 0 without one.
  toolbar: number;
  // The large title's block, which a scroll mustn't stop inside, or 0 without a large title that collapses.
  snap: number;
  // Where the content starts scrolled to: past a search field in the bar that hides when scrolling, as iOS starts it
  // hidden under the title, for a pull to bring out. 0 otherwise.
  start: number;
}

const HeaderScrollContext = createLucentContext<HeaderScroll | null>('HeaderScroll', null);

/** Wraps a stack screen's content, through the navigator's `screenLayout`. */
export const HeaderScrollProvider = ({
  children,
  routeKey,
  transparent,
  toolbar = 0,
  snap = 0,
  start = 0,
}: {
  children: ReactElement;
  routeKey: string;
  transparent: boolean;
  toolbar?: number;
  snap?: number;
  start?: number;
}) => {
  // The header reads the offset before the content's first scroll event: start it where the content does.
  useState(() => {
    if (start > 0) headerOffset(routeKey).set(start);
    return null;
  });
  useEffect(
    () => () => {
      offsets.delete(routeKey);
      lifts.delete(routeKey);
      reaches.delete(routeKey);
    },
    [routeKey],
  );
  // The same object while nothing in it changes: the navigator re-renders this on every options change, and a new
  // value would re-render the screen, whose Stack.Screen would set its options again, round and round.
  const value = useMemo(
    () => ({
      offset: headerOffset(routeKey),
      lift: searchLift(routeKey),
      reach: contentReach(routeKey),
      transparent,
      toolbar,
      snap,
      start,
    }),
    [routeKey, transparent, toolbar, snap, start],
  );
  return <HeaderScrollContext.Provider value={value}>{children}</HeaderScrollContext.Provider>;
};

// A release slower than this (pixels per millisecond) has no fling to follow, so the snap happens on release.
const flingVelocity = 0.1;

/**
 * A scroll handler that tells the screen's Lucent header how far the content has scrolled. Given the scroll view's
 * animated ref, it also does what UIKit does with a large title: a scroll that comes to rest partway through the title's
 * block carries on to whichever end is nearer, expanded or collapsed (measured on the simulator: from 20pt in it goes
 * back, from 30pt on it goes on to 52). Content too short to scroll the title away goes back to it expanded: a scroll to
 * an end it can't reach would stop short of it, and snap again, and again.
 */
export const useHeaderScroll = (scrollRef?: AnimatedRef<Animated.ScrollView>) => {
  const scroll = useContext(HeaderScrollContext);
  const offset = scroll?.offset;
  const snap = scroll?.snap ?? 0;
  const settle = (y: number, room: number) => {
    'worklet';
    if (!scrollRef || snap <= 0 || y <= 0 || y >= snap) return;
    const target = y >= snap / 2 && room >= snap ? snap : 0;
    if (Math.abs(target - y) < 0.5) return;
    scrollTo(scrollRef, 0, target, true);
  };
  return useAnimatedScrollHandler({
    onScroll: (event) => {
      offset?.set(event.contentOffset.y);
    },
    onEndDrag: (event) => {
      if (Math.abs(event.velocity?.y ?? 0) > flingVelocity) return;
      settle(event.contentOffset.y, event.contentSize.height - event.layoutMeasurement.height);
    },
    onMomentumEnd: (event) => {
      settle(event.contentOffset.y, event.contentSize.height - event.layoutMeasurement.height);
    },
  });
};

/**
 * How far content has to scroll to collapse the screen's large title, or 0 without one. iOS lets any content that
 * scrolls at all scroll that far, so the title can go: a scroll view gives itself the room it lacks.
 */
export const useHeaderSnap = (): number => useContext(HeaderScrollContext)?.snap ?? 0;

/** How far a scroll view's content has to start down to clear a transparent Lucent header, as iOS insets it. */
export const useHeaderInset = (): number => {
  const scroll = useContext(HeaderScrollContext);
  const height = useHeaderHeight();
  return scroll?.transparent ? height : 0;
};

/**
 * The screen's scroll offset as its header reads it, for a list's pull to refresh: pulled down, the list writes the pull
 * as a negative offset and the large title comes down with the content, as iOS's does.
 */
export const useHeaderOffset = (): SharedValue<number> | undefined => useContext(HeaderScrollContext)?.offset;

/** Where the screen's scroll view starts scrolled to (see `HeaderScroll.start`). */
export const useHeaderStart = (): number => useContext(HeaderScrollContext)?.start ?? 0;

/** How far the screen's content has moved up for a search in its navigation bar (see `searchLift`), or none. */
export const useSearchLift = (): SharedValue<number> | undefined => useContext(HeaderScrollContext)?.lift;

/** Where content pinned under the navigation bar ends, below it (see `contentReach`), or none. */
export const useContentReach = (): SharedValue<number> | undefined => useContext(HeaderScrollContext)?.reach;

/** How far a scroll view's content has to end up from the bottom to clear a Lucent bottom toolbar, as iOS insets it. */
export const useToolbarInset = (): number => useContext(HeaderScrollContext)?.toolbar ?? 0;
