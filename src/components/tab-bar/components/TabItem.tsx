import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type EntryExitAnimationFunction,
  type SharedValue,
} from 'react-native-reanimated';

import { TabBadge } from './TabBadge';
import { TabIcon } from './TabIcon';
import { barItemMotion } from '../../../core/motion/island';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { clamp01, labelShift, lerp } from '../helpers/bar';
import { tabExit, tabSlide } from '../helpers/presence';
import type { TabSpec } from '../helpers/triggers';
import { layout, motion } from '../tokens';

export interface TabItemProps {
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
  // How far each tab draws in toward the bar's middle as it minimizes.
  collapseSpread: SharedValue<number[]>;
  // Its place in the row, as iOS 27 spaces the tabs (helpers/slots).
  slotStyle?: StyleProp<ViewStyle>;
  handoff?: SharedValue<number>;
  revealed?: boolean;
  badgeOnly?: boolean;
  badgeColor?: string;
  badgeTextColor?: string;
  inkTone: SharedValue<number>;
  // The bar's swell as a tab comes or goes: its glyphs swell with it, as an island's do.
  swell?: SharedValue<number>;
  // How it grows in as it's added to the bar.
  entering?: EntryExitAnimationFunction;
  onActivate: (index: number) => void;
}

export const TabItem = ({
  tab,
  index,
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
  slotStyle,
  swell,
  entering,
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
        translateX: collapseX.get() + (collapseSpread.get()[index] ?? 0),
      },
      { translateY: collapsed.get() * labelShift },
      {
        scale:
          (1 + lift.get() * proximity.get() * motion.itemMagnify) *
          (1 + barItemMotion.glyphSwell * (swell?.get() ?? 0)),
      },
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
      <Animated.View
        style={[styles.slot, slotStyle]}
        pointerEvents="none"
        entering={entering}
        exiting={tabExit}
        layout={tabSlide}>
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
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[styles.slot, slotStyle]}
      entering={entering}
      exiting={tabExit}
      layout={tabSlide}
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
            numberOfLines={1}
            allowFontScaling={false}>
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
            numberOfLines={1}
            allowFontScaling={false}>
            {tab.label}
          </Animated.Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
