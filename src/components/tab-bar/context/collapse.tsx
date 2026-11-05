import { useContext, type ReactNode } from 'react';
import { Easing, useSharedValue, withDelay, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { createLucentContext } from '../../../theme/context';
import { motion } from '../tokens';

export interface TabBarCollapseState {
  progress: SharedValue<number>;
  // Minimizing, the bar (and its accessory) first draws in a little, before it gathers into its circles (motion.tuck).
  tuck: SharedValue<number>;
  target: SharedValue<number>;
  locked: SharedValue<boolean>;
  minimize: 'onScrollDown' | 'onScrollUp' | null;
}

const TabBarCollapseContext = createLucentContext<TabBarCollapseState | null>('TabBarCollapse', null);

interface Props {
  minimize: TabBarCollapseState['minimize'];
  children: ReactNode;
}

export const TabBarCollapseProvider = ({ minimize, children }: Props) => {
  const progress = useSharedValue(0);
  const tuck = useSharedValue(0);
  const target = useSharedValue(0);
  const locked = useSharedValue(false);

  return <TabBarCollapseContext value={{ progress, tuck, target, locked, minimize }}>{children}</TabBarCollapseContext>;
};

export const useTabBarCollapse = (): TabBarCollapseState | null => useContext(TabBarCollapseContext);

export const setTabBarCollapsed = (state: TabBarCollapseState, value: number) => {
  'worklet';
  if (state.target.get() === value || (value === 1 && state.locked.get())) {
    return;
  }
  state.target.set(value);
  // iOS 27 (simulator) minimizes in two steps: the whole bar, its accessory with it, shrinks a little about its middle,
  // and holds; then it gathers into its circles. Expanding, it opens straight out.
  if (value === 1) {
    state.tuck.set(withTiming(1, { duration: motion.tuck.duration, easing: Easing.out(Easing.quad) }));
    state.progress.set(
      withDelay(
        motion.tuck.gatherAfter,
        withTiming(1, { duration: motion.tuck.gather, easing: Easing.out(Easing.quad) }),
      ),
    );
  } else {
    state.tuck.set(0);
    state.progress.set(withSpring(0, motion.springs.expand));
  }
};
