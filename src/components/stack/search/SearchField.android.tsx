import { SymbolView } from 'expo-symbols';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ComponentRef,
} from 'react';
import {
  BackHandler,
  I18nManager,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { cancelSearch } from './SearchBar.android';
import {
  getSearchInput,
  searchFocusDrive,
  searchLeaves,
  setSearchInput,
  updateSearch,
  useSearch,
  type SearchState,
} from './store.android';
import { useBackClaim } from '../../../core/back/claims';
import { AnimatedNativeGlassBlur } from '../../../core/glass/NativeGlass';
import { useClearButton } from '../../../core/search/clearFade';
import { useTabsTint } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { systemTint } from '../../../theme/colors';
import { BarCapsule, BarGlassRow, SplitScaleContext, useBarGlassRow } from '../header/BarCapsule.android';
import { Split } from '../header/Split.android';
import { useBarType } from '../header/barType.android';
import { barItem, barMargin, islandSplit, search, searchMotion, toolbar } from '../tokens';
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

const Magnifier = ({ color, show, scale }: { color: string; show: boolean; scale?: SharedValue<number> }) => {
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale?.get() ?? 1 }] }));
  if (!show) return null;
  return (
    <Animated.View
      style={[styles.icon, { left: search.iconCentre - search.iconSize / 2 + search.iconNudge.x * ahead }, scaleStyle]}>
      <SymbolView name={{ android: 'search' }} size={search.iconSize} tintColor={color} />
    </Animated.View>
  );
};

// A critically damped spring's way from rest to rest, as an easing over a fixed time: `k` is its angular frequency times
// that time, and it's scaled to land on 1 at the end.
// Right to left, what moves toward the end moves left; styles' left and right already swap, translations don't.
const ahead = I18nManager.isRTL ? -1 : 1;

const criticallyDamped = (k: number) => {
  const end = 1 - (1 + k) * Math.exp(-k);
  return (t: number) => {
    'worklet';
    return (1 - (1 + k * t) * Math.exp(-k * t)) / end;
  };
};

// Focused, and checked on the frames after: Android can let go of a field focused as what's around it changes, now and
// then right after the app starts, so it's asked again until it holds, a few frames at most.
const focusInput = (routeKey: string, tries = 3) => {
  const input = getSearchInput(routeKey);
  if (!input) return;
  input.focus();
  requestAnimationFrame(() => {
    const still = getSearchInput(routeKey) === input && searchFocusDrive(routeKey).get() === 1;
    if (tries > 1 && still && !drawingBack.has(routeKey) && !input.isFocused()) focusInput(routeKey, tries - 1);
  });
};

// Screens whose in-bar field is drawing back from its close button's press: letting go of the keyboard doesn't end
// search mode for them, which waits for the field to land, so the render it takes doesn't hold up the motion.
const drawingBack = new Set<string>();
// And the same opening from the magnifier's press, until search mode starts as it sharpens.
const springingOpen = new Set<string>();

/** The field's text box, which tells the search bar's handlers what's typed. */
interface SearchInputProps {
  routeKey: string;
  state: SearchState;
  autoFocus?: boolean;
  // The cursor's colour when the search bar doesn't give one, where it isn't the system blue.
  tint?: string;
  // How big its magnifier is, as in a circle it grows out of, whose magnifier is drawn bigger.
  iconScale?: SharedValue<number>;
}

const SearchInput = ({ routeKey, state, autoFocus, tint, iconScale }: SearchInputProps) => {
  const { props } = state;
  // Registered for the search bar's ref and for focusing; taken away only while it's still the one registered.
  const mine = useRef<ComponentRef<typeof TextInput> | null>(null);
  const register = useCallback(
    (input: ComponentRef<typeof TextInput> | null) => {
      if (input) {
        mine.current = input;
        setSearchInput(routeKey, input);
      } else if (mine.current && getSearchInput(routeKey) === mine.current) setSearchInput(routeKey, null);
    },
    [routeKey],
  );
  const colors = useFieldColors(props, tint);
  const clear = useClearButton(Boolean(state.text), {
    // Cleared, the field takes the keyboard again, as iOS's does once its keyboard has gone.
    onClear: () => {
      updateSearch(routeKey, { text: '' });
      props.onChangeText?.({ nativeEvent: { text: '' } } as never);
      focusInput(routeKey);
    },
    hitSlop: 8,
  });
  const showIcon = props.shouldShowHintSearchIcon !== false;
  const type = useBarType();
  return (
    <>
      <Magnifier color={colors.icon} show={showIcon} scale={iconScale} />
      <TextInput
        allowFontScaling={false}
        ref={register}
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
          if (!state.text && !drawingBack.has(routeKey)) {
            updateSearch(routeKey, { focused: false });
            props.onClose?.();
          }
        }}
        onSubmitEditing={() => props.onSearchButtonPress?.({ nativeEvent: { text: state.text } } as never)}
        style={[styles.input, type.search, { left: showIcon ? search.text : search.trailing, color: colors.text }]}
      />
      <GestureDetector gesture={clear.gesture}>
        <View
          pointerEvents={state.text ? 'auto' : 'none'}
          style={styles.clear}
          accessible={Boolean(state.text)}
          accessibilityRole="button"
          accessibilityLabel="Clear text"
          accessibilityActions={[{ name: 'activate' }]}
          onAccessibilityAction={clear.onClear}>
          <Animated.View style={clear.fadeStyle}>
            <Animated.View style={clear.dimStyle}>
              <ClearGlyph fill={colors.clear} cross={colors.clearCross} />
            </Animated.View>
          </Animated.View>
        </View>
      </GestureDetector>
    </>
  );
};

/** The field's look without a text box: what it shows until it's tapped, in the toolbar or its slot. */
export const SearchDisplay = ({ routeKey, bubble }: { routeKey: string; bubble?: SearchBubble }) => {
  const state = useSearch(routeKey);
  const shared = useContext(SearchBubbleContext);
  if (!state) return null;
  return <SearchDisplayBody routeKey={routeKey} state={state} bubble={bubble ?? shared ?? undefined} />;
};

// Where each screen's field sits at rest, across the screen: focused, the field grows from there. The field up ahead of
// time follows it as the toolbar lays out.
const displayRects = new Map<string, { x: number; width: number }>();
const rectListeners = new Set<() => void>();
const setDisplayRect = (routeKey: string, x: number, width: number) => {
  const was = displayRects.get(routeKey);
  if (was && was.x === x && was.width === width) return;
  displayRects.set(routeKey, { x, width });
  rectListeners.forEach((listener) => listener());
};
const onRects = (listener: () => void) => {
  rectListeners.add(listener);
  return () => {
    rectListeners.delete(listener);
  };
};

const SearchDisplayBody = ({
  routeKey,
  state,
  bubble,
}: {
  routeKey: string;
  state: SearchState;
  bubble?: SearchBubble;
}) => {
  const colors = useFieldColors(state.props);
  const showIcon = state.props.shouldShowHintSearchIcon !== false;
  const ref = useRef<ComponentRef<typeof View>>(null);
  const type = useBarType();
  // Out of a field up ahead of time, it hides while that field's glass is up over it.
  const hideStyle = useAnimatedStyle(() => ({ opacity: bubble && bubble.up.get() > 0.5 ? 0 : 1 }));
  return (
    <Pressable
      ref={ref}
      onLayout={() => ref.current?.measureInWindow((x, _y, width) => setDisplayRect(routeKey, x, width))}
      accessibilityRole="search"
      accessibilityLabel={state.props.placeholder ?? 'Search'}
      onPress={() => {
        state.props.onOpen?.();
        // Out of a field up ahead of time, it starts growing at the press; search mode follows.
        if (bubble?.starterRef.current) bubble.starterRef.current();
        else updateSearch(routeKey, { focused: true });
      }}
      // Focused, the field above the keyboard shows it instead.
      style={[styles.display, !bubble && state.focused && styles.gone]}>
      <Animated.View style={[StyleSheet.absoluteFill, hideStyle]}>
        <Magnifier color={colors.icon} show={showIcon} />
        <Text
          numberOfLines={1}
          allowFontScaling={false}
          style={[
            styles.input,
            type.search,
            styles.displayText,
            { left: showIcon ? search.text : search.trailing, color: state.text ? colors.text : colors.placeholder },
          ]}>
          {state.text || (state.props.placeholder ?? 'Search')}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

/**
 * The magnifier's circle, the field at the bottom or the toolbar's slot, and the field that grows out of it, shared: the field's glass, up ahead of time
 * out of sight, and its opening, which a press on what it grows out of starts. That hides while the field's glass is up.
 */
export interface SearchBubble {
  up: SharedValue<number>;
  // How far the field has grown out of what was tapped, 0 to 1: the toolbar's items go as it grows out of their slot.
  stretch: SharedValue<number>;
  starterRef: { current: (() => void) | null };
}

// The toolbar's slot shows its field through the toolbar's items, which take no bubble of their own.
export const SearchBubbleContext = createContext<SearchBubble | null>(null);

export const useSearchBubble = (): SearchBubble => {
  const up = useSharedValue<number>(searchMotion.bar.parked);
  const stretch = useSharedValue(0);
  const starterRef = useRef<(() => void) | null>(null);
  return useMemo(() => ({ up, stretch, starterRef }), [up, stretch]);
};

/** The search bar alone at the bottom, where iOS 26 puts it on a screen without a toolbar. */
export const BottomSearch = ({ routeKey, bubble }: { routeKey: string; bubble?: SearchBubble }) => {
  const bottom = useToolbarOffset();
  // Gone while the field that grows out of it is up, its glass taking this one's place.
  const hidden = useDerivedValue<number>(() => (bubble && bubble.up.get() > 0.5 ? 0 : 1));
  const hideStyle = useAnimatedStyle(() => ({ opacity: hidden.get() }));
  return (
    <View pointerEvents="box-none" style={[styles.bottom, { bottom }]}>
      <BarCapsule height={toolbar.height} presence={bubble ? hidden : undefined}>
        <Animated.View style={[styles.display, bubble && hideStyle]}>
          <SearchDisplay routeKey={routeKey} bubble={bubble} />
        </Animated.View>
      </BarCapsule>
    </View>
  );
};

/**
 * The search bar as a button, for `placement: 'integratedButton'`: a glass circle with a magnifier that opens the field,
 * at the bottom as a toolbar's size, or in the navigation bar as a bar item's.
 */
export const SearchButton = ({
  routeKey,
  inBar = false,
  bubble,
}: {
  routeKey: string;
  inBar?: boolean;
  bubble?: SearchBubble;
}) => {
  const state = useSearch(routeKey);
  const { color } = useLucentTheme();
  // Gone while the field that grows out of it is up, its glass taking the circle's place.
  const hidden = useDerivedValue<number>(() => (bubble && bubble.up.get() > 0.5 ? 0 : 1));
  const hideStyle = useAnimatedStyle(() => ({ opacity: hidden.get() }));
  if (!state) return null;
  const size = inBar ? barItem.height : toolbar.height;
  return (
    <BarCapsule height={size} presence={bubble ? hidden : undefined}>
      <Pressable
        accessibilityRole="search"
        accessibilityLabel={state.props.placeholder ?? 'Search'}
        onPress={() => {
          state.props.onOpen?.();
          // Out of a field up ahead of time, it starts growing at the press; search mode follows.
          if (bubble?.starterRef.current) bubble.starterRef.current();
          else updateSearch(routeKey, { focused: true });
        }}
        style={[styles.close, { width: size, height: size }]}>
        <Animated.View style={bubble ? hideStyle : undefined}>
          <SymbolView
            name={{ android: 'search' }}
            size={search.buttonIcon}
            tintColor={colorString(state.props.headerIconColor) ?? color.text}
          />
        </Animated.View>
      </Pressable>
    </BarCapsule>
  );
};

/** The search button alone at the bottom, centred, where iOS 26 puts it on a screen without a toolbar. */
export const BottomSearchButton = ({ routeKey, bubble }: { routeKey: string; bubble?: SearchBubble }) => {
  const bottom = useToolbarOffset();
  return (
    <View pointerEvents="box-none" style={[styles.bottom, styles.centred, { bottom }]}>
      <SearchButton routeKey={routeKey} bubble={bubble} />
    </View>
  );
};

// While search mode is on, Back ends it, as the close button does, rather than leaving the screen.
// Back in search mode: with a screen to go back to, it goes back, search mode and all, as iOS 27's swipe back does; on a
// stack's first screen, where iOS has no swipe back, it ends search mode rather than leaving the app.
const useSearchBack = (routeKey: string, active: boolean) => {
  const ends = active && !searchLeaves(routeKey);
  useBackClaim(ends);
  useEffect(() => {
    if (!ends) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      cancelSearch(routeKey);
      return true;
    });
    return () => subscription.remove();
  }, [routeKey, ends]);
};

const CloseButton = ({
  onPress,
  size = search.focused.close,
  swell,
  sharp,
  drop,
  slide,
}: {
  onPress: () => void;
  size?: number;
  swell?: SharedValue<number>;
  // How sharp its cross is, 0 to 1, for one that comes in blurred on its own clock; otherwise as it splits off.
  sharp?: SharedValue<number>;
  // How far down it sits, in points, keeping to the middle of the field it splits off as that sags, and grows as much
  // on every side, as big as the field and round.
  drop?: SharedValue<number>;
  // How far along it's moved, in points, riding the end of a field that draws back away from its place.
  slide?: SharedValue<number>;
}) => {
  const { color } = useLucentTheme();
  // Splitting off, its cross comes in blurred, sharp once it's whole, as iOS 27's does.
  const split = useContext(SplitScaleContext);
  const crossBlur = useAnimatedProps(() => {
    const whole = sharp ? sharp.get() : split ? (split.scale.get() - islandSplit.from) / (1 - islandSplit.from) : 1;
    return { radius: (1 - Math.min(Math.max(whole, 0), 1)) * searchMotion.bar.blur };
  });
  // Splitting off, its cross comes out of the field's end into its circle, and melting back it slides back in, shrinking,
  // as the tab bar's search close button's does: inside the capsule's scale, so undone by it.
  const crossStyle = useAnimatedStyle(() => {
    const apart = split ? Math.min(Math.max(split.apart.get(), 0), 1) : 1;
    const scale = split ? Math.max(split.scale.get(), 0.01) : 1;
    const { glyphShift, glyphScale } = searchMotion.bar.close;
    const shrink = split && split.out.get() === 0 ? glyphScale + (1 - glyphScale) * apart * apart : 1;
    return {
      transform: [
        { translateX: ((slide?.get() ?? 0) - (glyphShift * (1 - apart)) / scale) * ahead },
        { scale: shrink },
        { translateY: drop?.get() ?? 0 },
        { scale: 1 + (2 * (drop?.get() ?? 0)) / size },
      ],
    };
  });
  return (
    <BarCapsule height={size} swell={swell} drop={drop} around={drop} inset={slide} outset={slide}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close search"
        onPress={onPress}
        style={[styles.close, { width: size, height: size }]}>
        <AnimatedNativeGlassBlur style={crossStyle} animatedProps={crossBlur}>
          <SymbolView name={{ android: 'close' }} size={search.focused.closeIcon} tintColor={color.text} />
        </AnimatedNativeGlassBlur>
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
  // From the magnifier's circle: the field's glass and opening it shares with the circle, up ahead of time.
  bubble?: SearchBubble;
}

/**
 * Search mode from the bottom: the field rides the keyboard up and down, playing every search field's motion
 * (`SearchMorph`) out of what was tapped, the toolbar's slot, the field at rest or the magnifier's circle.
 */
export const FocusedSearch = (props: FocusedSearchProps) => {
  const state = useSearch(props.routeKey);
  if (!state) return null;
  return <FocusedSearchBody {...props} state={state} />;
};

const FocusedSearchBody = ({
  routeKey,
  state,
  from,
  open,
  onClosed,
  bubble,
}: FocusedSearchProps & { state: SearchState }) => {
  const { width } = useWindowDimensions();
  const rest = useToolbarOffset();
  const keyboard = useReanimatedKeyboardAnimation();
  const tabsTint = useTabsTint();
  const { margin } = search.focused;
  // Where it grows from: the magnifier's circle, the field as it showed at rest, or the toolbar's slot.
  const circle = (width - toolbar.height) / 2;
  const rect = useSyncExternalStore(onRects, () => displayRects.get(routeKey));
  // Its sides in from the screen's start and end; the rest at rest is measured across the screen, left to right.
  const fromLeft = rect?.x ?? toolbar.margin;
  const fromRight = rect ? width - rect.x - rect.width : toolbar.margin;
  const fromStart = from === 'button' ? circle : ahead > 0 ? fromLeft : fromRight;
  const fromEnd = from === 'button' ? circle : ahead > 0 ? fromRight : fromLeft;
  // Above the keyboard it takes nearly the screen's width, widening as the keyboard comes up; with the keyboard down
  // (searched, or a hardware one), it keeps the toolbar's margins, as iOS's does. A floating keyboard takes no room under
  // it, reporting no height as its progress jumps, so the field keeps its width there rather than snapping wider.
  const side = useDerivedValue(() => {
    const docked = keyboard.height.get() < 0 ? keyboard.progress.get() : 0;
    return toolbar.margin + (margin - toolbar.margin) * docked;
  });
  const ownStretch = useSharedValue(0);
  const stretch = bubble?.stretch ?? ownStretch;
  // Mounted open, its glass shows from the first frame; the circle's is up ahead of time.
  const own = useSharedValue(1);
  const up = bubble?.up ?? own;
  // In the toolbar's slot, the field is the toolbar's glass until its other items have gone.
  const presence = up;
  // Closing from the slot, it stays where it was as the keyboard goes; otherwise it rides the keyboard.
  const pinned = useSharedValue(-1);
  useEffect(() => {
    if (!open && from === 'slot') pinned.set(Math.max(rest, -keyboard.height.get() + toolbar.aboveKeyboard));
  }, [open, from, rest, pinned, keyboard.height]);
  const bottom = useDerivedValue(() =>
    pinned.get() >= 0 ? pinned.get() : Math.max(rest, -keyboard.height.get() + toolbar.aboveKeyboard),
  );
  const fieldStyle = useAnimatedStyle(() => ({ bottom: bottom.get(), left: side.get(), right: side.get() }));
  // Taken away once it has played out and the keyboard's down, so what it came from shows where it landed.
  const landed = useSharedValue(0);
  useAnimatedReaction(
    () => landed.get() === 1 && keyboard.progress.get() < 0.02,
    (done, was) => {
      if (done && !was) scheduleOnRN(onClosed);
    },
  );
  // A floating or hardware keyboard may never quite report itself down.
  useEffect(() => {
    if (open) return undefined;
    const fallback = setTimeout(onClosed, searchMotion.bottom.closeBy);
    return () => clearTimeout(fallback);
  }, [open, onClosed]);
  return (
    <Animated.View pointerEvents={open ? 'box-none' : 'none'} style={[styles.focusedField, fieldStyle]}>
      <BarGlassRow style={styles.barRow} height={toolbar.height} presence={presence} pressable={open}>
        <SearchMorph
          routeKey={routeKey}
          state={state}
          open={open}
          onClosed={() => landed.set(1)}
          up={up}
          height={toolbar.height}
          fromStart={fromStart}
          fromEnd={fromEnd}
          side={side}
          shift={from === 'button' ? toolbar.height / 2 - search.iconCentre : 0}
          clip={from === 'button'}
          keepsContent={from === 'slot' || (from === 'bottom' && Boolean(bubble))}
          // Out of the circle, the keyboard waits for the field to have grown, which it would otherwise come up over; up
          // ahead of time, it's focused once it's sharp, as the bar's field is.
          focus={from === 'button' ? 'grown' : bubble ? 'sharp' : 'mount'}
          fadesOut={from === 'slot'}
          parks={Boolean(bubble)}
          starterRef={bubble?.starterRef}
          tint={from === 'slot' ? tabsTint : undefined}
          stretch={stretch}
        />
      </BarGlassRow>
    </Animated.View>
  );
};

// A frame's time, in ms.
const FRAME = 1000 / 60;

/**
 * A timing picked up a frame in, for one the open reaches the UI thread a frame late to start: where it is by then, and
 * the rest of the same curve.
 */
const aFrameIn = (easing: (t: number) => number, duration: number) => {
  const t0 = Math.min(FRAME / duration, 1);
  const start = easing(t0);
  const rest = (t: number) => {
    'worklet';
    return start >= 1 ? 1 : (easing(t0 + t * (1 - t0)) - start) / (1 - start);
  };
  return { start, timing: { duration: Math.max(duration - FRAME, 0), easing: rest } };
};

/**
 * Search opened from the magnifier among the navigation bar's items, as iOS 27 opens it: in the bar's row, the
 * magnifier's capsule stretching left into the field (`SearchMorph`). `from` is the capsule's width, which the field
 * stretches out of.
 */
export const BarSearch = ({ from, ...props }: BarSearchProps) => {
  const state = useSearch(props.routeKey);
  const { width } = useWindowDimensions();
  const margin = barMargin(width);
  const side = useDerivedValue<number>(() => margin);
  // Its glass shows from opening until it's closed: it's up ahead of time, out of sight, to open on the first frame.
  // Parked, it still draws, too faint to see, so its shader is ready on the first frame it opens.
  const up = useSharedValue<number>(searchMotion.bar.parked);
  if (!state) return null;
  return (
    <BarGlassRow
      style={styles.barRow}
      height={barItem.height}
      presence={up}
      // Up ahead of time, its capsules don't take a press meant for the row under it.
      pressable={props.open}>
      <SearchMorph
        {...props}
        state={state}
        up={up}
        height={barItem.height}
        fromStart={width - margin - Math.max(from, barItem.height)}
        fromEnd={margin}
        side={side}
        sags
        parks
        focus="sharp"
      />
    </BarGlassRow>
  );
};

interface BarSearchProps {
  routeKey: string;
  from: number;
  // Open, it plays in; closed, it plays back out, and then says so, to be taken away.
  open: boolean;
  // How far it has stretched out of the trailing capsule, 0 to 1: the header's, whose items ride its start.
  stretch?: SharedValue<number>;
  // 1 from the moment it starts closing until it next opens: the header's, whose title and buttons come back with it.
  closing?: SharedValue<number>;
  // 1 from the moment it starts opening until it starts closing: the header's, whose title and buttons go with it.
  opened?: SharedValue<number>;
  // How swollen its glass is as it lands back in the trailing capsule, 0 at rest: the header's, which the capsule takes on.
  land?: SharedValue<number>;
  // Given its opening, for the magnifier to start it at the press, on the UI thread, a render ahead of search mode.
  starterRef?: { current: (() => void) | null };
  onClosed: () => void;
}

interface SearchMorphProps extends Omit<BarSearchProps, 'from'> {
  state: SearchState;
  // Its row's glass: up while it's open.
  up: SharedValue<number>;
  height: number;
  // The screen's insets, left and right, of what it grows out of, and of where it ends up.
  fromStart: number;
  fromEnd: number;
  side: SharedValue<number>;
  // How far the magnifier sits past its place in the field in what it grows out of: a circle's middle.
  shift?: number;
  // Stretching out of a capsule in the navigation bar, it sags and swells as it goes, as iOS 27's does.
  sags?: boolean;
  // Out of a lone circle, its content is cut to its glass, none of the field's text showing past it.
  clip?: boolean;
  // Out of and back into a field that shows what it does, its content stays, that field's taking over.
  keepsContent?: boolean;
  // When it takes the keyboard: as it mounts, once it's sharp, or once it has grown.
  focus: 'mount' | 'sharp' | 'grown';
  // In the toolbar's slot, it fades where it is closing, as iOS 27's does, rather than drawing back.
  fadesOut?: boolean;
  // Up ahead of time, out of sight, it parks its glass once closed rather than being taken away.
  parks?: boolean;
  tint?: string;
}

/**
 * Every search field's motion, wherever it opens, as iOS 27 plays it. It grows out of what was tapped (a capsule among
 * the bar's items, the toolbar's slot, the field at rest or the magnifier's circle) to where it ends up, its content
 * coming in blurred, and the close button buds off its end, necked to it until it breaks free (`Split`). Closing runs it
 * backwards: the close button melts into its end as the field draws back into what it came out of. Started from a press,
 * the motion runs on the UI thread at once and search mode follows, so its render doesn't hold the motion up.
 */
const SearchMorph = ({
  routeKey,
  state,
  open,
  onClosed,
  up,
  height,
  fromStart,
  fromEnd,
  side,
  shift = 0,
  sags = false,
  clip = false,
  keepsContent = false,
  focus,
  fadesOut = false,
  parks = false,
  tint,
  stretch: given,
  closing: givenClosing,
  opened: givenOpened,
  land,
  starterRef,
}: SearchMorphProps) => {
  useSearchBack(routeKey, open);
  const row = useBarGlassRow();
  // As its sides move with the keyboard, its glass follows its layout on the UI thread, not a render later.
  const follow = row?.follow;
  useAnimatedReaction(
    () => side.get(),
    (now, was) => {
      if (follow && was !== null && now !== was) follow(searchMotion.bar.followSide);
    },
  );
  const own = useSharedValue(0);
  const stretch = given ?? own;
  const ownClosing = useSharedValue(0);
  const closing = givenClosing ?? ownClosing;
  const ownOpened = useSharedValue(0);
  const opened = givenOpened ?? ownOpened;
  const shown = useSharedValue(0);
  // How far the field sags as it stretches, in points; its glass follows the capsules on the UI thread as they move by
  // layout.
  const sag = useSharedValue(0);
  // The close button keeps to its middle.
  const middle = useDerivedValue(() => sag.get() / 2);
  // The close button's place as it opens, which the field's glass reaches into until it does: the field is laid out
  // where it ends up, the button at the row's end.
  const room = height + search.focused.gap;
  const closePlace = useSharedValue(0);
  // How big its content is, growing with it as it sags and settling once the close button breaks free.
  const grow = useSharedValue(1);
  // How sharp its content is, coming in blurred; and the close button's cross, soft until it breaks free.
  const sharp = useSharedValue(0);
  const crossSharp = useSharedValue(0);
  // Closing, all at once: the field draws back into what it came out of, the close button melts back into its end
  // (`Split`), the placeholder fades and the cross blurs away. Started from the press, on the UI thread, rather than a
  // render later: iOS moves on the touch.
  const startClose = (pressed = false) => {
    if (closing.get() === 1) return;
    const motion = searchMotion.bar;
    springingOpen.delete(routeKey);
    opened.set(0);
    closing.set(1);
    // Out of a circle, the magnifier stays in it as the field draws back, its text cut away with the glass.
    if (!clip && !keepsContent) shown.set(withTiming(0, { duration: motion.closeFade }));
    crossSharp.set(withTiming(0, { duration: motion.close.blurOut, easing: Easing.in(Easing.quad) }));
    const done = (finished?: boolean) => {
      'worklet';
      if (!finished) return;
      // Parked, its content goes with its glass: what it grew out of takes over, showing its own.
      if (parks) {
        up.set(searchMotion.bar.parked);
        shown.set(0);
      }
      scheduleOnRN(pressed ? endPressed : onClosed);
    };
    if (fadesOut) {
      const { fieldOut, closeOut } = searchMotion.bottom;
      up.set(withTiming(0, { duration: fieldOut }));
      shown.set(withTiming(0, { duration: fieldOut }));
      sharp.set(withDelay(closeOut, withTiming(0, { duration: 0 }, done)));
      return;
    }
    if (stretch.get() === 0) {
      done(true);
      return;
    }
    stretch.set(
      withTiming(
        0,
        { duration: motion.closeShrink, easing: criticallyDamped(motion.closeOmega * motion.closeShrink) },
        done,
      ),
    );
    row?.follow(motion.closeShrink + 50);
  };
  // Search mode ends once the field has landed; the keyboard goes at the press.
  const endPressed = () => {
    cancelSearch(routeKey);
    drawingBack.delete(routeKey);
    onClosed();
  };
  // Opening: from a press, the motion starts on the UI thread at once, and search mode once the field is on its way, so
  // the render it takes doesn't hold the motion up. Opened some other way, it starts with search mode.
  const startOpen = (pressed = false) => {
    if (opened.get() === 1) return;
    const motion = searchMotion.bar;
    if (pressed) {
      springingOpen.add(routeKey);
      // Search mode starts early in the stretch, its render done well before the field's sharp, when it's focused.
      focusGate.current = { rendered: false, sharp: false };
      setTimeout(commitOpen, motion.commitAt);
    }
    // The field's glass comes in now, in the shape of what it grows out of: a change to which glass shows reaches the
    // screen a frame after a move does, so the motion starts a frame on, the field whole on its first frame as iOS's is.
    opened.set(1);
    closing.set(0);
    up.set(1);
    sharp.set(clip || keepsContent ? 1 : 0);
    crossSharp.set(0);
    const next = <T,>(animation: T) => withDelay(FRAME, animation as never) as T;
    // Readable by about 120ms, a little soft until it breaks free.
    const { soft, softBy } = motion.close.cross;
    crossSharp.set(
      next(
        withSequence(
          withTiming(soft, { duration: softBy, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: motion.close.neck.at - softBy, easing: Easing.in(Easing.quad) }),
        ),
      ),
    );
    // A frame in already as it starts: the tap took one to get here, as iOS's first frame shows.
    const stretching = aFrameIn(Easing.out(Easing.poly(4)), motion.stretch);
    stretch.set(
      next(
        withSequence(
          withTiming(stretching.start, { duration: 0 }),
          withTiming(1, stretching.timing, (finished) => {
            if (finished && focus === 'grown') scheduleOnRN(focusInput, routeKey);
          }),
        ),
      ),
    );
    // Out of a circle, the magnifier's there from the start, the field's text uncovered as the glass grows; out of a field
    // showing what it does, its content's there already.
    shown.set(clip || keepsContent ? 1 : next(withTiming(1, { duration: motion.content })));
    // Focused once it's sharp, as iOS's cursor shows: not on mount, which Android lets go of again at once. Opened from a
    // press, search mode starts then too, and it's focused once that's rendered: Android lets go of a field focused
    // before a render that changes what's around it.
    sharp.set(
      next(
        withTiming(1, { duration: motion.sharpBy, easing: Easing.inOut(Easing.quad) }, (finished) => {
          if (finished && focus === 'sharp') scheduleOnRN(pressed ? sharpened : focusInput, routeKey);
        }),
      ),
    );
    if (sags) {
      const { by, up: deepen, hold, eased, ease, snapAt, snap } = motion.sag;
      const deepening = aFrameIn(Easing.out(Easing.quad), deepen);
      sag.set(
        next(
          withSequence(
            withTiming(by * deepening.start, { duration: 0 }),
            withTiming(by, deepening.timing),
            withDelay(hold, withTiming(eased, { duration: ease, easing: Easing.inOut(Easing.quad) })),
            withDelay(snapAt, withTiming(0, { duration: snap })),
          ),
        ),
      );
      const content = motion.grow;
      grow.set(
        next(
          withSequence(
            withTiming(1 + (content.by - 1) * deepening.start, { duration: 0 }),
            withTiming(content.by, deepening.timing),
            withDelay(hold, withTiming(content.eased, { duration: ease, easing: Easing.inOut(Easing.quad) })),
            withDelay(snapAt, withTiming(content.snapped, { duration: snap })),
            withTiming(1, { duration: content.settle, easing: Easing.inOut(Easing.quad) }),
          ),
        ),
      );
    }
    row?.follow(Math.max(motion.stretch, motion.close.neck.at + islandSplit.neckBreak) + 50);
  };
  const commitOpen = () => {
    if (!springingOpen.has(routeKey) || opened.get() !== 1) return;
    updateSearch(routeKey, { focused: true });
  };
  // Focused once both search mode's render has landed and the field is sharp, whichever comes last.
  const focusGate = useRef({ rendered: false, sharp: false });
  const sharpened = () => {
    focusGate.current.sharp = true;
    if (focusGate.current.rendered) focusInput(routeKey);
  };
  useLayoutEffect(() => {
    if (!starterRef) return undefined;
    starterRef.current = () => startOpen(true);
    return () => {
      starterRef.current = null;
    };
  });
  // Search mode come or gone some other way than a press on what it grows from or on its close button, as by Back.
  const mounted = useRef(false);
  useLayoutEffect(() => {
    const mounting = !mounted.current;
    mounted.current = true;
    if (open) {
      startOpen();
      // A couple of frames on, once the views have the props this render gave them: focused before, while its row still
      // takes no touches, Android lets go of it at once.
      if (springingOpen.delete(routeKey))
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            focusGate.current.rendered = true;
            if (focusGate.current.sharp) focusInput(routeKey);
          }),
        );
    } else if (!mounting) startClose();
  }, [open]);
  // How far in its glass is drawn at each end as it grows, from where it ends up to what it grows out of: its layout
  // stays where it ends up, and its glass follows on the UI thread.
  const away = useDerivedValue(() => (1 - stretch.get()) * (fromStart - side.get()));
  const endIn = useDerivedValue(() => (1 - stretch.get()) * Math.max(fromEnd - side.get(), 0));
  const outset = useDerivedValue(() => room - closePlace.get() - endIn.get());
  // The close button rides the field's end, where that draws back away from its place.
  const slide = useDerivedValue(() => -endIn.get());
  // Its content rides the glass's start. Grown about its start and kept in the middle of the sagging glass, as iOS's is.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [
      { translateX: clip ? 0 : (away.get() + shift * (1 - stretch.get())) * ahead },
      { translateY: sag.get() / 2 },
      { scale: grow.get() },
    ],
  }));
  // Out of a circle, its content is cut to its glass, and keeps the field's width inside it.
  // In the circle, only the magnifier: the field's text starts past it.
  const clipStyle = useAnimatedStyle(() => ({
    left: away.get(),
    right: -outset.get() + (1 - stretch.get()) * searchMotion.bottom.circleClip,
  }));
  const clippedStyle = useAnimatedStyle(() => {
    const left = shift * (1 - stretch.get());
    return { left, right: outset.get() - away.get() - left };
  });
  const contentBlur = useAnimatedProps(() => ({ radius: (1 - sharp.get()) * searchMotion.bar.blur }));
  // Out of a circle, its magnifier is the circle's size there, drawn bigger, and the field's as it grows.
  const iconScale = useDerivedValue(() => 1 + (1 - stretch.get()) * (search.buttonIcon / search.iconSize - 1));
  const content = (
    <AnimatedNativeGlassBlur
      // The field's height, not the toolbar's the resting field's display takes: in the bar's shorter capsule, its middle.
      style={[
        clip ? styles.clipped : [styles.display, { minHeight: height }],
        styles.fromStart,
        contentStyle,
        clip && clippedStyle,
      ]}
      animatedProps={contentBlur}>
      <SearchInput
        routeKey={routeKey}
        state={state}
        autoFocus={focus === 'mount'}
        tint={tint}
        iconScale={clip ? iconScale : undefined}
      />
    </AnimatedNativeGlassBlur>
  );
  return (
    <>
      <View
        pointerEvents={open ? 'auto' : 'none'}
        importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
        style={[styles.barField, { marginEnd: room }]}>
        <BarCapsule
          height={height}
          grow
          disabled
          sag={sags ? sag : undefined}
          inset={away}
          outset={outset}
          swell={land}>
          {clip ? (
            <Animated.View style={[styles.clip, { borderRadius: height / 2 }, clipStyle]}>{content}</Animated.View>
          ) : (
            content
          )}
        </BarCapsule>
      </View>
      <View pointerEvents="box-none" style={styles.barClose}>
        <Split
          shown={open}
          appear
          toward="start"
          size={height}
          gap={search.focused.gap}
          place={closePlace}
          delay={FRAME}
          spring={searchMotion.bar.close.spring}
          meltTime={searchMotion.bar.close.meltTime}
          from={searchMotion.bar.close.from}
          neck={searchMotion.bar.close.neck}
          glyphGoneBy={searchMotion.bar.close.glyphGoneBy}
          drive={opened}>
          <CloseButton
            size={height}
            sharp={crossSharp}
            drop={middle}
            slide={slide}
            onPress={() => {
              drawingBack.add(routeKey);
              getSearchInput(routeKey)?.blur();
              startClose(true);
            }}
          />
        </Split>
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
 * stays, as iOS 27 draws them. Focused, it rises into the bar's row as glass, and the close button buds off its end as
 * every search field's does.
 */
export const HeaderSearch = ({ routeKey, progress }: HeaderSearchProps) => {
  const state = useSearch(routeKey);
  if (!state) return null;
  return <HeaderSearchBody routeKey={routeKey} state={state} progress={progress} />;
};

const HeaderSearchBody = ({ routeKey, state, progress }: HeaderSearchProps & { state: SearchState }) => {
  useSearchBack(routeKey, state.focused);
  const { scheme } = useLucentTheme();
  const margin = barMargin(useWindowDimensions().width);
  const barTint = colorString(state.props.barTintColor);
  // A field that scrolls away is a flat pill at rest, and turns to glass as it rises; one that stays is glass throughout.
  const flat = state.props.hideWhenScrolling !== false;
  const glass = useDerivedValue(() => (flat ? Math.min(progress.get() / search.glassBy, 1) : 1));
  // Laid out across the row, its end drawing in as the close button buds off it and takes its place (`Split`), as every
  // search field's does: Android cuts off what's drawn past a view, so the field isn't laid out short of it.
  const closePlace = useSharedValue(0);
  const endIn = useDerivedValue(() => -closePlace.get());
  const reachStyle = useAnimatedStyle(() => ({ right: closePlace.get() }));
  const fillStyle = useAnimatedStyle(() => ({ opacity: 1 - glass.get(), right: closePlace.get() }));
  const { close } = searchMotion.bar;
  // It buds off as the field starts rising, on the frame after search mode starts, not a render later.
  const drive = useMemo(() => searchFocusDrive(routeKey), [routeKey]);
  return (
    <View style={[styles.headerRow, { marginHorizontal: margin }]}>
      <BarGlassRow style={styles.barRow} height={barItem.height} presence={flat ? glass : undefined}>
        <View style={styles.headerField}>
          {flat ? (
            <Animated.View
              pointerEvents="none"
              style={[styles.headerFill, { backgroundColor: barTint ?? search.fill[scheme] }, fillStyle]}
            />
          ) : null}
          <BarCapsule height={search.header.height} tint={barTint} disabled grow outset={endIn}>
            <View style={styles.headerGlass} />
          </BarCapsule>
          <Animated.View style={[styles.headerContent, reachStyle]}>
            <SearchInput routeKey={routeKey} state={state} />
          </Animated.View>
        </View>
        <View pointerEvents="box-none" style={styles.barClose}>
          <Split
            shown={state.focused}
            appear
            toward="start"
            size={barItem.height}
            gap={search.focused.gap}
            place={closePlace}
            spring={close.spring}
            from={close.from}
            neck={close.neck}
            glyphGoneBy={close.glyphGoneBy}
            drive={drive}>
            <CloseButton size={barItem.height} onPress={() => cancelSearch(routeKey)} />
          </Split>
        </View>
      </BarGlassRow>
    </View>
  );
};

const styles = StyleSheet.create({
  icon: { position: 'absolute', top: '50%', marginTop: -search.iconSize / 2 + search.iconNudge.y },
  input: {
    position: 'absolute',
    // From the magnifier on, whatever the text's own direction, as iOS lines it up.
    textAlign: I18nManager.isRTL ? 'right' : 'left',
    top: search.textNudge,
    bottom: -search.textNudge,
    right: search.clearTrailing + search.clearSize + 8,
    fontSize: search.fontSize,
    fontWeight: search.fontWeight,
    padding: 0,
    includeFontPadding: false,
  },
  displayText: {
    // From the magnifier on, as the text box's: a text's left is its start, which React Native swaps right to left.
    textAlign: 'left',
    textAlignVertical: 'center',
    lineHeight: toolbar.height,
    top: search.displayNudge,
    bottom: -search.displayNudge,
  },
  // Level with the magnifier, nudged up as it is: centred on the field rather than on the taller box it's drawn in.
  clear: {
    position: 'absolute',
    right: search.clearTrailing,
    top: '50%',
    marginTop: -search.clearSize / 2 + search.iconNudge.y,
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
  focusedRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: search.focused.gap },
  gone: { opacity: 0 },
  close: {
    width: search.focused.close,
    height: search.focused.close,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: { height: search.header.height, justifyContent: 'center' },
  headerField: { flex: 1, flexDirection: 'row', height: search.header.height },
  headerGlass: { flex: 1, height: search.header.height },
  headerContent: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  barRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: search.focused.gap },
  barField: { flex: 1, flexDirection: 'row' },
  // At the row's end, out of the field's layout.
  barClose: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  fromStart: { transformOrigin: 'left center' },
  clip: { position: 'absolute', top: 0, bottom: 0, overflow: 'hidden' },
  clipped: { position: 'absolute', top: 0, bottom: 0 },
  headerFill: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: search.header.height / 2 },
});
