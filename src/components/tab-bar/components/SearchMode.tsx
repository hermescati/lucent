import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GestureDetector, useManualGesture, type PanGesture } from 'react-native-gesture-handler';
import { KeyboardEvents } from 'react-native-keyboard-controller';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { ClearButton } from './ClearButton';
import { TabBadge } from './TabBadge';
import { TabIcon } from './TabIcon';
import { AnimatedNativeGlassBlur } from '../../../core/glass/NativeGlass';
import { useClearButton } from '../../../core/search/clearFade';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { space, typography } from '../../../theme/tokens';
import { useSearchHost } from '../context/search';
import { mirrored } from '../helpers/mirror';
import type { SlotPlan } from '../helpers/slots';
import type { TabSpec } from '../helpers/triggers';
import type { GlassPress, useGlassPress } from '../hooks/useGlassPress';
import { clearButton, layout, motion, placeholderBlend, searchFieldText } from '../tokens';

const fullHeight = layout.tabBarHeight;
const modeHeight = layout.searchModeHeight;
const modeInset = (fullHeight - modeHeight) / 2;
const backCenter = modeInset + modeHeight / 2;
const glyphCenter =
  modeInset + modeHeight + layout.searchModeGap + layout.searchFieldInset + layout.searchFieldIconSize / 2;
const glyphFromScale = layout.searchIconSize / layout.searchFieldIconSize;
const textFrom = -(layout.searchFieldIconSize + space[4]);
const fieldLeft = modeInset + modeHeight + layout.searchModeGap;
const fieldRight = modeInset + modeHeight + layout.searchModeGap;

const clamp01 = (value: number) => {
  'worklet';
  return Math.min(1, Math.max(0, value));
};

const lerp = (from: number, to: number, t: number) => {
  'worklet';
  return from + (to - from) * t;
};

interface Props {
  active: boolean;
  mode: SharedValue<number>;
  backTab: TabSpec;
  searchTab: TabSpec;
  tintColor?: string;
  badgeColor?: string;
  badgeTextColor?: string;
  backPress: ReturnType<typeof useGlassPress>;
  travel: {
    index: number;
    slots: SharedValue<SlotPlan>;
    width: SharedValue<number>;
    circle: SharedValue<number>;
    press: SharedValue<number>;
    target: SharedValue<number>;
    fit: SharedValue<{ scale: number; x: number; y: number }>;
  };
  onBack: () => void;
  // 1 once the ref's `cancelSearch` has left search inactive on its tab, the close button folded into the field's end.
  idle: SharedValue<number>;
  // The ref's `cancelSearch` while search is up.
  onCancel: () => void;
  // The field taken up again while inactive.
  onWake: () => void;
  // The field's glass under a finger on its clear button.
  fieldPress: GlassPress;
  backDrag: PanGesture;
  keyboard: SharedValue<number>;
  spread: SharedValue<number>;
  reach: number;
  sink: SharedValue<number>;
  dip: SharedValue<number>;
}

export const SearchMode = ({
  active,
  mode,
  backTab,
  searchTab,
  tintColor,
  badgeColor,
  badgeTextColor,
  backPress,
  travel,
  onBack,
  idle,
  onCancel,
  onWake,
  fieldPress,
  backDrag,
  keyboard,
  spread,
  reach,
  sink,
  dip,
}: Props) => {
  const { color, scheme } = useLucentTheme(tintColor);
  const iconDim = motion.pressIconDim[scheme];
  const { query, setQuery, props: searchProps, emit, attach } = useSearchHost();
  const placeholder = searchProps.placeholder ?? '';
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const clearQuery = () => {
    setQuery('');
    input.current?.focus();
  };
  // Always there, so the text's room doesn't change: iOS fades it in and out. Held, it swells the field.
  const clear = useClearButton(Boolean(query), {
    onClear: clearQuery,
    onPressIn: () => {
      'worklet';
      fieldPress.onPressIn();
    },
    onPressOut: fieldPress.onPressOut,
    hitSlop: clearButton.hitSlop,
  });
  // Touched in its text, the field swells a little less than under its clear button (iOS 27 simulator). The text box
  // takes the touch itself, so this only watches it, on the UI thread, so the swell starts with the touch.
  const fieldTouch = useManualGesture({
    onTouchesDown: () => {
      'worklet';
      fieldPress.onPressIn(motion.fieldTapPeak);
    },
    onTouchesUp: () => {
      'worklet';
      fieldPress.onPressOut();
    },
    onTouchesCancel: () => {
      'worklet';
      fieldPress.onPressOut();
    },
  });
  const [keyboardUp, setKeyboardUp] = useState(false);
  const wide = useDerivedValue(() => clamp01(keyboard.get()));

  useEffect(() => {
    const subscriptions = [
      KeyboardEvents.addListener('keyboardWillShow', () => setKeyboardUp(true)),
      KeyboardEvents.addListener('keyboardWillHide', () => setKeyboardUp(false)),
      KeyboardEvents.addListener('keyboardDidHide', () => setKeyboardUp(false)),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  useEffect(
    () =>
      attach({
        focus: active ? () => input.current?.focus() : undefined,
        blur: () => input.current?.blur(),
        cancel: active
          ? onCancel
          : () => {
              setQuery('');
              input.current?.blur();
            },
      }),
    [active, attach, setQuery, onCancel],
  );

  useEffect(() => {
    if (!active) {
      input.current?.blur();
      return;
    }
    if (!searchTab.automaticallyActivatesSearch) {
      return;
    }
    const timer = setTimeout(() => input.current?.focus(), motion.searchKeyboard.focusDelay);
    return () => clearTimeout(timer);
  }, [active, searchTab.automaticallyActivatesSearch]);

  const { index: travelIndex, slots, width: barWidth, circle, press: travelPress, target, fit: rowFit } = travel;
  const backStyle = useAnimatedStyle(() => ({
    opacity: (mode.get() > motion.backTravel.handoff ? 1 : 0) * (1 - wide.get()),
    transform: [{ translateY: sink.get() }, { scale: 1 + backPress.press.get() * motion.pressGrow }],
  }));
  const backOutlineStyle = useAnimatedStyle(() => ({
    opacity: target.get() === 0 ? 0 : 1,
  }));
  const backFilledStyle = useAnimatedStyle(() => ({
    opacity: target.get() === 0 ? 1 : 0,
  }));
  const backFillStyle = useAnimatedStyle(() => ({
    opacity: target.get() === 0 ? 0 : backPress.press.get(),
  }));
  const backInkStyle = useAnimatedStyle(() => {
    const away = 1 - clamp01(mode.get());
    const fit = rowFit.get();
    const settled = 1 - away;
    const width = Math.max(barWidth.get(), 1);
    const slot = slots.get().centers[travelIndex] ?? 0;
    const ride = modeInset * settled + (lerp(width, modeHeight, settled) / width) * slot;
    const rideEnd = modeInset + (modeHeight / width) * slot;
    const fromX = ride - backCenter - (rideEnd - backCenter) * settled;
    const fromY = fit.y + fit.scale * (fullHeight - layout.tabLabelHeight) * 0.5 - backCenter;
    return {
      opacity: 1 - backPress.press.get() * iconDim,
      transform: [{ translateX: fromX }, { translateY: fromY * away }],
    };
  });
  const wideShift = modeHeight + layout.searchModeGap + reach;
  const fieldStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (circle.get() - glyphCenter) * (1 - clamp01(mode.get())) -
          (modeHeight + layout.searchModeGap) * clamp01(keyboard.get()) * clamp01(mode.get()) -
          spread.get() +
          wideShift * wide.get(),
      },
      { translateY: dip.get() },
      { scale: 1 + fieldPress.press.get() * motion.fieldPressGrow * clamp01(mode.get()) },
    ],
    left: fieldLeft - wideShift * wide.get(),
    // Inactive, the field reaches over where the close button was.
    right: fieldRight - reach * wide.get() - (modeHeight + layout.searchModeGap) * idle.get(),
  }));
  const glyphStyle = useAnimatedStyle(() => ({
    opacity: mode.get() > motion.backTravel.handoff ? 1 : 0,
    transform: [
      {
        scale: 1 + (glyphFromScale * (1 + travelPress.get() * motion.pressGrow) - 1) * (1 - clamp01(mode.get())),
      },
    ],
  }));
  const glyphAccentStyle = useAnimatedStyle(() => ({
    opacity: target.get() === 1 ? 1 - clamp01(mode.get() * motion.searchTabs.pressFade) : 0,
  }));
  const textStyle = useAnimatedStyle(() => ({
    // Flipped back with the text (textMirrored), so reversed to slide the bar's way.
    transform: [{ translateX: (mirrored ? -textFrom : textFrom) * (1 - clamp01(mode.get())) }],
    opacity:
      mode.get() >= motion.backTravel.settle
        ? 0
        : target.get() === 1
          ? clamp01(mode.get() * motion.backTravel.textRate - motion.backTravel.textDelay)
          : clamp01((mode.get() - motion.searchClose.fadeFrom) / (1 - motion.searchClose.fadeFrom)),
  }));
  const inputStyle = useAnimatedStyle(() => ({
    opacity: mode.get() >= motion.backTravel.settle ? 1 : 0,
  }));
  const textBlurProps = useAnimatedProps(() => ({
    radius: (1 - clamp01(mode.get())) * motion.searchTabs.textBlur,
  }));

  const goBack = () => {
    Keyboard.dismiss();
    onBack();
  };

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={active ? 'box-none' : 'none'}
      // Closed, its back button and field are out of sight, and out of TalkBack's reach.
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}>
      <GestureDetector gesture={backDrag}>
        <Pressable
          style={styles.back}
          pointerEvents={keyboardUp ? 'none' : 'auto'}
          onPress={goBack}
          onPressIn={() => backPress.onPressIn()}
          onPressOut={backPress.onPressOut}
          accessibilityRole="button"
          accessibilityLabel={backTab.label}>
          <Animated.View style={[StyleSheet.absoluteFill, backStyle]}>
            <Animated.View style={[styles.fill, { backgroundColor: color.pressFill }, backFillStyle]} />
            <Animated.View style={[styles.center, backInkStyle]}>
              <Animated.View style={backOutlineStyle}>
                <TabIcon icon={backTab.icon} selected={false} size={layout.tabIconSize} color={color.text} />
              </Animated.View>
              <Animated.View style={[StyleSheet.absoluteFill, styles.center, backFilledStyle]}>
                <TabIcon icon={backTab.icon} selected size={layout.tabIconSize} color={color.tint} />
              </Animated.View>
              {backTab.badge !== undefined ? (
                <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
                  <View style={styles.iconBox}>
                    <TabBadge
                      text={backTab.badge}
                      color={badgeColor ?? color.badge}
                      textColor={badgeTextColor ?? color.badgeText}
                      offsetX={layout.backBadgeOffsetX}
                      rise={layout.backBadgeRise}
                    />
                  </View>
                </View>
              ) : null}
            </Animated.View>
          </Animated.View>
        </Pressable>
      </GestureDetector>
      <Animated.View style={[styles.field, fieldStyle]}>
        <Animated.View style={glyphStyle}>
          <TabIcon icon={searchTab.icon} selected={false} size={layout.searchFieldIconSize} color={color.text} />
          <Animated.View style={[StyleSheet.absoluteFill, glyphAccentStyle]}>
            <TabIcon icon={searchTab.icon} selected={false} size={layout.searchFieldIconSize} color={color.tint} />
          </Animated.View>
        </Animated.View>
        <GestureDetector gesture={fieldTouch}>
          <View style={[styles.text, mirrored && styles.textMirrored]}>
            <Animated.View style={[styles.layer, inputStyle]}>
              <TextInput
                ref={input}
                style={[styles.input, searchFieldText[scheme], mirrored && styles.inputMirrored, { color: color.text }]}
                value={query}
                onChangeText={setQuery}
                placeholder={placeholder}
                placeholderTextColor="transparent"
                selectionColor={searchProps.tintColor ?? color.tint}
                cursorColor={searchProps.tintColor ?? color.tint}
                autoCapitalize={searchProps.autoCapitalize === 'systemDefault' ? undefined : searchProps.autoCapitalize}
                onFocus={() => {
                  onWake();
                  emit('onFocus');
                }}
                onBlur={() => emit('onBlur')}
                onSubmitEditing={() => emit('onSearchButtonPress')}
                returnKeyType="search"
                autoCorrect={false}
                numberOfLines={1}
                maxFontSizeMultiplier={layout.searchFieldTextScaleMax}
              />
              {query ? null : (
                <View pointerEvents="none" style={[styles.layer, { mixBlendMode: placeholderBlend[scheme] }]}>
                  <Text
                    style={[
                      styles.input,
                      searchFieldText[scheme],
                      mirrored && styles.inputMirrored,
                      { color: color.placeholderActive },
                    ]}
                    numberOfLines={1}
                    maxFontSizeMultiplier={layout.searchFieldTextScaleMax}>
                    {placeholder}
                  </Text>
                </View>
              )}
            </Animated.View>
            <AnimatedNativeGlassBlur
              style={[styles.layer, textStyle]}
              animatedProps={textBlurProps}
              pointerEvents="none">
              <Text
                style={[
                  styles.input,
                  searchFieldText[scheme],
                  mirrored && styles.inputMirrored,
                  { color: query ? color.text : color.placeholder },
                ]}
                numberOfLines={1}
                maxFontSizeMultiplier={layout.searchFieldTextScaleMax}>
                {query || placeholder}
              </Text>
            </AnimatedNativeGlassBlur>
          </View>
        </GestureDetector>
        <ClearButton
          color={color.clearButton}
          gesture={clear.gesture}
          dimStyle={clear.dimStyle}
          fadeStyle={clear.fadeStyle}
          shown={Boolean(query)}
          onClear={clearQuery}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  back: {
    position: 'absolute',
    left: modeInset,
    top: modeInset,
    width: modeHeight,
    height: modeHeight,
  },
  field: {
    position: 'absolute',
    left: fieldLeft,
    right: fieldRight,
    top: modeInset,
    height: modeHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[4],
    paddingHorizontal: layout.searchFieldInset,
  },
  fill: {
    ...StyleSheet.absoluteFill,
    borderRadius: modeHeight / 2,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox: {
    width: layout.tabIconSize,
    height: layout.tabIconSize,
  },
  text: {
    flex: 1,
    alignSelf: 'stretch',
  },
  // In the mirrored bar (helpers/mirror), the text flipped back, and set right to left.
  textMirrored: {
    transform: [{ scaleX: -1 }],
    direction: 'rtl',
  },
  // From the reading side, whatever the text, as iOS's field aligns in a right-to-left language.
  inputMirrored: {
    textAlign: 'right',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'center',
  },
  input: {
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
    paddingHorizontal: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
