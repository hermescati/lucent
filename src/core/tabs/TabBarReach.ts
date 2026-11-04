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

/**
 * Whether the tab bar's search tab is in search mode, focused or not, and not cancelled. iOS 27 hides the search tab's
 * navigation bar meanwhile (simulator): it fades and lifts away as the field opens, and snaps back on `cancelSearch`.
 */
export const TabSearchActiveContext = createLucentContext<boolean>('TabSearchActive', false);

export const useTabSearchActive = () => useContext(TabSearchActiveContext);

/** Whether More's list covers the tabs' screens: the screen under it hides its navigation bar meanwhile. */
export const TabCoveredContext = createLucentContext<boolean>('TabCovered', false);

export const useTabCovered = () => useContext(TabCoveredContext);
