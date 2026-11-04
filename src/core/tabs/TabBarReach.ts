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
}

export const TabBarReachContext = createLucentContext<TabBarReach | null>('TabBarReach', null);

/** The tab bar's reach, or `null` outside `NativeTabs` or with its bar hidden. */
export const useTabBarReach = () => useContext(TabBarReachContext);
