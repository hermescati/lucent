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

/**
 * Whether the screen is inside `NativeTabs`, its bar shown or not. iOS places a stack's search by it: in a tab, up in
 * the navigation bar; outside one, at the bottom of an iPhone.
 */
export const InsideTabsContext = createLucentContext<boolean>('InsideTabs', false);

export const useInsideTabs = () => useContext(InsideTabsContext);

/**
 * The tint `NativeTabs` was given, for what in its screens takes it as iOS's do: a toolbar search field's cursor follows
 * the tab bar's tint (simulator), while the field in the navigation bar keeps the system blue.
 */
export const TabsTintContext = createLucentContext<string | undefined>('TabsTint', undefined);

export const useTabsTint = () => useContext(TabsTintContext);
