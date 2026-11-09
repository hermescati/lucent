import { useIsFocused, useTheme } from 'expo-router';
import type { NativeStackHeaderProps } from 'expo-router/native-stack';
import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  processColor,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ColorValue,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BackButton } from './BackButton.android';
import { BarGlassPresenceContext, BarReturnContext } from './BarCapsule.android';
import { BarBackButtonContext, BarSearchButtonContext } from './BarItems.android';
import { Split } from './Split.android';
import { useBarTop } from './barTop.android';
import { useBarType, useLargeBlock } from './barType.android';
import { BarMeltContext, meltLook } from './melt.android';
import { displayCornerRadius } from '../../../core/display/corner.android';
import { useTabSearchActive } from '../../../core/tabs/TabBarReach';
import { backgroundOf } from '../page.android';
import { useHeaderSearchBlock } from './searchBlock.android';
import { getHeader } from './store.android';
import { useSwipeMelt } from './swipeMelt.android';
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { headerOffset, searchLift } from '../../../core/header/scroll.android';
import { withReturnDip } from '../../../core/motion/island';
import { useLucentTheme } from '../../../theme/LucentProvider';
import type { MenuTree } from '../menu/items';
import { BarSearch, HeaderSearch, SearchButton } from '../search/SearchField.android';
import { getSearch, searchFocusDrive, updateSearch } from '../search/store.android';
import { SwipeProgressContext, ahead, dimAt, swipePhase } from '../swipe/SwipeBack.android';
import { ScreenHiddenContext, StackBackContext, SwipeRoleContext } from '../swipe/role.android';
import {
  bar,
  barItem,
  barMargin,
  barMotion,
  islandReturn,
  search as searchMetrics,
  searchMotion,
  title,
} from '../tokens';
import type { LucentStackScreenOptions } from '../types';

const colorString = (value: ColorValue | undefined) => (typeof value === 'string' ? value : undefined);

/** The header is transparent unless the screen says otherwise, as on iOS 26. */
export const isTransparent = (value: NativeStackHeaderProps['options']['headerTransparent']) =>
  (typeof value === 'object' ? Platform.select(value) : value) !== false;

// native-stack always gets a transparent header, so the page runs under Lucent's bar either way and the bar, drawn in the
// page, stays at its top. Whether the app asked for an opaque one is kept here.
export const opaqueBar = 'lucentOpaqueBar';

/** Whether the app asked for a see-through bar: what it set as `headerTransparent`, before Lucent's stack overrode it. */
export const barTransparent = (options: NativeStackHeaderProps['options']) =>
  (options as Record<string, unknown>)[opaqueBar] !== true;

// The scroll edge: iOS 26 blurs the content away under the bar once it scrolls there. A flat pane of glass that only
// blurs does the same, and draws in glass's order, so content glass scrolling up goes under it rather than over the bar.
// Its blur and tint come in with the scroll; the soft edge's wash is `EdgeWash`, under it. The inline title goes inside it, to draw on top.
export const edgeGlass = {
  bezel: 0,
  refraction: 0,
  dispersion: 0,
  specular: 0,
  highlightWidth: 0,
  edgeSharp: 0,
  edgeSoft: 0,
  shadowRadius: 0,
  rimWidth: 0,
  insetShade: 0,
  // Square: the shader reads 0 as half the height, a capsule.
  cornerRadius: 0.1,
};

// A colour as red, green and blue, for the edge's tint.
const channels = (color: string) => {
  // Any colour React Native takes (hex, rgb(), names), as an ARGB integer.
  const n = Number(processColor(color) ?? 0);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};

interface ScrollEdgeProps {
  color: string;
  height: number;
  // How much it blurs and washes once fully in.
  blur: number;
  wash: number;
  // How far the content has scrolled under the row, from 0 at rest to 1 once the edge is fully in.
  under: SharedValue<number>;
  // How much further down it reaches, over a field that stays under the row.
  reach?: SharedValue<number>;
  // The hairline iOS draws along the edge's bottom, one device pixel tall, or none.
  line?: string;
  // More blur at the top, easing off to none at `to` (dp from the edge's top), as iOS's soft edge does, or none.
  fade?: { blur: number; to: number };
  // A strip under the edge, this tall, whose blur starts at `blur` and eases off to none, so a coloured block's sides
  // taper below the bar rather than turning sharp at once.
  tail?: { height: number; blur: number };
  // How much it saturates what's under it before washing it, once fully in.
  saturation?: number;
  // Drawn solid (no blur), what it covers what scrolls under it with: the page's own colour, as One UI's bar does.
  fallback?: ColorValue;
  // Drawn solid, how far it fades out over at its bottom (barMotion.solidFade).
  fallbackFade?: number;
  children: ReactNode;
}

const ScrollEdge = ({
  color,
  height,
  blur,
  wash,
  under,
  line,
  fade,
  tail,
  saturation = 1,
  fallback,
  fallbackFade,
  reach,
  children,
}: ScrollEdgeProps) => {
  const [r, g, b] = channels(color);
  // Through a swipe back or a push, the top screen's edge keeps to its rounded corners, as the screen does; the
  // uncovered screen's dims with the rest of it.
  const role = useContext(SwipeRoleContext);
  const swipe = useContext(SwipeProgressContext);
  const corner = useMemo(() => displayCornerRadius(), []);
  const { height: screenHeight } = useWindowDimensions();
  const animatedProps = useAnimatedProps(() => ({
    blurRadius: under.get() * blur,
    fadeBlur: fade ? under.get() * fade.blur : 0,
    tint: `rgba(${r}, ${g}, ${b}, ${under.get() * wash})`,
    saturation: 1 + under.get() * (saturation - 1),
    dim: role === 'below' && swipe ? dimAt(swipe.progress.get()) : 0,
  }));
  const cornerStyle = useAnimatedStyle(() => {
    const radius = role === 'top' && swipe && swipe.phase.get() !== swipePhase.idle ? corner : 0;
    return { borderTopLeftRadius: radius, borderTopRightRadius: radius };
  });
  const lineStyle = useAnimatedStyle(() => ({ opacity: under.get() }));
  const tailProps = useAnimatedProps(() => ({ fadeBlur: tail ? under.get() * tail.blur : 0 }));
  const edgeStyle = useAnimatedStyle(() => ({ height: height + (reach?.get() ?? 0) }));
  // Below the edge as it reaches further, moved rather than laid out again each frame.
  const tailStyle = useAnimatedStyle(() => ({ transform: [{ translateY: reach?.get() ?? 0 }] }));
  return (
    <Animated.View pointerEvents="none" style={[styles.edgeClip, { height: screenHeight }, cornerStyle]}>
      {tail ? (
        <AnimatedNativeGlassView
          {...edgeGlass}
          fadeTo={tail.height}
          lift
          animatedProps={tailProps}
          pointerEvents="none"
          style={[styles.edge, { top: height, height: tail.height }, tailStyle]}
        />
      ) : null}
      <AnimatedNativeGlassView
        {...edgeGlass}
        fallback={fallback}
        fallbackFade={fallbackFade}
        fadeTo={fade?.to}
        lift
        animatedProps={animatedProps}
        pointerEvents="none"
        style={[styles.edge, edgeStyle]}>
        {children}
        {line ? <Animated.View style={[styles.edgeLine, { backgroundColor: line }, lineStyle]} /> : null}
      </AnimatedNativeGlassView>
    </Animated.View>
  );
};

/**
 * The edge over the status bar alone, while search mode from the bottom hides the bar: iOS 27 keeps blurring and washing
 * what scrolls up under the status bar there, as over a bar with no title (untitledEdge), where the bar's own edge fades
 * with it. It comes in as the bar goes and goes as it comes back, and is taken away once gone: lifted glass draws over
 * what's under it at any opacity.
 */
const StatusEdge = ({
  shown,
  top,
  color,
  under,
  fallback,
}: {
  shown: boolean;
  top: number;
  color: string;
  under: SharedValue<number>;
  fallback?: ColorValue;
}) => {
  const [mounted, setMounted] = useState(shown);
  if (shown && !mounted) setMounted(true);
  const presence = useSharedValue(0);
  useEffect(() => {
    if (!mounted) return;
    presence.set(
      withTiming(shown ? 1 : 0, { duration: searchMotion.barFade }, (done) => {
        if (done && !shown) scheduleOnRN(setMounted, false);
      }),
    );
  }, [shown, mounted, presence]);
  const style = useAnimatedStyle(() => ({ opacity: presence.get() }));
  if (!mounted) return null;
  const { untitledEdge } = barMotion;
  const reach = top * untitledEdge.reach;
  return (
    <Animated.View pointerEvents="none" style={[styles.statusEdge, { height: reach }, style]}>
      <EdgeWash
        color={color}
        stops={[
          [untitledEdge.wash, top * untitledEdge.washTo],
          [0, reach],
        ]}
        under={under}
      />
      <ScrollEdge
        color={color}
        height={reach}
        blur={barMotion.softBlur}
        wash={0}
        under={under}
        fade={{ blur: barMotion.softFade, to: reach }}
        fallback={fallback}
        fallbackFade={top * (untitledEdge.reach - untitledEdge.washTo)}>
        {null}
      </ScrollEdge>
    </Animated.View>
  );
};

// A wash that fades down the screen's top, under the edge's glass, which blurs it with the content: `stops` are
// alphas at heights, in dp from the top, and it ends at the last.
const EdgeWash = ({
  color,
  stops,
  under,
}: {
  color: string;
  stops: [number, number][];
  under: SharedValue<number>;
}) => {
  const [r, g, b] = channels(color);
  const height = stops[stops.length - 1][1];
  const at = ([alpha, y]: [number, number]) => `rgba(${r}, ${g}, ${b}, ${alpha}) ${Math.max(0, (y / height) * 100)}%`;
  const style = useAnimatedStyle(() => ({ opacity: under.get() }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.edge,
        { height, backgroundImage: `linear-gradient(to bottom, ${stops.map(at).join(', ')})` },
        style,
      ]}
    />
  );
};

// iOS's rise: an exponential ease-out with `searchMotion.lift.settle` as its time constant, scaled to end at 1, a point
// past the row, from where it settles back.
const liftEasing = (t: number) => {
  'worklet';
  const k = searchMotion.lift.duration / searchMotion.lift.settle;
  return (1 - Math.exp(-k * t)) / (1 - Math.exp(-k));
};

// Rising into the row, past it and settling back; or going back down.
const liftTo = (risen: boolean, rise: number) => {
  'worklet';
  const { duration, overshoot, back } = searchMotion.lift;
  return risen
    ? withSequence(
        withTiming(rise + overshoot, { duration, easing: liftEasing }),
        withTiming(rise, { duration: back, easing: Easing.inOut(Easing.quad) }),
      )
    : withSpring(0, { ...searchMotion.drop, mass: 1, overshootClamping: true });
};

// The magnifier among the trailing items: it opens search, as the field does.
const searchButtonFor = (routeKey: string) => ({
  label: getSearch(routeKey)?.props.placeholder ?? 'Search',
  open: () => {
    getSearch(routeKey)?.props.onOpen?.();
    updateSearch(routeKey, { focused: true });
  },
});

type HeaderOptions = NativeStackHeaderProps['options'];

/** Whether the bar shows a back button: iOS hides it once a left item replaces it, unless the screen asks to keep both. */
export const showsBack = (options: HeaderOptions, canGoBack: boolean) =>
  canGoBack &&
  options.headerBackVisible !== false &&
  (options.headerLeft === undefined || options.headerBackVisible === true);

/**
 * Where the large title goes: none, under the bar's row, or on it, beside the buttons (`headerLargeTitleInline`). As
 * UIKit does, only a screen without a back button takes it onto the row; one with keeps it under.
 */
export const largeTitlePlacement = (options: HeaderOptions, back: boolean): 'none' | 'below' | 'row' => {
  if (options.headerLargeTitle !== true) return 'none';
  return (options as LucentStackScreenOptions).headerLargeTitleInline === true && !back ? 'row' : 'below';
};

const titleOf = (props: Pick<NativeStackHeaderProps, 'options' | 'route'>) =>
  typeof props.options.headerTitle === 'string' ? props.options.headerTitle : (props.options.title ?? props.route.name);

type Navigation = NativeStackHeaderProps['navigation'];

/**
 * The screens below this one, the nearest first, as UIKit lists them in the back button's menu. The first screen of a
 * nested stack goes back to the stack around it, as its back button does, so the list carries on there.
 */
const backHistory = (navigation: Navigation, backTitle: string | undefined): MenuTree | undefined => {
  const children: MenuTree['children'] = [];
  for (let level: Navigation | undefined = navigation; level; level = level.getParent<Navigation>()) {
    const stack = level;
    const { type, routes, index } = stack.getState();
    if (type !== 'stack') continue;
    for (let i = index - 1; i >= 0; i--) {
      const route = routes[i];
      const header = getHeader(route.key);
      // A screen without a bar of its own, such as the tabs around a stack, has no title to list, unless it's the one
      // the back button already names.
      const label = header ? titleOf(header) : children.length === 0 ? backTitle : undefined;
      if (!label) continue;
      children.push({
        kind: 'action',
        key: route.key,
        label,
        destructive: false,
        disabled: false,
        keepPresented: false,
        onPress: () => stack.pop(index - i),
      });
    }
  }
  return children.length ? { children } : undefined;
};

// Buttons popping in: the capsules come almost at once, and the icons sharpen as it settles.
/**
 * iOS 26's navigation bar on Android: glass items in a row at the top, the title centred between them or large below,
 * collapsing into the bar as the content scrolls. native-stack renders it for each screen through `header`.
 */
/**
 * The back button beside leading items that aren't `Stack.Toolbar`'s, as `headerBackVisible` brings it or takes it
 * away: it splits off them or melts back in (`Split`), on its own glass, so with no neck. Without leading items, it just
 * shows or goes.
 */
const BackSplit = ({ shown, beside, children }: { shown: boolean; beside: boolean; children: ReactNode }) => {
  const [mounted, setMounted] = useState(shown);
  // There with the screen, it just shows; brought later, it splits off.
  const [appear, setAppear] = useState(false);
  if (shown && !mounted) {
    setMounted(true);
    setAppear(true);
  }
  const gone = useCallback(() => setMounted(false), []);
  if (!beside) return shown ? children : null;
  if (!mounted) return null;
  return (
    <Split shown={shown} appear={appear} toward="end" size={bar.row} onGone={gone}>
      {children}
    </Split>
  );
};

export const Header = ({ options, route, navigation, back }: NativeStackHeaderProps) => {
  const top = useBarTop();
  const { color, scheme, solid } = useLucentTheme();
  const { colors } = useTheme();
  const scrolled = headerOffset(route.key);
  const { block, hidden: searchHides, collapses, button, focusedInBar, barFocused } = useHeaderSearchBlock(route.key);
  // The tab bar's search tab, in search mode, hides its root screen's bar, as iOS 27 does.
  const tabSearch = useTabSearchActive();
  const focused = useIsFocused();
  const hidden = searchHides || (tabSearch && focused && navigation.getState().routes[0]?.key === route.key);
  // The row steps aside for search: a field rising into it, or one opening in it from the magnifier.
  const rowAside = focusedInBar || barFocused;
  // Search opened from the magnifier stays up as it plays back out, once closed.
  const [barSearchShown, setBarSearchShown] = useState(barFocused);
  if (barFocused && !barSearchShown) setBarSearchShown(true);
  const closeBarSearch = useCallback(() => setBarSearchShown(false), []);
  // Where a field in the bar's block starts, which it rises from.
  const [blockTop, setBlockTop] = useState(0);
  const rise = Math.max(blockTop - top, 0);
  const lift = searchLift(route.key);
  const searchProgress = useDerivedValue(() => (rise > 0 ? lift.get() / rise : 0));
  // The row's title and buttons step aside as it comes.
  // How far the field opening from the magnifier has stretched out of the trailing capsule, 0 to 1: the row's title,
  // the magnifier and the capsule's glass go the frame it starts, as iOS 27's do.
  const fieldStretch = useSharedValue(0);
  // 1 from the moment it starts closing, at the close button's press, until it next opens; everything that comes back
  // with it follows its stretch from then, on the UI thread, rather than this render.
  const fieldClosing = useSharedValue(0);
  // 1 from the magnifier's press, or search mode starting, until it starts closing: the row's title and buttons go with
  // it, on the UI thread.
  const fieldOpen = useSharedValue(0);
  const opening = useDerivedValue(() => fieldOpen.get() === 1 && fieldStretch.get() > 0);
  // The field's opening, which the magnifier starts at its press.
  const startField = useRef<(() => void) | null>(null);
  // Landing back in the trailing capsule, the field swells as it nears it and the capsule takes the swell over and
  // deflates, as iOS 27's island does taking the field back in: one piece of glass, not one swapped for another.
  const landSwell = useSharedValue(0);
  useAnimatedReaction(
    () => fieldStretch.get(),
    (now, was) => {
      if (fieldClosing.get() !== 1 || was === null) return;
      const { from, at, peak, settle } = searchMotion.bar.land;
      // Swelling as it nears, and deflating once it's arrived, as the last of its stretch eases out.
      if (now > at) landSwell.set(interpolate(now, [at, from], [peak, 0], 'clamp'));
      else if (was > at) landSwell.set(withTiming(0, { duration: settle, easing: Easing.inOut(Easing.quad) }));
    },
  );
  // Closing, it comes back last, once the field is back in its capsule.
  const magnifierBack = useSharedValue(1);
  const magnifierShows = useDerivedValue<number>(() =>
    fieldOpen.get() === 1 ? (opening.get() ? 0 : 1) : magnifierBack.get(),
  );
  // The same from one render to the next, so opening search doesn't redraw the bar's items.
  const placeholder = getSearch(route.key)?.props.placeholder;
  const searchButton = useMemo(() => {
    const plain = searchButtonFor(route.key);
    const open = () => {
      if (!startField.current) return plain.open();
      getSearch(route.key)?.props.onOpen?.();
      startField.current();
    };
    return { ...plain, open, label: placeholder ?? 'Search', shows: magnifierShows, land: landSwell };
  }, [route.key, placeholder, magnifierShows, landSwell]);
  const rowStyle = useAnimatedStyle(() => {
    // Opening from the magnifier, iOS has them gone at once.
    if (fieldOpen.get() === 1) return { opacity: opening.get() ? 0 : 1 };
    // Closing from the magnifier, the title comes back as the field draws away from it.
    if (fieldClosing.get() === 1) {
      const { from, to } = searchMotion.bar.titleIn;
      return { opacity: interpolate(fieldStretch.get(), [to, from], [1, 0], 'clamp') };
    }
    if (!rowAside) {
      return { opacity: withTiming(1, { duration: searchMotion.rowIn }) };
    }
    // Opening from the magnifier, iOS has them gone at once.
    if (barFocused) return { opacity: opening.get() ? 0 : 1 };
    return { opacity: withTiming(0, { duration: searchMotion.rowOut }) };
  });
  const returnScale = useSharedValue(1);
  const returnDip = useSharedValue(0);
  // The leading side the same, but back at once closing from the magnifier: its back button buds off the field's start.
  const leadStyle = useAnimatedStyle(() => {
    if (fieldOpen.get() === 1) return { opacity: opening.get() ? 0 : 1 };
    // Shown with its return under way, not the frame before it, when it'd be whole under the field.
    if (fieldClosing.get() === 1) return { opacity: returnScale.get() !== 1 || fieldStretch.get() === 0 ? 1 : 0 };
    if (!rowAside) {
      return { opacity: withTiming(1, { duration: searchMotion.rowIn }) };
    }
    if (barFocused) return { opacity: opening.get() ? 0 : 1 };
    return { opacity: withTiming(0, { duration: searchMotion.rowOut }) };
  });
  // Back from search, the leading capsules grow back and sink a little as the field closes up beside them, as iOS 27's
  // back button does.
  const returning = useMemo(() => ({ scale: returnScale, dip: returnDip }), [returnScale, returnDip]);
  const comeBack = useCallback(() => {
    returnScale.set(islandReturn.from);
    returnScale.set(withSpring(1, islandReturn.spring));
    returnDip.set(withReturnDip());
  }, [returnScale, returnDip]);
  // As a field that rose into the row goes back down out of its way, or as one opened from the magnifier draws back
  // into the trailing capsule, its back button budding off its start; the magnifier comes back last.
  const wasRisen = useRef(focusedInBar);
  useEffect(() => {
    if (wasRisen.current && !focusedInBar) comeBack();
    wasRisen.current = focusedInBar;
  }, [focusedInBar, comeBack]);
  // Before the commit paints, so the back button shows small on its first frame rather than whole and then shrinking.
  useAnimatedReaction(
    () => fieldOpen.get(),
    (now, was) => {
      if (now === 1 && was === 0) {
        magnifierBack.set(0);
        landSwell.set(0);
      }
    },
  );
  useAnimatedReaction(
    () => fieldClosing.get(),
    (now, was) => {
      if (now !== 1 || was !== 0) return;
      // Slower than beside a field going back down: it buds off the field's start and grows with it as it draws away.
      const { from, spring } = searchMotion.bar.backReturn;
      returnScale.set(from);
      returnScale.set(withSpring(1, spring));
      returnDip.set(withReturnDip());
      const { delay, duration } = searchMotion.bar.magnifierIn;
      magnifierBack.set(withDelay(delay, withTiming(1, { duration })));
    },
  );
  // A search field in the bar scrolls away first; the rest of the bar follows the scroll that's left.
  const offset = useDerivedValue(() =>
    collapses ? scrolled.get() - Math.min(Math.max(scrolled.get(), 0), block) : scrolled.get(),
  );
  const searchStyle = useAnimatedStyle(() => {
    const shrink = collapses ? Math.min(Math.max(scrolled.get(), 0), block) : 0;
    return {
      height: block - shrink,
      opacity: interpolate(shrink, [0, searchMetrics.header.height / 2], [1, 0], Extrapolation.CLAMP),
      transform: [{ translateY: -lift.get() }],
    };
  });
  // In search mode from the bottom toolbar, iOS hides the bar.
  const shownStyle = useAnimatedStyle(() => ({
    opacity: withTiming(hidden ? 0 : 1, { duration: searchMotion.barFade }),
  }));

  const transparent = barTransparent(options);
  const background = colorString(StyleSheet.flatten(options.headerStyle)?.backgroundColor);
  // iOS 27 draws the bar's glass buttons in the text colour whatever `headerTintColor` says, and gives the tint to the
  // title instead (simulator, on a coloured bar). A toolbar's or button's own `tintColor` still colours its glyphs.
  const tint = color.text;
  const label = titleOf({ options, route });
  const custom =
    typeof options.headerTitle === 'function' ? options.headerTitle({ children: label, tintColor: tint }) : null;

  const showBack = showsBack(options, back !== undefined);
  const placement = largeTitlePlacement(options, showBack);
  const large = placement !== 'none';
  // The large title under the row, in a block of its own, which scrolls away; on the row, the bar is an inline one's.
  const below = placement === 'below';
  const left = options.headerLeft?.({ tintColor: tint, canGoBack: back !== undefined, label: back?.title });
  const right = options.headerRight?.({ tintColor: tint, canGoBack: back !== undefined });

  const largeBlock = useLargeBlock();
  const height = top + bar.inline + (below ? largeBlock : 0) + block;
  // Focused, a field in the bar rises from its block into the row, as on iOS, and the content follows it up. In search
  // mode from the bottom, the bar hides and the content moves up into the part of it that shows.
  // A field in the bar's block rises, or goes back down, on the frame after search mode changes, before the render that
  // follows, which leaves `lifted` saying so.
  const focusDrive = useMemo(() => searchFocusDrive(route.key), [route.key]);
  const lifted = useSharedValue(-1);
  const inBlock = block > 0;
  useAnimatedReaction(
    () => focusDrive.get(),
    (now, was) => {
      if (was === null || now === was || !inBlock || hidden) return;
      lift.set(liftTo(now === 1, rise));
      lifted.set(now);
    },
  );
  useEffect(() => {
    if (hidden) {
      const shows = bar.inline + Math.max(height - top - bar.inline - Math.max(scrolled.get(), 0), 0);
      lift.set(withSpring(shows, { ...searchMotion.hide, mass: 1, overshootClamping: true }));
      return;
    }
    // Already on its way.
    if (lifted.get() === (focusedInBar ? 1 : 0)) {
      lifted.set(-1);
      return;
    }
    lift.set(liftTo(focusedInBar, rise));
  }, [lift, lifted, focusedInBar, rise, hidden, height, top, scrolled]);
  // An opaque bar covers what's under it, down to its bottom, which rides up with the content until only the row's left.
  const fillStyle = useAnimatedStyle(() => ({
    height: Math.max(top + bar.inline, height - Math.max(scrolled.get(), 0)),
  }));
  const collapsible = below;
  // Measured from finger drags recorded on the simulator: the large title rides up with the content, into the bar's row,
  // until the content has scrolled its block away. Then the two titles cross-fade on a clock, not with the scroll: the
  // large one goes in 150ms, the inline one comes in over 300ms, eased out: on iOS 27 it is a third of the way in by 33ms
  // and half by 66ms. Scrolling back reverses both, the inline title slower and eased in and out. On the row, the large
  // title stays where it is and the cross-fade starts as soon as content runs under the bar.
  const collapsed = useDerivedValue(() => large && offset.get() >= (below ? largeBlock : barMotion.rowTitleAt));
  // Each title blurs as it fades, as iOS's do: the large one out of focus as it goes, the inline one into focus.
  const largeGone = useDerivedValue(() => withTiming(collapsed.get() ? 1 : 0, { duration: barMotion.largeFade }));
  const inlineIn = useDerivedValue(() =>
    large
      ? collapsed.get()
        ? withTiming(1, { duration: barMotion.inlineFade, easing: Easing.out(Easing.quad) })
        : withTiming(0, { duration: barMotion.inlineFadeOut, easing: Easing.inOut(Easing.quad) })
      : 1,
  );
  // Up as the content scrolls; down with it as a list's pull to refresh pulls it (a negative offset), as iOS's comes.
  const largeStyle = useAnimatedStyle(() => {
    const y = collapsible ? offset.get() : 0;
    return { transform: [{ translateY: -y }], opacity: 1 - largeGone.get() };
  });
  const largeBlur = useAnimatedProps(() => ({ radius: largeGone.get() * barMotion.titleBlur }));
  // The copy in the edge's glass rises as a whole: Android doesn't draw a view whose box is outside its parent's, what
  // it holds included, and it starts just below the edge.
  const largeEdgeRise = useAnimatedStyle(() => ({
    transform: [{ translateY: -(collapsible ? offset.get() : 0) }],
  }));
  const largeEdgeFade = useAnimatedStyle(() => ({ opacity: 1 - largeGone.get() }));
  // Rising into the row as it comes, sinking as it goes, from a large title under the row; one beside the buttons, on
  // the row already, cross-fades with it where it stands, as iOS 27's does.
  const inlineUp = useDerivedValue(() =>
    large && below
      ? collapsed.get()
        ? withTiming(1, { duration: barMotion.inlineRiseIn, easing: Easing.out(Easing.cubic) })
        : withTiming(0, { duration: barMotion.inlineRiseOut, easing: Easing.inOut(Easing.quad) })
      : 1,
  );
  const inlineStyle = useAnimatedStyle(() => ({
    opacity: inlineIn.get(),
    transform: [{ translateY: (1 - inlineUp.get()) * barMotion.inlineRise }],
  }));
  // Coming, it sharpens as it fades in; going, it's soft almost at once.
  const inlineBlur = useAnimatedProps(() => {
    const out = 1 - inlineIn.get();
    return {
      radius: (collapsed.get() ? out : Math.min(out / barMotion.inlineBlurBy, 1)) * barMotion.titleBlur,
    };
  });

  // The edge comes in once content runs under the row: right away for an inline bar, after the large title's block.
  const under = useDerivedValue(() =>
    interpolate(offset.get() - (below ? largeBlock : 0), [0, barMotion.edgeOver], [0, 1], Extrapolation.CLAMP),
  );

  // A pushed screen's inline title doesn't slide in with it on an opaque bar: it fades in where it stands, a beat after
  // the push starts (measured from a recording of the simulator).
  const entrance = useSharedValue(back ? 0 : 1);
  const itemsStyle = useAnimatedStyle(() => ({ opacity: entrance.get() }));

  // The buttons hold against the slide and melt in and out with their screen (`useSwipeMelt`). A back button both
  // screens have stays put.
  const role = useContext(SwipeRoleContext);
  const goBack = useContext(StackBackContext);
  const swipe = useContext(SwipeProgressContext);
  const { width } = useWindowDimensions();
  const { melt, holdStyle, crossStyle, meltStyle, meltBlur } = useSwipeMelt(Boolean(back));
  // Whether the screen this one moves against has a back button too, so the button stays put rather than melting: on
  // top, the one below has one if it isn't the first; below, the one on top always has one. Settled at the start of
  // each push or swipe and kept until the next, by the screen's own place in the stack, not the stack's top: that drops
  // as a pop lands, and the button would melt in again on the screen it stayed on.
  const position = navigation.getState().routes.findIndex((entry) => entry.key === route.key);
  const backStays = useSharedValue(position >= 2);
  // The title comes in once the screen does: as a push slides it in, or, for a screen shown another way, once the bar
  // is up.
  const screenHidden = useContext(ScreenHiddenContext);
  useAnimatedReaction(
    () => screenHidden?.get() ?? 0,
    (now, before) => {
      if (now !== 0 || before === 0) return;
      entrance.set(
        withDelay(
          barMotion.itemsDelay,
          withTiming(1, { duration: barMotion.itemsFade, easing: Easing.out(Easing.quad) }),
        ),
      );
    },
  );
  // The back button both screens have: the one going hides as the other shows, the same button in the same place.
  // Beside `Stack.Toolbar`'s leading items, the back button goes on their glass, to split off it and melt back into it.
  const backOnBar =
    back !== undefined && Boolean((options.headerLeft as { lucentBarItems?: boolean } | undefined)?.lucentBarItems);
  useAnimatedReaction(
    () => swipe?.phase.get() ?? swipePhase.idle,
    (phase, previous) => {
      if (previous === null || phase === previous || phase === swipePhase.idle || !role) return;
      backStays.set(role === 'below' ? position >= 1 : position >= 2);
    },
  );
  // Staying, the same button in the same place: the one going hides as the other shows. Otherwise it melts with the
  // screen's other buttons. Either way it's the one view, so it isn't drawn again as the stack changes.
  const backStyle = useAnimatedStyle(() => {
    if (!backStays.get()) {
      const look = meltLook(melt.get());
      return { opacity: look.opacity, transform: [{ scale: look.scale }] };
    }
    const phase = swipe?.phase.get() ?? swipePhase.idle;
    const shown = !role || phase === swipePhase.idle || (role === 'top') !== (phase === swipePhase.going);
    return { opacity: shown ? 1 : 0, transform: [{ scale: 1 }] };
  });
  const backBlur = useAnimatedProps(() => ({ radius: backStays.get() ? 0 : meltLook(melt.get()).blur }));

  const titleColor =
    colorString(StyleSheet.flatten(options.headerTitleStyle)?.color) ??
    colorString(options.headerTintColor) ??
    color.text;
  // iOS's edge washes towards the system background, white or black, whatever the page's own colour: over a grouped
  // page's grey it lightens, and over its cards in dark mode it darkens.
  const hard = options.scrollEdgeEffects?.top === 'hard';
  // iOS's soft edge, asked for by name, fades out below the bar; left to the system, the edge is a flat band with a
  // hairline along its bottom.
  // A field that stays under the row gets the soft one unless the screen asks otherwise: no line, and what runs behind
  // the row stays readable through it (iOS 27 simulator).
  const pinned = block > 0 && !collapses;
  const soft = options.scrollEdgeEffects?.top === 'soft' || (pinned && options.scrollEdgeEffects?.top === undefined);
  // With no title, iOS's edge only covers the status bar, fading out well above the buttons, with no line.
  // A view in the title's place counts as none: iOS draws a titleView's bar as a bare one (iOS 27 simulator).
  const untitled = !hard && !large && (custom !== null || !label);
  // A field that stays under the row is in the edge too, down to its bottom (iOS 27 simulator). One that scrolls away is
  // gone before the edge comes in. Rising into the row, focused, it takes the edge back up with it.
  const pinnedReach = pinned ? bar.inline + searchMetrics.header.height - bar.row - barMotion.edgeReach : 0;
  const edgeReach = useDerivedValue(() => pinnedReach * (1 - Math.min(Math.max(searchProgress.get(), 0), 1)));
  const rowMiddle = top + bar.row / 2;
  const washStops: [number, number][] | null = untitled
    ? [
        [barMotion.untitledEdge.wash, top * barMotion.untitledEdge.washTo],
        [0, top * barMotion.untitledEdge.reach],
      ]
    : soft
      ? barMotion.edgeWash.stops[scheme].map(([alpha, y]): [number, number] => [alpha, rowMiddle + y])
      : null;
  // The soft edge washes towards a near-black grey in dark mode (iOS lifts black under it), the hard one to black.
  const wash = scheme === 'dark' ? (hard ? '#000000' : barMotion.edgeWash.dark) : '#FFFFFF';
  // UIKit centres the inline title when it fits between the bar's two sides with room to spare, and otherwise starts it
  // after the leading side, the bar's gap from it, cut short before the trailing side: Wallet's title sits beside its
  // back button. It needs the bar's 12pt gap from each side's buttons and no more (iOS 27 simulator: "Wallet ID" centres
  // 13.7pt from three icons, "Wallet IDs", which would come 9.2pt from them, starts after the back button).
  const [sides, setSides] = useState({ left: 0, right: 0, title: 0 });
  // The trailing side widens for a moment as a button melts into or splits off its capsule, the old and new both there:
  // the title waits that out before it moves for a wider side, and takes a narrower one at once.
  const measure = (key: keyof typeof sides) => (event: LayoutChangeEvent) => {
    const value = event.nativeEvent.layout.width;
    setSides((current) => (current[key] === value ? current : { ...current, [key]: value }));
  };
  const widening = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightNow = useRef(0);
  useEffect(() => () => clearTimeout(widening.current ?? undefined), []);
  const measureRight = useCallback((event: LayoutChangeEvent) => {
    const value = event.nativeEvent.layout.width;
    const apply = () => {
      rightNow.current = value;
      setSides((current) => (current.right === value ? current : { ...current, right: value }));
    };
    clearTimeout(widening.current ?? undefined);
    widening.current = null;
    if (rightNow.current > 0 && value > rightNow.current) widening.current = setTimeout(apply, barMotion.sideSettle);
    else apply();
  }, []);
  const margin = barMargin(width);
  // The trailing capsule becomes the field: its glass goes at once, the field's taking its place (lifted glass is drawn
  // by the backdrop, which an opacity around it doesn't reach), and its items ride the field's start as it grows,
  // fading out, as iOS 27's do. Its glass is back once the field has drawn back into it.
  // On the UI thread, from the field's own stretch, so the capsule's glass is back the frame the field's goes.
  const trailGlass = useDerivedValue<number>(() => (fieldOpen.get() === 1 || fieldStretch.get() > 0 ? 0 : 1));
  // How far that takes the field's start, which the trailing capsule's items ride.
  const fieldReach = Math.max(width - margin * 2 - Math.max(sides.right, barItem.height), 0);
  // Their fade, started once as what it's heading for changes: started from a style that runs every frame the field
  // stretches, it would start over each frame and crawl.
  const trailFade = useSharedValue(1);
  useAnimatedReaction(
    () => {
      if (fieldClosing.get() === 1) return 'closing';
      if (opening.get() || barFocused) return 'out';
      return rowAside ? 'aside' : 'in';
    },
    (now, previous) => {
      if (now === previous) return;
      // Closing, they follow the field's stretch (below), back in full by the time it lands.
      if (now === 'closing') trailFade.set(1);
      else if (now === 'out') trailFade.set(withTiming(0, { duration: searchMotion.bar.itemsOut }));
      else if (now === 'in') trailFade.set(withTiming(1, { duration: searchMotion.rowIn }));
      else trailFade.set(withTiming(0, { duration: searchMotion.rowOut }));
    },
    [barFocused, rowAside],
  );
  const trailStyle = useAnimatedStyle(() => {
    if (opening.get()) {
      return {
        opacity: trailFade.get(),
        transform: [{ translateX: -fieldStretch.get() * fieldReach * ahead }],
      };
    }
    // Closing from the magnifier, its items ride the field's start back into the capsule, the open run backwards,
    // showing as it nears the capsule.
    if (fieldClosing.get() === 1) {
      const stretch = fieldStretch.get();
      return {
        opacity: interpolate(stretch, [0, searchMotion.bar.itemsIn], [1, 0], 'clamp'),
        transform: [{ translateX: -stretch * fieldReach * ahead }],
      };
    }
    if (!rowAside) return { opacity: trailFade.get(), transform: [{ translateX: 0 }] };
    if (barFocused) {
      return {
        opacity: trailFade.get(),
        transform: [{ translateX: -fieldStretch.get() * fieldReach * ahead }],
      };
    }
    return { opacity: trailFade.get() };
  });
  const type = useBarType();
  // The back button's room: the bar less its margins, the trailing side, and the title beside it.
  const backRoom =
    width -
    2 * margin -
    (sides.right > 0 ? sides.right + bar.groupGap : 0) -
    (custom === null && label ? sides.title + bar.groupGap : 0);
  const backButton = (
    <BackButton
      label={options.headerBackTitle ?? back?.title}
      displayMode={options.headerBackButtonDisplayMode}
      room={backRoom}
      color={tint}
      onPress={() => (goBack ? goBack() : navigation.goBack())}
      history={
        options.headerBackButtonMenuEnabled === false
          ? undefined
          : backHistory(navigation, options.headerBackTitle ?? back?.title)
      }
    />
  );
  const leftEnd = margin + sides.left + (sides.left > 0 ? bar.groupGap : 0);
  const rightStart = width - margin - sides.right - (sides.right > 0 ? bar.groupGap : 0);
  const centredLeft = (width - sides.title) / 2;
  const centred = custom !== null || (centredLeft >= leftEnd && centredLeft + sides.title <= rightStart);
  // Only a title that cross-fades with a large one blurs: the others go without the blur's layer.
  const inlineText = custom ?? (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      accessibilityRole="header"
      style={[styles.inlineTitle, type.inline, centred ? null : styles.inlineLeading, { color: titleColor }]}>
      {label}
    </Text>
  );
  // The large title on the buttons' row. With the edge's glass, it's drawn in it, as the inline title is: the glass is
  // drawn over the row, and the solid fallback paints it in the page's colour from the start.
  const rowLarge = (
    <View pointerEvents="none" style={[styles.rowTitle, styles.leading]}>
      <Animated.Text
        numberOfLines={1}
        allowFontScaling={false}
        accessibilityRole="header"
        style={[
          styles.largeTitle,
          type.large,
          styles.largeOnRow,
          { paddingHorizontal: margin, color: titleColor },
          largeStyle,
        ]}>
        {label}
      </Animated.Text>
    </View>
  );
  const inlineTitle = (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.inline,
        !centred && { left: leftEnd, right: width - rightStart, alignItems: 'flex-start' },
        inlineStyle,
      ]}>
      {large ? (
        <AnimatedNativeGlassBlur
          animatedProps={inlineBlur}
          style={[styles.titleBlur, !centred && styles.titleBlurLeading]}>
          {inlineText}
        </AnimatedNativeGlassBlur>
      ) : (
        inlineText
      )}
    </Animated.View>
  );
  // The large title below the row. The edge's glass is drawn over everything, so as the title rides up under it and
  // fades, a copy drawn in the glass shows it there, as iOS's stays in view as it goes (one for screen readers).
  const largeText = (heading: boolean) => (
    <AnimatedNativeGlassBlur animatedProps={largeBlur} style={styles.leading}>
      <Animated.Text
        numberOfLines={1}
        allowFontScaling={false}
        accessibilityRole={heading ? 'header' : undefined}
        importantForAccessibility={heading ? 'auto' : 'no-hide-descendants'}
        style={[
          styles.largeTitle,
          type.large,
          { paddingHorizontal: margin, color: titleColor },
          heading ? largeStyle : largeEdgeFade,
        ]}>
        {label}
      </Animated.Text>
    </AnimatedNativeGlassBlur>
  );
  // The title's own width, unclipped, to decide where it goes.
  const titleMeasure = custom ? null : (
    <Text
      numberOfLines={1}
      onLayout={measure('title')}
      allowFontScaling={false}
      style={[styles.inlineTitle, type.inline, styles.measure]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {label}
    </Text>
  );

  return (
    <>
      <Animated.View
        pointerEvents={hidden ? 'none' : 'box-none'}
        // Gone in search mode, out of TalkBack's reach too, as VoiceOver can't reach iOS's hidden bar.
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
        style={[styles.header, { height, paddingTop: top }, shownStyle]}>
        {transparent && washStops ? <EdgeWash color={background ?? wash} stops={washStops} under={under} /> : null}
        {transparent ? null : (
          <Animated.View
            pointerEvents="none"
            style={[styles.edge, { backgroundColor: background ?? barMotion.opaqueFill[scheme] }, fillStyle]}
          />
        )}
        {transparent ? (
          <ScrollEdge
            color={background ?? wash}
            height={
              untitled
                ? top * barMotion.untitledEdge.reach
                : top + bar.row + (solid ? barMotion.solidFade : barMotion.edgeReach)
            }
            reach={untitled ? undefined : edgeReach}
            blur={hard ? barMotion.hardBlur : soft || untitled ? barMotion.softBlur : barMotion.edgeBlur[scheme]}
            wash={hard ? barMotion.hardTint[scheme] : washStops ? 0 : barMotion.edgeTint}
            saturation={hard ? barMotion.hardSaturation[scheme] : 1}
            line={hard || washStops || solid ? undefined : barMotion.edgeLine[scheme]}
            fade={
              hard
                ? undefined
                : untitled
                  ? { blur: barMotion.softFade, to: top * barMotion.untitledEdge.reach }
                  : soft
                    ? { blur: barMotion.softFade, to: top + bar.row }
                    : { blur: barMotion.edgeFade, to: top + bar.row * barMotion.edgeFadeTo }
            }
            tail={
              soft && !untitled && !solid
                ? { height: barMotion.edgeTail.reach, blur: barMotion.edgeTail.blur }
                : undefined
            }
            fallback={solid ? backgroundOf(options, colors.background) : undefined}
            fallbackFade={
              untitled ? top * (barMotion.untitledEdge.reach - barMotion.untitledEdge.washTo) : barMotion.solidFade
            }
            under={under}>
            {untitled ? null : (
              <Animated.View style={[styles.titleRow, { marginTop: top }, rowStyle]}>{inlineTitle}</Animated.View>
            )}
            {placement === 'row' ? (
              <View pointerEvents="none" style={[styles.largeOnEdge, { top }]}>
                {rowLarge}
              </View>
            ) : null}
            {below ? (
              <Animated.View
                pointerEvents="none"
                style={[styles.largeInEdge, { top: top + bar.inline, height: largeBlock }, rowStyle, largeEdgeRise]}>
                {largeText(false)}
              </Animated.View>
            ) : null}
          </ScrollEdge>
        ) : null}
        {/* Up ahead of time, out of sight, so it opens on the first frame; under the row, whose trailing items fade out
      over it as it grows out of their capsule. */}
        {button || barSearchShown ? (
          <View
            // Up ahead of time, out of sight, it lets touches through to the row under it (the glass view in it doesn't
            // take a pointerEvents of its own).
            pointerEvents={barFocused ? 'box-none' : 'none'}
            style={[styles.barSearch, { top, left: margin, right: margin }]}>
            <BarSearch
              routeKey={route.key}
              from={sides.right}
              open={barFocused}
              stretch={fieldStretch}
              closing={fieldClosing}
              land={landSwell}
              opened={fieldOpen}
              starterRef={startField}
              onClosed={closeBarSearch}
            />
          </View>
        ) : null}
        <Animated.View
          pointerEvents={rowAside ? 'none' : 'box-none'}
          style={[styles.row, { paddingHorizontal: margin }]}>
          {titleMeasure}
          {placement === 'row' && !transparent ? rowLarge : null}
          {/* Without the edge's glass to draw in: an opaque bar's title, or a view in a bare bar's, which draws whole. */}
          {transparent && !untitled ? null : (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, itemsStyle]}>
              <Animated.View style={[StyleSheet.absoluteFill, rowStyle]}>{inlineTitle}</Animated.View>
            </Animated.View>
          )}
          <Animated.View
            pointerEvents="box-none"
            style={[styles.side, holdStyle, leadStyle]}
            onLayout={measure('left')}>
            <BarReturnContext value={returning}>
              {back && !backOnBar ? (
                <BackSplit shown={showBack} beside={Boolean(left)}>
                  <AnimatedNativeGlassBlur pointerEvents="box-none" style={backStyle} animatedProps={backBlur}>
                    {backButton}
                  </AnimatedNativeGlassBlur>
                </BackSplit>
              ) : null}
              {/* Only with something in it: an empty one would count the side's gap after the back button. */}
              {left ? (
                <AnimatedNativeGlassBlur
                  pointerEvents="box-none"
                  style={[styles.side, meltStyle]}
                  animatedProps={meltBlur}>
                  <BarBackButtonContext value={backOnBar ? { element: backButton, shown: showBack } : null}>
                    {left}
                  </BarBackButtonContext>
                </AnimatedNativeGlassBlur>
              ) : null}
            </BarReturnContext>
          </Animated.View>
          <AnimatedNativeGlassBlur
            pointerEvents="box-none"
            style={[styles.side, holdStyle]}
            animatedProps={meltBlur}
            onLayout={measureRight}>
            <Animated.View pointerEvents="box-none" style={[styles.side, meltStyle]}>
              <Animated.View
                pointerEvents="box-none"
                // Out of reach while search is open, the magnifier left under the field among them.
                importantForAccessibility={rowAside ? 'no-hide-descendants' : 'auto'}
                style={[styles.side, trailStyle]}>
                <BarGlassPresenceContext value={trailGlass}>
                  <BarMeltContext value={melt}>
                    {right ? (
                      <BarSearchButtonContext value={button ? searchButton : null}>{right}</BarSearchButtonContext>
                    ) : button ? (
                      <SearchButton routeKey={route.key} inBar />
                    ) : null}
                  </BarMeltContext>
                </BarGlassPresenceContext>
              </Animated.View>
            </Animated.View>
          </AnimatedNativeGlassBlur>
        </Animated.View>
        {below ? (
          <Animated.View pointerEvents="none" style={[styles.largeBlock, { height: largeBlock }, rowStyle]}>
            {largeText(true)}
          </Animated.View>
        ) : null}
        {block ? (
          // A field that stays under the row is the bar's, not the page's: it holds still as the pages slide and fades
          // with the swipe, as iOS 27's does. One under a large title scrolls with the page, and slides with it.
          <Animated.View
            style={[styles.searchHold, !below && styles.searchBelowRow, pinned && !below && crossStyle]}
            onLayout={(event) => setBlockTop(event.nativeEvent.layout.y)}>
            <Animated.View style={[styles.searchBlock, focusedInBar && styles.searchOpen, searchStyle]}>
              <HeaderSearch routeKey={route.key} progress={searchProgress} />
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>
      {transparent ? (
        <StatusEdge
          shown={searchHides}
          top={top}
          color={wash}
          under={under}
          fallback={solid ? backgroundOf(options, colors.background) : undefined}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  header: {},
  edge: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Clips the lifted edge to its screen's rounded corners while it moves.
  edgeClip: { position: 'absolute', top: 0, left: 0, right: 0, overflow: 'hidden' },
  edgeLine: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth },
  statusEdge: { position: 'absolute', top: 0, left: 0, right: 0 },
  titleRow: { height: bar.row },
  row: {
    height: bar.row,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  side: { flexDirection: 'row', alignItems: 'center', gap: bar.groupGap },
  inline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineTitle: { ...title.inline, includeFontPadding: false, maxWidth: '50%' },
  inlineLeading: { maxWidth: '100%' },
  // Room around the title for its blur to spread into.
  titleBlur: { padding: barMotion.titleBlur * 2, margin: -barMotion.titleBlur * 2, alignItems: 'center' },
  titleBlurLeading: { alignItems: 'flex-start', maxWidth: '100%' },
  measure: { position: 'absolute', opacity: 0, maxWidth: undefined },
  searchHold: { overflow: 'visible' },
  searchBlock: { overflow: 'hidden' },
  // Focused, it stays whole: the close button swells and grows under the finger past the block's edges.
  searchOpen: { overflow: 'visible' },
  barSearch: {
    position: 'absolute',
    height: bar.row,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBelowRow: { marginTop: bar.inline - bar.row },
  // Not clipped: the large title rides up into the bar's row before it fades, as on iOS.
  largeBlock: { height: bar.large, marginTop: bar.inline - bar.row },
  largeInEdge: { position: 'absolute', left: 0, right: 0 },
  largeTitle: {
    fontSize: title.large.fontSize,
    lineHeight: title.large.lineHeight,
    fontWeight: title.large.fontWeight,
    marginTop: title.large.top,
    includeFontPadding: false,
  },
  // On the row, centred on its buttons (iOS 27 simulator: the letters span the row's middle).
  rowTitle: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center' },
  largeOnRow: { marginTop: 0 },
  largeOnEdge: { position: 'absolute', left: 0, right: 0, height: bar.row },
  // A large title at the leading edge whatever its script: the right, right to left.
  leading: { alignItems: 'flex-start' },
});
