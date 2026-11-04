import { useContext, type ReactNode } from 'react';
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';

import { createLucentContext } from '../../../theme/context';
import { motion } from '../tokens';

export interface TabBarCollapseState {
  progress: SharedValue<number>;
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
  const target = useSharedValue(0);
  const locked = useSharedValue(false);

  return <TabBarCollapseContext value={{ progress, target, locked, minimize }}>{children}</TabBarCollapseContext>;
};

export const useTabBarCollapse = (): TabBarCollapseState | null => useContext(TabBarCollapseContext);

export const setTabBarCollapsed = (state: TabBarCollapseState, value: number) => {
  'worklet';
  if (state.target.get() === value || (value === 1 && state.locked.get())) {
    return;
  }
  state.target.set(value);
  state.progress.set(withSpring(value, motion.springs.morph));
};
