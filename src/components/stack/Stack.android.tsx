import { Stack as ExpoStack, useTheme } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Children,
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { BackHandler, processColor, StyleSheet, useWindowDimensions, View, type ColorValue } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import Animated, { useAnimatedStyle, useEvent, useSharedValue } from 'react-native-reanimated';

import { AnimatedScreenEnter } from './enter.android';
import { isTransparent, largeTitlePlacement, opaqueBar, showsBack } from './header/Header.android';
import { HeaderOverlay, HeaderSpacer } from './header/HeaderSlot.android';
import { useBarTop } from './header/barTop.android';
import { useLargeBlock } from './header/barType.android';
import { MenuHost } from './menu/Menu.android';
import { SearchBar, searchPlacement } from './search/SearchBar.android';
import { BottomSearch, BottomSearchButton, FocusedSearch } from './search/SearchField.android';
import { useSearch } from './search/store.android';
import {
  ahead,
  dimAt,
  SwipeBackProvider,
  SwipeProgressContext,
  swipePhase,
  type SwipeDriver,
} from './swipe/SwipeBack.android';
import { ScreenHiddenContext, StackBackContext, SwipeRoleContext } from './swipe/role.android';
import { bar, search as searchMetrics, swipeMotion, toolbar } from './tokens';
import { BottomToolbar } from './toolbar/BottomToolbar.android';
import { Toolbar, toolbarOptions, useBottomToolbar } from './toolbar/Toolbar.android';
import { useToolbarOffset } from './toolbar/offset.android';
import type { LucentStack } from './types';
import { useBackClaimed } from '../../core/back/claims';
import { displayCornerRadius } from '../../core/display/corner.android';
import { InsideGlassBackdrop, useInsideGlassBackdrop } from '../../core/glass/BackdropContext';
import { NativeGlassBackdrop } from '../../core/glass/NativeGlass';
import { HeaderScrollProvider } from '../../core/header/scroll.android';
import { useHasKeyboardProvider } from '../../core/keyboard';
import { useInsideTabs, useTabBarReach } from '../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../theme/LucentProvider';
import { createLucentContext } from '../../theme/context';

type StackProps = ComponentProps<typeof ExpoStack>;
type ScreenProps = ComponentProps<typeof ExpoStack.Screen>;
type Options = NativeStackNavigationOptions;

// iOS 26's defaults: Lucent's bar, transparent over the content, and iOS's push.
const defaults: Options = {
  header: (props) => <HeaderSpacer {...props} />,
  headerTransparent: true,
  // The page's background is drawn by Lucent's frame inside the screen, which rounds its corners while it's swiped back.
  contentStyle: { backgroundColor: 'transparent' },
};

// The status bar's icons follow LucentProvider's scheme, as iOS's do through the bar's `headerUserInterfaceStyle`.
// Android otherwise keeps the icons it launched with when the scheme changes while the app runs, white on a light bar.
// A `statusBarStyle` in the app's options still wins.
const withDefaults = (
  screenOptions: StackProps['screenOptions'],
  scheme: 'light' | 'dark',
): StackProps['screenOptions'] => {
  const base: Options = { ...defaults, statusBarStyle: scheme === 'dark' ? 'light' : 'dark' };
  return typeof screenOptions === 'function'
    ? (args) => lucentPush(framed({ ...base, ...screenOptions(args) }))
    : lucentPush(framed({ ...base, ...(screenOptions as Options | undefined) }));
};

// Lucent pushes and pops a screen it can swipe back from itself, with the swipe's motion, so react-native-screens'
// own animation is out of sight while Lucent's runs: a screen goes in unseen, and Lucent slides it in. Once in, it
// has iOS's slide back, for the pops Lucent leaves to the stack (several screens at once, from the back menu). Any
// other `animation` is the app's, and stays.
const pushed = 'lucentPush';
const lucentPush = (options: Options): Options => {
  if ((options.animation ?? 'ios_from_right') !== 'ios_from_right' || !swipeFor(options)) {
    return { animation: 'ios_from_right', ...options };
  }
  // The stack's fade from the bottom leaves the screen below where it is, attached, for 350ms, which is long enough for
  // Lucent's slide to take over; the screen coming in is hidden till then.
  return { ...options, animation: 'fade_from_bottom', [pushed]: true } as Options;
};

// Lucent's frame draws the page's background, so it can round it; native-stack's under it is cleared. A
// `contentStyle` background set for one screen alone passes Lucent by, and that screen keeps square corners.
const pageBackground = 'lucentPageBackground';
// Lucent's bar draws in the page, so native-stack always lays the page out under a transparent header; whether the app
// asked for an opaque bar goes to Lucent's bar on the side. Options without `headerTransparent` pass as they are.
const barOptions = (options: Options): Options => {
  if (options.headerTransparent === undefined) return options;
  const opaque = !isTransparent(options.headerTransparent);
  // An opaque bar in a colour of its own sets the status bar's icons to read on it, light on a dark bar, as iOS does.
  const fill = opaque ? StyleSheet.flatten(options.headerStyle)?.backgroundColor : undefined;
  const statusBarStyle = options.statusBarStyle ?? (fill === undefined ? undefined : isDark(fill) ? 'light' : 'dark');
  return {
    ...options,
    headerTransparent: true,
    [opaqueBar]: opaque,
    ...(statusBarStyle ? { statusBarStyle } : {}),
  } as Options;
};

// Whether a colour is dark enough for light text, by its luminance.
const isDark = (value: ColorValue) => {
  const n = Number(processColor(value) ?? 0);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
};

const framed = (given: Options): Options => {
  const options = barOptions(given);
  const own = StyleSheet.flatten(options.contentStyle)?.backgroundColor;
  if (own === undefined || own === 'transparent') return options;
  return {
    ...options,
    contentStyle: [options.contentStyle, { backgroundColor: 'transparent' }],
    [pageBackground]: own,
  } as Options;
};

// Lucent's toolbars become header options; the rest (Title, BackButton, Header) are expo-router's and stay children.
const screenProps = ({ children, options, ...rest }: ScreenProps): ScreenProps => {
  const parts = Children.toArray(children);
  const toolbars = parts.filter(
    (part): part is ReactElement<ComponentProps<typeof Toolbar>> => isValidElement(part) && part.type === Toolbar,
  );
  if (!toolbars.length) {
    return {
      ...rest,
      children,
      options:
        typeof options === 'function'
          ? (args: Parameters<typeof options>[0]) => barOptions(options(args))
          : options && barOptions(options as Options),
    };
  }
  const extra = toolbars.reduce<Options>((merged, toolbar) => ({ ...merged, ...toolbarOptions(toolbar.props) }), {});
  const others = parts.filter((part) => !toolbars.includes(part as ReactElement<ComponentProps<typeof Toolbar>>));
  return {
    ...rest,
    children: others,
    options:
      typeof options === 'function'
        ? (args: Parameters<typeof options>[0]) => barOptions({ ...extra, ...options(args) })
        : barOptions({ ...extra, ...(options as Options | undefined) }),
  };
};

/** `Stack.Screen`, in a page or a layout. Named, so Fast Refresh keeps it the same component across edits. */
const LucentScreen = (props: ScreenProps) => <ExpoStack.Screen {...screenProps(props)} />;
const Screen = Object.assign(LucentScreen, {
  Title: ExpoStack.Screen.Title,
  BackButton: ExpoStack.Screen.BackButton,
});

// expo-router finds screens by type, so a layout's Lucent screens go to it as its own.
const toExpoScreens = (children: ReactNode): ReactNode =>
  Children.map(children, (child) => {
    if (!isValidElement<ScreenProps & { children?: ReactNode }>(child)) return child;
    if (child.type === Screen) return <ExpoStack.Screen key={child.key} {...screenProps(child.props)} />;
    if (child.type === ExpoStack.Protected) {
      return cloneElement(child, { children: toExpoScreens(child.props.children) });
    }
    return child;
  });

type LayoutArgs = Parameters<NonNullable<StackProps['screenLayout']>>[0];

interface TopScreen {
  key?: string;
  // Whether the screen on top can be swiped back from.
  swipe: boolean;
  // Whether the stack takes Android's back for it: it can go back, and nothing else has back first.
  back: boolean;
  // How far its bars reach in from the top and the bottom of the screen: a drag that starts on one is the bar's.
  bars: { top: number; bottom: number };
}

interface StackSwipe {
  // The screen on top tells the stack about itself, and how to pop it the stack's own way.
  setTop: (top: TopScreen, pop: () => void) => void;
  // The screen on top before this one: a screen pushed over it is its new neighbour, and slides in over it.
  lastTop: () => string | undefined;
  // Whether the stack has shown its first screens: those come in with it, unpushed.
  shown: () => boolean;
  driver: () => SwipeDriver | null;
}

const SwipeBackContext = createLucentContext<StackSwipe>('StackSwipeBack', {
  setTop: () => {},
  lastTop: () => undefined,
  shown: () => false,
  driver: () => null,
});

// A modal goes down, not back; the swipe is a card's. `fullScreenGestureEnabled: false` keeps iOS's swipe to the screen's
// edge, which on Android is its own back gesture's, so Lucent's swipe is off and Android's back is left.
const swipeFor = (options: Options) =>
  options.gestureEnabled !== false &&
  options.fullScreenGestureEnabled !== false &&
  (options.presentation ?? 'card') === 'card';

// What native-stack paints behind a page: the app's `contentStyle` background, or the theme's, except under a
// transparent modal. Lucent's frame paints it instead, so it can round it.
const backgroundOf = (options: Options, fallback: ColorValue) => {
  if (options.presentation === 'transparentModal' || options.presentation === 'containedTransparentModal') {
    return undefined;
  }
  const kept = (options as Record<string, unknown>)[pageBackground] as ColorValue | undefined;
  const own = StyleSheet.flatten(options.contentStyle)?.backgroundColor;
  return kept ?? (own === 'transparent' || own === undefined ? fallback : own);
};

// The page, on its background. Swiped back, the screen rounds its corners to the display's, as iOS 26's does: they
// match the screen's own at the start, so they show only as the page slides away. The bar isn't in it, since its
// buttons stay put outside the moving page.
const SwipeFrame = ({ top, background, children }: { top: boolean; background?: ColorValue; children: ReactNode }) => {
  const swipe = useContext(SwipeProgressContext);
  const radius = useMemo(() => displayCornerRadius(), []);
  const style = useAnimatedStyle(() => ({
    borderRadius: top && swipe && swipe.phase.get() !== swipePhase.idle ? radius : 0,
  }));
  return <Animated.View style={[styles.frame, { backgroundColor: background }, style]}>{children}</Animated.View>;
};

// Black over the screen a swipe back uncovers, fading as the swipe goes, as iOS dims it.
// With it, the soft shadow the top screen casts on this one, along its edge, which lifts it off the screen below.
const SwipeDim = () => {
  const swipe = useContext(SwipeProgressContext);
  const { width, height } = useWindowDimensions();
  const radius = useMemo(() => displayCornerRadius(), []);
  const style = useAnimatedStyle(() => ({ opacity: swipe ? dimAt(swipe.progress.get()) : 0 }));
  const shadowStyle = useAnimatedStyle(() => {
    const progress = swipe ? swipe.progress.get() : -1;
    if (progress < 0) return { opacity: 0, transform: [{ translateX: 0 }] };
    // The top screen's edge, in this screen's coordinates: it sits 30% of the way back, sliding in.
    const edge = progress * width - (progress * width - width) * swipeMotion.parallax;
    return { opacity: 1, transform: [{ translateX: ahead * edge }] };
  });
  return (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dim, style]} />
      {/* The top screen's outline, rounded as it is, casting its shadow outward: it follows the corners. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.shadow, { width, height, borderRadius: radius }, shadowStyle]}
      />
    </>
  );
};

// Each screen's content tells its header how far it has scrolled, and the bars draw after the content, over it.
const ScreenLayout = ({ args, layout }: { args: LayoutArgs; layout: StackProps['screenLayout'] }) => {
  const { options } = args;
  const key = args.route.key;
  const bottomToolbar = useBottomToolbar(key);
  const search = useSearch(key);
  const offset = useToolbarOffset();
  const tabBar = useTabBarReach();
  const tint = typeof options.headerTintColor === 'string' ? options.headerTintColor : undefined;
  const inTabs = useInsideTabs();
  const placement = search ? searchPlacement(search.props, bottomToolbar, inTabs) : undefined;
  // In search mode from the bottom, the field takes the toolbar's place above the keyboard.
  const searching = Boolean(search?.focused) && placement !== 'header' && placement !== 'barButton';
  // The field above the keyboard stays up as it plays back out, once search mode ends.
  const [focusShown, setFocusShown] = useState(searching);
  if (searching && !focusShown) setFocusShown(true);
  const closeFocus = useCallback(() => setFocusShown(false), []);
  const bottomBar = Boolean(bottomToolbar) || placement === 'bottom' || placement === 'button';
  const { colors } = useTheme();
  const largeBlock = useLargeBlock();

  // The stack's swipe is one gesture for all its screens, so the screen on top sets it.
  const { setTop, lastTop, shown, driver } = useContext(SwipeBackContext);
  const navigation = args.navigation;
  const state = navigation.getState();
  const top = state.routes[state.index]?.key === key;
  const swipe = swipeFor(options);
  // The screen a swipe back uncovers, which it dims.
  const below = state.routes[state.index - 1]?.key === key;
  const routeIndex = state.routes.findIndex((route: { key: string }) => route.key === key);
  const lucent = Boolean((options as Record<string, unknown>)[pushed]);

  // A screen Lucent pushes waits unseen until the swipe has it off-screen to the right, then slides in over the one it
  // was pushed onto. One that comes in another way (the stack's first, a replace, a deep link) just shows.
  // The stack's state is the one before the push while the screen first renders, so where it landed is known in the
  // effect; it waits unseen till then.
  const [arriving] = useState(() => lucent && shown() && driver() != null);
  const [previousTop] = useState(lastTop);
  const hidden = useSharedValue(arriving ? 1 : 0);
  const enterStyle = useAnimatedStyle(() => ({ opacity: 1 - hidden.get() }));
  // The slide starts as react-native-screens starts its transition, on the UI thread: its \`transitionStart\` comes to
  // JavaScript only once it's done with the new screen, often after the transition is over. That event still starts it
  // where the native signal doesn't come.
  const started = useSharedValue(false);
  const [pushNow] = useState(() => (arriving ? driver()?.pushNow : undefined));
  const onEnter = useEvent(() => {
    'worklet';
    if (pushNow) pushNow(hidden, started);
  }, ['onEnter']);
  useEffect(() => {
    if (!lucent) return;
    // Once in, the stack's own slide is the screen's, for the pops Lucent doesn't run.
    const settle = () => navigation.setOptions({ animation: 'ios_from_right', [pushed]: false } as Options);
    const now = navigation.getState();
    const entering = arriving && now.routes[now.index]?.key === key && previousTop === now.routes[now.index - 1]?.key;
    if (!entering) {
      hidden.set(0);
      settle();
      return;
    }
    // react-native-screens has added the screen once it starts its (empty) transition. Should it never say so, the
    // screen shows anyway.
    const fallback = setTimeout(() => hidden.set(0), 500);
    const unsubscribe = navigation.addListener('transitionStart', () => {
      clearTimeout(fallback);
      const swipe = driver();
      if (swipe) swipe.push(hidden, started);
      else hidden.set(0);
      settle();
    });
    return () => {
      clearTimeout(fallback);
      unsubscribe();
    };
  }, [lucent, arriving, previousTop, key, navigation, driver, hidden, started]);

  // Back from this screen: Lucent takes it off itself, with the swipe's motion, and the stack pops it once it's gone.
  // Where it can't (no swipe back, or one already running), the stack pops it its own way.
  const goBack = useCallback(() => {
    const swipeBack = driver();
    if (swipe && swipeBack) swipeBack.pop(() => navigation.goBack());
    else navigation.goBack();
  }, [swipe, driver, navigation]);

  // The Back key and Android's back gesture, while this screen is on top. Its listener comes after the navigation
  // container's, which runs first, so it goes back from here; a stack nested in the screen with somewhere to go back to
  // has it first, and a menu or search field open over the screen has it before either.
  useEffect(() => {
    if (!top || !swipe) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!navigation.isFocused() || !driver()) return false;
      // The stack's first screen has nowhere to go back to: Back goes on to the app's tabs, or closes it.
      if (navigation.getState().index === 0) return false;
      const route = navigation.getState().routes.find((candidate: { key: string }) => candidate.key === key);
      const nested = route?.state as { index?: number } | undefined;
      if (nested && (nested.index ?? 0) > 0) return false;
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [top, swipe, navigation, driver, key, goBack]);

  // Android's back gesture goes to the stack while this screen is on top and can go back, in the stack the app is
  // showing (another tab's stays out), and while no stack nested in it, menu or search field has back first.
  const claimed = useBackClaimed();
  const [focused, setFocused] = useState(() => navigation.isFocused());
  useEffect(() => {
    const onFocus = navigation.addListener('focus', () => setFocused(true));
    const onBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      onFocus();
      onBlur();
    };
  }, [navigation]);
  const nested = (args.route as { state?: { index?: number } }).state;
  const back = top && state.index > 0 && swipe && focused && !claimed && (nested?.index ?? 0) === 0;
  const rowTop = useBarTop();
  const barTop = options.headerShown === false ? 0 : rowTop + bar.row;
  const barBottom = bottomBar && !searching ? offset + toolbar.height : 0;

  useLayoutEffect(() => {
    if (top) setTop({ key, swipe, back, bars: { top: barTop, bottom: barBottom } }, () => navigation.goBack());
  }, [top, key, swipe, back, barTop, barBottom, setTop, navigation]);

  return (
    <HeaderScrollProvider
      routeKey={key}
      transparent
      // Inside NativeTabs a bottom toolbar sits under the tab bar, so the bar's own inset is the one that counts.
      toolbar={bottomBar && !(tabBar && bottomToolbar) ? offset + toolbar.height + toolbar.contentGap : 0}
      start={placement === 'header' && search?.props.hideWhenScrolling !== false ? searchMetrics.header.block : 0}
      // A search field in the bar scrolls away before the title, so its stack doesn't snap.
      snap={
        largeTitlePlacement(options, showsBack(options, state.index > 0)) === 'below' && placement !== 'header'
          ? largeBlock
          : 0
      }>
      {/* Bar menus open over the bars, so their glass draws last. */}
      <Animated.View style={[styles.page, enterStyle]}>
        {arriving ? <AnimatedScreenEnter armed style={styles.enter} onEnter={onEnter} /> : null}
        <MenuHost>
          <SwipeFrame top={top} background={backgroundOf(options, colors.background)}>
            {layout ? layout(args) : args.children}
          </SwipeFrame>
          <SwipeRoleContext value={top ? 'top' : below ? 'below' : null}>
            <StackBackContext value={goBack}>
              {/* Up with the screen, unseen with it: lifted glass takes its ancestors' opacity. */}
              <ScreenHiddenContext value={hidden}>
                <HeaderOverlay routeKey={key} />
              </ScreenHiddenContext>
            </StackBackContext>
          </SwipeRoleContext>
          {/* iOS dims all of the screen a swipe uncovers, its title and bar background too; only the buttons of its one
            bar stay clear, and here they're the top screen's, held in place over this one. */}
          {below ? <SwipeDim /> : null}
          {bottomToolbar && (!searching || placement === 'slot') ? (
            // Its buttons hold and melt through a push or a pop, as the bar's do.
            <SwipeRoleContext value={top ? 'top' : below ? 'below' : null}>
              <ScreenHiddenContext value={hidden}>
                <BottomToolbar
                  toolbar={bottomToolbar}
                  tintColor={tint}
                  routeKey={key}
                  pushed={routeIndex > 0}
                  searching={searching && placement === 'slot'}
                  returning={focusShown && !searching && placement === 'slot'}
                  stayDown={Boolean(search?.focused) && (placement === 'header' || placement === 'barButton')}
                />
              </ScreenHiddenContext>
            </SwipeRoleContext>
          ) : null}
          {placement === 'bottom' && !focusShown ? <BottomSearch routeKey={key} /> : null}
          {placement === 'button' && !focusShown ? <BottomSearchButton routeKey={key} /> : null}
          {focusShown ? (
            <FocusedSearch
              routeKey={key}
              from={placement === 'slot' ? 'slot' : placement === 'button' ? 'button' : 'bottom'}
              open={searching}
              onClosed={closeFocus}
            />
          ) : null}
        </MenuHost>
      </Animated.View>
    </HeaderScrollProvider>
  );
};

const StackRoot = ({ children, screenOptions, screenLayout, ...props }: StackProps) => {
  const inBackdrop = useInsideGlassBackdrop();
  const hasKeyboard = useHasKeyboardProvider();
  const { colors } = useTheme();
  const { scheme } = useLucentTheme();
  const [top, setTopState] = useState<TopScreen>({ swipe: true, back: false, bars: { top: 0, bottom: 0 } });
  const topPop = useRef<() => void>(() => {});
  const swipeProgress = useSharedValue(-1);
  const swipePhaseValue = useSharedValue<number>(swipePhase.idle);
  // What the stack's screens ask of its swipe as they come and go, kept out of render.
  const driver = useRef<SwipeDriver | null>(null);
  const lastTop = useRef<string | undefined>(undefined);
  const shown = useRef(false);
  useEffect(() => {
    shown.current = true;
  }, []);
  const swipeState = useMemo(
    () => ({
      progress: swipeProgress,
      phase: swipePhaseValue,
      setDriver: (next: SwipeDriver | null) => {
        driver.current = next;
      },
      back: top.back,
      fallback: () => topPop.current(),
      bars: top.bars,
    }),
    [swipeProgress, swipePhaseValue, top.back, top.bars],
  );
  const stackSwipe = useMemo<StackSwipe>(
    () => ({
      setTop: (next, pop) => {
        lastTop.current = next.key;
        topPop.current = pop;
        setTopState((current) =>
          current.key === next.key &&
          current.swipe === next.swipe &&
          current.back === next.back &&
          current.bars.top === next.bars.top &&
          current.bars.bottom === next.bars.bottom
            ? current
            : next,
        );
      },
      lastTop: () => lastTop.current,
      shown: () => shown.current,
      driver: () => driver.current,
    }),
    [],
  );
  // react-native-screens moves its screens for a swipe back run from JS, given the gesture; expo-router hands
  // `unstable_nativeProps` to its screen stack. The push and pop are iOS's slide, so the swipe follows it. The detector
  // finds the stack's screens again whenever the top one changes, which expo-router doesn't tell it, so Lucent does.
  const nativeProps = { goBackGesture: top.swipe ? 'swipeRight' : undefined, currentScreenId: top.key };
  const navigator = (
    <SwipeBackContext value={stackSwipe}>
      <SwipeProgressContext value={swipeState}>
        <SwipeBackProvider>
          <ExpoStack
            {...props}
            {...({ unstable_nativeProps: nativeProps } as object)}
            screenOptions={withDefaults(screenOptions, scheme)}
            screenLayout={(args) => <ScreenLayout args={args} layout={screenLayout} />}>
            {toExpoScreens(children)}
          </ExpoStack>
        </SwipeBackProvider>
      </SwipeProgressContext>
    </SwipeBackContext>
  );
  // The bar's glass refracts the screens, so outside NativeTabs the stack brings its own backdrop, and the root view
  // its swipe back and bar controls need.
  const backdropped = inBackdrop ? (
    navigator
  ) : (
    <GestureHandlerRootView style={styles.fill}>
      <InsideGlassBackdrop.Provider value>
        <NativeGlassBackdrop style={styles.fill}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          {navigator}
        </NativeGlassBackdrop>
      </InsideGlassBackdrop.Provider>
    </GestureHandlerRootView>
  );
  // A bottom toolbar rises with the keyboard, which it follows through keyboard-controller.
  return hasKeyboard ? backdropped : <KeyboardProvider>{backdropped}</KeyboardProvider>;
};

/** expo-router's `Stack`, with iOS 26's navigation bar and push drawn by Lucent. */
export const Stack = Object.assign(StackRoot, {
  Screen,
  Toolbar,
  Protected: ExpoStack.Protected,
  Header: ExpoStack.Header,
  SearchBar,
  Title: ExpoStack.Title,
}) as unknown as LucentStack;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  // Above native-stack's own header box (zIndex 1), as the bar inside it is, which would otherwise take its touches.
  page: { flex: 1, zIndex: 2 },
  dim: { backgroundColor: '#000000' },
  frame: { flex: 1, overflow: 'hidden' },
  enter: { position: 'absolute', width: 0, height: 0 },
  shadow: { position: 'absolute', top: 0, left: 0, boxShadow: swipeMotion.shadow },
});
