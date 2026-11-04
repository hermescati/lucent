import { useNavigation, useRoute } from 'expo-router';
import { Children, isValidElement, useImperativeHandle, useLayoutEffect } from 'react';

import { getSearch, getSearchInput, setSearchProps, updateSearch } from './store.android';
import { ToolbarSearchBarSlot } from '../toolbar/parts.android';
import type { LucentSearchBarProps, LucentToolbarProps } from '../types';

// `button` is a round magnifier at the bottom, and `barButton` one in the navigation bar; either opens the field.
export type SearchPlacement = 'header' | 'bottom' | 'slot' | 'button' | 'barButton';

const hasSlot = (toolbar: LucentToolbarProps) =>
  Children.toArray(toolbar.children).some(
    (child) =>
      isValidElement<{ hidden?: boolean }>(child) && child.type === ToolbarSearchBarSlot && !child.props.hidden,
  );

/**
 * Where iOS 26 puts a stack screen's search bar on iPhone: in the bottom toolbar's slot for it, at the bottom on its
 * own when there's no toolbar, and in the navigation bar beside a toolbar without a slot, or when asked to. Asked for a
 * button, it's a magnifier at the bottom, or in the navigation bar when a toolbar has the bottom; centred, it's the
 * field in the navigation bar on a screen without a toolbar, and the magnifier beside one, as on iPhone.
 */
export const searchPlacement = (
  props: LucentSearchBarProps,
  toolbar: LucentToolbarProps | undefined,
): SearchPlacement => {
  const { placement } = props;
  if (placement === 'stacked' || placement === 'inline' || props.allowToolbarIntegration === false) return 'header';
  // On iPhone, iOS 27 draws `integratedCentered` beside a bottom toolbar as `integratedButton` (simulator).
  if (placement === 'integratedCentered' && !toolbar) return 'header';
  if (toolbar && hasSlot(toolbar)) return 'slot';
  if (placement === 'integratedButton' || placement === 'integratedCentered') return toolbar ? 'barButton' : 'button';
  if (toolbar) return 'header';
  return 'bottom';
};

/** Leaves search mode, as the close button does: the field empties and lets go of the keyboard. */
export const cancelSearch = (routeKey: string) => {
  const state = getSearch(routeKey);
  if (!state) return;
  getSearchInput(routeKey)?.blur();
  if (state.text) state.props.onChangeText?.({ nativeEvent: { text: '' } } as never);
  updateSearch(routeKey, { focused: false, text: '' });
  state.props.onCancelButtonPress?.({} as never);
  state.props.onClose?.();
};

/** `Stack.SearchBar` on Android: the screen's header and toolbar draw the field from these props. */
export const SearchBar = ({ ref, ...props }: LucentSearchBarProps) => {
  const route = useRoute();
  const navigation = useNavigation();
  const key = route.key;

  useLayoutEffect(() => {
    setSearchProps(key, props);
  });
  useLayoutEffect(() => () => setSearchProps(key, undefined), [key]);
  // As in expo-router, a search bar shows the header.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: true });
  }, [navigation]);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        updateSearch(key, { focused: true });
        getSearchInput(key)?.focus();
      },
      blur: () => getSearchInput(key)?.blur(),
      clearText: () => {
        getSearchInput(key)?.clear();
        updateSearch(key, { text: '' });
      },
      setText: (text: string) => updateSearch(key, { text }),
      toggleCancelButton: () => {},
      cancelSearch: () => cancelSearch(key),
    }),
    [key],
  );

  return null;
};
