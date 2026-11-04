import { requireNativeView } from 'expo';
import { Stack as ExpoStack } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, type ViewProps } from 'react-native';

import type { LucentStack, LucentStackProps, LucentStackScreenOptions } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';

type StackProps = ComponentProps<typeof ExpoStack>;
type LayoutArgs = Parameters<NonNullable<StackProps['screenLayout']>>[0];

interface NavigationItemProps extends ViewProps {
  largeTitleInline?: boolean;
}

// expo-router's large title option, under its current name or the one it replaced.
const largeTitle = (options: LucentStackScreenOptions) =>
  (options.headerLargeTitleEnabled ?? options.headerLargeTitle) === true;

// Sets on the screen's navigation item what expo-router can't: see `NavigationItemView.swift`.
const NavigationItem = requireNativeView<NavigationItemProps>('Lucent', 'NavigationItemView');

/**
 * expo-router's `Stack`: on iOS the header and toolbars are UIKit's own. Lucent's `md` icons are only read on Android, and
 * expo-router ignores them here.
 *
 * The one default Lucent adds: the bar takes `LucentProvider`'s colour scheme, as Lucent's Android bar does. expo-router
 * otherwise takes it from React Navigation's theme, which is light when the app sets none, so a dark app got a light bar.
 * A `headerUserInterfaceStyle` in the app's options still wins.
 *
 * Lucent's own option, `headerLargeTitleInline`, goes to UIKit through a view in each screen, which sets it on the
 * screen's navigation item.
 */
const StackRoot = ({ screenOptions, screenLayout, ...props }: LucentStackProps) => {
  const { scheme } = useLucentTheme();
  const defaults = { headerUserInterfaceStyle: scheme };
  const layout = (args: LayoutArgs) => {
    const options = args.options as LucentStackScreenOptions;
    return (
      <>
        {screenLayout ? screenLayout(args) : args.children}
        <NavigationItem
          pointerEvents="none"
          style={styles.item}
          largeTitleInline={largeTitle(options) && options.headerLargeTitleInline === true}
        />
      </>
    );
  };
  return (
    <ExpoStack
      {...props}
      screenLayout={layout}
      screenOptions={
        (typeof screenOptions === 'function'
          ? (args: Parameters<typeof screenOptions>[0]) => ({ ...defaults, ...screenOptions(args) })
          : { ...defaults, ...screenOptions }) as StackProps['screenOptions']
      }
    />
  );
};

export const Stack = Object.assign(StackRoot, {
  Screen: ExpoStack.Screen,
  Protected: ExpoStack.Protected,
  Header: ExpoStack.Header,
  SearchBar: ExpoStack.SearchBar,
  Title: ExpoStack.Title,
  Toolbar: ExpoStack.Toolbar,
}) as unknown as LucentStack;

const styles = StyleSheet.create({
  item: { position: 'absolute', width: 0, height: 0 },
});
