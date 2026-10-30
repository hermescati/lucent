import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { useTabTrigger } from 'expo-router/ui';
import { useCallback, useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  interpolateColor,
  useAnimatedReaction,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useEvent,
  useFrameCallback,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { CloseGlyph } from './CloseGlyph';
import { SearchMode } from './SearchMode';
import { TabBadge } from './TabBadge';
import { TabIcon } from './TabIcon';
import { setTabBarCollapsed, useTabBarCollapse } from './collapse';
import { useKeyboard } from './keyboard';
import { useTabBarOffset } from './offset';
import { reselectTab } from './reselect';
import { useSearchHost } from './search';
import type { TabSpec } from './triggers';
import { useGlassPress } from './useGlassPress';
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView, NativeGlassBackdrop } from '../glass/NativeGlass';
import { regularMaterial } from '../glass/material';
import { useLucentTheme } from '../theme/LucentProvider';
import { glass, layout, motion, space } from '../theme/tokens';

const rowInset = space[4];
const inlinePad = layout.tabBarInlinePadding;
const fullHeight = layout.tabBarHeight;
const lensFullHeight = fullHeight - rowInset * 2;
const lensCompactScaleY = (layout.tabBarCompactHeight - rowInset * 2) / lensFullHeight;
const labelShift = layout.tabLabelHeight / 2;
const modeHeight = layout.searchModeHeight;
const modeInset = (fullHeight - modeHeight) / 2;
const modeRadius = modeHeight / 2;
const modeShrink = modeHeight / fullHeight;
const fieldGlyphCenter =
  modeInset + modeHeight + layout.searchModeGap + layout.searchFieldInset + layout.searchFieldIconSize / 2;
const tabBarGroup = 'tabbar';
const screenGroup = 'default';
const revealGroup = 'tabbar-reveal';

const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const lerp = (from: number, to: number, progress: number) => {
  'worklet';
  return from + (to - from) * progress;
};

const tick = () => {
  performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
};

interface TabItemProps {
  tab: TabSpec;
  index: number;
  middleIndex: number;
  tintColor?: string;
  selected: boolean;
  lensPosition: SharedValue<number>;
  lift: SharedValue<number>;
  shine: SharedValue<number>;
  presence: SharedValue<number>;
  cover: SharedValue<number>;
  covered: SharedValue<number[]>;
  collapsed: SharedValue<number>;
  collapseX: SharedValue<number>;
  collapseSpread: SharedValue<number>;
  handoff?: SharedValue<number>;
  revealed?: boolean;
  badgeOnly?: boolean;
  badgeColor?: string;
  badgeTextColor?: string;
  inkTone: SharedValue<number>;
  onActivate: (index: number) => void;
}

const TabItem = ({
  tab,
  index,
  middleIndex,
  tintColor,
  selected,
  lensPosition,
  lift,
  shine,
  presence,
  cover,
  covered,
  collapsed,
  collapseX,
  collapseSpread,
  handoff,
  revealed = false,
  badgeOnly = false,
  badgeColor,
  badgeTextColor,
  inkTone,
  onActivate,
}: TabItemProps) => {
  const { color } = useLucentTheme(tintColor);
  const proximity = useDerivedValue(() => 1 - Math.min(1, Math.abs(index - lensPosition.get())));
  const chosen = useSharedValue(selected ? 1 : 0);
  useAnimatedReaction(
    () => (Math.round(lensPosition.get()) === index ? 1 : 0),
    (next, previous) => {
      if (next !== previous) {
        chosen.set(withSpring(next, motion.springs.snappy));
      }
    },
  );

  const itemStyle = useAnimatedStyle(() => ({
    opacity: lerp(1, chosen.get(), clamp01(collapsed.get() * motion.labelFadeRate)),
    transform: [
      {
        translateX: collapseX.get() + (index - middleIndex) * collapseSpread.get(),
      },
      { translateY: collapsed.get() * labelShift },
      { scale: 1 + lift.get() * proximity.get() * motion.itemMagnify },
    ],
  }));
  const highlight = useDerivedValue(() =>
    revealed ? 1 : chosen.get() * presence.get() * clamp01((1 - cover.get()) * 2),
  );
  const activeStyle = useAnimatedStyle(() => ({ opacity: highlight.get() }));
  const glow = useDerivedValue(() => (revealed ? shine.get() : 0));
  const brightInkStyle = useAnimatedStyle(() => ({ opacity: inkTone.get() }));
  const activeRestStyle = useAnimatedStyle(() => ({
    opacity: highlight.get(),
  }));
  const activeLiftStyle = useAnimatedStyle(() => ({
    opacity: highlight.get() * glow.get(),
  }));
  const idleStyle = useAnimatedStyle(() => ({
    opacity: revealed ? 0 : 1 - Math.max(highlight.get(), covered.get()[index] ?? 0),
  }));
  const handoffStyle = useAnimatedStyle(() => ({
    opacity: handoff && handoff.get() > motion.backTravel.handoff ? 0 : 1,
  }));
  const activeLabelColor = useAnimatedStyle(() => ({
    color: interpolateColor(
      glow.get(),
      [0, 1],
      [interpolateColor(inkTone.get(), [0, 1], [color.tabActiveOver, color.tabActive]), color.tabAccent],
    ),
  }));
  const labelStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, collapsed.get() * motion.labelFadeRate),
  }));

  if (badgeOnly) {
    return (
      <View style={styles.slot} pointerEvents="none">
        <Animated.View style={[styles.item, itemStyle]}>
          <Animated.View style={[styles.iconBox, handoffStyle]}>
            {tab.badge !== undefined ? (
              <TabBadge
                text={tab.badge}
                color={(selected ? tab.badgeColor : undefined) ?? badgeColor ?? color.badge}
                textColor={badgeTextColor ?? color.badgeText}
              />
            ) : null}
          </Animated.View>
          <Animated.View style={[styles.labelBox, labelStyle]} />
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={styles.slot}
      accessible={!revealed}
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      accessibilityState={{ selected, disabled: tab.disabled }}
      accessibilityValue={tab.badge ? { text: tab.badge } : undefined}
      accessibilityActions={[{ name: 'activate' }]}
      onAccessibilityAction={() => onActivate(index)}>
      <Animated.View style={[styles.item, itemStyle]}>
        <Animated.View style={handoffStyle}>
          <Animated.View style={idleStyle}>
            <TabIcon icon={tab.icon} selected={false} size={layout.tabIconSize} color={color.text} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, activeRestStyle]}>
            <TabIcon icon={tab.icon} selected size={layout.tabIconSize} color={color.tabActiveOver} />
            <Animated.View style={[StyleSheet.absoluteFill, brightInkStyle]}>
              <TabIcon icon={tab.icon} selected size={layout.tabIconSize} color={color.tabActive} />
            </Animated.View>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, activeLiftStyle]}>
            <TabIcon icon={tab.icon} selected size={layout.tabIconSize} color={color.tabAccent} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.labelBox, labelStyle]}>
          <Animated.Text
            style={[
              styles.label,
              styles.legible,
              {
                color: color.text,
                textShadowColor: color.legibilityShadow,
              },
              idleStyle,
            ]}
            numberOfLines={1}>
            {tab.label}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.label,
              styles.labelOverlay,
              styles.legible,
              {
                textShadowColor: color.legibilityShadow,
              },
              activeStyle,
              activeLabelColor,
            ]}
            numberOfLines={1}>
            {tab.label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

interface Props {
  tabs: TabSpec[];
  searchTab?: TabSpec;
  tintColor?: string;
  badgeColor?: string;
  badgeTextColor?: string;
}

export const FloatingTabBar = ({ tabs, searchTab, tintColor, badgeColor, badgeTextColor }: Props) => {
  const tabCount = tabs.length;
  const lastIndex = tabCount - 1;
  const middleIndex = lastIndex / 2;
  const clampIndex = (value: number) => {
    'worklet';
    return Math.min(lastIndex, Math.max(0, value));
  };
  const bottom = useTabBarOffset();
  const window = useWindowDimensions();
  const barSpan = Math.min(window.width - layout.tabBarSideInset * 2, layout.tabBarMaxWidth);
  const barLeft = (window.width - barSpan) / 2;
  const theme = useLucentTheme(tintColor);
  const { color, scheme } = theme;
  const iconDim = motion.pressIconDim[scheme];
  const collapse = useTabBarCollapse();
  const { getTrigger, switchTab } = useTabTrigger({ name: tabs[0].name });
  const focusedIndex = tabs.findIndex((tab) => getTrigger(tab.name)?.isFocused);
  const searchFocused = searchTab ? (getTrigger(searchTab.name)?.isFocused ?? false) : false;
  const { setQuery, emit } = useSearchHost();
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

  const morphSearch = useCallback(
    (open: boolean) => {
      const target = open ? 1 : 0;
      if (modeTarget.get() === target) {
        return;
      }
      modeTarget.set(target);
      if (open) {
        searchBump.set(withSpring(0, motion.springs.searchBumpOut));
        searchMode.set(
          withDelay(
            motion.searchMorph.delay,
            withSpring(1, {
              ...motion.springs.searchOpen,
              velocity: motion.searchMorph.openVelocity,
            }),
          ),
        );
        searchPop.set(withDelay(motion.searchPop.delay, withSpring(1, motion.springs.searchPop)));
      } else {
        const typing = keyboardProgress.get() > 0.5;
        const delay = typing ? 0 : motion.searchClose.delay;
        searchPop.set(
          withDelay(delay, withSpring(0, typing ? motion.springs.searchKeyboardAbsorb : motion.springs.searchAbsorb)),
        );
        searchMode.set(
          withDelay(delay, withSpring(0, typing ? motion.springs.searchKeyboardMorph : motion.springs.searchMorph)),
        );
      }
    },
    [modeTarget, searchMode, searchPop, searchBump, keyboardProgress],
  );

  useAnimatedReaction(
    () => modeTarget.get() === 0 && searchMode.get() < 1 - motion.searchBump.at,
    (hit, previous) => {
      if (hit && previous === false) {
        searchBump.set(
          withSequence(withSpring(1, motion.springs.searchBumpIn), withSpring(0, motion.springs.searchBumpOut)),
        );
      }
    },
  );

  useAnimatedReaction(
    () => modeTarget.get() === 1 && searchMode.get() > motion.searchBump.at,
    (hit, previous) => {
      if (hit && previous === false) {
        backBump.set(
          withSequence(withSpring(1, motion.springs.searchBumpIn), withSpring(0, motion.springs.searchBumpOut)),
        );
      }
    },
  );

  useEffect(() => {
    morphSearch(searchFocused);
  }, [searchFocused, morphSearch]);

  const selectTab = (index: number, wait = 0) => {
    if (tabs[index]?.disabled) {
      return;
    }
    setTimeout(() => requestAnimationFrame(() => switchTab(tabs[index].name, {})), wait);
  };

  const reselect = (index: number) => {
    const tab = tabs[index];
    if (tab && !tab.disabled) {
      reselectTab(tab);
    }
  };

  const onPillLayout = (event: LayoutChangeEvent) => {
    barWidth.set(event.nativeEvent.layout.width);
  };

  const openSearch = () => {
    if (!searchTab) {
      return;
    }
    tick();
    lensPosition.set(0);
    edgesReady.set(false);
    morphSearch(true);
    requestAnimationFrame(() => switchTab(searchTab.name, {}));
  };

  const leaveSearch = () => {
    tick();
    lensPosition.set(backIndex);
    settledIndex.set(backIndex);
    edgesReady.set(false);
    morphSearch(false);
    requestAnimationFrame(() => switchTab(tabs[backIndex].name, {}));
  };

  const closeSearch = () => {
    searchPress.press.set(1);
    searchPress.press.set(withSpring(0, motion.springs.closeFlash));
    setQuery('');
    emit('onCancelButtonPress');
    Keyboard.dismiss();
    backLight.set(0);
    leaveSearch();
  };

  const backSearch = () => {
    backLight.set(1);
    leaveSearch();
  };

  const positionAt = (x: number) => {
    'worklet';
    return clampIndex((x - barWidth.get() / 2 - barShiftX.get()) / itemWidth.get() + middleIndex);
  };

  const startDrip = (amount = 1) => {
    'worklet';
    const kick = { ...motion.springs.dripKick, velocity: amount * motion.tapLanding.dripKick };
    dripShape.set(withDelay(motion.tapLanding.dripDelay, withSpring(0, kick)));
    landing.set(withSequence(withSpring(amount, motion.springs.landIn), withSpring(0, motion.springs.landOut)));
  };

  const pressBegin = (x: number) => {
    'worklet';
    const index = Math.round(positionAt(x));
    bounceAt.set(-1);
    if (index !== focused.get()) {
      scheduleOnRN(tick);
    }
    dragIndex.set(index);
    moved.set(false);
    const switching = index !== focused.get();
    tapStay.set(switching ? 0 : 1);
    pressedAt.set(Date.now());
    pressing.set(true);
    dripOnArrival.set(false);
    settleFill.set(withSpring(0, motion.springs.lift));
    settleOnArrival.set(false);
    tapSlide.set(1);
    tapSlide.set(withDelay(motion.tapSlide.holdDelay, withSpring(0, motion.springs.lift)));
    landing.set(switching ? withSpring(0, motion.springs.lift) : withSpring(1, motion.springs.landIn));
    barPress.set(withSpring(1, motion.springs.barPressIn));
    barGrowth.set(withSpring(motion.barGrow.held, motion.springs.barGrowIn));
    dragRelease.set(0);
    settleAt.set(-1);
    lensPresence.set(withSpring(1, motion.springs.lift));
    pressSquash.set(withSequence(withSpring(1, motion.springs.track), withSpring(0, motion.springs.edgeSettle)));
    jellyVelocity.set(jellyVelocity.get() + motion.jelly.pressKick * (switching ? motion.switchTravel.pressKick : 1));
    if (switching) {
      lift.set(withSpring(1, motion.springs.lift));
    } else {
      tapGlow.set(withSpring(1, motion.springs.tapRise));
      const dipping = lift.get() > motion.tapLens.dipFrom;
      const rise = withSpring(1, motion.springs.tapLift);
      tapDipping.set(dipping);
      lift.set(dipping ? withSequence(withSpring(motion.tapLens.dip, motion.springs.tapDip), rise) : rise);
    }
    gliding.set(switching);
    glideTo.set(index);
    glideSpan.set(Math.abs(index - lensPosition.get()));
    glideFrom.set(lensPosition.get());
    if (switching) {
      const distance = index - lensPosition.get();
      const extra = Math.max(0, Math.abs(distance) - 1);
      const travel = withSpring(index, {
        duration: motion.switchTravel.duration + motion.switchTravel.perSlot * extra,
        dampingRatio: motion.switchTravel.dampingRatio,
        velocity: Math.sign(distance) * (motion.switchTravel.kick + motion.switchTravel.kickPerSlot * extra),
      });
      lensPosition.set(motion.switchTravel.delay > 0 ? withDelay(motion.switchTravel.delay, travel) : travel);
    } else {
      lensPosition.set(withSpring(index, motion.springs.lens));
    }
    dragOrigin.set(index);
    if (!switching) {
      const tabCenter = barWidth.get() / 2 + pillShiftX.get() + (index - middleIndex) * itemWidth.get();
      pokeSide.set(clamp01((x - tabCenter) / Math.max(itemWidth.get(), 1) + 0.5) * 2 - 1);
      poke.set(
        withSequence(
          withSpring(motion.poke.tap, motion.springs.pokeIn),
          withDelay(motion.poke.holdDelay, withSpring(1, motion.springs.pokeHold)),
        ),
      );
    }
  };

  const pressUpdate = (x: number, translationX: number) => {
    'worklet';
    if (!moved.get() && Math.abs(translationX) < motion.dragThreshold) {
      return;
    }
    moved.set(true);
    tapGlow.set(0);
    poke.set(withSpring(0, motion.springs.pokeHold));
    gliding.set(false);
    tapSlide.set(withSpring(0, motion.springs.lift));
    sliding.set(false);
    settleOnArrival.set(false);
    barPress.set(withSpring(1, motion.springs.barPressIn));
    barGrowth.set(withSpring(motion.barGrow.held, motion.springs.barGrowIn));
    const width = barWidth.get();
    const inner = x < inlinePad ? x - inlinePad : x > width - inlinePad ? x - (width - inlinePad) : 0;
    const rubber = Math.sign(inner) * motion.nudgeMax * (1 - 1 / (1 + Math.abs(inner) / motion.nudgeRange));
    const follow = width > 0 ? ((x - width / 2) / (width / 2)) * motion.nudgeFollow : 0;
    nudge.set(withSpring(rubber + follow, motion.springs.track));
    const position = positionAt(x);
    const lastCenter = barWidth.get() - inlinePad - fullItemWidth.get() / 2;
    const pushTarget = hasSearch ? clamp01((x - lastCenter) / Math.max(fullItemWidth.get() / 2, 1)) : 0;
    push.set(withSpring(pushTarget, motion.springs.track));
    lensPosition.set(withSpring(position, motion.springs.track));
    const index = Math.round(position);
    if (index !== dragIndex.get()) {
      dragIndex.set(index);
      scheduleOnRN(tick);
    }
  };

  const pressEnd = (canceled: boolean) => {
    'worklet';
    pressing.set(false);
    poke.set(withSpring(0, motion.springs.pokeOut));
    const committed = !canceled || !moved.get();
    const pressTime = Date.now() - pressedAt.get();
    const linger = gliding.get() ? motion.switchTravel.lingerPerSlot * Math.max(0, glideSpan.get() - 1) : 0;
    settleFill.set(
      withDelay(
        Math.max(0, motion.switchTravel.fillDelay + linger - pressTime),
        withSpring(1, motion.springs.settleFill),
      ),
    );
    const picked = dragIndex.get();
    const blocked = committed && picked >= 0 && (disabledTabs.get()[picked] ?? false);
    const index = committed && !blocked ? picked : focused.get();
    if (blocked) {
      gliding.set(false);
    }
    dragIndex.set(-1);
    push.set(withSpring(0, motion.springs.release));
    nudge.set(withSpring(0, motion.springs.edgeSettle));
    const settle = withSpring(0, motion.springs.release);
    const quick = !moved.get() && tapSlide.get() > 0.5;
    const tapping = quick && sliding.get() && !blocked;
    const pressed = !moved.get() && !quick && tapStay.get() === 1;
    const pressSwitch = !moved.get() && !quick && gliding.get();
    if (quick || pressSwitch) {
      tapSlide.set(withSpring(1, motion.springs.lift));
    }
    if (pressed) {
      tapSlide.set(1);
    }
    if (tapping) {
      settleOnArrival.set(true);
    } else if (moved.get() && index >= 0) {
      dragRelease.set(1);
      settleAt.set(index);
      landing.set(withSpring(0, motion.springs.landOut));
    } else {
      const rise = withSpring(1, motion.springs.tapRise);
      const dipping = tapDipping.get() && lift.get() > motion.tapLens.dipFrom;
      const strength =
        quick && !dipping
          ? clamp01((pressTime - motion.tapLens.dentFrom) / (motion.tapLens.dentFull - motion.tapLens.dentFrom))
          : 0;
      const dripLater = strength > 0 && gliding.get();
      dent.set(strength);
      dripOnArrival.set(dripLater);
      const dripNow = strength > 0 && !gliding.get();
      const fall = withSpring(0, {
        duration: lerp(motion.springs.release.duration, motion.springs.landFall.duration, strength),
        dampingRatio: 1,
      });
      tapGlow.set(
        quick && strength < 1 && !gliding.get() && tapStay.get() === 1
          ? withSequence(
              withSpring(1, motion.springs.tapRise),
              withDelay(motion.tapLens.glowHold, withSpring(0, motion.springs.tapGlowOut)),
            )
          : 0,
      );
      if (dripNow) {
        startDrip(strength);
      } else {
        dripShape.set(0);
        landing.set(withSpring(0, motion.springs.landOut));
      }
      lift.set(
        pressSwitch
          ? settle
          : dripLater
            ? rise
            : quick || pressed
              ? dipping
                ? withSequence(withSpring(motion.tapLens.dip, motion.springs.tapDip), rise, settle)
                : withSequence(rise, gliding.get() ? withDelay(motion.switchTravel.hold + linger, settle) : fall)
              : settle,
      );
      tapDipping.set(false);
    }
    barPress.set(withSpring(0, motion.springs.barPressOut));
    barGrowth.set(withSpring(0, motion.springs.barPressOut));
    if (index >= 0) {
      const bounce = blocked && !moved.get() ? pressedAt.get() + motion.disabledBounce.delay : -1;
      if (bounce > Date.now()) {
        bounceAt.set(bounce);
      } else if (!tapping && !(gliding.get() && index === glideTo.get())) {
        lensPosition.set(withSpring(index, motion.springs.lens));
      }
      settledIndex.set(index);
      if (committed && index !== focused.get()) {
        scheduleOnRN(selectTab, index, moved.get() ? 0 : Math.max(0, motion.switchTravel.navigateDelay - pressTime));
      } else if (committed && !blocked && !moved.get() && index === focused.get()) {
        scheduleOnRN(reselect, index);
      } else if (focused.get() < 0) {
        lensPresence.set(withSpring(0, motion.springs.morph));
      }
    }
  };

  const pan = usePanGesture({
    enabled: !searchFocused,
    minDistance: 0,
    onBegin: (event) => {
      if (collapse && collapse.target.get() === 1) {
        expandOnly.set(true);
        setTabBarCollapsed(collapse, 0);
        return;
      }
      pressBegin(event.x);
    },
    onUpdate: (event) => {
      if (expandOnly.get()) {
        return;
      }
      pressUpdate(event.x, event.translationX);
    },
    onFinalize: (event) => {
      if (expandOnly.get()) {
        expandOnly.set(false);
        return;
      }
      pressEnd(event.canceled);
    },
  });

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  const backDrag = usePanGesture({
    enabled: searchFocused,
    minDistance: motion.searchDrag.start,
    onActivate: (event) => {
      const x = modeInset + event.x;
      const index = Math.round(positionAt(x));
      backDragging.set(true);
      lensPosition.set(index);
      focused.set(disabledTabs.get()[index] ? backIndex : index);
      edgesReady.set(false);
      backLight.set(0);
      modeTarget.set(0);
      searchPop.set(withSpring(0, motion.springs.searchDrag));
      searchMode.set(withSpring(0, motion.springs.searchDrag));
      scheduleOnRN(dismissKeyboard);
      pressBegin(x);
      pressUpdate(x, motion.dragThreshold + 1);
    },
    onUpdate: (event) => {
      if (backDragging.get()) {
        pressUpdate(modeInset + event.x, event.translationX);
      }
    },
    onFinalize: () => {
      if (!backDragging.get()) {
        return;
      }
      backDragging.set(false);
      const index = dragIndex.get();
      const blocked = index >= 0 && (disabledTabs.get()[index] ?? false);
      const selected = index !== focused.get();
      const target = blocked ? focused.get() : index;
      pressEnd(false);
      if ((blocked || !selected) && target >= 0) {
        scheduleOnRN(selectTab, target);
      }
    },
  });

  useFrameCallback((frame) => {
    const width = itemWidth.get();
    if (width <= 0) {
      return;
    }
    const position = lensPosition.get();
    const delta = position - previousLensPosition.get();
    if (bounceAt.get() >= 0 && Date.now() >= bounceAt.get()) {
      bounceAt.set(-1);
      lensPosition.set(withSpring(settledIndex.get(), motion.springs.lens));
    }
    if (settleAt.get() >= 0 && Math.abs(position - settleAt.get()) < motion.dragSettle.near) {
      settleAt.set(-1);
      lift.set(withSpring(0, motion.springs.release));
    }
    const direction = Math.sign(delta);
    previousLensPosition.set(position);
    const elapsed = Math.max(frame.timeSincePreviousFrame ?? 16, 1);
    const speed = (Math.abs(delta) * 1000) / elapsed;
    const dt = Math.min(elapsed, 34) / 1000;
    if (Math.abs(delta) > 0.002) {
      heading.set(Math.sign(delta));
    }
    const previousSpeed = smoothSpeed.get();
    const filteredSpeed = lerp(previousSpeed, speed, 1 - Math.exp(-dt * motion.jelly.smoothing));
    smoothSpeed.set(filteredSpeed);
    const acceleration = (filteredSpeed - previousSpeed) / dt;
    const free = 1 - slideShape.get();
    const stretchTarget = Math.min(1, filteredSpeed / motion.lensMoveSpeed) * motion.jelly.stretch * lift.get();
    const omega = (2 * Math.PI) / motion.jelly.period;
    const force =
      omega * omega * (stretchTarget - jelly.get()) -
      2 * motion.jelly.damping * omega * jellyVelocity.get() +
      motion.jelly.kick * acceleration;
    approachSpeed.set(Math.max(approachSpeed.get() * Math.exp(-dt * motion.squish.memory), filteredSpeed));
    const endZone = gliding.get() ? motion.switchTravel.contactZone : motion.jelly.endZone;
    const nearLeft = position <= endZone && Math.abs(leftEdge.get() - leftTarget.get()) < motion.squish.contact;
    const nearRight =
      position >= lastIndex - endZone && Math.abs(rightEdge.get() - rightTarget.get()) < motion.squish.contact;
    const endReached = nearLeft || nearRight;
    if (endReached && !atEnd.get() && (lift.get() > 0.5 || sliding.get() || gliding.get())) {
      wallSide.set(nearLeft ? -1 : 1);
      squishVelocity.set(
        squishVelocity.get() +
          (gliding.get()
            ? motion.switchTravel.squishKick * glideSpan.get()
            : Math.min(approachSpeed.get(), motion.squish.speedCap) *
              motion.squish.impact *
              (sliding.get() ? lerp(1, motion.tapSlide.impact, tapSlide.get()) : motion.squish.dragImpact)),
      );
    }
    atEnd.set(endReached);
    const squishOmega =
      (2 * Math.PI) /
      (gliding.get()
        ? motion.switchTravel.squishPeriod
        : sliding.get()
          ? motion.squish.period
          : motion.squish.dragPeriod);
    const squishForce =
      -squishOmega * squishOmega * squish.get() -
      2 *
        (gliding.get()
          ? motion.switchTravel.squishDamping
          : sliding.get()
            ? motion.squish.damping
            : motion.squish.dragDamping) *
        squishOmega *
        squishVelocity.get();
    const nextSquishVelocity = squishVelocity.get() + squishForce * dt;
    squishVelocity.set(nextSquishVelocity);
    squish.set(Math.min(motion.squish.max, Math.max(-motion.squish.max, squish.get() + nextSquishVelocity * dt)));
    const nextVelocity = jellyVelocity.get() + force * dt;
    jellyVelocity.set(nextVelocity);
    jelly.set(Math.min(motion.jelly.max, Math.max(-motion.jelly.max, jelly.get() + nextVelocity * dt)));
    const speedTarget = lift.get() > 0 ? Math.min(1, speed / motion.lensMoveSpeed) : 0;
    if (Math.abs(speedTarget - movingTarget.get()) > 0.05 || (speedTarget === 0 && movingTarget.get() !== 0)) {
      movingTarget.set(speedTarget);
      moving.set(withSpring(speedTarget, motion.springs.stretch));
    }

    const reach =
      middleIndex > 0 ? (lift.get() * held.get() * motion.lensEdgeReach * (position - middleIndex)) / middleIndex : 0;
    const center =
      barWidth.get() / 2 +
      pillShiftX.get() +
      (position - middleIndex) * width +
      reach +
      push.get() * motion.lensPushTravel;
    const restHalf = Math.min(layout.bubbleRestWidth, width + space[6]) / 2;
    const spread = Math.max(
      lift.get(),
      Math.min(1, landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.hold),
    );
    const halfWidth =
      lerp(restHalf, (width / 2) * motion.lensLift.x, spread * free) *
      lerp(1, motion.switchTravel.wide, gliding.get() ? lift.get() : 0);
    const edgeInset = (fullHeight - layout.bubbleRestHeight) / 2;
    const barLeft = pillShiftX.get() + (barWidth.get() * (1 - scaleX.get())) / 2 + edgeInset;
    const barRight = pillShiftX.get() + (barWidth.get() * (1 + scaleX.get())) / 2 - edgeInset;
    const resting = (1 - lift.get()) * (moved.get() ? 0 : 1);
    const hugLeft = Math.min(0, barLeft - (center - halfWidth)) * clamp01(1 - position) * resting;
    const hugRight = Math.max(0, barRight - (center + halfWidth)) * clamp01(position - (lastIndex - 1)) * resting;
    const hugged = center + hugLeft + hugRight;
    const contain = !gliding.get() && resting > 0.5;
    const left = contain ? Math.max(hugged - halfWidth, barLeft) : hugged - halfWidth;
    const right = contain ? Math.min(hugged + halfWidth, barRight) : hugged + halfWidth;
    restSpan.set(halfWidth * 2);

    const collapsing = collapsed.get() !== previousCollapsed.get();
    previousCollapsed.set(collapsed.get());

    if (!edgesReady.get() || (collapsing && lift.get() === 0)) {
      edgesReady.set(true);
      leftEdge.set(left);
      rightEdge.set(right);
      leftTarget.set(left);
      rightTarget.set(right);
      return;
    }

    if (sliding.get()) {
      const travel = slideTo.get() - slideFrom.get();
      const lead = slideRight.get() ? rightEdge.get() : leftEdge.get();
      const arrived = Math.abs(travel) > 0.5 ? (lead - slideFrom.get()) / travel : 1;
      if (settleOnArrival.get() && arrived >= motion.tapSlide.arrival) {
        settleOnArrival.set(false);
        lift.set(withSpring(0, motion.springs.tapSettle));
      }
      const resting =
        lift.get() < 0.001 &&
        Math.abs(leftEdge.get() - leftTarget.get()) < motion.edgeEpsilon &&
        Math.abs(rightEdge.get() - rightTarget.get()) < motion.edgeEpsilon &&
        Math.abs(position - Math.round(position)) < 0.002;
      if (tapSlide.get() > 0.5 && !resting) {
        return;
      }
      sliding.set(false);
    }

    if (
      pressing.get() &&
      gliding.get() &&
      !moved.get() &&
      Date.now() - pressedAt.get() >= motion.tapSlide.holdDelay &&
      Math.abs(position - glideTo.get()) < motion.switchTravel.holdArrive
    ) {
      gliding.set(false);
      tapStay.set(withSpring(1, motion.springs.lift));
      landing.set(withSpring(1, motion.springs.landIn));
    }
    if (dripOnArrival.get() && gliding.get() && Math.abs(position - glideTo.get()) < motion.switchTravel.holdArrive) {
      dripOnArrival.set(false);
      gliding.set(false);
      tapStay.set(withSpring(1, motion.springs.snappy));
      startDrip(dent.get());
      lift.set(withSpring(0, motion.springs.landFall));
    }
    if (gliding.get() && lift.get() < 0.001 && Math.abs(position - glideTo.get()) < 0.002) {
      gliding.set(false);
    }
    if (gliding.get() || (tapStay.get() === 1 && !moved.get() && held.get() < 0.5)) {
      leftTarget.set(left);
      rightTarget.set(right);
      leftEdge.set(left);
      rightEdge.set(right);
      return;
    }

    const settling = direction === 0;
    if (Math.abs(left - leftTarget.get()) > motion.edgeEpsilon) {
      leftTarget.set(left);
      const config = settling
        ? motion.springs.jellySettle
        : direction < 0
          ? motion.springs.jellyLead
          : motion.springs.jellyTrail;
      leftEdge.set(withSpring(left, config));
    }
    if (Math.abs(right - rightTarget.get()) > motion.edgeEpsilon) {
      rightTarget.set(right);
      const config = settling
        ? motion.springs.jellySettle
        : direction > 0
          ? motion.springs.jellyLead
          : motion.springs.jellyTrail;
      rightEdge.set(withSpring(right, config));
    }
  });

  const deflate = useDerivedValue(() => {
    const travel = clamp01(
      (Math.abs(lensPosition.get() - dragOrigin.get()) - motion.deflateTravel) / motion.deflateRamp,
    );
    const fast = clamp01((moving.get() - motion.deflateSpeed) / (1 - motion.deflateSpeed));
    return fast * travel * lift.get();
  });

  const lensGeometry = useDerivedValue(() => {
    const fullWidth = layout.bubbleRestWidth;
    const left = leftEdge.get();
    const right = rightEdge.get();
    const span = Math.max(0, right - left);
    const barScale = fullHeight / lensFullHeight;
    const slide = slideShape.get();
    const liftScale = lerp(
      lerp(
        layout.bubbleRestHeight / lensFullHeight,
        lerp(
          lerp(
            motion.lensLift.y,
            lerp(moved.get() ? motion.lensLift.y : motion.tapLens.holdLiftY, motion.tapLens.liftY, tapSlide.get()),
            tapStay.get(),
          ),
          (fullHeight * motion.switchTravel.height) / lensFullHeight,
          tapSlide.get() * (1 - tapStay.get()),
        ),
        lift.get(),
      ),
      barScale,
      deflate.get(),
    );
    const minScaleY = lerp(layout.bubbleRestHeight / lensFullHeight, barScale, lift.get()) * (1 - slide);
    const rest = restSpan.get();
    const stretchRatio = rest > 0 ? span / rest : 1;
    const floor = lerp(motion.minLensSquash, motion.tapSlide.minSquash, slide);
    const travel = slideTo.get() - slideFrom.get();
    const lead = slideRight.get() ? right : left;
    const arrived = Math.abs(travel) > 0.5 ? clamp01((lead - slideFrom.get()) / travel) : 1;
    const thinning = lerp(0.5, arrived * arrived, slide);
    const squash = Math.min(1 / floor, Math.max(floor, Math.pow(Math.max(stretchRatio, 0.01), -thinning)));
    const compact = lerp(1, lensCompactScaleY, collapsed.get());
    const base = compact * Math.max(minScaleY, liftScale * squash * (1 - pressSquash.get() * motion.pressSquashY));
    const wobble = 1 + jelly.get() * lerp(1, motion.tapSlide.jellyX, slide);
    let scaleY = base * (1 + squish.get() * (gliding.get() ? motion.switchTravel.squishBulge : motion.squish.bulge));
    let scaleX =
      (fullWidth > 0 ? Math.max(span / fullWidth, 0.01) : 1) *
      (1 + pressSquash.get() * motion.pressSquashX) *
      wobble *
      (1 - squish.get());
    const wall = Math.max(base, (compact * (fullHeight + motion.canal.overflow)) / lensFullHeight);
    if (scaleY > wall) {
      const excess = scaleY - wall;
      scaleY = wall + excess * motion.canal.give;
      scaleX +=
        excess *
        (1 - motion.canal.give) *
        lerp(motion.canal.spread, motion.tapSlide.wallSpread, slide) *
        (lensFullHeight / fullWidth);
    }
    if (gliding.get()) {
      const knee = (fullHeight * motion.switchTravel.height) / lensFullHeight;
      const cap = (fullHeight - 2 * motion.switchTravel.railGap) / lensFullHeight;
      if (scaleY > knee && cap > knee) {
        const room = cap - knee;
        const capped = knee + room * Math.tanh((scaleY - knee) / room);
        scaleX += (scaleY - capped) * motion.switchTravel.heightToWidth * (lensFullHeight / fullWidth);
        scaleY = capped;
      }
    }
    if (!gliding.get() && !sliding.get()) {
      scaleY *= 1 + squish.get() * motion.squish.dragHeight;
    }
    scaleY /= Math.max(wobble, 0.5);
    const pressed = poke.get() * pokeSide.get();
    scaleX *= 1 - Math.abs(pressed) * motion.poke.flat;
    scaleY *= 1 + Math.abs(pressed) * motion.poke.bulge;
    const land = landing.get() * tapStay.get() * tapSlide.get();
    scaleX *= 1 + land * motion.tapLanding.wide;
    scaleY *= 1 - land * motion.tapLanding.flat;
    return {
      translateX:
        (left + right) / 2 -
        inlinePad -
        fullWidth / 2 +
        heading.get() * Math.abs(jelly.get()) * (span / 2) * motion.jelly.lean +
        wallSide.get() * squish.get() * (span / 2) -
        pressed * ((span * motion.poke.flat) / 2 + motion.poke.lean),
      translateY: slide * lift.get() * motion.tapSlide.drop + land * (1 - lift.get()) * motion.tapLanding.drop,
      scaleX,
      scaleY,
    };
  });

  const lensRise = useDerivedValue(() => {
    const overhang = (lensGeometry.get().scaleY * lensFullHeight - fullHeight) / 2;
    const out = clamp01(overhang / motion.tapLens.revealOverhang);
    return lerp(out * out * (3 - 2 * out), 1, held.get());
  });
  const lensPeak = useSharedValue(0);
  useAnimatedReaction(
    () =>
      lift.get() < motion.tapLens.fallGrey.from && landing.get() < motion.tapLens.fallGrey.from
        ? 0
        : Math.max(lensPeak.get(), lensRise.get()),
    (peak) => {
      if (peak !== lensPeak.get()) {
        lensPeak.set(peak);
      }
    },
  );
  const lensOut = useDerivedValue(() => {
    const { from, to } = motion.tapLens.fallGrey;
    const fall = clamp01((lift.get() - from) / (to - from));
    const land = landing.get() * tapStay.get() * tapSlide.get();
    return Math.max(lensRise.get(), Math.min(lensPeak.get(), Math.max(fall * fall * (3 - 2 * fall), land)));
  });
  const grey = useDerivedValue(() =>
    Math.max(
      lerp(settleFill.get(), 1 - Math.max(lensOut.get(), tapGlow.get()), tapStay.get()),
      landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.tint,
    ),
  );

  const lensStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: edgesReady.get()
        ? lensPresence.get() * grey.get() * (1 - clamp01(collapsed.get() * motion.labelFadeRate))
        : 0,
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const lensGlassOpacity = useDerivedValue(() =>
    edgesReady.get()
      ? Math.max(
          lerp(
            lift.get(),
            clamp01(
              lift.get() *
                (tapStay.get() === 1 && dragRelease.get() === 0 ? motion.tapLens.glassRamp : motion.tapSlide.glassRamp),
            ),
            Math.max(tapSlide.get(), dragRelease.get()),
          ),
          clamp01(landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.glassHold),
        )
      : 0,
  );

  const lensGlassStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: lensGlassOpacity.get() * lerp(1 - settleFill.get(), 1, tapStay.get()),
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const iconCover = useDerivedValue(() =>
    clamp01(
      Math.max(
        lensGlassOpacity.get() * motion.tapLens.iconCoverRamp,
        (gliding.get() || dragRelease.get() > 0) && lift.get() > motion.tapLens.coverLift ? 1 : 0,
        landing.get() * tapStay.get() * tapSlide.get() * motion.tapLanding.glassHold * motion.tapLanding.iconHold,
      ) * lerp(clamp01((1 - settleFill.get()) * motion.tapLens.iconCoverRamp), 1, tapStay.get()),
    ),
  );

  const coveredIcons = useDerivedValue(() => {
    const width = itemWidth.get();
    const half = width * motion.tapLens.iconHalf;
    const left = leftEdge.get();
    const right = rightEdge.get();
    const strength = iconCover.get();
    return tabs.map((_, index) => {
      const center = barWidth.get() / 2 + pillShiftX.get() + (index - middleIndex) * width;
      const overlap = Math.min(right, center + half) - Math.max(left, center - half);
      return half > 0
        ? strength * clamp01((overlap / (half * 2) - motion.tapLens.coverFrom) / (1 - motion.tapLens.coverFrom))
        : 0;
    });
  });

  const lensIconStyle = useAnimatedStyle(() => {
    const geometry = lensGeometry.get();
    return {
      opacity: iconCover.get(),
      transform: [
        { translateX: geometry.translateX },
        { translateY: geometry.translateY },
        { scaleX: geometry.scaleX },
        { scaleY: geometry.scaleY },
      ],
    };
  });

  const searchScale = useDerivedValue(
    () =>
      scaleY.get() *
      lerp(1, modeShrink, Math.pow(clamp01(searchMode.get()), motion.searchMorph.heightLag)) *
      (1 + searchPress.press.get() * motion.pressGrow),
  );
  const searchFillStyle = useAnimatedStyle(() => {
    const mode = searchMode.get();
    const travel = barWidth.get() + layout.tabBarGap + fullHeight / 2 - fieldGlyphCenter;
    if (modeTarget.get() === 0) {
      return {
        opacity: searchPress.press.get() * clamp01(searchPop.get() * motion.searchClose.lightHold),
        transform: [
          {
            translateX:
              (-motion.searchPop.shift * (1 - clamp01(searchPop.get())) * clamp01(mode)) /
              Math.max(searchScale.get(), 0.01),
          },
          { scale: lerp(motion.searchClose.circleScale, 1, clamp01(searchPop.get()) ** 2) },
        ],
      };
    }
    return {
      opacity:
        searchPress.press.get() *
        (mode < 0.5 ? 1 - clamp01(mode * motion.searchTabs.pressFade) : clamp01((searchPop.get() - 0.75) * 4)),
      transform: [{ translateX: mode < 0.5 ? -travel * clamp01(mode) : 0 }],
    };
  });
  const searchInkStyle = useAnimatedStyle(() => ({
    opacity: 1 - searchPress.press.get() * iconDim,
  }));

  const keyboardReach = Math.max(0, barLeft + modeInset - motion.searchKeyboard.edge);
  const keyboardSpread = useDerivedValue(() => keyboardReach * clamp01(searchRaise.get()));

  useAnimatedReaction(
    () => ({ closing: modeTarget.get() === 0, raised: searchRaise.get() >= motion.searchKeyboard.dipAt }),
    (next, previous) => {
      if (next.closing && !next.raised && previous?.raised) {
        searchDip.set(
          withSequence(
            withSpring(motion.searchKeyboard.dip, motion.springs.searchDipIn),
            withSpring(0, motion.springs.searchDipOut),
          ),
        );
      }
    },
  );
  const tileSink = useDerivedValue(() => -barLift.get());
  const barLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: barLift.get() }],
  }));
  const searchSpreadStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: keyboardSpread.get() }, { translateY: searchDip.get() }],
  }));

  const pillModeStyle = useAnimatedStyle(() => ({
    opacity:
      1 - clamp01(searchMode.get() * (modeTarget.get() === 1 ? motion.searchTabs.fade : motion.searchTabs.closeFade)),
    transform: [{ translateY: tileSink.get() }],
  }));
  const searchCenter = useDerivedValue(() => barWidth.get() + layout.tabBarGap + fullHeight / 2);
  const pillReach = useDerivedValue(() =>
    modeTarget.get() === 1 ? lerp(barWidth.get(), modeInset + modeHeight, clamp01(searchMode.get())) : barWidth.get(),
  );
  const rowFit = useDerivedValue(() => {
    if (modeTarget.get() === 1) {
      return { scale: 1, x: 0, y: 0 };
    }
    const settled = clamp01(searchMode.get());
    const width = Math.max(barWidth.get(), 1);
    return {
      scale: lerp(width, modeHeight, settled) / width,
      x: modeInset * settled,
      y: modeInset * Math.pow(settled, motion.searchMorph.heightLag),
    };
  });
  const rowClipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillReach.get() - barWidth.get() }],
  }));
  const rowUnclipStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: barWidth.get() - pillReach.get() }],
  }));
  const rowFitStyle = useAnimatedStyle(() => {
    const fit = rowFit.get();
    const width = Math.max(barWidth.get(), 1);
    return {
      transform: [
        { translateX: fit.x - (width * (1 - fit.scale)) / 2 },
        { translateY: fit.y - (fullHeight * (1 - fit.scale)) / 2 },
        { scale: fit.scale },
      ],
    };
  });
  const rowBlurProps = useAnimatedProps(() => ({
    radius: clamp01(searchMode.get()) * motion.searchTabs.blur,
  }));
  const searchContentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: searchScale.get() }],
  }));

  const barGlassProps = useAnimatedProps(() => {
    const width = barWidth.get();
    if (width <= 0) {
      return {
        shapes: [] as number[],
        blend: 0,
        dim: 0,
        glowX: 0,
        glowY: 0,
        glowSpread: 0,
        glowStrength: 0,
        frost: 0,
        frostClear: 0,
        frostRadius: 0,
        frostLeft: 0,
        frostTop: 0,
        frostRight: 0,
        frostBottom: 0,
        wideMix: glass.wideMix[scheme] as number,
      };
    }
    const mode = searchMode.get();
    const settled = clamp01(mode);
    const settledY = Math.pow(settled, motion.searchMorph.heightLag);
    const pop = searchPop.get();
    const popPlace = clamp01(pop);
    const pad = glass.pad;
    const fit = rowFit.get();
    const ride = modeTarget.get() === 0 ? settled : 0;
    const frostCenter = inlinePad + layout.bubbleRestWidth / 2 + lensGeometry.get().translateX;
    const frostRideEnd = modeInset + (modeHeight / width) * frostCenter;
    const frostX = fit.x + frostCenter * fit.scale - (frostRideEnd - modeInset - modeHeight / 2) * ride;
    const frostY = fullHeight / 2 + lensGeometry.get().translateY;
    const frostShrink = lerp(1, modeHeight / lensFullHeight, ride);
    const frostHalfX = ((layout.bubbleRestWidth * lensGeometry.get().scaleX) / 2) * frostShrink;
    const frostHalfY = ((lensFullHeight * lensGeometry.get().scaleY) / 2) * frostShrink;

    const growX = barGrowth.get() * motion.barGrow.x * (1 - settled);
    const grow = barGrowth.get() * motion.barGrow.y * (1 - settled);
    const wallBulge = gliding.get() ? 0 : Math.max(0, squish.get()) * motion.squish.barBulge * (1 - settled);
    const pillLeft =
      pillShiftX.get() + (width - width * scaleX.get()) / 2 - growX - (wallSide.get() < 0 ? wallBulge : 0);
    const pillRight =
      pillLeft +
      width * scaleX.get() +
      growX * (1 + towardSearch) +
      (wallSide.get() < 0 ? wallBulge : 0) +
      (wallSide.get() > 0 ? wallBulge : 0);
    const pillInset = (fullHeight * (1 - scaleY.get())) / 2;
    const pillTop = pillInset - grow;
    const backGrow = modeRadius * motion.pressGrow * backPress.press.get() * settled;
    const backLeft = lerp(pillLeft, pillLeft + modeInset, settled) - backGrow;
    const bump = searchBump.get();
    const backRight =
      lerp(pillRight, pillLeft + modeInset + modeHeight, settled) +
      backGrow +
      bump * motion.searchBump.overshoot -
      backBump.get() * motion.searchBump.squish;
    const backTop = lerp(pillTop, modeInset, settledY) - backGrow;
    const backBottom = lerp(fullHeight - pillInset + grow, fullHeight - modeInset, settledY) + backGrow;
    const spread = keyboardSpread.get();
    const sink = tileSink.get();
    const dip = searchDip.get();
    const backSpread = modeTarget.get() === 0 && mode > 0 ? backLight.get() * Math.pow(settled, glass.backGlowFade) : 0;

    const searchX = width + layout.tabBarGap + fullHeight / 2;
    const circleY = fullHeight / 2;
    const searchRadius = (fullHeight / 2) * searchScale.get();
    const fieldEnd = searchX + searchRadius - motion.searchPop.shift * settled + spread;
    const circleX = lerp(searchX, lerp(searchX - motion.searchPop.shift, searchX, popPlace), settled) + spread;
    const hiddenScale = modeTarget.get() === 0 ? motion.searchClose.circleScale : motion.searchPop.hiddenScale;
    const circleRadius =
      modeTarget.get() === 0
        ? lerp(
            searchRadius,
            lerp(searchRadius * hiddenScale, searchRadius, pop * pop),
            clamp01(settled * motion.searchClose.circleHold),
          )
        : lerp(searchRadius, lerp(searchRadius * hiddenScale, searchRadius, pop), settled);

    const fieldStart =
      lerp(pillLeft + modeInset + modeHeight + layout.searchModeGap, pillLeft + modeInset, clamp01(searchRaise.get())) -
      spread;
    const fieldLeft = lerp(searchX - searchRadius, fieldStart, settled);
    const fieldRight = lerp(fieldEnd, searchX - modeRadius - layout.searchModeGap + spread, popPlace);
    const fieldTop = lerp(circleY - searchRadius, modeInset, settledY);
    const fieldBottom = lerp(circleY + searchRadius, fullHeight - modeInset, settledY);
    const tucked =
      settled > 0 ? Math.min(circleRadius, ((fieldBottom - fieldTop) / 2) * motion.searchPop.tuckScale) : circleRadius;
    const fieldRadius = lerp(tucked, circleRadius, popPlace);

    return {
      blend: Math.max(
        glass.blend * clamp01(mode * 3),
        glass.popBlend * Math.sin(Math.PI * popPlace) * settled,
        glass.liftBlend *
          clamp01(barGrowth.get() / motion.barGrow.held) ** 2 *
          (1 - settled) *
          (1 -
            clamp01(1 - (lastIndex - lensPosition.get()) / glass.lensPinchSideReach) *
              (1 - lerp(motion.endMelt, 1, push.get()))),
        glass.pressBlend * searchPress.press.get(),
        (hasSearch ? glass.meltBlend : 0) *
          shine.get() *
          (1 - settled) *
          clamp01(1 - (lastIndex - lensPosition.get()) / glass.lensPinchSideReach) *
          lerp(motion.endMelt, 1, push.get()),
      ),
      dim: 0,
      frost:
        glass.lensFrost *
        lensPresence.get() *
        grey.get() *
        (1 - clamp01(collapsed.get() * motion.labelFadeRate)) *
        (modeTarget.get() === 0
          ? clamp01((motion.searchClose.fillFrom - mode) / (motion.searchClose.fillFrom - motion.searchClose.fillTo))
          : 1),
      frostClear: glass.lensFrostClear[scheme],
      frostRadius: glass.lensFrostRadius[scheme],
      frostMagnify: glass.lensFrostMagnify[scheme],
      frostLeft: frostX - frostHalfX + pad,
      frostRight: frostX + frostHalfX + pad,
      frostTop: frostY - frostHalfY + pad,
      frostBottom: frostY + frostHalfY + pad,
      ...(backSpread > 0
        ? {
            glowX: backLeft + modeHeight / 2 + pad,
            glowY: (backTop + backBottom) / 2 + pad,
            glowSpread: (backRight - backLeft) * glass.backGlowSpread,
            glowStrength: glass.backGlow[scheme] * backSpread,
          }
        : {
            glowX: (leftEdge.get() + rightEdge.get()) / 2 + pad,
            glowY: fullHeight / 2 + pad,
            glowSpread: glass.pressGlowSpread,
            glowStrength: glass.pressGlow * shine.get() * barPress.get() * (1 - tapSlide.get()) * (1 - settled),
          }),
      wideMix: lerp(glass.wideMix[scheme], glass.pressWideMix[scheme], barPress.get() * (1 - settled)),
      shapes: [
        backLeft + pad,
        backTop + sink + pad,
        backRight + pad,
        backBottom + sink + pad,
        ...(hasSearch
          ? [
              circleX - fieldRadius + bump * motion.searchBump.squish + pad,
              circleY - fieldRadius + dip + pad,
              circleX + fieldRadius + pad,
              circleY + fieldRadius + dip + pad,
            ]
          : []),
        ...(mode > 0
          ? [
              fieldLeft + bump * motion.searchBump.squish + pad,
              fieldTop + dip + pad,
              fieldRight + pad,
              fieldBottom + dip + pad,
            ]
          : []),
      ],
    };
  });
  const searchGlyphStyle = useAnimatedStyle(() => ({
    opacity: searchMode.get() > motion.backTravel.handoff ? 0 : 1,
  }));
  const closeGlyphStyle = useAnimatedStyle(() => {
    const settled = clamp01(searchMode.get());
    const pop = clamp01(searchPop.get());
    return {
      opacity:
        modeTarget.get() === 1
          ? clamp01(searchMode.get() * 2 - 1)
          : clamp01((pop - motion.searchClose.glyphGone) / (1 - motion.searchClose.glyphGone)),
      transform: [
        {
          translateX: (-motion.searchPop.shift * (1 - pop) * settled) / Math.max(searchScale.get(), 0.01),
        },
        {
          scale: lerp(
            (modeTarget.get() === 0 ? motion.searchClose.glyphScale : motion.searchPop.glyphScale) /
              (1 + searchPress.press.get() * motion.pressGrow),
            1,
            modeTarget.get() === 0 ? pop * pop : pop,
          ),
        },
      ],
    };
  });

  const pressScaleStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const growX = barGrowth.get() * motion.barGrow.x * (1 - clamp01(searchMode.get()));
    return {
      transform: [
        { translateY: tileSink.get() },
        { translateX: (-growX * (1 - towardSearch)) / 2 },
        { scale: 1 + (growX * (1 + towardSearch)) / width },
      ],
    };
  });

  const pillLiftStyle = useAnimatedStyle(() => {
    const width = Math.max(barWidth.get(), 1);
    const open = 1 - clamp01(searchMode.get());
    const growX = barGrowth.get() * motion.barGrow.x * open;
    const growY = barGrowth.get() * motion.barGrow.y * open;
    return {
      opacity: shine.get() * lerp(1, barPress.get(), tapStay.get()) * open,
      transform: [
        { translateX: (growX * (towardSearch - 1)) / 2 },
        { scaleX: 1 + (growX * (1 + towardSearch)) / width },
        { scaleY: 1 + (growY * 2) / fullHeight },
      ],
    };
  });

  const glide = useDerivedValue(() => (gliding.get() ? 1 : 0));

  const switchOptics = useDerivedValue(() => {
    const fade = clamp01((lift.get() - motion.switchTravel.clearFrom) / (1 - motion.switchTravel.clearFrom));
    return gliding.get() ? motion.switchTravel.optics * fade * fade * (3 - 2 * fade) : 1;
  });

  const wallFlat = useDerivedValue(() => {
    const press = clamp01(Math.abs(squish.get()) * motion.squish.flatRate);
    const flat = press * press;
    return {
      side: flat > 0.001 ? -wallSide.get() : 0,
      round: lerp(1, motion.squish.flatRound, flat),
      lead: lerp(1, motion.squish.leadRound, flat),
    };
  });

  const lensOptics = useDerivedValue(() => {
    const geometry = lensGeometry.get();
    const slide = slideShape.get();
    const canal = slide * lift.get();
    const optics = lerp(1, clamp01(lift.get() * motion.tapSlide.glassRamp), slide);
    const travel = switchOptics.get();
    const bendScale = optics * lerp(1, motion.tapSlide.bend, slide) * travel;
    const centerX = inlinePad + layout.bubbleRestWidth / 2 + geometry.translateX;
    const centerY = fullHeight / 2 + geometry.translateY;
    const reveal = lensOut.get();
    return {
      refraction: glass.lensRefraction * bendScale * reveal,
      magnify: glass.lensMagnify * optics * travel * reveal * (1 - glide.get()),
      rimOut:
        glass.lensRimOut.amount *
        lift.get() *
        reveal *
        lerp(
          glass.lensRimOut.endKeep,
          1,
          clamp01(Math.min(lensPosition.get(), lastIndex - lensPosition.get()) / glass.lensRimOut.endReach),
        ),
      dispersion: glass.lensDispersion * bendScale * reveal,
      ellipse: Math.max(
        canal,
        motion.tapLens.ellipse * lift.get() * (1 - held.get()),
        motion.tapLens.heldEllipse * lift.get() * holding.get(),
      ),
      clipLeft: -motion.canal.overflow - centerX,
      clipTop: -motion.canal.overflow - centerY,
      clipRight: barWidth.get() + motion.canal.overflow - centerX,
      clipBottom: fullHeight + motion.canal.overflow - centerY,
      clipScaleX: Math.max(geometry.scaleX, 0.01),
      clipScaleY: Math.max(geometry.scaleY, 0.01),
      clipSoft: motion.canal.soft,
      clipOn: canal,
      wallSide: wallFlat.get().side,
      wallRound: wallFlat.get().round,
      wallLead: wallFlat.get().lead,
    };
  });

  const glideBend = useDerivedValue(() => {
    const span = glideSpan.get();
    if (!gliding.get() || span < 1.5) {
      return 0;
    }
    const progress = clamp01(Math.abs(lensPosition.get() - glideFrom.get()) / span);
    return Math.sin(Math.PI * progress) * clamp01((span - 1) / 2);
  });

  const lensIconProps = useAnimatedProps(() => {
    const optics = lensOptics.get();
    return {
      ...optics,
      refraction: optics.refraction * glass.lensIconBend,
      rimOut: 0,
      topBend: lerp(
        1,
        motion.tapLanding.iconBend,
        Math.max(dripShape.get(), glideBend.get() * motion.switchTravel.topBend),
      ),
      topDepth: lerp(
        1,
        motion.tapLanding.iconDepth,
        Math.max(dripShape.get() * dripShape.get(), glideBend.get() * motion.switchTravel.topBend),
      ),
      rimPrism: glass.lensIconPrism * lensOut.get(),
    };
  });

  const lensSideProps = useAnimatedProps(() => {
    const position = lensPosition.get();
    const geometry = lensGeometry.get();
    const restWidth = layout.bubbleRestWidth;
    const lensCenter = inlinePad + restWidth / 2 + geometry.translateX;
    const gapMiddle = lerp(
      barWidth.get() + layout.tabBarGap / 2,
      barWidth.get() + layout.tabBarGap + motion.meltReach,
      lerp(motion.endMelt, 1, push.get()),
    );
    const sampleMaxX = (gapMiddle - lensCenter) / Math.max(geometry.scaleX, 0.01) + restWidth / 2 + glass.lensPad;
    const pinchScale =
      lerp(1, motion.tapSlide.pinch, slideShape.get()) *
      switchOptics.get() *
      lerp(1, glass.lensGlidePinch[scheme], glide.get());
    const reveal = lensOut.get();
    const optics = lensOptics.get();
    const tint = interpolateColor(
      reveal,
      [0, 1],
      [
        color.lensTintEarly,
        interpolateColor(holding.get() * (1 - tapSlide.get()), [0, 1], [color.lensTint, color.lensHeldTint]),
      ],
    );
    return {
      ...optics,
      dispersion: optics.dispersion * lerp(1, glass.lensHeldDispersion[scheme], holding.get()),
      edgeSharp: lerp(glass.lensEdgeShade[scheme], glass.lensHeldEdge[scheme], holding.get()),
      sampleMaxX: Math.max(sampleMaxX, 1),
      pinch: glass.lensPinch * (1 - deflate.get()) * pinchScale * reveal,
      pinchLeft: glass.lensPinch * clamp01(1 - position / glass.lensPinchEndReach) * pinchScale * reveal,
      pinchRight: glass.lensPinch * clamp01(1 - (lastIndex - position) / glass.lensPinchEndReach) * pinchScale * reveal,
      specular: glass.lensSpecular * reveal,
      rim: interpolateColor(
        reveal,
        [0, 1],
        [color.lensRimEarly, interpolateColor(holding.get(), [0, 1], [color.lensRim, color.lensHeldRim])],
      ),
      rimPrism: glass.lensRimPrism[scheme] * reveal,
      topBend: lerp(1, motion.tapLanding.iconBend, glideBend.get() * motion.switchTravel.topBend),
      topDepth: lerp(1, motion.tapLanding.iconDepth, glideBend.get() * motion.switchTravel.topBend),
      edgeAxis: holding.get(),
      rimWidth: lerp(glass.lensRimWidth[scheme], glass.lensHeldRimWidth[scheme], holding.get()),
      prismAxis: holding.get(),
      prismShift: glass.lensHeldPrismShift[scheme] * holding.get(),
      pinchSpread: lerp(glass.lensPinchSpread, glass.lensHeldPinchSpread[scheme], holding.get()),
      shadow: interpolateColor(reveal, [0, 1], [color.lensTintEarly, color.lensShadow]),
      tint,
    };
  });

  const lensFillStyle = useAnimatedStyle(() => {
    const { side, round, lead } = wallFlat.get();
    const full = lensFullHeight / 2;
    const left = full * (side < 0 ? round : side > 0 ? lead : 1);
    const right = full * (side > 0 ? round : side < 0 ? lead : 1);
    return {
      backgroundColor: interpolateColor(1 - grey.get(), [0, 1], [color.lens, color.lensActive]),
      borderTopLeftRadius: left,
      borderBottomLeftRadius: left,
      borderTopRightRadius: right,
      borderBottomRightRadius: right,
    };
  });

  return (
    <Animated.View
      style={[styles.bar, { bottom, left: barLeft, width: barSpan }, barLiftStyle]}
      pointerEvents="box-none">
      <NativeGlassBackdrop group={tabBarGroup} style={styles.backdrop}>
        <AnimatedNativeGlassView
          style={styles.barGlass}
          pointerEvents="none"
          animatedProps={barGlassProps}
          {...glassStyle}
          sampleBackdrop
          onBackdropLuma={onBackdropLuma}
        />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.frame, pillModeStyle]}
            pointerEvents={searchFocused ? 'none' : 'auto'}
            onLayout={onPillLayout}>
            <Animated.View
              pointerEvents="none"
              style={[styles.pillLift, { backgroundColor: color.pressLift }, pillLiftStyle]}
            />
            <Animated.View pointerEvents="none" style={[styles.lens, lensStyle]}>
              <Animated.View style={[styles.lensLayer, lensFillStyle]} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        {searchTab ? (
          <Animated.View style={[styles.search, searchSpreadStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={searchFocused ? closeSearch : openSearch}
              onPressIn={searchPress.onPressIn}
              onPressOut={searchPress.onPressOut}
              accessibilityRole="tab"
              accessibilityLabel={searchFocused ? 'Close search' : searchTab.label}
              accessibilityState={{ selected: searchFocused }}>
              <Animated.View style={[StyleSheet.absoluteFill, searchContentStyle]}>
                <Animated.View style={[styles.pressFill, { backgroundColor: color.pressFill }, searchFillStyle]} />
                <Animated.View style={[styles.searchIcon, searchInkStyle]}>
                  <Animated.View style={[styles.searchIcon, searchGlyphStyle]}>
                    <TabIcon icon={searchTab.icon} selected={false} size={layout.searchIconSize} color={color.text} />
                  </Animated.View>
                  <Animated.View style={[styles.searchIcon, closeGlyphStyle]}>
                    <CloseGlyph size={layout.closeIconSize} color={color.text} />
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : null}
      </NativeGlassBackdrop>
      <Animated.View
        pointerEvents="none"
        style={[styles.lensOverlay, !hasSearch && styles.lensOverlayFull, pillModeStyle, pressScaleStyle]}>
        <Animated.View style={[styles.rowClip, rowClipStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, rowUnclipStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, rowFitStyle]}>
              <AnimatedNativeGlassBlur style={styles.row} animatedProps={rowBlurProps} accessibilityRole="tablist">
                {tabs.map((tab, index) => (
                  <TabItem
                    key={tab.name}
                    tab={tab}
                    index={index}
                    middleIndex={middleIndex}
                    tintColor={tintColor}
                    selected={index === focusedIndex}
                    lensPosition={lensPosition}
                    lift={lift}
                    shine={shine}
                    presence={lensPresence}
                    cover={iconCover}
                    covered={coveredIcons}
                    collapsed={collapsed}
                    collapseX={collapseX}
                    collapseSpread={collapseSpread}
                    inkTone={inkTone}
                    handoff={index === backIndex ? searchMode : undefined}
                    onActivate={selectTab}
                  />
                ))}
              </AnimatedNativeGlassBlur>
            </Animated.View>
          </Animated.View>
        </Animated.View>
        <NativeGlassBackdrop
          group={revealGroup}
          offscreen
          style={StyleSheet.absoluteFill}
          importantForAccessibility="no-hide-descendants">
          <View style={styles.row}>
            {tabs.map((tab, index) => (
              <TabItem
                key={tab.name}
                tab={tab}
                index={index}
                middleIndex={middleIndex}
                tintColor={tintColor}
                selected={index === focusedIndex}
                lensPosition={lensPosition}
                lift={lift}
                shine={shine}
                presence={lensPresence}
                cover={iconCover}
                covered={coveredIcons}
                collapsed={collapsed}
                collapseX={collapseX}
                collapseSpread={collapseSpread}
                inkTone={inkTone}
                revealed
                onActivate={selectTab}
              />
            ))}
          </View>
        </NativeGlassBackdrop>
        <Animated.View style={[styles.lens, lensGlassStyle]}>
          <AnimatedNativeGlassView
            style={styles.lensGlass}
            animatedProps={lensSideProps}
            rimOutBand={glass.lensRimOut.band}
            group={tabBarGroup}
            underlay={screenGroup}
            inset={glass.lensPad}
            refractionYScale={glass.lensRefractionYScale}
            cornerRadius={lensFullHeight / 2}
            blurRadius={glass.lensBlurRadius}
            bezel={glass.lensBezel}
            refraction={glass.lensRefraction}
            falloff={glass.lensFalloff}
            dispersion={glass.lensDispersion}
            magnify={glass.lensMagnify}
            pinchWidth={glass.lensPinchWidth}
            sharpWidth={glass.lensShadeWidth}
            lightAngle={glass.lightAngle}
            rimSide={glass.lensRimSide[scheme]}
            shadowRadius={glass.lensShadowRadius}
            shadowOffset={glass.lensShadowOffset}
          />
        </Animated.View>
        <Animated.View style={[styles.lens, lensIconStyle]}>
          <AnimatedNativeGlassView
            style={styles.lensGlass}
            animatedProps={lensIconProps}
            rimOutBand={glass.lensRimOut.band}
            group={revealGroup}
            alphaPass
            inset={glass.lensPad}
            refractionYScale={glass.lensRefractionYScale}
            cornerRadius={lensFullHeight / 2}
            blurRadius={glass.lensBlurRadius}
            bezel={glass.lensBezel}
            refraction={glass.lensRefraction}
            falloff={glass.lensFalloff}
            dispersion={glass.lensDispersion}
            magnify={glass.lensMagnify}
          />
        </Animated.View>
        {hasBadges ? (
          <Animated.View
            style={[styles.rowClip, rowClipStyle]}
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants">
            <Animated.View style={[StyleSheet.absoluteFill, rowUnclipStyle]}>
              <Animated.View style={[StyleSheet.absoluteFill, rowFitStyle]}>
                <View style={styles.row}>
                  {tabs.map((tab, index) => (
                    <TabItem
                      key={tab.name}
                      tab={tab}
                      index={index}
                      middleIndex={middleIndex}
                      tintColor={tintColor}
                      selected={index === focusedIndex}
                      lensPosition={lensPosition}
                      lift={lift}
                      shine={shine}
                      presence={lensPresence}
                      cover={iconCover}
                      covered={coveredIcons}
                      collapsed={collapsed}
                      collapseX={collapseX}
                      collapseSpread={collapseSpread}
                      inkTone={inkTone}
                      handoff={index === backIndex ? searchMode : undefined}
                      badgeOnly
                      badgeColor={badgeColor}
                      badgeTextColor={badgeTextColor}
                      onActivate={selectTab}
                    />
                  ))}
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>
      {searchTab ? (
        <SearchMode
          active={searchFocused}
          mode={searchMode}
          backTab={tabs[backIndex]}
          searchTab={searchTab}
          tintColor={tintColor}
          badgeColor={badgeColor}
          badgeTextColor={badgeTextColor}
          backPress={backPress}
          travel={{
            index: backIndex,
            slotWidth: fullItemWidth,
            width: barWidth,
            circle: searchCenter,
            press: searchPress.press,
            target: modeTarget,
            fit: rowFit,
          }}
          onBack={backSearch}
          backDrag={backDrag}
          keyboard={searchRaise}
          spread={keyboardSpread}
          reach={keyboardReach}
          sink={tileSink}
          dip={searchDip}
        />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
  },
  backdrop: {
    flexDirection: 'row',
    gap: layout.tabBarGap,
  },
  rowClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: fullHeight / 2,
  },
  lensOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: fullHeight + layout.tabBarGap,
    height: fullHeight,
  },
  lensOverlayFull: {
    right: 0,
  },
  barGlass: {
    position: 'absolute',
    top: -glass.pad,
    left: -glass.pad,
    right: -glass.pad,
    bottom: -glass.pad,
  },
  frame: {
    flex: 1,
    height: fullHeight,
  },
  search: {
    width: fullHeight,
    height: fullHeight,
  },
  pressFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: fullHeight / 2,
  },
  pillLift: {
    ...StyleSheet.absoluteFill,
    borderRadius: fullHeight / 2,
  },
  searchIcon: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    position: 'absolute',
    top: rowInset,
    left: inlinePad,
    width: layout.bubbleRestWidth,
    height: lensFullHeight,
  },
  lensGlass: {
    position: 'absolute',
    top: -glass.lensPad,
    left: -glass.lensPad,
    right: -glass.lensPad,
    bottom: -glass.lensPad,
  },
  lensLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: lensFullHeight / 2,
    overflow: 'hidden',
  },
  row: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    paddingVertical: rowInset,
    paddingHorizontal: inlinePad,
  },
  slot: {
    flex: 1,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: layout.tabIconSize,
    height: layout.tabIconSize,
  },
  labelBox: {
    alignSelf: 'stretch',
    height: layout.tabLabelHeight,
  },
  label: {
    fontSize: layout.tabLabelSize,
    fontWeight: '500',
    textAlign: 'center',
  },
  legible: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: layout.legibilityShadowRadius,
  },
  labelOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
