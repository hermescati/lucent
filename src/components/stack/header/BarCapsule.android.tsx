import { useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  measure,
  useAnimatedProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';

import { BarMeltContext, meltLook } from './melt.android';
import { AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { regularMaterial, useGlassMaterial } from '../../../core/glass/material';
import { glassPress } from '../../../core/glass/presets';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { bar, barItem, barItemMotion } from '../tokens';

// The glass shader draws at most this many shapes in one view.
export const maxBridged = 4;

interface Shape {
  x: number;
  y: number;
  width: number;
  height: number;
  interactive: boolean;
}

interface Row {
  set: (id: string, shape: Shape | null) => void;
  // A capsule's view and swell, read on the UI thread while its size animates.
  track: (id: string, tracked: Tracked | null) => void;
  // Keeps the glass following its capsules' layout for this long, as one of them resizes.
  follow: (duration: number) => void;
}

interface Tracked {
  ref: AnimatedRef<Animated.View>;
  swell: SharedValue<number>;
}

const RowContext = createLucentContext<Row | null>('BarGlassRow', null);

/** The row a capsule's glass is drawn in, if it's shared: its items tell it when they resize. */
export const useBarGlassRow = () => useContext(RowContext);

/**
 * How a capsule's width goes from one size to another as an item on it shows or hides, as a progress from 0 to 1:
 * eased out a little past it and back, as on iOS 27.
 */
export const resize = (showing: boolean) => {
  'worklet';
  const { show, hide, overshoot, settle } = barItemMotion;
  return withSequence(
    withTiming(1 + overshoot, { duration: (showing ? show : hide).width, easing: Easing.out(Easing.quad) }),
    withTiming(1, { duration: settle, easing: Easing.inOut(Easing.quad) }),
  );
};

/**
 * How far a capsule grows on each side as it swells: 17% taller, and wider by as much for a circle, so it stays round,
 * or by `swellX` for a long capsule, as iOS 27's do.
 */
export const swellBy = (width: number, height: number, amount: number) => {
  'worklet';
  const taller = (height * barItemMotion.swellY * amount) / 2;
  const long = Math.min(Math.max((width - height) / height, 0), 1);
  const wider = taller + (barItemMotion.swellX * amount - taller) * long;
  return { wider, taller };
};

// iOS draws bar buttons in the bar's glass, as the tab bar is, not a glass view's: its soft rim and shadow rather than a
// glass view's hairline outline.
const useBarMaterial = () => {
  const theme = useLucentTheme();
  return { ...useGlassMaterial('regular'), ...barEdge(regularMaterial(theme)) };
};

const glowFor = (width: number, tinted: boolean) =>
  (width >= glassPress.wideFrom ? glassPress.wideGlow : glassPress.glow) * (tinted ? glassPress.tintedGlow : 1);

interface RowProps {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  height: number;
}

/**
 * One side's capsules drawn in one piece of glass, as iOS does: each stays its own capsule at rest, but a held one grows
 * into its neighbour and a neck of glass joins them, which breaks as it lets go. The row's `BarCapsule`s become shapes in
 * it. Only for untinted capsules, and no more than the shader draws.
 */
export const BarGlassRow = ({ children, style, height }: RowProps) => {
  const material = useBarMaterial();
  const [shapes, setShapes] = useState<Record<string, Shape>>({});
  const set = useCallback((id: string, shape: Shape | null) => {
    setShapes((current) => {
      if (!shape) {
        if (!(id in current)) return current;
        const { [id]: _removed, ...others } = current;
        return others;
      }
      const old = current[id];
      if (
        old &&
        old.x === shape.x &&
        old.y === shape.y &&
        old.width === shape.width &&
        old.height === shape.height &&
        old.interactive === shape.interactive
      ) {
        return current;
      }
      return { ...current, [id]: shape };
    });
  }, []);
  const [tracked, setTracked] = useState<Record<string, Tracked>>({});
  const track = useCallback((id: string, value: Tracked | null) => {
    setTracked((current) => {
      if (value) return current[id] === value ? current : { ...current, [id]: value };
      if (!(id in current)) return current;
      const { [id]: _removed, ...others } = current;
      return others;
    });
  }, []);
  // Runs while a capsule resizes, so the shapes below are worked out again each frame.
  const ticking = useSharedValue(0);
  const follow = useCallback(
    (duration: number) => {
      ticking.set(0);
      ticking.set(withTiming(1, { duration }));
    },
    [ticking],
  );
  const row = useMemo(() => ({ set, track, follow }), [set, track, follow]);
  // Left to right, so a shape keeps its index while the others come and go.
  const visible = useMemo(
    () =>
      Object.entries(shapes)
        .map(([id, shape]) => ({ id, ...shape }))
        .sort((a, b) => a.x - b.x),
    [shapes],
  );
  const rects = visible.flatMap((shape) => [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height]);
  const views = visible.map((shape) => tracked[shape.id] ?? null);
  const glass = useAnimatedRef<Animated.View>();
  // The glass's own width, unscaled: `measure` gives frames as drawn, swollen by the melt the row sits in (and a frame
  // late), so they're scaled back by how much bigger than this the glass itself measures, in the same frame.
  const laidOut = useSharedValue(0);

  // Each capsule's shape, read from its layout on the UI thread as it animates there, so no frame waits on React; and
  // swollen about its middle as an item on it shows or hides. React's layout is the start and the fallback.
  const melt = useContext(BarMeltContext);
  const animated = useAnimatedProps(() => {
    ticking.get();
    const origin = _WORKLET ? measure(glass) : null;
    const out: number[] = [];
    for (let i = 0; i < views.length; i++) {
      const view = views[i];
      const frame = origin && view ? measure(view.ref) : null;
      let left = rects[i * 4];
      let top = rects[i * 4 + 1];
      let right = rects[i * 4 + 2];
      let bottom = rects[i * 4 + 3];
      if (origin && frame) {
        const scale = laidOut.get() > 0 && origin.width > 0 ? origin.width / laidOut.get() : 1;
        left = (frame.pageX - origin.pageX) / scale;
        top = (frame.pageY - origin.pageY) / scale;
        right = left + frame.width / scale;
        bottom = top + frame.height / scale;
      }
      const amount = view?.swell.get() ?? 0;
      const { wider, taller } = swellBy(right - left, bottom - top, amount);
      out.push(left - wider, top - taller, right + wider, bottom + taller);
    }
    return {
      blend: melt ? meltLook(melt.get()).blend : bar.bridge,
      shapes: out.length > 0 ? out : [0, 0, 0, 0],
    };
  });
  return (
    <RowContext value={row}>
      <AnimatedNativeGlassView
        ref={glass as never}
        {...material}
        lift
        presence={visible.length > 0 ? 1 : 0}
        animatedProps={animated}
        // The glass rounds each shape by at most half its height, so this keeps every capsule fully round, a swelling
        // one too: at half the resting height a taller capsule would square its corners.
        cornerRadius={height}
        continuous={1}
        pressGrow={glassPress.grow}
        pressGlowSpread={glassPress.glowSpread}
        pressShapes={visible.map((shape) => (shape.interactive ? glowFor(shape.width, false) : 0))}
        onLayout={(event) => laidOut.set(event.nativeEvent.layout.width)}
        style={style}>
        {children}
      </AnimatedNativeGlassView>
    </RowContext>
  );
};

interface Props {
  children: ReactNode;
  // The accent, for a prominent item, which iOS fills with tinted glass.
  tint?: string;
  disabled?: boolean;
  // The bottom toolbar's capsules are taller than the bar's.
  height?: number;
  // Takes the row's spare width, as a capsule holding the search field does.
  grow?: boolean;
  // 0 at rest; 1 swells it taller and wider about its middle, as when one of its items shows or hides.
  swell?: SharedValue<number>;
  // How much of its glass shows, 0 to 1, its content staying whole: for a capsule that turns into glass from a plain fill.
  presence?: SharedValue<number>;
}

/** The glass behind a group of bar items: a capsule that lifts and glows under the finger, as a glass button does. */
export const BarCapsule = ({
  children,
  tint,
  disabled,
  height = barItem.height,
  grow = false,
  swell,
  presence,
}: Props) => {
  const row = useContext(RowContext);
  const id = useId();
  const material = useBarMaterial();
  const [width, setWidth] = useState(0);
  const shared = row && !tint;
  useEffect(() => (shared ? () => row.set(id, null) : undefined), [shared, row, id]);
  const view = useAnimatedRef<Animated.View>();
  useEffect(() => {
    if (!shared || !swell) return undefined;
    row.track(id, { ref: view, swell });
    return () => row.track(id, null);
  }, [shared, row, id, swell, view]);
  const style = [styles.capsule, { height, minWidth: height }, grow && styles.grow];
  // Grown by its swell on every side, the margins giving it back so nothing around it moves.
  const swellStyle = useAnimatedStyle(() => {
    const { wider, taller } = swellBy(width, height, swell?.get() ?? 0);
    return {
      height: height + taller * 2,
      marginVertical: -taller,
      paddingHorizontal: wider,
      marginHorizontal: -wider,
    };
  });
  const glassProps = useAnimatedProps(() => ({
    cornerRadius: (height + height * barItemMotion.swellY * (swell?.get() ?? 0)) / 2,
    presence: presence?.get() ?? 1,
  }));

  if (shared) {
    const layout = (event: LayoutChangeEvent) => {
      const { x, y, width: w, height: h } = event.nativeEvent.layout;
      row.set(id, { x, y, width: w, height: h, interactive: !disabled });
    };
    // The row's glass draws this capsule's shape, following its layout.
    return (
      <Animated.View ref={view} style={style} onLayout={layout}>
        {children}
      </Animated.View>
    );
  }

  // A capsule in glass of its own swells and resizes through its layout, which runs on the UI thread too.
  return (
    <AnimatedNativeGlassView
      {...material}
      lift
      cornerRadius={height / 2}
      animatedProps={swell || presence ? glassProps : undefined}
      // Apple's capsule: the curve eases into the straight sides rather than meeting them as a semicircle.
      continuous={1}
      glassTint={tint}
      interactive={!disabled}
      pressGrow={glassPress.grow}
      pressGlow={glowFor(width, Boolean(tint))}
      pressGlowSpread={glassPress.glowSpread}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={[style, swell && swellStyle]}>
      {children}
    </AnimatedNativeGlassView>
  );
};

const barEdge = ({
  rimWidth,
  rimSide,
  rimOptic,
  rimOpticTop,
  rimOpticDarken,
  shadow,
  shadowRadius,
  shadowOffset,
  shadowSpread,
}: ReturnType<typeof regularMaterial>) => ({
  rimWidth,
  rimSide,
  rimOptic,
  rimOpticTop,
  rimOpticDarken,
  shadow,
  shadowRadius,
  shadowOffset,
  shadowSpread,
});

const styles = StyleSheet.create({
  capsule: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
