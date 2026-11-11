import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type LayoutChangeEvent, type ScrollViewProps } from 'react-native';
import { GestureDetector, useNativeGesture, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  measure,
  scrollTo,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useFrameCallback,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import {
  ListAutoScrollContext,
  ListEditContext,
  ListForEach,
  ListIndexContext,
  ListScrollGestureContext,
  ListSelectionContext,
  ListStyleContext,
  OpenRowContext,
  sectionsOf,
  useListColors,
} from './section.android';
import { list } from './tokens';
import type { ListProps } from './types';
import { AnimatedNativeGlassView } from '../../core/glass/NativeGlass';
import { useGlassMaterial } from '../../core/glass/material';
import {
  useContentReach,
  useHeaderInset,
  useHeaderOffset,
  useHeaderSnap,
  useToolbarInset,
} from '../../core/header/scroll';
import { ListScrollViewContext } from '../../core/scroll';
import { Spinner } from '../../core/spinner';
import { useTabBarReach } from '../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../theme/LucentProvider';

/** The scroll view the screen gives lists (`ListScrollViewContext`), with Lucent's background and no overscroll glow. */
export const ListScroll = ({
  background,
  onRefresh,
  children,
  style,
  testID,
  indexLens = false,
}: {
  background: string;
  indexLens?: boolean;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
  style?: ScrollViewProps['style'];
  testID?: string;
}) => {
  const Scroll = useContext(ListScrollViewContext);
  const scrollY = useSharedValue(0);
  // Scrolled from the UI thread while a row is dragged near the list's visible ends, under the bars.
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const finger = useSharedValue(-1);
  const contentHeight = useSharedValue(0);
  const barTop = useHeaderInset();
  // For a plain list's pinned headers: the large title's block, where the sections start in the content, which header
  // is pinned, and how far under the bar it reaches, for the bar's scroll edge.
  const snap = useHeaderSnap();
  const contentTop = onRefresh ? barTop : 0;
  const pinnedBy = useSharedValue(0);
  const reach = useContentReach();
  const autoScroll = useMemo(
    () => ({ finger, scrollY, scrollRef, barTop, snap, contentTop, pinnedBy, reach }),
    [finger, scrollY, scrollRef, barTop, snap, contentTop, pinnedBy, reach],
  );
  const toolbar = useToolbarInset();
  const tabBar = useTabBarReach();
  const scrolling = useFrameCallback((frame) => {
    const y = finger.get();
    const box = measure(scrollRef);
    if (y < 0 || !box) return;
    const { zone, speed } = list.edit.autoScroll;
    const top = box.pageY + barTop;
    const bottom = box.pageY + box.height - Math.max(tabBar?.reach.get() ?? 0, toolbar);
    const deep = y > bottom - zone ? (y - bottom + zone) / zone : y < top + zone ? (y - top - zone) / zone : 0;
    if (deep === 0) return;
    const step = Math.max(-1, Math.min(1, deep)) * speed * ((frame.timeSincePreviousFrame ?? 16) / 1000);
    const next = Math.max(0, Math.min(contentHeight.get() - box.height, scrollY.get() + step));
    if (Math.abs(next - scrollY.get()) < 0.01) return;
    scrollY.set(next);
    scrollTo(scrollRef, 0, next, false);
  }, false);
  useAnimatedReaction(
    () => finger.get() >= 0,
    (dragging, before) => {
      if (dragging !== before) scheduleOnRN(scrolling.setActive, dragging);
    },
  );
  // The list's index: its sections' labels where they sit in the content, in order down it.
  const [indexed, setIndexed] = useState<Record<string, number>>({});
  const report = useCallback((label: string, y: number | null) => {
    setIndexed((now) => {
      if (y === null) {
        if (!(label in now)) return now;
        const { [label]: _gone, ...rest } = now;
        return rest;
      }
      return now[label] === y ? now : { ...now, [label]: y };
    });
  }, []);
  const entries = Object.entries(indexed).sort((a, b) => a[1] - b[1]);
  const indexYs = useSharedValue<number[]>([]);
  useEffect(() => {
    indexYs.set(entries.map(([, y]) => y));
  });
  const picked = useSharedValue(-1);
  const insets = useSafeAreaInsets();
  const { color } = useLucentTheme();
  const { pitch } = list.index;
  const onIndexTick = useCallback(() => performAndroidHapticsAsync(AndroidHaptics.Segment_Tick), []);
  // The compact bar's bottom, where a picked section's header goes, as iOS scrolls it (measured).
  const snapNow = useHeaderSnap();
  const under = barTop - snapNow;
  // A touch or drag along the index scrolls its section to the top at once, with a tick for each new one.
  const pick = (y: number) => {
    'worklet';
    const ys = indexYs.get();
    if (ys.length === 0) return;
    const at = Math.max(0, Math.min(ys.length - 1, Math.floor(y / pitch)));
    if (at === picked.get()) return;
    picked.set(at);
    const box = measure(scrollRef);
    const most = Math.max(0, contentHeight.get() - (box ? box.height : 0));
    const to = Math.max(0, Math.min(most, ys[at] + (onRefresh ? barTop : 0) - under));
    scrollY.set(to);
    scrollTo(scrollRef, 0, to, false);
    scheduleOnRN(onIndexTick);
  };
  // `indexLens`: where the finger is along the index, whether it's down, and each new letter's coming in.
  const fingerAt = useSharedValue(0);
  const touching = useSharedValue(0);
  const swap = useSharedValue(1);
  const { indexLens: lens } = list;
  useAnimatedReaction(
    () => picked.get(),
    (now, before) => {
      if (indexLens && now >= 0 && before !== null && before >= 0 && now !== before) {
        swap.set(0);
        swap.set(withTiming(1, { duration: lens.swap, easing: Easing.out(Easing.cubic) }));
      }
    },
  );
  const indexPan = usePanGesture({
    minDistance: 0,
    onBegin: (event) => {
      picked.set(-1);
      pick(event.y);
      fingerAt.set(event.y);
      if (indexLens) touching.set(withSpring(1, lens.spring));
    },
    onUpdate: (event) => {
      pick(event.y);
      fingerAt.set(event.y);
    },
    onFinalize: () => {
      if (indexLens) touching.set(withTiming(0, { duration: lens.out, easing: Easing.out(Easing.quad) }));
    },
  });
  const lensProps = useAnimatedProps(() => ({ presence: Math.min(1, touching.get()) }));
  const lensStyle = useAnimatedStyle(() => {
    const t = touching.get();
    return {
      transform: [{ translateY: fingerAt.get() - lens.size / 2 }, { scale: lens.from + (1 - lens.from) * t }],
    };
  });
  const lensLetter = useAnimatedStyle(() => ({
    opacity: Math.min(1, touching.get()) * (0.3 + 0.7 * swap.get()),
    transform: [{ scale: 0.92 + 0.08 * swap.get() }],
  }));
  const glass = useGlassMaterial('regular');
  // To a screen reader the index is one adjustable element, as iOS's: its value the section last picked, and a swipe up
  // or down moving to the next or previous one.
  const [readAt, setReadAt] = useState(0);
  useAnimatedReaction(
    () => picked.get(),
    (now, before) => {
      if (now !== before && now >= 0) scheduleOnRN(setReadAt, now);
    },
  );
  const readTo = (at: number) => {
    const to = Math.max(0, Math.min(entries.length - 1, at));
    scheduleOnUI(() => {
      'worklet';
      picked.set(-1);
      pick(to * pitch + pitch / 2);
    });
  };
  const indexBar =
    entries.length > 0 ? (
      <View pointerEvents="box-none" style={[styles.index, { top: under, bottom: insets.bottom }]}>
        <GestureDetector gesture={indexPan}>
          <View
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Section index"
            accessibilityValue={{ text: entries[Math.min(readAt, entries.length - 1)]?.[0] }}
            accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
            onAccessibilityAction={(event) => readTo(readAt + (event.nativeEvent.actionName === 'increment' ? 1 : -1))}
            style={styles.indexTouch}>
            {entries.map(([label]) => (
              <Text key={label} style={[styles.indexLabel, { color: color.tint }]}>
                {label}
              </Text>
            ))}
            {indexLens ? (
              <Animated.View pointerEvents="none" style={[styles.lens, lensStyle]}>
                <AnimatedNativeGlassView
                  {...glass}
                  lift
                  animatedProps={lensProps}
                  cornerRadius={lens.size / 2}
                  style={styles.lensGlass}>
                  <Animated.Text style={[styles.lensLetter, { color: color.tint }, lensLetter]}>
                    {entries[Math.min(readAt, entries.length - 1)]?.[0]}
                  </Animated.Text>
                </AnimatedNativeGlassView>
              </Animated.View>
            ) : null}
          </View>
        </GestureDetector>
      </View>
    ) : null;
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
      // While a dragged row scrolls the list, the offset it scrolled to stands: scroll events arrive a frame or more
      // behind, and would pull the row back and forth under the finger.
      if (finger.get() < 0) scrollY.set(event.contentOffset.y);
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
      onContentSizeChange: (_: number, h: number) => contentHeight.set(h),
      scrollRef,
      // The plain scroll view takes the ref itself; the screen's own take it as `scrollRef`.
      ...(Scroll === ScrollView ? { ref: scrollRef } : null),
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
    <ListAutoScrollContext value={autoScroll}>
      <OpenRowContext value={openRow}>
        <ListScrollGestureContext value={native}>
          <ListIndexContext value={report}>
            <View style={styles.fill}>
              {onRefresh ? (
                <GestureDetector gesture={pan}>
                  <View style={styles.fill}>
                    <GestureDetector gesture={native}>{scroll}</GestureDetector>
                  </View>
                </GestureDetector>
              ) : (
                <GestureDetector gesture={native}>{scroll}</GestureDetector>
              )}
              {indexBar}
            </View>
          </ListIndexContext>
        </ListScrollGestureContext>
      </OpenRowContext>
    </ListAutoScrollContext>
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
  selection,
  onSelectionChange,
  testID,
  style,
  indexLens,
}: ListProps) => {
  const colors = useListColors();
  // With `selection`, edit mode selects: rows show circles and a tap toggles them.
  const selecting = useMemo(
    () =>
      selection === undefined
        ? null
        : {
            selected: selection,
            toggle: (key: string) =>
              onSelectionChange?.(selection.includes(key) ? selection.filter((k) => k !== key) : [...selection, key]),
          },
    [selection, onSelectionChange],
  );
  // Into and out of edit mode on one spring, every row together.
  const editProgress = useSharedValue(editMode ? 1 : 0);
  useEffect(() => {
    editProgress.set(withSpring(editMode ? 1 : 0, list.edit.spring));
  }, [editMode, editProgress]);
  const edit = useMemo(() => ({ editing: editMode, progress: editProgress }), [editMode, editProgress]);
  return (
    <ListEditContext value={edit}>
      <ListSelectionContext value={selecting}>
        <ListStyleContext value={listStyle}>
          <ListScroll
            // Plain or inset grouped, the list sits on the grouped grey: a plain list's rows are white on it, as iOS 27's.
            background={colors.page}
            onRefresh={onRefresh}
            style={style}
            testID={testID}
            indexLens={indexLens}>
            {sectionsOf(children)}
          </ListScroll>
        </ListStyleContext>
      </ListSelectionContext>
    </ListEditContext>
  );
};

List.ForEach = ListForEach;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingBottom: 24 },
  spinner: { position: 'absolute', top: 0, start: 0, end: 0, alignItems: 'center', justifyContent: 'center' },
  // The index along the trailing edge, centred between the compact bar and the screen's bottom (measured).
  index: { position: 'absolute', end: 0, justifyContent: 'center' },
  // Touchable inward of it too: Android's back gesture takes a drag that starts at the screen's edge.
  indexTouch: { paddingStart: list.index.touch },
  lens: {
    position: 'absolute',
    top: 0,
    end: list.index.width + list.index.touch + list.indexLens.gap,
    width: list.indexLens.size,
    height: list.indexLens.size,
  },
  lensGlass: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  lensLetter: {
    fontSize: list.indexLens.fontSize,
    lineHeight: list.indexLens.lineHeight,
    fontWeight: '600',
    includeFontPadding: false,
  },
  indexLabel: {
    width: list.index.width,
    height: list.index.pitch,
    fontSize: list.index.fontSize,
    lineHeight: list.index.pitch,
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
  },
});
