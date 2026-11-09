import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ListEditContext,
  ListForEach,
  ListScrollGestureContext,
  ListStyleContext,
  OpenRowContext,
  sectionsOf,
  useListColors,
} from './section.android';
import { list } from './tokens';
import type { ListProps } from './types';
import { useHeaderOffset, useHeaderSnap } from '../../core/header/scroll';
import { ListScrollViewContext } from '../../core/scroll';
import { Spinner } from '../../core/spinner';

/** The scroll view the screen gives lists (`ListScrollViewContext`), with Lucent's background and no overscroll glow. */
export const ListScroll = ({
  background,
  onRefresh,
  children,
  style,
  testID,
}: {
  background: string;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
  style?: ScrollViewProps['style'];
  testID?: string;
}) => {
  const Scroll = useContext(ListScrollViewContext);
  const scrollY = useSharedValue(0);
  const openRow = useSharedValue(-1);
  // How far the content is pulled down past its top, whether a refresh is running, and how many of the spinner's spokes
  // are drawn (a refresh starts as the last one is). `fading` is the spinner going once a refresh is done.
  const pull = useSharedValue(0);
  const refreshingNow = useSharedValue(false);
  const drawn = useSharedValue(0);
  const pulledFrom = useSharedValue(0);
  const fading = useSharedValue(0);
  // The screen's large title, if it has one, comes down with the content, and the spinner takes its place.
  const headerOffset = useHeaderOffset();
  const overTitle = useHeaderSnap() > 0;
  const [height, setHeight] = useState(0);
  // The spinner is there only while the content is pulled down or refreshing: turning, unseen, it would keep the UI
  // thread busy for nothing. It turns once a refresh starts.
  const [spinnerState, setSpinnerState] = useState<'none' | 'drawing' | 'spinning'>('none');
  useAnimatedReaction(
    () => (refreshingNow.get() ? 'spinning' : pull.get() > 0.5 ? 'drawing' : 'none'),
    (now, before) => {
      if (now !== before) scheduleOnRN(setSpinnerState, now);
    },
  );
  useAnimatedReaction(
    () => pull.get(),
    (now, before) => {
      if (headerOffset && scrollY.get() <= 1 && (now > 0 || (before ?? 0) > 0)) headerOffset.set(-now);
    },
  );
  const { lead, band, spokes, size, rest, fade, spring } = list.refresh;
  const full = spokes.pull[spokes.pull.length - 1];

  const finish = useCallback(() => {
    // Done: the spinner shrinks and fades where it is, then the content goes back up.
    fading.set(
      withTiming(1, { duration: fade, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (!finished) return;
        refreshingNow.set(false);
        pull.set(withSpring(0, spring));
      }),
    );
  }, [fading, fade, refreshingNow, pull, spring]);
  const start = useCallback(() => {
    if (!onRefresh) return;
    performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
    onRefresh().finally(finish);
  }, [onRefresh, finish]);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.set(event.contentOffset.y);
    },
    // Scrolling closes a row's open actions, as iOS's does.
    onBeginDrag: () => {
      openRow.set(-1);
    },
  });
  const native = useNativeGesture({});
  // Down from the top, the content follows the finger one to one for a way, then with iOS's rubber band, harder the
  // further it goes. The refresh starts as the spinner's last spoke is drawn, finger still down.
  const pan = usePanGesture({
    enabled: Boolean(onRefresh),
    activeOffsetY: 10,
    failOffsetX: [-15, 15],
    simultaneousWith: native,
    // A drag that starts while a refresh runs picks the content up where it rests.
    onActivate: () => {
      pulledFrom.set(pull.get());
    },
    onUpdate: (event) => {
      const x = pulledFrom.get() + event.translationY;
      if (scrollY.get() > 1 || x <= 0) {
        if (pull.get() !== 0 && !refreshingNow.get()) pull.set(0);
        if (!refreshingNow.get()) drawn.set(0);
        return;
      }
      const d = height || 800;
      const next = x <= lead ? x : lead + (1 - 1 / (((x - lead) * band) / d + 1)) * d;
      pull.set(next);
      // Once it runs, the content still follows the finger, and the spinner turns.
      if (refreshingNow.get()) return;
      drawn.set(interpolate(next, spokes.pull, spokes.drawn, 'clamp'));
      if (next >= full) {
        refreshingNow.set(true);
        fading.set(0);
        scheduleOnRN(start);
      }
    },
    onDeactivate: (event) => {
      // Let go, the content settles: where a refresh runs, or back up, carrying the finger's speed (slowed by the band).
      const velocity = event.velocityY * band;
      pull.set(withSpring(refreshingNow.get() ? rest : 0, { ...spring, velocity }));
      if (!refreshingNow.get()) drawn.set(0);
    },
  });
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pull.get() }] }));
  // In the large title's place as the title comes down, or with no large title, in the middle of the room the pull makes.
  const spinnerStyle = useAnimatedStyle(() => {
    const middle = overTitle ? -list.refresh.overTitle : pull.get() / 2;
    const going = fading.get();
    return {
      opacity: 1 - going,
      transform: [{ translateY: middle - size / 2 }, { scale: 1 - going * 0.5 }],
    };
  });

  // The screen's scroll view, from context: the same component each render, so drawn with `createElement` rather than
  // as a tag the compiler would take for one made during render.
  const scroll = createElement(
    Scroll,
    {
      testID,
      style: [styles.fill, { backgroundColor: background }, style],
      contentContainerStyle: styles.content,
      overScrollMode: 'never',
      onScroll: onScroll as unknown as ScrollViewProps['onScroll'],
      scrollEventThrottle: 16,
      onLayout: (event: LayoutChangeEvent) => setHeight(event.nativeEvent.layout.height),
    },
    onRefresh ? (
      <View>
        <Animated.View pointerEvents="none" style={[styles.spinner, { height: size }, spinnerStyle]}>
          {spinnerState !== 'none' ? (
            <Spinner size={size} drawn={drawn} spinning={spinnerState === 'spinning'} />
          ) : null}
        </Animated.View>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </View>
    ) : (
      children
    ),
  );
  return (
    <OpenRowContext value={openRow}>
      <ListScrollGestureContext value={native}>
        {onRefresh ? (
          <GestureDetector gesture={pan}>
            <View style={styles.fill}>
              <GestureDetector gesture={native}>{scroll}</GestureDetector>
            </View>
          </GestureDetector>
        ) : (
          <GestureDetector gesture={native}>{scroll}</GestureDetector>
        )}
      </ListScrollGestureContext>
    </OpenRowContext>
  );
};

/**
 * `@expo/ui`'s `List`, drawn as iOS 27's: inset grouped by default, each section on a rounded card over the grouped
 * grey, or plain, edge to edge; with `onRefresh`, a pull down from the top shows the spinner and lets go into a refresh
 * the returned promise ends.
 */
export const List = ({
  children,
  onRefresh,
  listStyle = 'insetGrouped',
  editMode = false,
  testID,
  style,
}: ListProps) => {
  const colors = useListColors();
  // Into and out of edit mode on one spring, every row together.
  const editProgress = useSharedValue(editMode ? 1 : 0);
  useEffect(() => {
    editProgress.set(withSpring(editMode ? 1 : 0, list.edit.spring));
  }, [editMode, editProgress]);
  const edit = useMemo(() => ({ editing: editMode, progress: editProgress }), [editMode, editProgress]);
  return (
    <ListEditContext value={edit}>
      <ListStyleContext value={listStyle}>
        <ListScroll
          background={listStyle === 'plain' ? colors.plain : colors.page}
          onRefresh={onRefresh}
          style={style}
          testID={testID}>
          {sectionsOf(children)}
        </ListScroll>
      </ListStyleContext>
    </ListEditContext>
  );
};

List.ForEach = ListForEach;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 24 },
  spinner: { position: 'absolute', top: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' },
});
