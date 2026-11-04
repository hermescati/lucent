import { useCallback, useContext, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useAnimatedProps } from 'react-native-reanimated';

import { BarMeltContext, meltLook } from './melt.android';
import { AnimatedNativeGlassView, NativeGlassView } from '../../../core/glass/NativeGlass';
import { regularMaterial, useGlassMaterial } from '../../../core/glass/material';
import { glassPress } from '../../../core/glass/presets';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { bar, barItem } from '../tokens';

// The glass shader draws at most this many shapes in one view.
export const maxBridged = 4;

interface Shape {
  x: number;
  y: number;
  width: number;
  height: number;
  interactive: boolean;
}

const RowContext = createLucentContext<((id: string, shape: Shape | null) => void) | null>('BarGlassRow', null);

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
  // Left to right, so a shape keeps its index while the others come and go.
  const visible = useMemo(() => Object.values(shapes).sort((a, b) => a.x - b.x), [shapes]);
  // As the bar's buttons pop in or out, they run together.
  const melt = useContext(BarMeltContext);
  const blend = useAnimatedProps(() => ({ blend: melt ? meltLook(melt.get()).blend : bar.bridge }));
  return (
    <RowContext value={set}>
      <AnimatedNativeGlassView
        {...material}
        lift
        presence={visible.length > 0 ? 1 : 0}
        animatedProps={blend}
        cornerRadius={height / 2}
        continuous={1}
        pressGrow={glassPress.grow}
        pressGlowSpread={glassPress.glowSpread}
        pressShapes={visible.map((shape) => (shape.interactive ? glowFor(shape.width, false) : 0))}
        shapes={
          visible.length > 0
            ? visible.flatMap((shape) => [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height])
            : [0, 0, 0, 0]
        }
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
}

/** The glass behind a group of bar items: a capsule that lifts and glows under the finger, as a glass button does. */
export const BarCapsule = ({ children, tint, disabled, height = barItem.height, grow = false }: Props) => {
  const row = useContext(RowContext);
  const id = useId();
  const material = useBarMaterial();
  const [width, setWidth] = useState(0);
  const shared = row && !tint;
  useEffect(() => (shared ? () => row(id, null) : undefined), [shared, row, id]);
  const style = [styles.capsule, { height, minWidth: height }, grow && styles.grow];

  if (shared) {
    const layout = (event: LayoutChangeEvent) => {
      const { x, y, width: w, height: h } = event.nativeEvent.layout;
      row(id, { x, y, width: w, height: h, interactive: !disabled });
    };
    return (
      <View style={style} onLayout={layout}>
        {children}
      </View>
    );
  }

  return (
    <NativeGlassView
      {...material}
      lift
      cornerRadius={height / 2}
      // Apple's capsule: the curve eases into the straight sides rather than meeting them as a semicircle.
      continuous={1}
      glassTint={tint}
      interactive={!disabled}
      pressGrow={glassPress.grow}
      pressGlow={glowFor(width, Boolean(tint))}
      pressGlowSpread={glassPress.glowSpread}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={style}>
      {children}
    </NativeGlassView>
  );
};

const barEdge = ({
  rim,
  rimWidth,
  rimSide,
  shadow,
  shadowRadius,
  shadowOffset,
  shadowSpread,
}: ReturnType<typeof regularMaterial>) => ({
  rim,
  rimWidth,
  rimSide,
  rimCrisp: false,
  shadow,
  shadowRadius,
  shadowOffset,
  shadowSpread,
});

const styles = StyleSheet.create({
  capsule: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
});
