import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedRef, type AnimatedRef } from 'react-native-reanimated';

import { NativeGlassView } from './glass/NativeGlass';
import { createLucentContext } from '../theme/context';

/**
 * A layer over all of a screen, its bars too: what a component shows there draws above everything but the bars'
 * menus. A list's dragged row moves into it while it's lifted, as iOS draws a lifted row above the navigation bar.
 * `ref` is the layer, which a component measures to place its content.
 */
export interface ScreenOverlay {
  show: (node: ReactNode) => void;
  ref: AnimatedRef<Animated.View>;
}

export const ScreenOverlayContext = createLucentContext<ScreenOverlay | null>('ScreenOverlay', null);

/** A screen's overlay, drawn after `children`. What it shows takes no touches. */
export const ScreenOverlayHost = ({ children }: { children: ReactNode }) => {
  const [node, setNode] = useState<ReactNode>(null);
  const ref = useAnimatedRef<Animated.View>();
  const overlay = useMemo(() => ({ show: setNode, ref }), [ref]);
  return (
    <ScreenOverlayContext value={overlay}>
      {children}
      <Animated.View ref={ref} pointerEvents="none" style={styles.layer}>
        {/* The bars' buttons are lifted glass, which the screen's backdrop draws over everything else: its content goes
          in glass of its own, lifted after theirs but drawing none, so it draws over them. */}
        {node != null ? (
          <NativeGlassView lift presence={0} style={styles.fill}>
            {node}
          </NativeGlassView>
        ) : null}
      </Animated.View>
    </ScreenOverlayContext>
  );
};

// Over the bars, which are raised (`elevation`) above the content: Android draws a raised view over later ones.
const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 3, elevation: 3 },
  fill: { flex: 1 },
});
