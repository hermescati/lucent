import { createElement, useCallback, useContext, type ReactNode } from 'react';
import { StyleSheet, View, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ListForEach, ListStyleContext, OpenRowContext, sectionsOf, useListColors } from './section.android';
import { list } from './tokens';
import type { ListProps } from './types';
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
  // How far the content is pulled down past its top, and whether a refresh is running.
  const pull = useSharedValue(0);
  const refreshingNow = useSharedValue(false);
  const { threshold, rest, resistance, spring } = list.refresh;

  const finish = useCallback(() => {
    refreshingNow.set(false);
    pull.set(withSpring(0, spring));
  }, [pull, refreshingNow, spring]);
  const start = useCallback(() => {
    if (!onRefresh) return;
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
  // Down from the top, the content follows the finger at a resisting rate, as iOS's rubber band does, and lets go into
  // a refresh past `threshold`.
  const pan = usePanGesture({
    enabled: Boolean(onRefresh),
    activeOffsetY: 10,
    failOffsetX: [-15, 15],
    simultaneousWith: native,
    onUpdate: (event) => {
      if (refreshingNow.get()) return;
      if (scrollY.get() > 1 || event.translationY <= 0) {
        if (pull.get() !== 0) pull.set(0);
        return;
      }
      pull.set(event.translationY * resistance);
    },
    onDeactivate: () => {
      if (refreshingNow.get()) return;
      if (pull.get() >= threshold) {
        refreshingNow.set(true);
        pull.set(withSpring(rest, spring));
        scheduleOnRN(start);
      } else {
        pull.set(withSpring(0, spring));
      }
    },
  });
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pull.get() }] }));
  const spinnerStyle = useAnimatedStyle(() => ({
    opacity: refreshingNow.get() ? 1 : interpolate(pull.get(), [threshold * 0.3, threshold], [0, 1], 'clamp'),
    transform: [{ translateY: pull.get() / 2 - rest / 2 }],
  }));

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
    },
    onRefresh ? (
      <View>
        <Animated.View pointerEvents="none" style={[styles.spinner, { height: rest }, spinnerStyle]}>
          <Spinner />
        </Animated.View>
        <Animated.View style={contentStyle}>{children}</Animated.View>
      </View>
    ) : (
      children
    ),
  );
  return (
    <OpenRowContext value={openRow}>
      {onRefresh ? (
        <GestureDetector gesture={pan}>
          <View style={styles.fill}>
            <GestureDetector gesture={native}>{scroll}</GestureDetector>
          </View>
        </GestureDetector>
      ) : (
        scroll
      )}
    </OpenRowContext>
  );
};

/**
 * `@expo/ui`'s `List`, drawn as iOS 27's: inset grouped by default, each section on a rounded card over the grouped
 * grey, or plain, edge to edge; with `onRefresh`, a pull down from the top shows the spinner and lets go into a refresh
 * the returned promise ends.
 */
export const List = ({ children, onRefresh, listStyle = 'insetGrouped', testID, style }: ListProps) => {
  const colors = useListColors();
  return (
    <ListStyleContext value={listStyle}>
      <ListScroll
        background={listStyle === 'plain' ? colors.plain : colors.page}
        onRefresh={onRefresh}
        style={style}
        testID={testID}>
        {sectionsOf(children)}
      </ListScroll>
    </ListStyleContext>
  );
};

List.ForEach = ListForEach;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 24 },
  spinner: { position: 'absolute', top: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' },
});
