import type { Stack as ExpoStack } from 'expo-router';
import type { NativeStackNavigationOptions } from 'expo-router/native-stack';
import type { AndroidSymbol } from 'expo-symbols';
import type { ComponentProps, FC, ReactElement } from 'react';

type ExpoToolbar = typeof ExpoStack.Toolbar;

/** Lucent: `md`, a Material Symbol for Android, beside expo-router's `icon`, which is an SF Symbol on iOS. */
export type LucentToolbarButtonProps = ComponentProps<ExpoToolbar['Button']> & { md?: AndroidSymbol };

/** Lucent: `md`, a Material Symbol for Android, beside `sf`. */
export type LucentToolbarIconProps = ComponentProps<ExpoToolbar['Icon']> & { md?: AndroidSymbol };

/** Lucent: `md`, a Material Symbol for Android, for the menu's button. */
export type LucentToolbarMenuProps = ComponentProps<ExpoToolbar['Menu']> & { md?: AndroidSymbol };

/** Lucent: `md`, a Material Symbol for Android, beside the SF Symbol in `icon`. */
export type LucentToolbarMenuActionProps = ComponentProps<ExpoToolbar['MenuAction']> & { md?: AndroidSymbol };

export type LucentToolbarProps = ComponentProps<ExpoToolbar>;

export type LucentSearchBarProps = ComponentProps<typeof ExpoStack.SearchBar>;

export type LucentToolbar = ((props: LucentToolbarProps) => ReactElement | null) &
  Omit<ExpoToolbar, 'Button' | 'Icon' | 'Menu' | 'MenuAction'> & {
    Button: FC<LucentToolbarButtonProps>;
    Icon: FC<LucentToolbarIconProps>;
    Menu: FC<LucentToolbarMenuProps>;
    MenuAction: FC<LucentToolbarMenuActionProps>;
  };

/** Lucent's options for a stack screen, beside expo-router's. Left out, the bar is expo-router's. */
export interface LucentStackScreenOptionsAdditions {
  /**
   * Lucent: with `headerLargeTitle`, the large title sits on the bar's row, beside its buttons, as Photos › Collections'
   * does, rather than under them: UIKit's `largeTitleDisplayMode = .inline`, SwiftUI's `.inlineLarge`. As UIKit does,
   * only on a screen without a back button (a tab's first screen, or one with `headerBackVisible: false`); a screen with
   * one keeps the large title under the row. iOS 17 and later.
   */
  headerLargeTitleInline?: boolean;
  // TODO: a subtitle (UIKit's `subtitle`/`largeSubtitle`, SwiftUI's `navigationSubtitle`, iOS 26), as Photos › Library's
  // "6 Photos". Setting it works, but under expo-router's stack a pushed screen with one opens with its large title
  // collapsed, which pure UIKit doesn't do. Waiting on expo-router / react-native-screens to support it.
}

export type LucentStackScreenOptions = NativeStackNavigationOptions & LucentStackScreenOptionsAdditions;

// expo-router's options, or a function giving them, taking Lucent's too.
type WithLucentOptions<T> = T extends (...args: infer A) => NativeStackNavigationOptions
  ? (...args: A) => LucentStackScreenOptions
  : T extends NativeStackNavigationOptions
    ? LucentStackScreenOptions
    : T;

type ExpoScreenProps = ComponentProps<typeof ExpoStack.Screen>;
type ExpoStackProps = ComponentProps<typeof ExpoStack>;

export type LucentStackScreenProps = Omit<ExpoScreenProps, 'options'> & {
  options?: WithLucentOptions<ExpoScreenProps['options']>;
};

export type LucentStackProps = Omit<ExpoStackProps, 'screenOptions'> & {
  screenOptions?: WithLucentOptions<ExpoStackProps['screenOptions']>;
};

export type LucentStackScreen = ((props: LucentStackScreenProps) => ReactElement | null) &
  Omit<typeof ExpoStack.Screen, never>;

/** expo-router's `Stack`, with Lucent's screen options and `md` icons on toolbar buttons. */
export type LucentStack = ((props: LucentStackProps) => ReactElement) &
  Omit<typeof ExpoStack, 'Toolbar' | 'Screen'> & { Toolbar: LucentToolbar; Screen: LucentStackScreen };
