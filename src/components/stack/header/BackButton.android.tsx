import { useLayoutEffect, useRef, useState, type ComponentRef } from 'react';
import { I18nManager, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { BarCapsule, resize } from './BarCapsule.android';
import { Chevron } from './Chevron';
import { useBarType } from './barType.android';
import { useOpenMenu } from '../menu/Menu.android';
import type { MenuTree } from '../menu/items';
import { backButton, barItem, barItemMotion } from '../tokens';

interface Props {
  label?: string;
  // iOS's `backButtonDisplayMode`: the previous title, or the chevron alone. iOS 27 draws `generic` as the chevron alone
  // too, as `minimal` (simulator), rather than "Back".
  displayMode?: 'default' | 'generic' | 'minimal';
  // How wide the button may be, beside the bar's title and other items; the label goes to fit, as UIKit's does.
  room?: number;
  color: string;
  onPress: () => void;
  // The screens further back, for the menu a long press opens, as `headerBackButtonMenuEnabled` asks.
  // TODO: the long press opens Lucent's menu, which isn't iOS's pull-down menu yet; revisit once that component is
  // finished.
  history?: MenuTree;
}

// The capsule's width around a label this wide.
const capsuleFor = (labelWidth: number) =>
  backButton.leading + backButton.chevronWidth + backButton.gap + labelWidth + backButton.trailing;

/**
 * iOS 26's back button: a glass capsule with the chevron and the previous screen's title, or a circle with the chevron.
 * As UIKit does, it never cuts the title short: a title that doesn't fit gives way to "Back", and that to the chevron.
 * Its label coming or going, the capsule opens or closes about it as the bar's island does as an item shows or hides.
 */
export const BackButton = ({ label, displayMode = 'default', color, onPress, history, room }: Props) => {
  const [widths, setWidths] = useState({ label: 0, back: 0 });
  const measure = (key: keyof typeof widths) => (event: LayoutChangeEvent) => {
    const value = event.nativeEvent.layout.width;
    setWidths((current) => (current[key] === value ? current : { ...current, [key]: value }));
  };
  const fits = (width: number) => room === undefined || capsuleFor(width) <= room;
  const text =
    displayMode !== 'default' || !label
      ? undefined
      : fits(widths.label)
        ? label
        : fits(widths.back)
          ? 'Back'
          : undefined;
  // The label last shown, kept while it goes.
  const [shownText, setShownText] = useState(text);
  if (text !== undefined && text !== shownText) setShownText(text);
  const openMenu = useOpenMenu();
  const type = useBarType();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const onLongPress =
    history && openMenu
      ? () => ref.current?.measureInWindow((x, y, width, height) => openMenu(history, { x, y, width, height }))
      : undefined;

  const labelled = text !== undefined;
  const target = labelled ? capsuleFor(text === label ? widths.label : widths.back) : barItem.icon;
  const fromWidth = useSharedValue(target);
  const toWidth = useSharedValue(target);
  const progress = useSharedValue(1);
  const shown = useSharedValue(labelled ? 1 : 0);
  const swell = useSharedValue(0);
  const was = useRef(labelled);
  useLayoutEffect(() => {
    const now = fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get();
    fromWidth.set(now);
    toWidth.set(target);
    if (was.current === labelled) {
      // The same label, measured again or swapped for "Back": no show, it just takes its width.
      if (progress.get() >= 1) fromWidth.set(target);
      return;
    }
    was.current = labelled;
    const { show, hide } = barItemMotion;
    const { swellUp, swellDown } = labelled ? show : hide;
    progress.set(0);
    progress.set(resize(labelled));
    swell.set(
      withSequence(
        withTiming(1, { duration: swellUp, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: swellDown, easing: Easing.inOut(Easing.quad) }),
      ),
    );
    shown.set(
      labelled
        ? withDelay(show.glyphDelay, withTiming(1, { duration: show.glyph }))
        : withTiming(0, { duration: hide.glyph }),
    );
  }, [target, labelled, fromWidth, toWidth, progress, shown, swell]);
  const bodyStyle = useAnimatedStyle(() => {
    const width = fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get();
    return { width: Math.max(width, 0) };
  });
  // The chevron moves from the circle's middle to its place before a label. Inside the press, so all of the circle takes
  // a tap, its padding too.
  const inset = useAnimatedStyle(() => {
    const alone = (barItem.icon - backButton.chevronWidth) / 2 - backButton.aloneShift;
    return { paddingStart: alone + (backButton.leading - alone) * shown.get() };
  });
  const labelStyle = useAnimatedStyle(() => ({
    opacity: shown.get() * shown.get(),
    transform: [{ scale: barItemMotion.leaveScale + (1 - barItemMotion.leaveScale) * shown.get() }],
  }));
  return (
    <BarCapsule swell={swell}>
      <Animated.View style={[styles.body, bodyStyle]}>
        <Pressable
          ref={ref}
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole="button"
          accessibilityLabel={label ? `Back to ${label}` : 'Back'}
          style={styles.press}>
          <Animated.View style={[styles.row, inset]}>
            <Chevron color={color} />
            {shownText !== undefined ? (
              <Animated.Text
                numberOfLines={1}
                allowFontScaling={false}
                importantForAccessibility={labelled ? 'auto' : 'no-hide-descendants'}
                style={[
                  styles.label,
                  type.item,
                  { color, width: Math.ceil(shownText === label ? widths.label : widths.back) + 1 },
                  styles.labelAfter,
                  labelStyle,
                ]}>
                {shownText}
              </Animated.Text>
            ) : null}
          </Animated.View>
        </Pressable>
      </Animated.View>
      {displayMode === 'default' && label ? (
        <View
          pointerEvents="none"
          style={styles.measure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Text allowFontScaling={false} style={[styles.label, type.item]} onLayout={measure('label')}>
            {label}
          </Text>
          <Text allowFontScaling={false} style={[styles.label, type.item]} onLayout={measure('back')}>
            Back
          </Text>
        </View>
      ) : null}
    </BarCapsule>
  );
};

const styles = StyleSheet.create({
  // Clipped, so the label goes as the capsule closes over it. Alone, iOS sits the chevron 1.5pt left of the circle's
  // centre, so it looks centred.
  body: { height: barItem.height, overflow: 'hidden' },
  press: { flex: 1 },
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  // Whole as the capsule closes over it, never cut short.
  labelAfter: { marginStart: backButton.gap, flexShrink: 0, transformOrigin: I18nManager.isRTL ? 'right' : 'left' },
  // The labels at their own widths, unseen, to decide which fits.
  measure: { position: 'absolute', opacity: 0, alignItems: 'flex-start', width: 1000 },
  label: {
    fontSize: barItem.fontSize,
    lineHeight: barItem.lineHeight,
    fontWeight: barItem.labelWeight,
    includeFontPadding: false,
  },
});
