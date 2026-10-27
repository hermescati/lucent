import { Platform } from 'react-native';

export type {
  GlassColorScheme,
  GlassContainerProps,
  GlassEffectStyleConfig,
  GlassStyle,
  GlassViewProps,
} from 'expo-glass-effect';
export { GlassBackdrop } from './glass/GlassBackdrop';
export { GlassContainer } from './glass/GlassContainer';
export { GlassView } from './glass/GlassView';
export { NativeTabs } from './tabs/NativeTabs';
export { SearchBar } from './tabs/SearchBar';
export { useTabSearch } from './tabs/search';
export type { SearchBarProps, TabSearch } from './tabs/search';
export { TabScrollMarker, useTabBarInset, useTabBarScroll } from './tabs/scroll';
export { TabScrollView } from './tabs/TabScrollView';
export type { TabScrollViewProps } from './tabs/TabScrollView';
export type {
  LucentNativeTabsProps,
  LucentNativeTabsTriggerIconProps,
  LucentNativeTabTriggerProps,
  LucentSvgIconProps,
  LucentSvgMarkup,
} from './tabs/types';
export { LucentProvider, useLucentTheme } from './theme/LucentProvider';
export type { LucentProviderProps, LucentTheme } from './theme/LucentProvider';
export type { LucentColorOverrides, LucentColors } from './theme/colors';

const refractionApi = 33;

export const isLiquidGlassAvailable = () => typeof Platform.Version === 'number' && Platform.Version >= refractionApi;

export const isGlassEffectAPIAvailable = () => true;
