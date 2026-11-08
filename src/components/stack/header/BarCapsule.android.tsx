import { useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { I18nManager, StyleSheet, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { regularMaterial, useGlassMaterial } from '../../../core/glass/material';
import { glassPress } from '../../../core/glass/presets';
import { islandReturn } from '../../../core/motion/island';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { bar, barItem, barItemMotion } from '../tokens';

// Right to left, a capsule's start is its right.
const mirrored = I18nManager.isRTL;

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
  // How much a capsule splitting off or melting back blends with its neighbour, as the tab bar's search circle does.
  splitBlend: SharedValue<number>;
}

interface Tracked {
  ref: AnimatedRef<Animated.View>;
  swell?: SharedValue<number>;
  scale?: SharedValue<number> | null;
  sag?: SharedValue<number>;
  inset?: SharedValue<number>;
  outset?: SharedValue<number>;
  drop?: SharedValue<number>;
  around?: SharedValue<number>;
}

const RowContext = createLucentContext<Row | null>('BarGlassRow', null);

/**
 * A capsule splitting off (`Split`): how big it is, 0 to 1, about its middle, and how much its glyph shows. The row's
 * glass draws its shape that size and its content shrinks and fades with it: not a transform around it, which `measure`
 * reads late, from the shadow tree.
 */
export const SplitScaleContext = createLucentContext<{
  scale: SharedValue<number>;
  glyph: SharedValue<number>;
  // How far apart it is, 0 melted in to 1 split off.
  apart: SharedValue<number>;
  // 1 splitting off, 0 melting back.
  out: SharedValue<number>;
} | null>('BarSplitScale', null);

/**
 * A side's capsules coming back beside glass closing up to them (`islandReturn`), as the back button does when search in
 * the bar closes: how big they are, about their middles, and how far they've sunk. Drawn as `SplitScaleContext` is.
 */
export const BarReturnContext = createLucentContext<{
  scale: SharedValue<number>;
  dip: SharedValue<number>;
} | null>('BarReturn', null);

/**
 * How much of a side's glass shows, 0 to 1, for every capsule and row in it: lifted glass is drawn by the backdrop, so an
 * opacity around it doesn't hide it. The trailing capsule goes this way as search in the bar opens over it.
 */
export const BarGlassPresenceContext = createLucentContext<SharedValue<number> | null>('BarGlassPresence', null);

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
  const fill = useContext(BarFillContext);
  return { ...useGlassMaterial('regular'), ...barEdge(regularMaterial(theme)), ...(fill ? { fallback: fill } : {}) };
};

/**
 * The capsules' fill in the solid fallback, where they're drawn plain: `Stack.Toolbar`'s `backgroundColor`, which
 * expo-router's Android toolbar fills itself with. Glass ignores it, as iOS's does.
 */
export const BarFillContext = createLucentContext<string | undefined>('BarFill', undefined);

const glowFor = (width: number, tinted: boolean) =>
  (width >= glassPress.wideFrom ? glassPress.wideGlow : glassPress.glow) * (tinted ? glassPress.tintedGlow : 1);

interface RowProps {
  children: ReactNode;
  style: StyleProp<ViewStyle>;
  height: number;
  // How much of its glass shows, 0 to 1, its content staying whole: for a row that turns into glass from a plain fill.
  presence?: SharedValue<number>;
  // Its capsules glow under a finger, which takes the touch: off for a row up out of sight over another.
  pressable?: boolean;
}

/**
 * One side's capsules drawn in one piece of glass, as iOS does: each stays its own capsule at rest, but a held one grows
 * into its neighbour and a neck of glass joins them, which breaks as it lets go. The row's `BarCapsule`s become shapes in
 * it. Only for untinted capsules, and no more than the shader draws.
 */
export const BarGlassRow = ({ children, style, height, presence: own, pressable = true }: RowProps) => {
  const side = useContext(BarGlassPresenceContext);
  const presence = own ?? side ?? undefined;
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
      'worklet';
      ticking.set(0);
      ticking.set(withTiming(1, { duration }));
    },
    [ticking],
  );
  const splitBlend = useSharedValue(0);
  const row = useMemo(() => ({ set, track, follow, splitBlend }), [set, track, follow, splitBlend]);
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
  // The glass's own height, unscaled: `measure` gives frames as drawn, swollen by the melt the row sits in, so they're
  // scaled back by how much taller than this the glass itself measures, in the same frame. Its height, not its width:
  // that's reported a frame late, and the row widens as a capsule splits off.
  const laidOut = useSharedValue(0);

  // Each capsule's shape, read from its layout on the UI thread as it animates there, so no frame waits on React; and
  // swollen about its middle as an item on it shows or hides. React's layout is the start and the fallback.
  const melt = useContext(BarMeltContext);
  const back = useContext(BarReturnContext);
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
        const scale = laidOut.get() > 0 && origin.height > 0 ? origin.height / laidOut.get() : 1;
        left = (frame.pageX - origin.pageX) / scale;
        top = (frame.pageY - origin.pageY) / scale;
        right = left + frame.width / scale;
        bottom = top + frame.height / scale;
      }
      // Drawn in from its start without a layout pass, which `measure` would read a frame late; right to left, its start
      // is its right.
      if (mirrored) {
        right -= view?.inset?.get() ?? 0;
        left -= view?.outset?.get() ?? 0;
      } else {
        left += view?.inset?.get() ?? 0;
        right += view?.outset?.get() ?? 0;
      }
      const scale = (view?.scale?.get() ?? 1) * (back?.scale.get() ?? 1);
      const dip = (back?.dip.get() ?? 0) + (view?.drop?.get() ?? 0);
      top += dip;
      bottom += dip;
      if (scale !== 1) {
        const across = ((right - left) * (1 - scale)) / 2;
        const down = ((bottom - top) * (1 - scale)) / 2;
        left += across;
        right -= across;
        top += down;
        bottom -= down;
      }
      // Grown evenly, staying round.
      const by = view?.around?.get() ?? 0;
      left -= by;
      right += by;
      top -= by;
      bottom += by;
      const amount = view?.swell?.get() ?? 0;
      const { wider, taller } = swellBy(right - left, bottom - top, amount);
      out.push(left - wider, top - taller, right + wider, bottom + taller + (view?.sag?.get() ?? 0));
    }
    return {
      blend: Math.max(melt ? meltLook(melt.get()).blend : bar.bridge, splitBlend.get()),
      ...(presence ? { presence: presence.get() } : {}),
      shapes: out.length > 0 ? out : [0, 0, 0, 0],
    };
  });
  return (
    <RowContext value={row}>
      <AnimatedNativeGlassView
        ref={glass as never}
        {...material}
        lift
        presence={presence ? undefined : visible.length > 0 ? 1 : 0}
        animatedProps={animated}
        // The glass rounds each shape by at most half its height, so this keeps every capsule fully round, a swelling
        // one too: at half the resting height a taller capsule would square its corners.
        cornerRadius={height}
        continuous={1}
        pressGrow={glassPress.grow}
        pressGlowSpread={glassPress.groupGlowSpread}
        pressShapes={visible.map((shape) => (pressable && shape.interactive ? glowFor(shape.width, false) : 0))}
        onLayout={(event) => laidOut.set(event.nativeEvent.layout.height)}
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
  // How far its bottom drops, in points, its top and sides staying put, as a search field sags stretching out of the
  // magnifier. In a shared row only.
  sag?: SharedValue<number>;
  // How far in from its start its glass is drawn, in points, as a field stretching out of a capsule: its layout stays
  // whole. In a shared row only.
  inset?: SharedValue<number>;
  // How far past its end its glass is drawn, in points, as a field reaching into a close button's place before that
  // opens: its layout stays put. In a shared row only.
  outset?: SharedValue<number>;
  // How far its glass grows on every side, in points, staying round: a close button as big as the field it's necked
  // to as that sags. In a shared row only.
  around?: SharedValue<number>;
  // How far down its glass is drawn, in points, as a close button keeps to the middle of a field sagging beside it. In a
  // shared row only.
  drop?: SharedValue<number>;
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
  sag,
  inset,
  outset,
  drop,
  around,
  presence: own,
}: Props) => {
  const row = useContext(RowContext);
  const side = useContext(BarGlassPresenceContext);
  const presence = own ?? side ?? undefined;
  const id = useId();
  const material = useBarMaterial();
  const [width, setWidth] = useState(0);
  const shared = row && !tint;
  useEffect(() => (shared ? () => row.set(id, null) : undefined), [shared, row, id]);
  const view = useAnimatedRef<Animated.View>();
  const split = useContext(SplitScaleContext);
  const splitScale = split?.scale ?? null;
  useEffect(() => {
    if (!shared || (!swell && !splitScale && !sag && !inset && !outset && !drop && !around)) return undefined;
    row.track(id, { ref: view, swell, scale: splitScale, sag, inset, outset, drop, around });
    return () => row.track(id, null);
  }, [shared, row, id, swell, splitScale, sag, inset, outset, drop, around, view]);
  const back = useContext(BarReturnContext);
  const moves = Boolean(splitScale || back);
  const scaleStyle = useAnimatedStyle(() => ({
    opacity: split?.glyph.get() ?? 1,
    transform: [{ translateY: back?.dip.get() ?? 0 }, { scale: (split?.scale.get() ?? 1) * (back?.scale.get() ?? 1) }],
  }));
  // Coming back, its glyphs come out of a blur as it grows, sharp once it's whole, as iOS 27's back button's do budding
  // off a search field's start.
  const backBlur = useAnimatedProps(() => {
    const now = Math.min(back?.scale.get() ?? 1, 1);
    const grown = Math.min(Math.max((now - islandReturn.from) / (1 - islandReturn.from), 0), 1);
    return { radius: (1 - grown) * barItemMotion.blur };
  });
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
        {back ? (
          <AnimatedNativeGlassBlur style={[styles.capsule, styles.blur, scaleStyle]} animatedProps={backBlur}>
            {children}
          </AnimatedNativeGlassBlur>
        ) : moves ? (
          <Animated.View style={[styles.capsule, scaleStyle]}>{children}</Animated.View>
        ) : (
          children
        )}
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
      style={[style, swell && swellStyle, moves && scaleStyle]}>
      {back ? (
        <AnimatedNativeGlassBlur style={[styles.capsule, styles.blur]} animatedProps={backBlur}>
          {children}
        </AnimatedNativeGlassBlur>
      ) : (
        children
      )}
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
  // Room for a blur to spread past what it holds.
  blur: { padding: barItemMotion.blur * 2, margin: -barItemMotion.blur * 2 },
  grow: { flex: 1 },
});
