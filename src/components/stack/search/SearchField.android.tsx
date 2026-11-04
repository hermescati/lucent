import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { cancelSearch } from './SearchBar.android';
import { setSearchInput, updateSearch, useSearch, type SearchState } from './store.android';
import { useBackClaim } from '../../../core/back/claims';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { systemTint } from '../../../theme/colors';
import { BarCapsule } from '../header/BarCapsule.android';
import { barItem, search, searchMotion, toolbar } from '../tokens';
import { useToolbarOffset } from '../toolbar/offset.android';
import type { LucentSearchBarProps } from '../types';

const keyboardTypes: Record<NonNullable<LucentSearchBarProps['inputType']>, KeyboardTypeOptions> = {
  text: 'default',
  phone: 'phone-pad',
  number: 'number-pad',
  email: 'email-address',
};

const colorString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const useFieldColors = (props: LucentSearchBarProps) => {
  const { color, scheme } = useLucentTheme();
  return {
    text: colorString(props.textColor) ?? color.text,
    placeholder: colorString(props.hintTextColor) ?? color.placeholder,
    icon: colorString(props.headerIconColor) ?? color.text,
    clear: color.clearButton,
    // The cross is cut out of the clear button: it shows the field's near-white or near-black.
    clearCross: scheme === 'dark' ? '#000000' : '#FFFFFF',
    // UIKit's search field takes its own tint, or the system's blue: not the app's accent.
    tint: colorString(props.tintColor) ?? systemTint[scheme],
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
      style={[styles.icon, { left: search.iconCentre - search.iconSize / 2 }]}
    />
  ) : null;

/** The field's text box, which tells the search bar's handlers what's typed. */
const SearchInput = ({ routeKey, state, autoFocus }: { routeKey: string; state: SearchState; autoFocus?: boolean }) => {
  const { props } = state;
  const colors = useFieldColors(props);
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

const SearchDisplayBody = ({ routeKey, state }: { routeKey: string; state: SearchState }) => {
  const colors = useFieldColors(state.props);
  const showIcon = state.props.shouldShowHintSearchIcon !== false;
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel={state.props.placeholder ?? 'Search'}
      onPress={() => {
        state.props.onOpen?.();
        updateSearch(routeKey, { focused: true });
      }}
      style={styles.display}>
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

const CloseButton = ({ onPress, size = search.focused.close }: { onPress: () => void; size?: number }) => {
  const { color } = useLucentTheme();
  return (
    <BarCapsule height={size}>
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

/**
 * Search mode from the bottom toolbar: the field takes the screen's width above the keyboard, beside a close button,
 * while the toolbar's other items and the navigation bar step aside.
 */
export const FocusedSearch = ({ routeKey }: { routeKey: string }) => {
  const state = useSearch(routeKey);
  const rest = useToolbarOffset();
  const keyboard = useReanimatedKeyboardAnimation().height;
  const position = useAnimatedStyle(() => ({
    bottom: Math.max(rest, -keyboard.get() + toolbar.aboveKeyboard),
  }));

  useSearchBack(routeKey, true);

  if (!state) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(searchMotion.focus)}
      exiting={FadeOut.duration(searchMotion.focus)}
      pointerEvents="box-none"
      style={[styles.focused, position]}>
      <View style={styles.focusedField}>
        <BarCapsule height={toolbar.height} disabled>
          <View style={styles.display}>
            <SearchInput routeKey={routeKey} state={state} autoFocus />
          </View>
        </BarCapsule>
      </View>
      <CloseButton onPress={() => cancelSearch(routeKey)} />
    </Animated.View>
  );
};

// TODO: the field here is a TextInput in the bar's glass. Rebuild it on a Lucent search field that matches iOS's
// UISearchTextField (glyphs, text, clear button, cursor), then revisit the bar's search: closing a search isn't measured
// on iOS (it plays the rise in reverse), and iOS's rise ends with a point of overshoot that this leaves out. Also: the
// magnifier among the bar's items (`integratedButton` beside a toolbar) opens the field up in the bar, not at the bottom:
// on iOS 27 its capsule stretches left into the field over about 300ms, the back button and title fading, its glyphs
// blurring into the placeholder, and the close button buds off the field's end as glass necks apart.
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
  icon: { position: 'absolute', top: '50%', marginTop: -search.iconSize / 2 },
  input: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: search.trailing + search.clearSize + 8,
    fontSize: search.fontSize,
    padding: 0,
    includeFontPadding: false,
  },
  displayText: { textAlignVertical: 'center', lineHeight: toolbar.height },
  clear: {
    position: 'absolute',
    right: search.trailing,
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
  focused: {
    position: 'absolute',
    left: search.focused.margin,
    right: search.focused.margin,
    flexDirection: 'row',
    alignItems: 'center',
    gap: search.focused.gap,
    zIndex: 3,
    elevation: 3,
  },
  focusedField: { flex: 1 },
  close: {
    width: search.focused.close,
    height: search.focused.close,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { height: search.header.height, marginHorizontal: search.header.margin, justifyContent: 'center' },
  headerField: { height: search.header.height },
  headerFill: { ...StyleSheet.absoluteFill, borderRadius: search.header.height / 2 },
  headerClose: { position: 'absolute', right: 0 },
});
