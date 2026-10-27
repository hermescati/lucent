import type { GlassContainerProps } from 'expo-glass-effect';
import { useCallback, useMemo, useState } from 'react';

import { NativeGlassView } from './NativeGlass';
import { glassPresets } from './presets';
import { ContainerContext, useGlassScheme, type GlassShape } from './shared';

const maxShapes = 4;

export const GlassContainer = ({ spacing = 0, children, ...rest }: GlassContainerProps) => {
  const scheme = useGlassScheme();
  const [shapes, setShapes] = useState<Record<string, GlassShape>>({});

  const set = useCallback((id: string, shape: GlassShape | null) => {
    setShapes((current) => {
      if (!shape) {
        const { [id]: _removed, ...others } = current;
        return others;
      }
      return { ...current, [id]: shape };
    });
  }, []);
  const context = useMemo(() => ({ set }), [set]);

  const visible = Object.values(shapes)
    .filter((shape) => shape.style !== 'none')
    .slice(0, maxShapes);
  const material = glassPresets[visible.some((shape) => shape.style === 'regular') ? 'regular' : 'clear'][scheme];

  return (
    <ContainerContext.Provider value={context}>
      <NativeGlassView
        {...material}
        lift
        presence={visible.length > 0 ? 1 : 0}
        blend={spacing}
        cornerRadius={Math.max(0, ...visible.map((shape) => shape.radius))}
        shapes={
          visible.length > 0
            ? visible.flatMap((shape) => [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height])
            : [0, 0, 0, 0]
        }
        {...rest}>
        {children}
      </NativeGlassView>
    </ContainerContext.Provider>
  );
};
