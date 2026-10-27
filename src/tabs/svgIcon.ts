import type { NativeTabsTriggerIconProps } from 'expo-router/native-tabs';

import type { LucentNativeTabsTriggerIconProps, LucentSvgIconProps } from './types';
import { vectorIconSource } from '../icons/vectorIcon';
import { layout } from '../theme/tokens';

const isSvgIcon = (props: LucentNativeTabsTriggerIconProps): props is LucentSvgIconProps => 'svg' in props;

export const resolveTabIcon = (props: LucentNativeTabsTriggerIconProps): NativeTabsTriggerIconProps => {
  if (!isSvgIcon(props)) {
    return props;
  }
  const { svg, renderingMode = 'template', selectedColor } = props;
  const markup = typeof svg === 'string' ? { default: svg, selected: svg } : svg;
  const base = markup.default ?? markup.selected ?? '';
  return {
    src: {
      default: vectorIconSource(base, layout.tabIconSize),
      selected: vectorIconSource(markup.selected ?? base, layout.tabIconSize),
    },
    renderingMode,
    selectedColor,
  };
};
