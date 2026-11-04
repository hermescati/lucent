import { useTabTrigger } from 'expo-router/ui';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useEvent,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { useGlassPress } from './useGlassPress';
import { barItemMotion } from '../../../core/motion/island';
import { moreName, useMore } from '../helpers/more';
import { islandTo } from '../helpers/presence';
import { useKeyboard } from './useKeyboard';
import { useTabBarOffset } from './useTabBarOffset';
import { regularMaterial } from '../../../core/glass/material';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { glass, space } from '../../../theme/tokens';
import { setTabBarCollapsed, useTabBarCollapse } from '../context/collapse';
import { useSearchActions } from '../context/search';
import { barSpanFor, clamp01, fullHeight, inlinePad, lensFullHeight, lerp } from '../helpers/bar';
import type { TabSpec } from '../helpers/triggers';
import { layout, motion } from '../tokens';

export interface FloatingTabBarProps {
  tabs: TabSpec[];
  searchTab?: TabSpec;
  tintColor?: string;
  badgeColor?: string;
  badgeTextColor?: string;
}

/** The bar's state: focus, collapse, keyboard and every shared value the hooks below animate. */
export const useBarState = ({ tabs, searchTab, tintColor }: FloatingTabBarProps) => {
  const tabCount = tabs.length;
  const lastIndex = tabCount - 1;
  const middleIndex = lastIndex / 2;
  const clampIndex = (value: number) => {
    'worklet';
    return Math.min(lastIndex, Math.max(0, value));
  };
  const bottom = useTabBarOffset();
  const window = useWindowDimensions();
  const barSpan = barSpanFor(window.width);
  const barLeft = (window.width - barSpan) / 2;
  const theme = useLucentTheme(tintColor);
  const { color, scheme } = theme;
  const iconDim = motion.pressIconDim[scheme];
  const collapse = useTabBarCollapse();
  const { getTrigger, switchTab } = useTabTrigger({ name: tabs[0].name });
  const more = useMore();
  // More's tab is the selected one while its list shows or one of the tabs under it does.
  const underMore = more !== null && (more.open || more.overflow.some((tab) => getTrigger(tab.name)?.isFocused));
  const focusedIndex = underMore
    ? tabs.findIndex((tab) => tab.name === moreName)
    : tabs.findIndex((tab) => getTrigger(tab.name)?.isFocused);
  const searchFocused = searchTab ? (getTrigger(searchTab.name)?.isFocused ?? false) : false;
  const { setQuery, emit, command, setActive: setSearchActive } = useSearchActions();
  const { height: keyboardHeight, progress: keyboardProgress } = useKeyboard();
  const [backIndex, setBackIndex] = useState(Math.max(focusedIndex, 0));
  if (focusedIndex >= 0 && focusedIndex !== backIndex) {
    setBackIndex(focusedIndex);
  }

  const fallbackCollapsed = useSharedValue(0);
  const collapsed = collapse?.progress ?? fallbackCollapsed;
  const barWidth = useSharedValue(0);
  const lensPosition = useSharedValue(Math.max(focusedIndex, 0));
  const lift = useSharedValue(0);
  const leftEdge = useSharedValue(0);
  const rightEdge = useSharedValue(0);
  const leftTarget = useSharedValue(0);
  const rightTarget = useSharedValue(0);
  const restSpan = useSharedValue(0);
  const edgesReady = useSharedValue(false);
  const previousCollapsed = useSharedValue(0);
  const previousLensPosition = useSharedValue(Math.max(focusedIndex, 0));
  const focused = useSharedValue(focusedIndex);
  const settledIndex = useSharedValue(focusedIndex);
  const dragIndex = useSharedValue(-1);
  const expandOnly = useSharedValue(false);
  const moved = useSharedValue(false);
  const lensPresence = useSharedValue(focusedIndex >= 0 ? 1 : 0);
  const hasSearch = searchTab !== undefined;
  // The bar's own width with two tabs beside search's circle, left aligned; otherwise it fills the span.
  const fitWidth = hasSearch && tabCount === 2 ? layout.tabBarTwoTabWidth : undefined;
  // Search's circle sits at the span's right end, wherever the bar ends.
  const circleCenter = barSpan - fullHeight / 2;
  // As tabs come and go, the bar moves as a navigation bar's island does when one of its buttons shows or hides (iOS
  // snaps the tab bar, but a jump reads as a glitch next to the pill's own easing): the tabs slide to their places
  // (TabItem's layout animation) and the pill with them (barWidth, slots), a little past and back; the glass eases to
  // its new width around them (frameWidth), revealing or covering the ends; and the bar swells and settles.
  const restWidth = fitWidth ?? (hasSearch ? barSpan - layout.tabBarGap - fullHeight : barSpan);
  const frameWidth = useSharedValue(restWidth);
  const slots = useSharedValue(tabCount);
  const swell = useSharedValue(0);
  const laidOut = useRef({ restWidth, tabCount });
  useLayoutEffect(() => {
    const before = laidOut.current;
    if (before.restWidth === restWidth && before.tabCount === tabCount) {
      barWidth.set(restWidth);
      return;
    }
    laidOut.current = { restWidth, tabCount };
    const growing = restWidth > before.restWidth || tabCount > before.tabCount;
    const { show, hide } = barItemMotion;
    const { swellUp, swellDown } = growing ? show : hide;
    barWidth.set(islandTo(barWidth.get(), restWidth, show.width));
    slots.set(islandTo(slots.get(), tabCount, show.width));
    frameWidth.set(islandTo(frameWidth.get(), restWidth, (growing ? show : hide).width));
    swell.set(
      withSequence(
        withTiming(1, { duration: swellUp, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: swellDown, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [restWidth, tabCount, barWidth, frameWidth, slots, swell]);
  const frameWidthStyle = useAnimatedStyle(() => ({ width: frameWidth.get() }));
  // The tabs' row spans the room the bar could fill, padded down to the bar's width, so a tab leaving from past the new
  // end still shows while the glass closes over it; the clip follows the glass (useSearchMorph).
  const fullWidth = hasSearch ? barSpan - layout.tabBarGap - fullHeight : barSpan;
  const overlayWidthStyle = { right: barSpan - fullWidth };
  const rowPadStyle = { paddingRight: inlinePad + fullWidth - restWidth };
  const towardSearch = hasSearch ? motion.barGrow.towardSearch : 0;
  const disabledKey = tabs.map((tab) => (tab.disabled ? 1 : 0)).join('');
  const disabledTabs = useSharedValue(tabs.map((tab) => tab.disabled));
  useEffect(() => {
    disabledTabs.set(disabledKey.split('').map((flag) => flag === '1'));
  }, [disabledKey, disabledTabs]);
  const hasBadges = tabs.some((tab) => tab.badge !== undefined);
  const searchPress = useGlassPress();
  // The search field's glass under a finger on its clear button: it swells and brightens, as iOS's does.
  const fieldPress = useGlassPress(true);
  const backPress = useGlassPress();
  const backLight = useSharedValue(0);
  const backDragging = useSharedValue(false);
  const glassStyle = regularMaterial(theme);
  const nudge = useSharedValue(0);
  const pressSquash = useSharedValue(0);
  const searchMode = useSharedValue(searchFocused ? 1 : 0);
  const modeTarget = useSharedValue(searchFocused ? 1 : 0);
  const searchDip = useSharedValue(0);
  const searchKeyboard = useDerivedValue(() => (modeTarget.get() === 1 || searchMode.get() > 0 ? 1 : 0));
  const barLift = useDerivedValue(() => Math.min(0, keyboardHeight.get() + bottom - space[8]) * searchKeyboard.get());
  const searchRaise = useDerivedValue(() => keyboardProgress.get() * searchKeyboard.get());
  const searchBump = useSharedValue(0);
  const backBump = useSharedValue(0);
  const searchPop = useSharedValue(searchFocused ? 1 : 0);
  // 1 while the ref's `cancelSearch` has left search inactive on its tab: the close button folded into the field, which
  // reaches the bar's end.
  const searchIdle = useSharedValue(0);
  const moving = useSharedValue(0);
  const push = useSharedValue(0);
  const jelly = useSharedValue(0);
  const jellyVelocity = useSharedValue(0);
  const smoothSpeed = useSharedValue(0);
  const dragOrigin = useSharedValue(0);
  const settleFill = useSharedValue(1);
  const pressedAt = useSharedValue(0);
  const pressing = useSharedValue(false);
  const dripOnArrival = useSharedValue(false);
  const dent = useSharedValue(1);
  const inkTone = useSharedValue(1);
  const labelWidths = useSharedValue<number[]>([]);
  const inkRange = glass.inkLuma[scheme];
  const onBackdropLuma = useEvent<{ luma: number }>(
    (event) => {
      'worklet';
      const tone = clamp01((event.luma - inkRange.from) / (inkRange.to - inkRange.from));
      if (Math.abs(tone - inkTone.get()) > motion.inkTone.threshold) {
        inkTone.set(withSpring(tone, motion.springs.inkTone));
      }
    },
    ['onBackdropLuma', 'topBackdropLuma'],
  );
  const heading = useSharedValue(0);
  const atEnd = useSharedValue(true);
  const squish = useSharedValue(0);
  const barPress = useSharedValue(0);
  const barGrowth = useSharedValue(0);
  const tapSlide = useSharedValue(0);
  const settleOnArrival = useSharedValue(false);
  const settleAt = useSharedValue(-1);
  const bounceAt = useSharedValue(-1);
  const dragRelease = useSharedValue(0);
  const sliding = useSharedValue(false);
  const slideFrom = useSharedValue(0);
  const slideTo = useSharedValue(0);
  const slideRight = useSharedValue(true);
  const tapStay = useSharedValue(0);
  const landing = useSharedValue(0);
  const tapGlow = useSharedValue(0);
  const dripShape = useSharedValue(0);
  const tapDipping = useSharedValue(false);
  const gliding = useSharedValue(false);
  const glideTo = useSharedValue(0);
  const glideSpan = useSharedValue(1);
  const glideFrom = useSharedValue(0);
  const slideShape = useDerivedValue(() => tapSlide.get() * (1 - tapStay.get()) * motion.tapSlide.canal);
  const shine = useDerivedValue(() => lift.get() * (1 - slideShape.get()));
  const held = useDerivedValue(() => lerp(1, barPress.get(), tapStay.get()));
  const holding = useDerivedValue(() => tapStay.get() * barPress.get());
  const squishVelocity = useSharedValue(0);
  const wallSide = useSharedValue(0);
  const poke = useSharedValue(0);
  const pokeSide = useSharedValue(0);
  const approachSpeed = useSharedValue(0);
  const movingTarget = useSharedValue(0);

  const compactPop = useSharedValue(0);
  useAnimatedReaction(
    () => collapse?.target.get() ?? 0,
    (target, previous) => {
      if (target === 1 && previous === 0) {
        compactPop.set(
          withDelay(
            motion.compactPop.delay,
            withSequence(
              withSpring(motion.compactPop.depth, motion.springs.compactPopIn),
              withSpring(0, motion.springs.compactPopOut),
            ),
          ),
        );
      } else if (target === 0) {
        compactPop.set(0);
      }
    },
  );
  const compactSize = useDerivedValue(() => layout.tabBarCompactHeight * (1 - compactPop.get()));
  const scaleX = useDerivedValue(() => lerp(1, compactSize.get() / Math.max(barWidth.get(), 1), collapsed.get()));
  const scaleY = useDerivedValue(() => lerp(1, compactSize.get() / fullHeight, collapsed.get()));
  const fullItemWidth = useDerivedValue(() => (barWidth.get() - inlinePad * 2) / Math.max(slots.get(), 1));
  // The pill's unscaled width: at rest it's scaled the same both ways, so its ends stay round, a capsule as iOS's is,
  // rather than stretched into ellipses.
  const lensBase = useDerivedValue(
    () => ((fullItemWidth.get() + motion.pillFit.slot) * lensFullHeight) / layout.bubbleRestHeight,
  );
  const itemWidth = useDerivedValue(() => (barWidth.get() * scaleX.get() - inlinePad * 2) / Math.max(slots.get(), 1));
  const barShiftX = useDerivedValue(
    () => -(barWidth.get() * (1 - scaleX.get())) / 2 + (fullHeight * (1 - scaleY.get())) / 2,
  );
  const pillShiftX = useDerivedValue(() => barShiftX.get() + nudge.get());
  const collapseX = useDerivedValue(() => nudge.get() + collapsed.get() * (fullHeight / 2 - barWidth.get() / 2));
  const collapseSpread = useDerivedValue(() => -fullItemWidth.get() * collapsed.get());

  useEffect(() => {
    focused.set(focusedIndex);
    if (focusedIndex >= 0 && dragIndex.get() < 0 && settledIndex.get() !== focusedIndex) {
      lensPosition.set(withSpring(focusedIndex, motion.springs.lens));
    }
    settledIndex.set(focusedIndex);
    lensPresence.set(withSpring(focusedIndex >= 0 ? 1 : 0, motion.springs.morph));
    if (collapse) {
      setTabBarCollapsed(collapse, 0);
    }
  }, [focusedIndex, focused, settledIndex, dragIndex, lensPosition, lensPresence, collapse]);

  useEffect(() => {
    if (!collapse) {
      return;
    }
    collapse.locked.set(searchFocused);
    if (searchFocused) {
      setTabBarCollapsed(collapse, 0);
    }
  }, [collapse, searchFocused]);

  return {
    approachSpeed,
    atEnd,
    backBump,
    backDragging,
    backIndex,
    backLight,
    backPress,
    barGrowth,
    barLeft,
    barLift,
    barPress,
    barShiftX,
    barSpan,
    barWidth,
    circleCenter,
    frameWidth,
    swell,
    frameWidthStyle,
    overlayWidthStyle,
    rowPadStyle,
    fullWidth,
    bottom,
    bounceAt,
    clampIndex,
    collapse,
    collapseSpread,
    collapseX,
    collapsed,
    color,
    dent,
    disabledTabs,
    dragIndex,
    dragOrigin,
    dragRelease,
    dripOnArrival,
    dripShape,
    edgesReady,
    emit,
    command,
    setSearchActive,
    expandOnly,
    focused,
    focusedIndex,
    fullItemWidth,
    glassStyle,
    glideFrom,
    glideSpan,
    glideTo,
    gliding,
    hasBadges,
    hasSearch,
    heading,
    held,
    holding,
    iconDim,
    inkTone,
    labelWidths,
    itemWidth,
    lensBase,
    jelly,
    jellyVelocity,
    keyboardProgress,
    landing,
    lastIndex,
    leftEdge,
    leftTarget,
    lensPosition,
    lensPresence,
    lift,
    middleIndex,
    modeTarget,
    moved,
    moving,
    movingTarget,
    nudge,
    onBackdropLuma,
    pillShiftX,
    poke,
    pokeSide,
    pressSquash,
    pressedAt,
    pressing,
    previousCollapsed,
    previousLensPosition,
    push,
    restSpan,
    rightEdge,
    rightTarget,
    scaleX,
    scaleY,
    scheme,
    searchBump,
    searchDip,
    searchFocused,
    searchMode,
    searchPop,
    searchIdle,
    searchPress,
    fieldPress,
    searchRaise,
    searchTab,
    setQuery,
    settleAt,
    settleFill,
    settleOnArrival,
    settledIndex,
    shine,
    slideFrom,
    slideRight,
    slideShape,
    slideTo,
    sliding,
    smoothSpeed,
    squish,
    squishVelocity,
    getTrigger,
    switchTab,
    tabs,
    tapDipping,
    tapGlow,
    tapSlide,
    tapStay,
    tintColor,
    towardSearch,
    wallSide,
  };
};

export type BarState = ReturnType<typeof useBarState>;
