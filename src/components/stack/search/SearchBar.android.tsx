import { useNavigation, useRoute } from 'expo-router';
import { Children, isValidElement, useImperativeHandle, useLayoutEffect } from 'react';

import { getSearch, getSearchInput, setSearchProps, updateSearch } from './store.android';
import { ToolbarSearchBarSlot } from '../toolbar/parts.android';
import type { LucentSearchBarProps, LucentToolbarProps } from '../types';

// `button` is a round magnifier at the bottom, and `barButton` one in the navigation bar; either opens the field.
export type SearchPlacement = 'header' | 'bottom' | 'slot' | 'button' | 'barButton';

const slotOf = (toolbar: LucentToolbarProps) =>
  Children.toArray(toolbar.children).find(
    (child) =>
      isValidElement<{ hidden?: boolean }>(child) && child.type === ToolbarSearchBarSlot && !child.props.hidden,
  ) as { props: { separateBackground?: boolean; hidesSharedBackground?: boolean } } | undefined;
const hasSlot = (toolbar: LucentToolbarProps) => slotOf(toolbar) !== undefined;

/**
 * Whether the toolbar's search slot is a magnifier in a circle rather than a field: given a background of its own, or
 * none, iOS 27 draws it as a round button among the toolbar's, which opens search mode as the field does (simulator).
 */
export const slotIsButton = (toolbar: LucentToolbarProps | undefined) => {
  const slot = toolbar ? slotOf(toolbar) : undefined;
  return Boolean(slot && (slot.props.separateBackground || slot.props.hidesSharedBackground));
};

/**
 * Where iOS 26 puts a stack screen's search bar on iPhone: in the bottom toolbar's slot for it, at the bottom on its
 * own when there's no toolbar, and in the navigation bar beside a toolbar without a slot, or when asked to. Asked for a
 * button, it's a magnifier at the bottom, or in the navigation bar when a toolbar has the bottom; centred, it's the
 * field in the navigation bar on a screen without a toolbar, and the magnifier beside one, as on iPhone.
 */
export const searchPlacement = (
  props: LucentSearchBarProps,
  toolbar: LucentToolbarProps | undefined,
  inTabs: boolean,
): SearchPlacement => {
  const { placement } = props;
  if (placement === 'stacked' || placement === 'inline' || props.allowToolbarIntegration === false) return 'header';
  // On iPhone, iOS 27 draws `integratedCentered` beside a bottom toolbar as `integratedButton` (simulator).
  if (placement === 'integratedCentered' && !toolbar) return 'header';
  if (toolbar && hasSlot(toolbar)) return 'slot';
  // In a tab, the bottom is the tab bar's, so iOS 27 puts the button up among the bar's items, and the field under the
  // title, even with the tab bar hidden (simulator). Outside tabs, it floats them at the bottom.
  if (placement === 'integratedButton' || placement === 'integratedCentered') {
    return toolbar || inTabs ? 'barButton' : 'button';
  }
  if (toolbar || inTabs) return 'header';
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
