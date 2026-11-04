import { useNavigation, useRoute } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import { useLayoutEffect, useSyncExternalStore } from 'react';

import {
  ToolbarBadge,
  ToolbarButton,
  ToolbarIcon,
  ToolbarLabel,
  ToolbarMenu,
  ToolbarMenuAction,
  ToolbarSearchBarSlot,
  ToolbarSpacer,
  ToolbarView,
} from './parts.android';
import { BarItems } from '../header/BarItems.android';
import type { LucentToolbar, LucentToolbarProps } from '../types';

const colorString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const sideFor = (placement: LucentToolbarProps['placement']) =>
  placement === 'left' ? 'headerLeft' : placement === 'right' ? 'headerRight' : null;

let warnedBottom = false;

/**
 * A toolbar as header options, for `Stack.Screen` in a layout. The bar calls `headerLeft` and `headerRight` with its
 * tint, so the items match the back button and title.
 */
export const toolbarOptions = (props: LucentToolbarProps): NativeStackNavigationOptions => {
  const side = sideFor(props.placement ?? 'bottom');
  if (!side) {
    // As in expo-router: a bottom toolbar belongs to a page, which renders `Stack.Toolbar` itself.
    if (__DEV__ && !warnedBottom) {
      warnedBottom = true;
      console.warn('Stack.Toolbar placement="bottom" only works inside a page, not in a layout\'s Stack.Screen.');
    }
    return {};
  }
  return {
    headerShown: true,
    [side]: ({ tintColor }: { tintColor?: string }) =>
      props.asChild ? (
        props.children
      ) : (
        <BarItems color={colorString(props.tintColor) ?? tintColor ?? ''}>{props.children}</BarItems>
      ),
  };
};

// A page's toolbar changes as the page renders; the bar reads it from here, so the page doesn't set options each time.
const pageToolbars = new Map<string, LucentToolbarProps>();
const listeners = new Set<() => void>();
const publish = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** A page's bottom toolbar, if it has one. */
export const useBottomToolbar = (routeKey: string) =>
  useSyncExternalStore(subscribe, () => pageToolbars.get(`${routeKey}:bottom`));

const PageToolbarSlot = ({ id, tintColor }: { id: string; tintColor?: string }) => {
  const props = useSyncExternalStore(subscribe, () => pageToolbars.get(id));
  if (!props) return null;
  const side = toolbarOptions(props)[props.placement === 'left' ? 'headerLeft' : 'headerRight'];
  return typeof side === 'function' ? side({ tintColor }) : null;
};

/** `Stack.Toolbar` inside a page: it puts a slot in the bar once and keeps the slot's items current. */
const ToolbarRoot = (props: LucentToolbarProps) => {
  const navigation = useNavigation();
  const route = useRoute();
  const side = sideFor(props.placement ?? 'bottom');
  const id = `${route.key}:${props.placement ?? 'bottom'}`;

  useLayoutEffect(() => {
    pageToolbars.set(id, props);
    publish();
  });

  useLayoutEffect(() => {
    // The screen's layout draws a bottom toolbar from the store, so it needs no options.
    if (!side) {
      return () => {
        pageToolbars.delete(id);
        publish();
      };
    }
    navigation.setOptions({
      headerShown: true,
      [side]: ({ tintColor }: { tintColor?: string }) => <PageToolbarSlot id={id} tintColor={tintColor} />,
    });
    return () => {
      pageToolbars.delete(id);
      navigation.setOptions({ [side]: undefined });
    };
    // The slot reads the latest props itself; only where it sits needs setting.
  }, [navigation, id, side]);

  return null;
};

export const Toolbar = Object.assign(ToolbarRoot, {
  Button: ToolbarButton,
  Menu: ToolbarMenu,
  MenuAction: ToolbarMenuAction,
  SearchBarSlot: ToolbarSearchBarSlot,
  Spacer: ToolbarSpacer,
  View: ToolbarView,
  Label: ToolbarLabel,
  Icon: ToolbarIcon,
  Badge: ToolbarBadge,
}) as unknown as LucentToolbar;
