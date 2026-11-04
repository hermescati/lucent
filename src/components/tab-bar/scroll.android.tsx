import type { ReactElement } from 'react';
import { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

import { setTabBarCollapsed, useTabBarCollapse } from './context/collapse';
import { useTabBarOffset } from './hooks/useTabBarOffset';
import { layout, motion } from './tokens';
import { space } from '../../theme/tokens';

interface TabScrollMarkerProps {
  children: ReactElement;
}

export const TabScrollMarker = ({ children }: TabScrollMarkerProps) => children;

export const useTabBarScroll = () => {
  const collapse = useTabBarCollapse();
  const lastOffset = useSharedValue(0);
  const travelled = useSharedValue(0);
  // Only a drag or its fling minimizes the bar: not the content starting scrolled past a hidden search field, nor a
  // scroll to the top.
  const touched = useSharedValue(false);

  return useAnimatedScrollHandler({
    onScroll: (event) => {
      const offset = event.contentOffset.y;
      const delta = offset - lastOffset.get();
      lastOffset.set(offset);
      if (!collapse?.minimize) {
        return;
      }
      if (offset <= motion.collapseTopOffset) {
        travelled.set(0);
        setTabBarCollapsed(collapse, 0);
        return;
      }
      if (!touched.get()) {
        return;
      }
      const previous = travelled.get();
      const next = Math.sign(delta) === Math.sign(previous) || previous === 0 ? previous + delta : delta;
      travelled.set(next);
      const toward = collapse.minimize === 'onScrollUp' ? -next : next;
      if (toward > motion.collapseDistance) {
        setTabBarCollapsed(collapse, 1);
      } else if (toward < -motion.collapseDistance) {
        setTabBarCollapsed(collapse, 0);
      }
    },
    onBeginDrag: () => {
      touched.set(true);
    },
    onMomentumBegin: () => {
      touched.set(true);
    },
    onEndDrag: () => {
      touched.set(false);
    },
    onMomentumEnd: () => {
      touched.set(false);
    },
  });
};

export const useTabBarInset = (): number => useTabBarOffset() + layout.tabBarHeight + space[16];
