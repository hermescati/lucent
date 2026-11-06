/**
 * iOS 26's interactive swipe back for the Android stack.
 *
 * react-native-screens runs a swipe back on Android when its screen stack gets `goBackGesture`, through a gesture
 * detector that `GestureDetectorProvider` supplies. Its detector (4.30) measures the top screen in a way Reanimated 4
 * no longer accepts, so every swipe fails with "Failed to measure screen", and it only swipes from the left edge or on
 * any pan at all. This is that detector, adapted from react-native-screens (MIT): the measure fixed, and the pan set
 * up as iOS 26's, which starts anywhere on the screen once a drag goes right and leaves vertical scrolls alone.
 */
import { useContext, useEffect, useLayoutEffect, useMemo, type RefObject, type ReactNode } from 'react';
import { findNodeHandle, I18nManager, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { measure, startScreenTransition, useEvent, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { GHContext } from 'react-native-screens/src/contexts';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
// The context react-native-screens' screen stack reads its gesture detector from. It isn't in the package's public
// entry, but it is what `GestureDetectorProvider` fills, and the screen stack imports it from here too.

import { AnimatedPredictiveBack, type BackStep } from '../../../core/back/PredictiveBack.android';
import { createLucentContext } from '../../../theme/context';
import { swipeMotion } from '../tokens';

interface PanEvent {
  absoluteX: number;
  absoluteY: number;
  translationX: number;
  translationY: number;
  velocityX: number;
  velocityY: number;
  x: number;
  y: number;
  handlerTag: number;
  numberOfPointers: number;
  state: number;
  pointerType: number;
}

const restingEvent: PanEvent = {
  absoluteX: 0,
  absoluteY: 0,
  translationX: 0,
  translationY: 0,
  velocityX: 0,
  velocityY: 0,
  x: 0,
  y: 0,
  handlerTag: 0,
  numberOfPointers: 0,
  state: 0,
  pointerType: 0,
};

const noDimensions = { width: 0, height: 0, x: 0, y: 0, pageX: 0, pageY: 0 };

interface Turbo {
  startTransition: (stackTag: number) => {
    topScreenTag: number;
    belowTopScreenTag: number;
    canStartTransition: boolean;
  };
  updateTransition: (stackTag: number, progress: number) => void;
  finishTransition: (stackTag: number, isCanceled: boolean) => void;
}

// react-native-screens' native side, which moves its screens for a transition run from JS. It's on the JS runtime's
// global, so it's read here, once, and the gesture's worklets carry it to the UI runtime.
const screensModule = (globalThis as unknown as { RNScreensTurboModule: Turbo }).RNScreensTurboModule;

const turbo = () => {
  'worklet';
  return screensModule;
};

interface HostInstance {
  __nativeTag?: number;
  __internalInstanceHandle?: { stateNode?: { node?: unknown } };
}

interface DetectorProps {
  children?: ReactNode;
  gestureDetectorBridge: RefObject<{ stackUseEffectCallback: (stackRef: RefObject<unknown>) => void }>;
  goBackGesture?: string;
  screensRefs?: RefObject<Record<string, RefObject<unknown>>>;
  currentScreenId?: string;
}

interface Transition {
  stackTag: number;
  topScreenId: unknown;
  belowTopScreenId: unknown;
  screenDimensions: typeof noDimensions;
}

/**
 * Where a swipe back is: none running, the finger on it, or settling after it onto the screen below or back. A push
 * runs the same transition the other way, the new screen coming in from the right over the one it covers.
 */
export const swipePhase = { idle: 0, dragging: 1, going: 2, staying: 3, pushing: 4 } as const;

/** What the stack asks of its swipe back: a pop or a push run as one, without a finger. */
export interface SwipeDriver {
  // Takes the top screen off as a swipe let go would; `fallback` runs when it can't, to pop it the usual way.
  pop: (fallback: () => void) => void;
  // Brings the top screen, just pushed, in from the right. `hidden` holds it unseen until it's placed off-screen, and
  // `started` says the push has begun, so it runs once, whichever of the screen's two signals comes first.
  push: (hidden: SharedValue<number>, started: SharedValue<boolean>) => void;
  // The same, as a worklet, for the UI thread.
  pushNow: (hidden: SharedValue<number>, started: SharedValue<boolean>) => void;
}

export interface SwipeState {
  // How far the swipe has taken the top screen, 0 to 1, while one runs; -1 otherwise.
  progress: SharedValue<number>;
  phase: SharedValue<number>;
  // The swipe back hands the stack its driver while it has one, and takes it back with null.
  setDriver: (driver: SwipeDriver | null) => void;
  // Whether the stack takes Android's back itself, gesture and all: its top screen can go back, and nothing else (a
  // nested stack, a menu) has back first.
  back: boolean;
  // Pops the top screen the stack's own way, where Lucent can't.
  fallback: () => void;
  // How far the top screen's bars reach in from the screen's top and bottom.
  bars: { top: number; bottom: number };
}

/**
 * The stack's swipe back, for its screens: the one below dims itself by it, and both bars keep their buttons in place
 * as iOS's one bar does. The stack makes it and the swipe sets it.
 */
export const SwipeProgressContext = createLucentContext<SwipeState | null>('StackSwipeProgress', null);

/** How dark the screen below is, 0 to 1, for a swipe this far along: iOS's, fitted to recordings. */
export const dimAt = (progress: number) => {
  'worklet';
  return progress < 0 ? 0 : swipeMotion.dim * Math.pow(1 - Math.min(progress, 1), swipeMotion.dimCurve);
};

interface Spring {
  omega: number;
  damping: number;
}

// Where a spring that starts `from` its rest at `velocity` is `t` seconds on, and how fast it's going: critically
// damped, or overdamped (two decays, the slower of which it ends on).
const settleAt = ({ omega, damping }: Spring, from: number, velocity: number, t: number) => {
  'worklet';
  if (damping <= 1) {
    const decay = Math.exp(-omega * t);
    return {
      offset: (from + (velocity + omega * from) * t) * decay,
      speed: (velocity - omega * (velocity + omega * from) * t) * decay,
    };
  }
  const spread = omega * Math.sqrt(damping * damping - 1);
  const slow = -omega * damping + spread;
  const fast = -omega * damping - spread;
  const a = (velocity - fast * from) / (slow - fast);
  const b = from - a;
  return {
    offset: a * Math.exp(slow * t) + b * Math.exp(fast * t),
    speed: a * slow * Math.exp(slow * t) + b * fast * Math.exp(fast * t),
  };
};

// Marks the last frame of a cancelled swipe: the screen below goes back to where it rests, since it stays in the
// stack, and the next push expects it there.
const settledBack = -1;

// Right to left, back is a swipe to the left, from the right: the swipe works forwards, in the reading direction, and
// the screens move the mirror way.
export const ahead = I18nManager.isRTL ? -1 : 1;

/** A pointer as if the screen read left to right. */
const forwards = (pointer: PanEvent, width: number): PanEvent => {
  'worklet';
  if (ahead > 0) return pointer;
  return {
    ...pointer,
    absoluteX: width - pointer.absoluteX,
    translationX: -pointer.translationX,
    velocityX: -pointer.velocityX,
  };
};

// iOS's slide: the top screen with the finger, the one below starting 30% of the width behind.
const slide = {
  topScreenStyle: (event: PanEvent) => {
    'worklet';
    return { transform: [{ translateX: ahead * event.translationX }] };
  },
  belowTopScreenStyle: (event: PanEvent, screen: { width: number }) => {
    'worklet';
    if (event.pointerType === settledBack) return { transform: [{ translateX: 0 }] };
    return { transform: [{ translateX: ahead * (event.translationX - screen.width) * swipeMotion.parallax }] };
  },
};

// The screen stack warns about a provider that isn't react-native-screens' own unless the detector has this name.
function GHWrapper({ children, gestureDetectorBridge, goBackGesture, screensRefs, currentScreenId }: DetectorProps) {
  const event = useSharedValue<PanEvent>(restingEvent);
  const start = useSharedValue<PanEvent>(restingEvent);
  const updating = useSharedValue(false);
  // A screen gone back from stays in the native stack, the one below it attached as well, until the navigator has
  // popped it, a trip through JavaScript; a transition started before then would attach the one below again, which
  // react-native-screens can't. So the swipe waits for the stack's new top.
  const leaving = useSharedValue(false);
  const stackTag = useSharedValue(-1);
  const screenNodes = useSharedValue<Record<number, unknown>>({});
  const transition = useSharedValue<Transition>({
    stackTag: -1,
    topScreenId: undefined,
    belowTopScreenId: undefined,
    screenDimensions: noDimensions,
  });
  const swipe = useContext(SwipeProgressContext);
  const progress = swipe?.progress;
  const phase = swipe?.phase;
  const { width: windowWidth } = useWindowDimensions();
  const screenWidth = useSharedValue(windowWidth);
  useEffect(() => screenWidth.set(windowWidth), [windowWidth, screenWidth]);

  // The screen stack hands over its native view once it's mounted, after this detector's effects have run, by calling
  // what the detector leaves on the bridge it passes in: react-native-screens' contract, so the write is meant.
  // eslint-disable-next-line react-hooks/immutability
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    gestureDetectorBridge.current.stackUseEffectCallback = (stackRef) => {
      if (goBackGesture) stackTag.set(findNodeHandle(stackRef.current as never) ?? -1);
    };
  }, [gestureDetectorBridge, goBackGesture, stackTag]);

  // The native side names screens by tag; the transition moves them by their shadow nodes.
  useEffect(() => {
    if (!goBackGesture || !screensRefs) return;
    const nodes: Record<number, unknown> = {};
    for (const key in screensRefs.current) {
      const host = screensRefs.current[key].current as HostInstance | null;
      const node = host?.__internalInstanceHandle?.stateNode?.node;
      if (host?.__nativeTag && node) nodes[host.__nativeTag] = node;
    }
    screenNodes.set(nodes);
  }, [currentScreenId, goBackGesture, screensRefs, screenNodes]);

  // The stack has a new top: the screen gone back from has left it.
  useEffect(() => leaving.set(false), [currentScreenId, leaving]);

  // What Reanimated's screen transition reads: the screens, the pan, and iOS's slide.
  const config = (current: Transition, extra?: object) => {
    'worklet';
    return {
      ...current,
      sharedEvent: event,
      startingGesturePosition: start,
      screenTransition: slide,
      goBackGesture: 'swipeRight',
      isTransitionCanceled: false,
      onFinishAnimation: () => {
        'worklet';
      },
      ...extra,
    };
  };

  // The swipe's three steps, whichever gesture drives them: begin with the screens, follow the finger, let go.
  const begin = (pointer: PanEvent) => {
    'worklet';
    event.set(pointer);
    const tag = stackTag.get();
    const data = turbo().startTransition(tag);
    if (data.canStartTransition === false) {
      updating.set(false);
      return;
    }
    const top = screenNodes.get()[data.topScreenTag];
    // Reanimated 4 measures an animated ref by its value, the view's shadow node.
    const size = measure({ value: top } as never);
    if (size == null) {
      updating.set(false);
      turbo().finishTransition(tag, true);
      return;
    }
    const next = {
      stackTag: tag,
      topScreenId: top,
      belowTopScreenId: screenNodes.get()[data.belowTopScreenTag],
      screenDimensions: size,
    };
    transition.set(next);
    start.set(pointer);
    startScreenTransition(config(next) as never);
    phase?.set(swipePhase.dragging);
    updating.set(true);
  };

  // Moves the screens to `x`, the top screen's offset.
  const place = (x: number, pointer?: PanEvent) => {
    'worklet';
    const base = pointer ?? event.get();
    const { stackTag: tag, screenDimensions } = transition.get();
    const width = Math.max(screenDimensions.width, 1);
    event.set({ ...base, translationX: x });
    progress?.set(Math.min(x / width, 1));
    turbo().updateTransition(tag, x / width);
  };

  const follow = (pointer: PanEvent) => {
    'worklet';
    if (!updating.get()) return;
    // From where the drag took hold, so the screen doesn't jump the distance it took to start; back, never past the
    // screen it started on.
    place(Math.max(pointer.translationX - start.get().translationX, 0), pointer);
  };

  // Let go: the screen settles on iOS's spring, from the finger's speed, onto the edge or back into place.
  const release = (canceled: boolean, velocity: number, spring: Spring, next?: number) => {
    'worklet';
    if (!updating.get()) return false;
    updating.set(false);
    const current = transition.get();
    const width = current.screenDimensions.width;
    const target = canceled ? 0 : width;
    phase?.set(next ?? (canceled ? swipePhase.staying : swipePhase.going));
    const from = event.get().translationX - target;
    const clock = { began: -1 };
    // A plain function inside the worklet, so it can schedule itself.
    const step = (now: number) => {
      if (clock.began < 0) clock.began = now;
      const t = (now - clock.began) / 1000;
      const { offset, speed } = settleAt(spring, from, velocity, t);
      const done = Math.abs(offset) < 0.5 && Math.abs(speed) < 20;
      if (!done) {
        place(Math.min(Math.max(target + offset, 0), width));
        requestAnimationFrame(step);
        return;
      }
      if (canceled) {
        // The top screen back in place, the one below back where it rests.
        event.set({ ...event.get(), translationX: 0, pointerType: settledBack });
      } else {
        event.set({ ...event.get(), translationX: width });
      }
      event.removeListener(current.stackTag);
      progress?.set(-1);
      phase?.set(swipePhase.idle);
      if (!canceled) leaving.set(true);
      turbo().finishTransition(current.stackTag, canceled);
    };
    requestAnimationFrame(step);
    return true;
  };

  // A pop or a push without a finger: the same screens, moved by the same spring, from where the finger isn't. One runs
  // at a time, and a tap while one does is dropped, as iOS ignores the back button mid-transition.
  const busy = () => {
    'worklet';
    return updating.get() || leaving.get() || (phase != null && phase.get() !== swipePhase.idle);
  };
  const popNow = (fallback: () => void) => {
    'worklet';
    if (busy()) return;
    begin(restingEvent);
    if (!updating.get()) {
      scheduleOnRN(fallback);
      return;
    }
    release(false, 0, swipeMotion.tap);
  };
  const pushNow = (hidden: SharedValue<number>, started: SharedValue<boolean>) => {
    'worklet';
    if (started.get()) return;
    started.set(true);
    if (busy()) {
      hidden.set(0);
      return;
    }
    begin(restingEvent);
    if (updating.get()) {
      // Off-screen to the right, then shown: the same frame, so it never shows where it was put.
      place(transition.get().screenDimensions.width);
      phase?.set(swipePhase.pushing);
    }
    hidden.set(0);
    release(true, 0, swipeMotion.tap, swipePhase.pushing);
  };
  const setDriver = swipe?.setDriver;
  useEffect(() => {
    if (!setDriver || !goBackGesture) return;
    setDriver({
      pop: (fallback) => scheduleOnUI(popNow, fallback),
      push: (hidden, started) => scheduleOnUI(pushNow, hidden, started),
      pushNow,
    });
    return () => setDriver(null);
  });

  // Android's back gesture, from either edge: the top screen follows the finger as the swipe's does, from where it
  // started, and goes or stays as Android decides on release. The Back key, and the gesture where predictive back is
  // off, only say when it's done: those pop as the back button does.
  const backFrom = useSharedValue(-1);
  const fallback = swipe?.fallback;
  const onBack = useEvent<BackStep>(
    (step) => {
      'worklet';
      if (step.type === 'start') {
        backFrom.set(-1);
        if (busy()) return;
        begin(restingEvent);
        if (updating.get()) backFrom.set(step.x ?? 0);
        return;
      }
      const from = backFrom.get();
      if (step.type === 'progress') {
        if (from < 0 || !updating.get()) return;
        const x = step.x ?? from;
        place(Math.max(step.fromRight ? from - x : x - from, 0));
        return;
      }
      backFrom.set(-1);
      if (step.type === 'cancel') {
        if (from >= 0) release(true, 0, swipeMotion.settle);
        return;
      }
      if (from >= 0) release(false, 0, swipeMotion.tap);
      else if (fallback) popNow(fallback);
    },
    ['onBack'],
  );

  const barTop = swipe?.bars.top ?? 0;
  const barBottom = swipe?.bars.bottom ?? 0;
  // The same object while the bars stay put: a new one sets the gesture up again.
  const hitSlop = useMemo(() => ({ top: -barTop, bottom: -barBottom }), [barTop, barBottom]);
  const pan = usePanGesture({
    enabled: Boolean(goBackGesture),
    // A drag that starts on a bar is its buttons', which hold the touch as the finger moves over them; the swipe
    // starts below the bar and above a bottom toolbar.
    hitSlop,
    activeOffsetX: [-swipeMotion.activateAfter, swipeMotion.activateAfter],
    failOffsetY: [-swipeMotion.verticalSlack, swipeMotion.verticalSlack],
    onActivate: (payload) => {
      const pointer = forwards(payload as unknown as PanEvent, screenWidth.get());
      // A drag to the left isn't a way back, and Android's back gesture owns the screen's edges: a drag from there is
      // Android's, which takes it over, and the swipe would be left halfway.
      const from = pointer.absoluteX - pointer.translationX;
      const width = screenWidth.get();
      if (
        pointer.translationX < 0 ||
        from < swipeMotion.systemEdge ||
        (width > 0 && from > width - swipeMotion.systemEdge)
      ) {
        updating.set(false);
        return;
      }
      // Not while a push or pop is still settling: its screens are the stack's until it's done.
      if (busy()) return;
      begin(pointer);
    },
    onUpdate: (payload) => {
      follow(forwards({ ...(payload as unknown as PanEvent) }, screenWidth.get()));
    },
    onDeactivate: (payload) => {
      if (!updating.get()) return;
      const pointer = {
        ...forwards(payload as unknown as PanEvent, screenWidth.get()),
        canceled: (payload as unknown as { canceled?: boolean }).canceled,
      };
      // A drag taken away (Android's back gesture, a dialog) goes back into place.
      if (pointer.canceled) {
        release(true, 0, swipeMotion.settle);
        return;
      }
      // A flick counts for its speed, as on iOS: far enough, or fast enough, goes back.
      const moved = Math.max(pointer.translationX - start.get().translationX, 0);
      const distance = moved + Math.min(pointer.velocityX * swipeMotion.velocityFactor, swipeMotion.velocityCap);
      release(
        distance < transition.get().screenDimensions.width * swipeMotion.commit,
        pointer.velocityX,
        swipeMotion.settle,
      );
    },
  });

  return (
    <>
      <GestureDetector gesture={pan}>{children}</GestureDetector>
      <AnimatedPredictiveBack
        pointerEvents="none"
        style={styles.back}
        enabled={Boolean(goBackGesture) && swipe?.back === true}
        onBack={onBack}
      />
    </>
  );
}

/** Gives the stack's screens iOS 26's swipe back. */
export const SwipeBackProvider = ({ children }: { children: ReactNode }) => (
  <GHContext.Provider value={GHWrapper as never}>{children}</GHContext.Provider>
);

const styles = StyleSheet.create({
  back: { position: 'absolute', width: 0, height: 0 },
});
