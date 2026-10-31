import type { NativeTabsProps, NativeTabsTriggerIconProps, NativeTabTriggerProps } from 'expo-router/native-tabs';
import type { ColorValue } from 'react-native';

export type LucentNativeTabsProps = NativeTabsProps;

export type LucentNativeTabTriggerProps = NativeTabTriggerProps & {
  automaticallyActivatesSearch?: boolean;
};

export type LucentSvgMarkup = string | { default?: string; selected?: string };

export interface LucentSvgIconProps {
  svg: LucentSvgMarkup;
  selectedColor?: ColorValue;
  renderingMode?: 'template' | 'original';
}

export type LucentNativeTabsTriggerIconProps = NativeTabsTriggerIconProps | LucentSvgIconProps;
