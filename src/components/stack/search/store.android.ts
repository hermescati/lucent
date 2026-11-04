import { useSyncExternalStore, type ComponentRef } from 'react';
import type { TextInput } from 'react-native';

import type { LucentSearchBarProps } from '../types';

/** A screen's search: its `Stack.SearchBar` props, and the field's state, which the header and toolbar both draw. */
export interface SearchState {
  props: LucentSearchBarProps;
  focused: boolean;
  text: string;
}

// The field while it's on screen, for the search bar's ref commands. Apart from the state, so registering it changes
// no one's snapshot.
type Input = ComponentRef<typeof TextInput>;

const inputs = new Map<string, Input>();

export const setSearchInput = (routeKey: string, input: Input | null) => {
  if (input) inputs.set(routeKey, input);
  else inputs.delete(routeKey);
};

export const getSearchInput = (routeKey: string): Input | undefined => inputs.get(routeKey);

const searches = new Map<string, SearchState>();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getSearch = (routeKey: string) => searches.get(routeKey);

export const setSearchProps = (routeKey: string, props: LucentSearchBarProps | undefined) => {
  if (!props) {
    searches.delete(routeKey);
  } else {
    const current = searches.get(routeKey);
    searches.set(routeKey, { focused: false, text: '', ...current, props });
  }
  publish();
};

export const updateSearch = (routeKey: string, patch: Partial<Omit<SearchState, 'props'>>) => {
  const current = searches.get(routeKey);
  if (!current) return;
  if (Object.entries(patch).every(([key, value]) => current[key as keyof SearchState] === value)) return;
  searches.set(routeKey, { ...current, ...patch });
  publish();
};

export const useSearch = (routeKey: string) => useSyncExternalStore(subscribe, () => searches.get(routeKey));
