import type { Stack as ExpoStack } from 'expo-router';
import type { ComponentProps } from 'react';

import type {
  LucentToolbarButtonProps,
  LucentToolbarIconProps,
  LucentToolbarMenuActionProps,
  LucentToolbarMenuProps,
} from '../types';

type ExpoToolbar = typeof ExpoStack.Toolbar;

/**
 * The toolbar's parts on Android. They render nothing themselves: the bar reads their props and lays out iOS's glass
 * items, as expo-router's do for its native toolbar.
 */
export const ToolbarButton = (_: LucentToolbarButtonProps) => null;
export const ToolbarMenu = (_: LucentToolbarMenuProps) => null;
export const ToolbarMenuAction = (_: LucentToolbarMenuActionProps) => null;
export const ToolbarSpacer = (_: ComponentProps<ExpoToolbar['Spacer']>) => null;
export const ToolbarView = (_: ComponentProps<ExpoToolbar['View']>) => null;
export const ToolbarLabel = (_: ComponentProps<ExpoToolbar['Label']>) => null;
export const ToolbarIcon = (_: LucentToolbarIconProps) => null;
export const ToolbarBadge = (_: ComponentProps<ExpoToolbar['Badge']>) => null;
export const ToolbarSearchBarSlot = (_: ComponentProps<ExpoToolbar['SearchBarSlot']>) => null;
