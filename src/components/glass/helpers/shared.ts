import type { GlassStyle, GlassViewProps } from 'expo-glass-effect';
import type { StyleProp, ViewStyle } from 'react-native';
import { createLucentContext } from '../../../theme/context';

export interface GlassShape {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  style: GlassStyle;
  interactive: boolean;
}

export interface GlassContainerContext {
  set: (id: string, shape: GlassShape | null) => void;
}

export const ContainerContext = createLucentContext<GlassContainerContext | null>('GlassContainer', null);

export const resolveEffectStyle = (value: GlassViewProps['glassEffectStyle']) => {
  if (value === undefined) {
    return { style: 'regular' as GlassStyle, animate: false, duration: 0 };
  }
  if (typeof value === 'string') {
    return { style: value, animate: false, duration: 0 };
  }
  return { style: value.style, animate: value.animate ?? false, duration: (value.animationDuration ?? 0) * 1000 };
};

export const radiusOf = (style: StyleProp<ViewStyle>): number => {
  if (Array.isArray(style)) {
    return style.reduce<number>((found, part) => radiusOf(part) || found, 0);
  }
  if (style && typeof style === 'object' && 'borderRadius' in style && typeof style.borderRadius === 'number') {
    return style.borderRadius;
  }
  return 0;
};
