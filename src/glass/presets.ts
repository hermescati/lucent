import type { ViewProps } from 'react-native';

import type { NativeGlassViewProps } from './NativeGlass';
import { colorTint } from '../theme/tokens';

export type GlassScheme = 'light' | 'dark';

export type GlassMaterial = Omit<NativeGlassViewProps, keyof ViewProps>;

const clearBase = {
  blurRadius: 0,
  bezel: 10,
  refraction: 7,
  falloff: 0,
  dispersion: 0.95,
  lightAngle: 30,
  specular: 0.22,
  sharpWidth: 1,
  shadowRadius: 8,
  shadowOffset: 4,
  outset: 16,
} satisfies GlassMaterial;

export const clearPresets: Record<GlassScheme, GlassMaterial> = {
  dark: {
    ...clearBase,
    edgeSharp: -0.45,
    rimWidth: 2,
    rimSide: 1,
    tint: 'rgba(0, 0, 0, 0.2)',
    fallback: '#2F2F32',
    shadow: 'rgba(0, 0, 0, 0.12)',
    rim: 'rgba(255, 255, 255, 0.16)',
    tintDarken: colorTint.dark.darken,
    tintMix: colorTint.dark.mix,
  },
  light: {
    ...clearBase,
    edgeSharp: -0.04,
    rimWidth: 1.25,
    rimSide: 3,
    tint: 'rgba(0, 0, 0, 0.025)',
    fallback: '#F4F5F9',
    shadow: 'rgba(0, 0, 0, 0.012)',
    rim: 'rgba(0, 0, 0, 0.16)',
    tintDarken: colorTint.light.darken,
    tintMix: colorTint.light.mix,
  },
};

export const glassPress = {
  grow: 16,
  glow: 0.29,
  wideGlow: 0.11,
  wideFrom: 118,
  glowSpread: 68,
};
