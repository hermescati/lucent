import { useSyncExternalStore, type ComponentRef } from 'react';
import type { TextInput } from 'react-native';
import { makeMutable, type SharedValue } from 'react-native-reanimated';

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
    focusDrives.delete(routeKey);
    going.delete(routeKey);
  } else {
    const current = searches.get(routeKey);
    searches.set(routeKey, { focused: false, text: '', ...current, props });
  }
  publish();
};

// Screens with one under them to go back to: there, back leaves the screen in search mode, as iOS 27's swipe back
// does; on a stack's first screen, it ends search mode.
const leaves = new Set<string>();

export const setSearchLeaves = (routeKey: string, can: boolean) => {
  if (can) leaves.add(routeKey);
  else leaves.delete(routeKey);
};

export const searchLeaves = (routeKey: string) => leaves.has(routeKey);

// Screens on their way off: a field still opening there doesn't take the keyboard as it goes, which would stay up over
// the screen under it.
const going = new Set<string>();

/** The screen's leaving: its field lets go of the keyboard and isn't focused again. */
export const searchGoing = (routeKey: string) => {
  going.add(routeKey);
  inputs.get(routeKey)?.blur();
};

export const searchIsGoing = (routeKey: string) => going.has(routeKey);

// Each screen's search mode on the UI thread, 1 focused: set as search mode changes, before the render that shows it,
// so motion that goes with it starts on the next frame rather than a render later.
const focusDrives = new Map<string, SharedValue<number>>();

export const searchFocusDrive = (routeKey: string) => {
  let drive = focusDrives.get(routeKey);
  if (!drive) {
    drive = makeMutable(searches.get(routeKey)?.focused ? 1 : 0);
    focusDrives.set(routeKey, drive);
  }
  return drive;
};

export const updateSearch = (routeKey: string, patch: Partial<Omit<SearchState, 'props'>>) => {
  const current = searches.get(routeKey);
  if (!current) return;
  if (Object.entries(patch).every(([key, value]) => current[key as keyof SearchState] === value)) return;
  searches.set(routeKey, { ...current, ...patch });
  if (patch.focused !== undefined) focusDrives.get(routeKey)?.set(patch.focused ? 1 : 0);
  publish();
};

export const useSearch = (routeKey: string) => useSyncExternalStore(subscribe, () => searches.get(routeKey));
