import type { GlassColorScheme, GlassStyle, GlassViewProps } from 'expo-glass-effect';
import { createContext } from 'react';
import { useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

import type { GlassScheme } from './presets';

export interface GlassShape {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  style: GlassStyle;
}

export interface GlassContainerContext {
  set: (id: string, shape: GlassShape | null) => void;
}

export const ContainerContext = createContext<GlassContainerContext | null>(null);

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

export const useGlassScheme = (colorScheme: GlassColorScheme = 'auto'): GlassScheme => {
  const system = useColorScheme();
  if (colorScheme === 'light' || colorScheme === 'dark') {
    return colorScheme;
  }
  return system === 'dark' ? 'dark' : 'light';
};
