import { createContext, use } from 'react';

import type { TabSpec } from './triggers';

/**
 * iPhone's tab bar fits five entries, search's circle included. With more, iOS 27 shows the first four tabs and a More
 * tab, drops search's circle, and lists the rest (search last) on More's own screen (simulator).
 */
export const maxEntries = 5;

export const moreName = '__lucent_more';

export const moreTab: TabSpec = {
  name: moreName,
  label: 'More',
  icon: { md: 'more_horiz' },
  hidden: false,
  search: false,
  disabled: false,
  disablePopToTop: true,
  disableScrollToTop: true,
  automaticallyActivatesSearch: false,
};

export interface MoreState {
  // The tabs that don't fit, in order, listed on More's screen.
  overflow: TabSpec[];
  // Every tab's name, the bar's and More's: Back from More's list goes to the one it was opened over.
  entries: string[];
  // Whether More's list is showing, over whichever tab was last chosen.
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const MoreContext = createContext<MoreState | null>(null);

export const useMore = () => use(MoreContext);

/** The bar's tabs and search's circle for these entries, and the tabs that go under More. */
export const splitEntries = (primary: TabSpec[], search: TabSpec | undefined) => {
  if (primary.length + (search ? 1 : 0) <= maxEntries) {
    return { barTabs: primary, barSearch: search, overflow: [] as TabSpec[] };
  }
  const shown = maxEntries - 1;
  return {
    barTabs: [...primary.slice(0, shown), moreTab],
    barSearch: undefined,
    overflow: [...primary.slice(shown), ...(search ? [search] : [])],
  };
};
