import { useContext } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { createLucentContext } from '../../theme/context';

/**
 * How far the floating tab bar reaches up from the screen's bottom edge, for what floats above it, such as a stack's
 * bottom toolbar. `reach` follows the bar as it minimizes; `rest` is its full reach, for insetting content.
 */
export interface TabBarReach {
  reach: SharedValue<number>;
  rest: number;
  // How far the bar's middle sits above the screen's bottom edge; it minimizes about it.
  middle: number;
  // How far the minimized bar's circles' centres sit in from the screen's sides, and how wide they are.
  circle: number;
  compact: number;
}

export const TabBarReachContext = createLucentContext<TabBarReach | null>('TabBarReach', null);

/** The tab bar's reach, or `null` outside `NativeTabs` or with its bar hidden. */
export const useTabBarReach = () => useContext(TabBarReachContext);
