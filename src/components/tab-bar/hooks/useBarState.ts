import { useTabTrigger } from 'expo-router/ui';
import { useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  useAnimatedReaction,
  useDerivedValue,
  useEvent,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import { useGlassPress } from './useGlassPress';
import { useKeyboard } from './useKeyboard';
import { useTabBarOffset } from './useTabBarOffset';
import { regularMaterial } from '../../../core/glass/material';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { glass, space } from '../../../theme/tokens';
import { setTabBarCollapsed, useTabBarCollapse } from '../context/collapse';
import { useSearchActions } from '../context/search';
import { barSpanFor, clamp01, fullHeight, inlinePad, lerp } from '../helpers/bar';
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
  const focusedIndex = tabs.findIndex((tab) => getTrigger(tab.name)?.isFocused);
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
  const glassStyle = { ...regularMaterial(theme), rim: theme.color.tabBarRim };
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
  const fullItemWidth = useDerivedValue(() => (barWidth.get() - inlinePad * 2) / tabCount);
  const itemWidth = useDerivedValue(() => (barWidth.get() * scaleX.get() - inlinePad * 2) / tabCount);
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
