import { Easing, useDerivedValue, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * The native glass press (GlassPress.kt), for glass whose shape JS draws: the same spring, light and finger following,
 * so a capsule pressed this way feels as the navigation bar's buttons do. Keep in step with GlassConstants.kt.
 */
export const shapePress = {
  // The press spring, fitted to iOS 26's bar and glass buttons: about 130ms to full size, overshooting a little, then a
  // bouncier release that dips below the rest size (PRESS_IN_/PRESS_OUT_OMEGA and _DAMPING).
  in: { stiffness: 24.2 * 24.2, damping: 2 * 0.75 * 24.2, mass: 1 },
  out: { stiffness: 15.4 * 15.4, damping: 2 * 0.36 * 15.4, mass: 1 },
  // Pressed, it leans toward where the finger is on it, this many points at most (PRESS_LEAN), and stretches that way
  // by this much (PRESS_STRETCH).
  lean: 1.5,
  leanStretch: 0.01,
  // What follows the finger, the lean, light and pull, trails it by this time constant, in ms (FOLLOW_TIME).
  follow: 50,
  // The light comes up and goes out over these time constants, in ms, and dims to `glowOutside` as the finger leaves
  // the shape, over `outsideReach` points (GLOW_RISE, GLOW_FALL, GLOW_DIM, GLOW_OUTSIDE, OUTSIDE_REACH).
  glowRise: 25,
  glowFall: 120,
  glowDim: 150,
  glowOutside: 0.6,
  outsideReach: 28,
};

// Following the finger critically damped over the native press's time constant (FOLLOW_TIME).
const followRate = 1000 / shapePress.follow;
const followSpring = { stiffness: followRate * followRate, damping: 2 * followRate, mass: 1 };

// An exponential approach with time constant `tau` reads as settled after about three of them.
const settle = (tau: number) => {
  'worklet';
  return { duration: tau * 3, easing: Easing.out(Easing.exp) };
};

export type ShapePress = ReturnType<typeof useShapePress>;

/**
 * A pressed glass shape: the press (0 at rest, 1 held), the light (0 to 1), where the finger is on it, trailed, in its
 * own points, and how far past its edges the finger is (`pull`, signed points, trailed too). `full`: a quick tap still
 * swells it all the way before it settles back, as iOS's search field does however briefly it's touched. Each runs on
 * either thread.
 */
export const useShapePress = (full = false) => {
  const press = useSharedValue(0);
  const glow = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pullX = useSharedValue(0);
  const pullY = useSharedValue(0);
  // How far this press swells it, 1 unless a press says otherwise.
  const top = useSharedValue(1);
  const pull = useDerivedValue(() => ({ x: pullX.get(), y: pullY.get() }));

  const dim = (outside: number) => {
    'worklet';
    const target = 1 - (1 - shapePress.glowOutside) * Math.min(Math.max(outside / shapePress.outsideReach, 0), 1);
    if (Math.abs(target - glow.get()) > 1e-3) {
      glow.set(withTiming(target, settle(target > glow.get() ? shapePress.glowRise : shapePress.glowDim)));
    }
  };

  return {
    press,
    glow,
    x,
    y,
    pull,
    /** A finger down at (`atX`, `atY`), in the shape's own points; `peak`: how far it swells, 1 unless said. */
    begin: (atX = 0, atY = 0, peak = 1) => {
      'worklet';
      x.set(atX);
      y.set(atY);
      pullX.set(0);
      pullY.set(0);
      top.set(peak);
      press.set(withSpring(peak, shapePress.in));
      glow.set(withTiming(1, settle(shapePress.glowRise)));
    },
    /** The finger moved to (`atX`, `atY`); `outside`: how far past the shape it is, in points. */
    move: (atX: number, atY: number, outside: number) => {
      'worklet';
      // Retargeted on every move, a spring keeps its speed and glides after the finger, as the native press's per-frame
      // follow does; a timing restarted from rest at each move stalled behind it.
      x.set(withSpring(atX, followSpring));
      y.set(withSpring(atY, followSpring));
      dim(outside);
    },
    /** The finger is this far past the shape's edges, signed, in points: what pulls it after the finger. */
    drag: (pastX: number, pastY: number) => {
      'worklet';
      pullX.set(withSpring(pastX, followSpring));
      pullY.set(withSpring(pastY, followSpring));
      dim(Math.hypot(pastX, pastY));
    },
    end: () => {
      'worklet';
      press.set(
        full && press.get() < top.get()
          ? withSequence(withSpring(top.get(), shapePress.in), withSpring(0, shapePress.out))
          : withSpring(0, shapePress.out),
      );
      glow.set(withTiming(0, settle(shapePress.glowFall)));
    },
  };
};

/** How far `at` leans from a shape's middle toward its edge, -1 to 1, with the press (GlassPress.leanOf). */
export const leanOf = (offset: number, half: number, press: number) => {
  'worklet';
  return half <= 0 ? 0 : Math.tanh(offset / half) * press;
};

/**
 * How a press leans a shape toward the finger (GlassPress.shapeScale and its lean): its middle moves `shiftX`/`shiftY`
 * points and it stretches `x` across and `y` down. `offsetX`/`offsetY`: the finger from the shape's middle, in points.
 */
export const leanBy = (offsetX: number, offsetY: number, half: number, press: number) => {
  'worklet';
  const leanX = leanOf(offsetX, half, press);
  const leanY = leanOf(offsetY, half, press);
  const long = shapePress.leanStretch * (Math.abs(leanX) - Math.abs(leanY));
  return { shiftX: leanX * shapePress.lean, shiftY: leanY * shapePress.lean, x: 1 + long, y: 1 - long };
};
