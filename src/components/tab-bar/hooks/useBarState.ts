import { useTabTrigger } from 'expo-router/ui';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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

import { useKeyboard } from './useKeyboard';
import { useTabBarOffset } from './useTabBarOffset';
import { regularMaterial } from '../../../core/glass/material';
import { useShapePress } from '../../../core/glass/useShapePress';
import { barItemMotion } from '../../../core/motion/island';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { glass, space } from '../../../theme/tokens';
import { setTabBarCollapsed, useTabBarCollapse } from '../context/collapse';
import { useSearchActions } from '../context/search';
import { barSpanFor, clamp01, fullHeight, inlinePad, lensFullHeight, lerp, searchFieldFit } from '../helpers/bar';
import { moreName, useMore } from '../helpers/more';
import { islandTo } from '../helpers/presence';
import { mixSlots, pillWidthAt, planSlots } from '../helpers/slots';
import type { TabSpec } from '../helpers/triggers';
import { layout, motion } from '../tokens';

export interface FloatingTabBarProps {
  tabs: TabSpec[];
  searchTab?: TabSpec;
  // The bottom accessory's content, when there is one.
  accessory?: ReactNode;
  tintColor?: string;
  badgeColor?: string;
  badgeTextColor?: string;
}

/** The bar's state: focus, collapse, keyboard and every shared value the hooks below animate. */
export const useBarState = ({ tabs, searchTab, accessory, tintColor }: FloatingTabBarProps) => {
  const tabCount = tabs.length;
  const lastIndex = tabCount - 1;
  const middleIndex = lastIndex / 2;
  const clampIndex = (value: number) => {
    'worklet';
    return Math.min(lastIndex, Math.max(0, value));
  };
  const bottom = useTabBarOffset();
  const window = useWindowDimensions();
  const fieldFit = searchFieldFit(window.fontScale);
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
  // The circle's tab chosen: for search, the bar morphs into the field; a prominent tab just shows its screen.
  const apartFocused = searchTab ? (getTrigger(searchTab.name)?.isFocused ?? false) : false;
  const searchFocused = apartFocused && (searchTab?.searchRole ?? false);
  const { setQuery, emit, command, setActive: setSearchActive } = useSearchActions();
  const { height: keyboardHeight, progress: keyboardProgress } = useKeyboard();
  const [backIndex, setBackIndex] = useState(Math.max(focusedIndex, 0));
  if (focusedIndex >= 0 && focusedIndex !== backIndex) {
    setBackIndex(focusedIndex);
  }

  const fallbackCollapsed = useSharedValue(0);
  const collapsed = collapse?.progress ?? fallbackCollapsed;
  const fallbackTuck = useSharedValue(0);
  const tuck = collapse?.tuck ?? fallbackTuck;
  const hasAccessory = accessory !== undefined;
  const barWidth = useSharedValue(0);
  const lensPosition = useSharedValue(Math.max(focusedIndex, 0));
  const lift = useSharedValue(0);
  const leftEdge = useSharedValue(0);
  const rightEdge = useSharedValue(0);
  const leftTarget = useSharedValue(0);
  const rightTarget = useSharedValue(0);
  const restSpan = useSharedValue(0);
  // Pressed in place, the lens's width at rest and how much it grows when fully lifted (useLensPhysics).
  const placeSpan = useSharedValue({ rest: 0, grow: 0 });
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
  // Search set apart in its own circle (1) or among the tabs (0). Moving between them, the circle pinches off the bar's
  // end and drifts to its place, or drifts back and melts into it, as the search field's close button does.
  const searchApart = useSharedValue(hasSearch ? 1 : 0);
  // Pulled out as the bar minimizes, search splits off quickly, before the bar gathers into its circles.
  const splitSpring = () =>
    collapse !== null && collapse.target.get() === 1 && hasSearch ? motion.searchSplit.pull : motion.searchSplit.spring;
  useEffect(() => {
    searchApart.set(withSpring(hasSearch ? 1 : 0, splitSpring()));
  }, [hasSearch, searchApart]);
  // Search's circle sits at the span's right end, wherever the bar ends.
  const circleCenter = barSpan - fullHeight / 2;
  // As tabs come and go, the bar moves as a navigation bar's island does when one of its buttons shows or hides (iOS
  // snaps the tab bar, but a jump reads as a glitch next to the pill's own easing): the tabs slide to their places
  // (TabItem's layout animation) and the pill with them (barWidth, slots), a little past and back; the glass eases to
  // its new width around them (frameWidth), revealing or covering the ends; and the bar swells and settles.
  // Each tab's label, measured unconstrained (FloatingTabBar), for the tabs' places and the pill's fit.
  const [labelSizes, setLabelSizes] = useState<Record<string, number>>({});
  const setLabelSize = useCallback(
    (name: string, width: number) =>
      setLabelSizes((sizes) => (Math.abs((sizes[name] ?? -1) - width) < 0.5 ? sizes : { ...sizes, [name]: width })),
    [],
  );
  // Sized as iOS's labels are: SF Pro sets them about 11% wider than Roboto at the same size.
  const contents = tabs.map((tab) => Math.max((labelSizes[tab.name] ?? 0) * layout.tabLabelScale, layout.tabIconSize));
  // iOS 27 fits the bar to its tabs (helpers/slots), up to the room it has: the span, or the span less search's circle.
  // Fitted short of it, a bar without the circle sits in the middle. Three tabs or more beside the circle fill the
  // room, so the circle stays `tabBarGap` from the bar; under a bottom accessory, any number of tabs do, as wide as it.
  const room = hasSearch ? barSpan - layout.tabBarGap - fullHeight : barSpan;
  const fill = hasAccessory || (hasSearch && tabs.length >= 3);
  const plan = planSlots(room, contents, layout.tabSpacing, fill);
  const restWidth = plan.width;
  const centerShift = hasSearch ? 0 : (barSpan - restWidth) / 2;
  const centering = useSharedValue(centerShift);
  const frameWidth = useSharedValue(restWidth);
  const swell = useSharedValue(0);
  const labelWidths = useSharedValue<number[]>([]);
  // The tabs' places, as iOS 27 spaces them (helpers/slots): React lays the tabs out from it; the pill and the
  // gestures follow `slotPlan`, which eases from the last plan to this one.
  const planKey = plan.lefts.map((left, index) => `${left.toFixed(1)}:${plan.widths[index].toFixed(1)}`).join(',');
  const planFrom = useSharedValue(plan);
  const planTo = useSharedValue(plan);
  const planMix = useSharedValue(1);
  const slotPlan = useDerivedValue(() => mixSlots(planFrom.get(), planTo.get(), planMix.get()));
  const laidOut = useRef({ restWidth, tabCount, planKey, hasSearch });
  const splitAt = useRef(0);
  const splitWith = useRef<{ duration: number; dampingRatio: number }>(motion.searchSplit.spring);
  // Pulled out as the bar minimizes, the bar takes its new width at once, so no empty place shows as it gathers.
  const pulling = useRef(false);
  useLayoutEffect(() => {
    labelWidths.set(tabs.map((tab) => labelSizes[tab.name] ?? 0));
    const before = laidOut.current;
    // Search changing sides moves the bar with its circle (searchApart), as one piece of liquid.
    // (The new tab's label is measured a moment later, so the whole split window counts, not just the first layout.)
    if (before.hasSearch !== hasSearch) {
      splitAt.current = Date.now();
      splitWith.current = splitSpring();
      pulling.current = splitWith.current === motion.searchSplit.pull;
    }
    const splitting = Date.now() - splitAt.current < splitWith.current.duration;
    const snap = splitting && pulling.current;
    const toWidth = (from: number, to: number) =>
      snap ? to : splitting ? withSpring(to, splitWith.current) : islandTo(from, to, barItemMotion.show.width);
    if (before.planKey !== planKey) {
      planFrom.set(slotPlan.get());
      planTo.set(plan);
      planMix.set(0);
      planMix.set(toWidth(0, 1));
    }
    laidOut.current = { restWidth, tabCount, planKey, hasSearch };
    if (before.restWidth === restWidth && before.tabCount === tabCount) {
      barWidth.set(restWidth);
      centering.set(centerShift);
      return;
    }
    const growing = restWidth > before.restWidth || tabCount > before.tabCount;
    const { show, hide } = barItemMotion;
    const { swellUp, swellDown } = growing ? show : hide;
    barWidth.set(toWidth(barWidth.get(), restWidth));
    centering.set(toWidth(centering.get(), centerShift));
    frameWidth.set(
      snap
        ? restWidth
        : splitting
          ? withSpring(restWidth, splitWith.current)
          : islandTo(frameWidth.get(), restWidth, (growing ? show : hide).width),
    );
    if (!snap) {
      swell.set(
        withSequence(
          withTiming(1, { duration: swellUp, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: swellDown, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    }
  }, [
    restWidth,
    tabCount,
    planKey,
    barWidth,
    frameWidth,
    swell,
    planFrom,
    planTo,
    planMix,
    slotPlan,
    labelWidths,
    centering,
    centerShift,
  ]);
  const frameWidthStyle = useAnimatedStyle(() => ({ width: frameWidth.get() }));
  // The tabs' row spans the room the bar could fill, padded down to the bar's width, so a tab leaving from past the new
  // end still shows while the glass closes over it; the clip follows the glass (useSearchMorph).
  const fullWidth = hasSearch ? barSpan - layout.tabBarGap - fullHeight : barSpan;
  const overlayWidthStyle = { right: barSpan - fullWidth };
  const rowPadStyle = { paddingRight: fullWidth - restWidth };
  // How far the bar's end toward search grows, against its other end's.
  const towardSearch = hasSearch ? motion.barGrow.towardSearch : 1;
  const disabledKey = tabs.map((tab) => (tab.disabled ? 1 : 0)).join('');
  const disabledTabs = useSharedValue(tabs.map((tab) => tab.disabled));
  useEffect(() => {
    disabledTabs.set(disabledKey.split('').map((flag) => flag === '1'));
  }, [disabledKey, disabledTabs]);
  const hasBadges = tabs.some((tab) => tab.badge !== undefined);
  const searchPress = useShapePress();
  // The search field's glass under a finger on its clear button: it swells and brightens, as iOS's does.
  const fieldPress = useShapePress(true);
  const backPress = useShapePress();
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
  const dent = useSharedValue(1);
  const inkTone = useSharedValue(1);
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
  // How far above or below the bar a finger holding the lens is, in points (motion.pull); it eases out with the lift.
  const lensPull = useSharedValue(0);
  // The same, on the lens's own slightly bouncy spring (motion.pull.lens).
  const lensGive = useSharedValue(0);
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
            motion.tuck.gatherAfter + motion.compactPop.delay,
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
  // Held, the minimized bar swells and lights up as a pressed glass shape does, staying minimized until let go (iOS 27:
  // let go, it opens; a drag from it opens it at once and carries on as a drag on the bar).
  const minimizedPress = useShapePress();
  const compactSize = useDerivedValue(() => layout.tabBarCompactHeight * (1 - compactPop.get()));
  const scaleX = useDerivedValue(() => lerp(1, compactSize.get() / Math.max(barWidth.get(), 1), collapsed.get()));
  const scaleY = useDerivedValue(() => lerp(1, compactSize.get() / fullHeight, collapsed.get()));
  // An even share of the bar per tab: what the lens's motion is sized by (how wide it lifts, where a press pokes it,
  // which icons it covers), as it was tuned. Where each tab sits is in slotPlan.
  const fullItemWidth = useDerivedValue(
    () => (barWidth.get() - inlinePad * 2) / Math.max(slotPlan.get().widths.length, 1),
  );
  // The pill's unscaled width: at rest it's scaled the same both ways, so its ends stay round, a capsule as iOS's is,
  // rather than stretched into ellipses.
  // It's the selected tab's own resting pill (as useLensPhysics fits it: its slot and the space beside it), so the
  // pill rests unstretched on any tab now that tabs differ in width; taken from the settled tab, not the moving
  // pill, so it changes once per switch.
  const lensBase = useDerivedValue(() => {
    const index = Math.max(settledIndex.get(), 0);
    const rest = pillWidthAt(slotPlan.get(), index, layout.tabSpacing.outset);
    return (rest * lensFullHeight) / layout.bubbleRestHeight;
  });
  const itemWidth = useDerivedValue(
    () => (barWidth.get() * scaleX.get() - inlinePad * 2) / Math.max(slotPlan.get().widths.length, 1),
  );
  const barShiftX = useDerivedValue(
    () => -(barWidth.get() * (1 - scaleX.get())) / 2 + (fullHeight * (1 - scaleY.get())) / 2,
  );
  const pillShiftX = useDerivedValue(() => barShiftX.get() + nudge.get());
  const collapseX = useDerivedValue(() => nudge.get() + collapsed.get() * (fullHeight / 2 - barWidth.get() / 2));
  // Minimizing, each tab draws in to the bar's middle.
  const collapseSpread = useDerivedValue(() =>
    slotPlan.get().centers.map((center) => (barWidth.get() / 2 - center) * collapsed.get()),
  );

  useEffect(() => {
    focused.set(focusedIndex);
    if (focusedIndex >= 0 && dragIndex.get() < 0 && settledIndex.get() !== focusedIndex) {
      lensPosition.set(withSpring(focusedIndex, motion.springs.lens));
    }
    settledIndex.set(focusedIndex);
    lensPresence.set(withSpring(focusedIndex >= 0 ? 1 : 0, motion.springs.morph));
  }, [focusedIndex, focused, settledIndex, dragIndex, lensPosition, lensPresence]);

  // Choosing another tab expands a minimized bar. Only a new tab does: the tabs shifting in the bar, as search pulled
  // out into its circle as it minimizes, isn't one.
  const focusedName = focusedIndex >= 0 ? tabs[focusedIndex]?.name : apartFocused ? searchTab?.name : undefined;
  const lastFocused = useRef(focusedName);
  useEffect(() => {
    if (lastFocused.current === focusedName) {
      return;
    }
    lastFocused.current = focusedName;
    if (collapse) {
      setTabBarCollapsed(collapse, 0);
    }
  }, [focusedName, collapse]);

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
    centering,
    color,
    dent,
    disabledTabs,
    dragIndex,
    dragOrigin,
    dragRelease,
    dripShape,
    edgesReady,
    emit,
    command,
    setSearchActive,
    expandOnly,
    focused,
    focusedIndex,
    fullItemWidth,
    slotPlan,
    plan,
    setLabelSize,
    fieldFit,
    glassStyle,
    glideFrom,
    glideSpan,
    glideTo,
    gliding,
    hasAccessory,
    hasBadges,
    hasSearch,
    searchApart,
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
    planMix,
    poke,
    pokeSide,
    pressSquash,
    pressedAt,
    pressing,
    previousCollapsed,
    previousLensPosition,
    push,
    restSpan,
    placeSpan,
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
    minimizedPress,
    fieldPress,
    searchRaise,
    searchTab,
    apartFocused,
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
    lensPull,
    lensGive,
    tintColor,
    towardSearch,
    tuck,
    wallSide,
  };
};

export type BarState = ReturnType<typeof useBarState>;
