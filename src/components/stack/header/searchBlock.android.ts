import { searchPlacement } from '../search/SearchBar.android';
import { useSearch } from '../search/store.android';
import { search } from '../tokens';
import { useBottomToolbar } from '../toolbar/Toolbar.android';

/**
 * What the screen's search bar asks of its navigation bar: room for the field when it goes in the bar, whether the
 * field scrolls away, whether it's a button among the bar's items, and whether the bar steps aside while a search from the bottom toolbar is under way.
 */
export const useHeaderSearchBlock = (routeKey: string) => {
  const state = useSearch(routeKey);
  const toolbar = useBottomToolbar(routeKey);
  const placement = state ? searchPlacement(state.props, toolbar) : undefined;
  const inBar = placement === 'header';
  return {
    block: inBar ? search.header.block : 0,
    hidden: Boolean(state?.focused) && !inBar && state?.props.hideNavigationBar !== false,
    collapses: inBar && state?.props.hideWhenScrolling !== false && !state?.focused,
    // Focused in the bar, the field rises into the row, and the row's items and title step aside.
    focusedInBar: inBar && Boolean(state?.focused),
    // A magnifier among the bar's items, which opens the field.
    button: placement === 'barButton' && !state?.focused,
  };
};
