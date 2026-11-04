import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, type ComponentRef } from 'react';
import {
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  interpolate,
  Extrapolation,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cancelSearch } from './SearchBar.android';
import { getSearchInput, setSearchInput, updateSearch, useSearch, type SearchState } from './store.android';
import { useBackClaim } from '../../../core/back/claims';
import { AnimatedNativeGlassBlur } from '../../../core/glass/NativeGlass';
import { useTabsTint } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { systemTint } from '../../../theme/colors';
import { BarCapsule, BarGlassRow, useBarGlassRow } from '../header/BarCapsule.android';
import { meltLook } from '../header/melt.android';
import { bar, barItem, search, searchMotion, toolbar } from '../tokens';
import { useToolbarOffset } from '../toolbar/offset.android';
import type { LucentSearchBarProps } from '../types';

const keyboardTypes: Record<NonNullable<LucentSearchBarProps['inputType']>, KeyboardTypeOptions> = {
  text: 'default',
  phone: 'phone-pad',
  number: 'number-pad',
  email: 'email-address',
};

const colorString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const useFieldColors = (props: LucentSearchBarProps, tint?: string) => {
  const { color, scheme } = useLucentTheme();
  return {
    text: colorString(props.textColor) ?? color.text,
    placeholder: colorString(props.hintTextColor) ?? (scheme === 'dark' ? search.placeholderDark : color.placeholder),
    icon: colorString(props.headerIconColor) ?? color.text,
    clear: color.clearButton,
    // The cross is cut out of the clear button: it shows the field's near-white or near-black.
    clearCross: scheme === 'dark' ? '#000000' : '#FFFFFF',
    // UIKit's search field takes its own tint, or the system's blue: not the app's accent.
    tint: colorString(props.tintColor) ?? tint ?? systemTint[scheme],
  };
};

/** iOS's clear button, `xmark.circle.fill`: a filled circle with a cross cut out of it. */
const ClearGlyph = ({ fill, cross }: { fill: string; cross: string }) => (
  <View style={[styles.clearCircle, { backgroundColor: fill }]}>
    <View style={[styles.clearBar, styles.clearBarDown, { backgroundColor: cross }]} />
    <View style={[styles.clearBar, styles.clearBarUp, { backgroundColor: cross }]} />
  </View>
);

const Magnifier = ({ color, show }: { color: string; show: boolean }) =>
  show ? (
    <SymbolView
      name={{ android: 'search' }}
      size={search.iconSize}
      tintColor={color}
      style={[styles.icon, { left: search.iconCentre - search.iconSize / 2 + search.iconNudge.x }]}
    />
  ) : null;

const focusInput = (routeKey: string) => getSearchInput(routeKey)?.focus();

/** The field's text box, which tells the search bar's handlers what's typed. */
interface SearchInputProps {
  routeKey: string;
  state: SearchState;
  autoFocus?: boolean;
  // The cursor's colour when the search bar doesn't give one, where it isn't the system blue.
  tint?: string;
}

const SearchInput = ({ routeKey, state, autoFocus, tint }: SearchInputProps) => {
  const { props } = state;
  const colors = useFieldColors(props, tint);
  const showIcon = props.shouldShowHintSearchIcon !== false;
  return (
    <>
      <Magnifier color={colors.icon} show={showIcon} />
      <TextInput
        ref={(input) => setSearchInput(routeKey, input)}
        value={state.text}
        autoFocus={autoFocus ?? props.autoFocus}
        placeholder={props.placeholder ?? 'Search'}
        placeholderTextColor={colors.placeholder}
        selectionColor={colors.tint}
        cursorColor={colors.tint}
        autoCapitalize={props.autoCapitalize === 'systemDefault' ? undefined : props.autoCapitalize}
        keyboardType={props.inputType ? keyboardTypes[props.inputType] : undefined}
        returnKeyType="search"
        onChangeText={(text) => {
          updateSearch(routeKey, { text });
          props.onChangeText?.({ nativeEvent: { text } } as never);
        }}
        onFocus={(event) => {
          if (!state.focused) props.onOpen?.();
          updateSearch(routeKey, { focused: true });
          props.onFocus?.(event as never);
        }}
        onBlur={(event) => {
          props.onBlur?.(event as never);
          // Like iOS, an empty field leaves search mode once it lets go of the keyboard; one with text stays.
          if (!state.text) {
            updateSearch(routeKey, { focused: false });
            props.onClose?.();
          }
        }}
        onSubmitEditing={() => props.onSearchButtonPress?.({ nativeEvent: { text: state.text } } as never)}
        style={[styles.input, { left: showIcon ? search.text : search.trailing, color: colors.text }]}
      />
      {state.text ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          hitSlop={8}
          onPress={() => {
            updateSearch(routeKey, { text: '' });
            props.onChangeText?.({ nativeEvent: { text: '' } } as never);
          }}
          style={styles.clear}>
          <ClearGlyph fill={colors.clear} cross={colors.clearCross} />
        </Pressable>
      ) : null}
    </>
  );
};

/** The field's look without a text box: what it shows until it's tapped, in the toolbar or its slot. */
export const SearchDisplay = ({ routeKey }: { routeKey: string }) => {
  const state = useSearch(routeKey);
  if (!state) return null;
  return <SearchDisplayBody routeKey={routeKey} state={state} />;
};

// Where each screen's field sits at rest, across the screen: focused, the field grows from there.
const displayRects = new Map<string, { x: number; width: number }>();

const SearchDisplayBody = ({ routeKey, state }: { routeKey: string; state: SearchState }) => {
  const colors = useFieldColors(state.props);
  const showIcon = state.props.shouldShowHintSearchIcon !== false;
  const ref = useRef<ComponentRef<typeof View>>(null);
  return (
    <Pressable
      ref={ref}
      onLayout={() => ref.current?.measureInWindow((x, _y, width) => displayRects.set(routeKey, { x, width }))}
      accessibilityRole="search"
      accessibilityLabel={state.props.placeholder ?? 'Search'}
      onPress={() => {
        state.props.onOpen?.();
        updateSearch(routeKey, { focused: true });
      }}
      // Focused, the field above the keyboard shows it instead.
      style={[styles.display, state.focused && styles.gone]}>
      <Magnifier color={colors.icon} show={showIcon} />
      <Text
        numberOfLines={1}
        style={[
          styles.input,
          styles.displayText,
          { left: showIcon ? search.text : search.trailing, color: state.text ? colors.text : colors.placeholder },
        ]}>
        {state.text || (state.props.placeholder ?? 'Search')}
      </Text>
    </Pressable>
  );
};

/** The search bar alone at the bottom, where iOS 26 puts it on a screen without a toolbar. */
export const BottomSearch = ({ routeKey }: { routeKey: string }) => {
  const bottom = useToolbarOffset();
  return (
    <View pointerEvents="box-none" style={[styles.bottom, { bottom }]}>
      <BarCapsule height={toolbar.height}>
        <SearchDisplay routeKey={routeKey} />
      </BarCapsule>
    </View>
  );
};

/**
 * The search bar as a button, for `placement: 'integratedButton'`: a glass circle with a magnifier that opens the field,
 * at the bottom as a toolbar's size, or in the navigation bar as a bar item's.
 */
export const SearchButton = ({ routeKey, inBar = false }: { routeKey: string; inBar?: boolean }) => {
  const state = useSearch(routeKey);
  const { color } = useLucentTheme();
  if (!state) return null;
  const size = inBar ? barItem.height : toolbar.height;
  return (
    <BarCapsule height={size}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={state.props.placeholder ?? 'Search'}
        onPress={() => {
          state.props.onOpen?.();
          updateSearch(routeKey, { focused: true });
        }}
        style={[styles.close, { width: size, height: size }]}>
        <SymbolView
          name={{ android: 'search' }}
          size={search.buttonIcon}
          tintColor={colorString(state.props.headerIconColor) ?? color.text}
        />
      </Pressable>
    </BarCapsule>
  );
};

/** The search button alone at the bottom, centred, where iOS 26 puts it on a screen without a toolbar. */
export const BottomSearchButton = ({ routeKey }: { routeKey: string }) => {
  const bottom = useToolbarOffset();
  return (
    <View pointerEvents="box-none" style={[styles.bottom, styles.centred, { bottom }]}>
      <SearchButton routeKey={routeKey} />
    </View>
  );
};

// While search mode is on, Back ends it, as the close button does, rather than leaving the screen.
const useSearchBack = (routeKey: string, active: boolean) => {
  useBackClaim(active);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelSearch(routeKey);
      return true;
    });
    return () => subscription.remove();
  }, [routeKey, active]);
};

const CloseButton = ({
  onPress,
  size = search.focused.close,
  swell,
}: {
  onPress: () => void;
  size?: number;
  swell?: SharedValue<number>;
}) => {
  const { color } = useLucentTheme();
  return (
    <BarCapsule height={size} swell={swell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={onPress}
        style={[styles.close, { width: size, height: size }]}>
        <SymbolView name={{ android: 'close' }} size={search.focused.closeIcon} tintColor={color.text} />
      </Pressable>
    </BarCapsule>
  );
};

type FocusedFrom = 'slot' | 'bottom' | 'button';

interface FocusedSearchProps {
  routeKey: string;
  // What was tapped: the toolbar's slot, the field at the bottom, or the magnifier at the bottom.
  from: FocusedFrom;
  // Open, it plays in; closed, it plays back out, and then says so, to be taken away.
  open: boolean;
  onClosed: () => void;
}

/**
 * Search mode from the bottom, as iOS 27 plays it: the field rides the keyboard up, growing out of what was tapped (the
 * toolbar's capsule, the bottom field or the magnifier's circle) to the screen's width beside a close button, which buds
 * off its end. Closing, a field from the toolbar fades where it is, one from the bottom rides the keyboard back down
 * whole, and the magnifier's shrinks at once to its empty circle, which rides it down.
 */
export const FocusedSearch = ({ routeKey, from, open, onClosed }: FocusedSearchProps) => {
  const state = useSearch(routeKey);
  useSearchBack(routeKey, open);
  if (!state) return null;
  return <FocusedSearchBody routeKey={routeKey} state={state} from={from} open={open} onClosed={onClosed} />;
};

const FocusedSearchBody = ({ routeKey, state, from, open, onClosed }: FocusedSearchProps & { state: SearchState }) => {
  const { width } = useWindowDimensions();
  const rest = useToolbarOffset();
  const keyboard = useReanimatedKeyboardAnimation();
  const tabsTint = useTabsTint();
  const motion = searchMotion.bottom;
  const { margin, close, gap } = search.focused;
  // Where it grows from, and to: the magnifier's circle, or the field as it showed at rest.
  const circle = (width - toolbar.height) / 2;
  const rect = displayRects.get(routeKey);
  const fromLeft = from === 'button' ? circle : (rect?.x ?? toolbar.margin);
  const fromRight = from === 'button' ? circle : rect ? width - rect.x - rect.width : toolbar.margin;
  // Above the keyboard it takes nearly the screen's width; with the keyboard down (searched, or a hardware one), it
  // keeps the toolbar's margins, as iOS's does.
  const side = useDerivedValue(() => toolbar.margin + (margin - toolbar.margin) * keyboard.progress.get());
  // The magnifier and text keep the focused field's layout, the magnifier centred in the circle.
  const shift = from === 'button' ? toolbar.height / 2 - search.iconCentre : 0;

  const clock = useSharedValue(0);
  const collapse = useSharedValue(0);
  const fade = useSharedValue(1);
  const closeFade = useSharedValue(1);
  const pinned = useSharedValue(-1);
  const settled = useSharedValue(0);
  useEffect(() => {
    if (open) {
      clock.set(withDelay(motion.fallback, withTiming(1, { duration: motion.fallbackOver })));
      return;
    }
    clock.set(0);
    settled.set(withTiming(1, { duration: motion.closeOut }));
    if (from === 'button') collapse.set(withTiming(1, { duration: motion.collapse }));
    if (from === 'slot') {
      pinned.set(Math.max(rest, -keyboard.height.get() + toolbar.aboveKeyboard));
      fade.set(withTiming(0, { duration: motion.fieldOut }));
      closeFade.set(withTiming(0, { duration: motion.closeOut }));
    }
  }, [open, from, rest, motion, clock, collapse, fade, closeFade, pinned, settled, keyboard.height]);
  // Taken away once the keyboard's down and it has played out.
  useAnimatedReaction(
    () => !open && settled.get() === 1 && keyboard.progress.get() < 0.02,
    (done, was) => {
      if (done && !was) scheduleOnRN(onClosed);
    },
  );

  // How far the keyboard has come up, or the clock without one.
  const way = useDerivedValue(() => (open ? Math.max(keyboard.progress.get(), clock.get()) : keyboard.progress.get()));
  const grow = useDerivedValue(
    () => interpolate(way.get(), motion.grow, [0, 1], Extrapolation.CLAMP) * (1 - collapse.get()),
  );
  const bud = useDerivedValue(() => interpolate(way.get(), motion.bud, [0, 1], Extrapolation.CLAMP));
  const bottom = useDerivedValue(() =>
    pinned.get() >= 0 ? pinned.get() : Math.max(rest, -keyboard.height.get() + toolbar.aboveKeyboard),
  );
  const fieldStyle = useAnimatedStyle(() => ({
    bottom: bottom.get(),
    left: fromLeft + (side.get() - fromLeft) * grow.get(),
    right: fromRight + (side.get() + close + gap - fromRight) * grow.get(),
    opacity: fade.get(),
  }));
  const contentStyle = useAnimatedStyle(() => ({
    // The focused field's width throughout, so the text box is never a sliver: focused as one, Android lets it go.
    width: width - side.get() * 2 - close - gap,
    opacity: from === 'button' ? grow.get() : 1,
    transform: [{ translateX: shift * (1 - grow.get()) }],
  }));
  // In the toolbar's slot, the field is the toolbar's glass until its other items have gone.
  const glass = useDerivedValue(() =>
    from === 'slot' ? interpolate(way.get(), motion.melt, [0, 1], Extrapolation.CLAMP) : 1,
  );
  const closeLook = useDerivedValue(() => meltLook(1 - Math.min(bud.get(), closeFade.get())));
  const closeStyle = useAnimatedStyle(() => ({
    bottom: bottom.get(),
    right: side.get(),
    opacity: closeLook.get().opacity,
    transform: [{ scale: closeLook.get().scale }],
  }));
  const closeBlur = useAnimatedProps(() => ({ radius: closeLook.get().blur }));

  return (
    <>
      <Animated.View pointerEvents={open ? 'box-none' : 'none'} style={[styles.focusedField, fieldStyle]}>
        <BarCapsule height={toolbar.height} grow disabled presence={glass}>
          <View style={styles.focusedClip}>
            <Animated.View style={[styles.focusedContent, contentStyle]}>
              <SearchInput routeKey={routeKey} state={state} autoFocus tint={from === 'slot' ? tabsTint : undefined} />
            </Animated.View>
          </View>
        </BarCapsule>
      </Animated.View>
      <Animated.View pointerEvents={open ? 'box-none' : 'none'} style={[styles.focusedClose, closeStyle]}>
        <AnimatedNativeGlassBlur animatedProps={closeBlur}>
          <CloseButton onPress={() => cancelSearch(routeKey)} />
        </AnimatedNativeGlassBlur>
      </Animated.View>
    </>
  );
};

// TODO: the field here is a TextInput in the bar's glass. Rebuild it on a Lucent search field that matches the text and
// glyph metrics of iOS's UISearchTextField.
/**
 * Search opened from the magnifier among the navigation bar's items, as iOS 27 opens it: in the bar's row, the
 * magnifier's capsule stretching left into the field, with the close button's cross at its end, which then buds off into
 * a glass circle of its own. `from` is the capsule's width, which the field stretches out of.
 */
export const BarSearch = ({ routeKey, from, open, onClosed }: BarSearchProps) => {
  const state = useSearch(routeKey);
  if (!state) return null;
  return (
    <BarGlassRow style={styles.barRow} height={barItem.height}>
      <BarSearchBody routeKey={routeKey} state={state} from={from} open={open} onClosed={onClosed} />
    </BarGlassRow>
  );
};

interface BarSearchProps {
  routeKey: string;
  from: number;
  // Open, it plays in; closed, it plays back out, and then says so, to be taken away.
  open: boolean;
  onClosed: () => void;
}

const BarSearchBody = ({ routeKey, state, from, open, onClosed }: BarSearchProps & { state: SearchState }) => {
  useSearchBack(routeKey, open);
  const row = useBarGlassRow();
  const { width } = useWindowDimensions();
  const span = width - bar.margin * 2;
  const stretch = useSharedValue(0);
  const bud = useSharedValue(0);
  const shown = useSharedValue(0);
  // The glass follows the capsules on the UI thread: they move by layout.
  const still = useSharedValue(0);
  useEffect(() => {
    const motion = searchMotion.bar;
    if (open) {
      // Focused once it's stretched: focused on mount, while it's still a sliver, Android lets go of it again at once.
      stretch.set(
        withTiming(1, { duration: motion.stretch, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(focusInput, routeKey);
        }),
      );
      shown.set(withTiming(1, { duration: motion.content }));
      bud.set(withDelay(motion.budAt, withTiming(1, { duration: motion.bud, easing: Easing.inOut(Easing.quad) })));
      row?.follow(motion.budAt + motion.bud + 50);
      return;
    }
    shown.set(withTiming(0, { duration: motion.closeFade }));
    bud.set(withTiming(0, { duration: motion.closeMerge, easing: Easing.inOut(Easing.quad) }));
    stretch.set(
      withDelay(
        motion.closeAt,
        withTiming(0, { duration: motion.closeShrink, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(onClosed);
        }),
      ),
    );
    row?.follow(motion.closeAt + motion.closeShrink + 50);
  }, [open, stretch, bud, shown, row, onClosed]);
  const room = barItem.height + search.focused.gap;
  const fieldStyle = useAnimatedStyle(() => ({
    marginLeft: (1 - stretch.get()) * Math.max(span - Math.max(from, barItem.height), 0),
    marginRight: bud.get() * room,
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return (
    <>
      <Animated.View style={[styles.barField, fieldStyle]}>
        <BarCapsule height={barItem.height} grow disabled swell={still}>
          <Animated.View style={[styles.display, contentStyle]}>
            <SearchInput routeKey={routeKey} state={state} autoFocus={false} />
          </Animated.View>
        </BarCapsule>
      </Animated.View>
      <View pointerEvents={open ? 'auto' : 'none'} style={styles.barClose}>
        <CloseButton size={barItem.height} swell={still} onPress={() => cancelSearch(routeKey)} />
      </View>
    </>
  );
};

interface HeaderSearchProps {
  routeKey: string;
  // From 0 at rest below the title to 1 risen into the bar's row, focused.
  progress: SharedValue<number>;
}

/**
 * The search bar in the navigation bar: a field below the title, a flat grey pill if it scrolls away and glass if it
 * stays, as iOS 27 draws them. Focused, it rises into the bar's row as glass and narrows, and a close button slides in
 * from the screen's edge beside it.
 */
export const HeaderSearch = ({ routeKey, progress }: HeaderSearchProps) => {
  const state = useSearch(routeKey);
  if (!state) return null;
  return <HeaderSearchBody routeKey={routeKey} state={state} progress={progress} />;
};

const HeaderSearchBody = ({ routeKey, state, progress }: HeaderSearchProps & { state: SearchState }) => {
  useSearchBack(routeKey, state.focused);
  const { scheme } = useLucentTheme();
  const barTint = colorString(state.props.barTintColor);
  // A field that scrolls away is a flat pill at rest, and turns to glass as it rises; one that stays is glass throughout.
  const flat = state.props.hideWhenScrolling !== false;
  const glass = useDerivedValue(() => (flat ? Math.min(progress.get() / search.glassBy, 1) : 1));
  const fillStyle = useAnimatedStyle(() => ({ opacity: 1 - glass.get() }));
  const room = barItem.height + search.focused.gap;
  const fieldStyle = useAnimatedStyle(() => ({ marginRight: progress.get() * room }));
  const closeStyle = useAnimatedStyle(() => ({
    opacity: progress.get() > 0.001 ? 1 : 0,
    transform: [{ translateX: (1 - progress.get()) * (barItem.height + search.header.margin) }],
  }));
  return (
    <View style={styles.headerRow}>
      <Animated.View style={[styles.headerField, fieldStyle]}>
        {flat ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.headerFill, { backgroundColor: barTint ?? search.fill[scheme] }, fillStyle]}
          />
        ) : null}
        <BarCapsule height={search.header.height} tint={barTint} disabled presence={flat ? glass : undefined}>
          <View style={styles.display}>
            <SearchInput routeKey={routeKey} state={state} />
          </View>
        </BarCapsule>
      </Animated.View>
      <Animated.View pointerEvents={state.focused ? 'box-none' : 'none'} style={[styles.headerClose, closeStyle]}>
        <CloseButton size={barItem.height} onPress={() => cancelSearch(routeKey)} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  icon: { position: 'absolute', top: '50%', marginTop: -search.iconSize / 2 + search.iconNudge.y },
  input: {
    position: 'absolute',
    top: search.textNudge,
    bottom: -search.textNudge,
    right: search.clearTrailing + search.clearSize + 8,
    fontSize: search.fontSize,
    padding: 0,
    includeFontPadding: false,
  },
  displayText: {
    textAlignVertical: 'center',
    lineHeight: toolbar.height,
    top: search.displayNudge,
    bottom: -search.displayNudge,
  },
  clear: {
    position: 'absolute',
    right: search.clearTrailing,
    top: '50%',
    marginTop: -search.clearSize / 2,
  },
  clearCircle: {
    width: search.clearSize,
    height: search.clearSize,
    borderRadius: search.clearSize / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBar: {
    position: 'absolute',
    width: search.clearCross * Math.SQRT2,
    height: search.clearStroke,
    borderRadius: search.clearStroke / 2,
  },
  clearBarDown: { transform: [{ rotate: '45deg' }] },
  clearBarUp: { transform: [{ rotate: '-45deg' }] },
  display: { flex: 1, alignSelf: 'stretch', minHeight: toolbar.height },
  bottom: {
    position: 'absolute',
    left: toolbar.margin,
    right: toolbar.margin,
    zIndex: 2,
    elevation: 2,
  },
  centred: { alignItems: 'center' },
  focusedField: { position: 'absolute', flexDirection: 'row', zIndex: 3, elevation: 3 },
  focusedClip: { ...StyleSheet.absoluteFill, overflow: 'hidden', borderRadius: toolbar.height / 2 },
  focusedContent: { height: toolbar.height },
  focusedClose: { position: 'absolute', right: search.focused.margin, zIndex: 3, elevation: 3 },
  gone: { opacity: 0 },
  close: {
    width: search.focused.close,
    height: search.focused.close,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { height: search.header.height, marginHorizontal: search.header.margin, justifyContent: 'center' },
  headerField: { height: search.header.height },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  barField: { flex: 1, flexDirection: 'row' },
  barClose: { position: 'absolute', right: 0 },
  headerFill: { ...StyleSheet.absoluteFill, borderRadius: search.header.height / 2 },
  headerClose: { position: 'absolute', right: 0 },
});
