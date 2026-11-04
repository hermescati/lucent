import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarReach } from '../../../core/tabs/TabBarReach';
import { toolbar } from '../tokens';

/** How far the bottom toolbar sits above the screen's bottom edge at rest: above the tab bar, if there is one. */
export const useToolbarOffset = () => {
  const bottom = useSafeAreaInsets().bottom;
  const tabBar = useTabBarReach();
  if (tabBar) return tabBar.rest + toolbar.aboveTabBar;
  return bottom > toolbar.gestureNavInsetMax ? bottom + toolbar.aboveButtons : toolbar.bottom;
};
