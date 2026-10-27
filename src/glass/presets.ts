import type { ViewProps } from 'react-native';

import type { NativeGlassViewProps } from './NativeGlass';

export type GlassScheme = 'light' | 'dark';

export type GlassMaterial = Omit<NativeGlassViewProps, keyof ViewProps>;

const regularBase = {
  falloff: 1,
  dispersion: 0,
  saturation: 1,
  adaptive: 0,
  lightAngle: 30,
  specular: 0,
  highlightWidth: 2,
  edgeSharp: 0.18,
  sharpWidth: 1.17,
  softWidth: 2.2,
  bezel: 34,
  refraction: 22,
  rimWidth: 1.6,
  rimOutside: true,
  rimSide: 3,
  insetShade: 0,
  insetOffset: 10,
  insetBlur: 10,
  outset: 28,
} satisfies GlassMaterial;

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

export const glassPresets: Record<'regular' | 'clear', Record<GlassScheme, GlassMaterial>> = {
  regular: {
    dark: {
      ...regularBase,
      blurRadius: 1,
      pullBottom: 4,
      pullBand: 8,
      pullTop: 10,
      pullTopBand: 20,
      refractionYScale: 0.3,
      wideRadius: 16,
      wideMix: 0.35,
      chroma: 1.8,
      toneOn: 1,
      toneBase: 0.125,
      toneGain: 0.593,
      toneGamma: 0.705,
      frostBase: 0.035,
      frostGain: 0.518,
      frostGamma: 1,
      frostChroma: 2.6,
      edgeSoft: 0.08,
      shadowRadius: 12,
      shadowOffset: 6,
      shadowSpread: 0,
      tint: 'rgba(90, 90, 90, 0)',
      fallback: '#2F2F32',
      shadow: 'rgba(0, 0, 0, 0.12)',
      rim: 'rgba(255, 255, 255, 0)',
    },
    light: {
      ...regularBase,
      blurRadius: 2,
      pullBottom: 8,
      pullBand: 17,
      pullTop: 0,
      pullTopBand: 1,
      refractionYScale: 0.5,
      wideRadius: 32,
      wideMix: 0.6,
      chroma: 2.2,
      toneOn: 0,
      edgeSoft: 0.02,
      shadowRadius: 8,
      shadowOffset: 11,
      shadowSpread: -6,
      tint: 'rgba(245, 245, 245, 0.61)',
      fallback: '#F4F5F9',
      shadow: 'rgba(0, 0, 0, 0.012)',
      rim: 'rgba(0, 0, 0, 0.12)',
    },
  },
  clear: {
    dark: {
      ...clearBase,
      edgeSharp: -0.45,
      rimWidth: 2,
      rimSide: 1,
      tint: 'rgba(0, 0, 0, 0.2)',
      fallback: '#2F2F32',
      shadow: 'rgba(0, 0, 0, 0.12)',
      rim: 'rgba(255, 255, 255, 0.16)',
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
    },
  },
};

export const glassPress = {
  scale: 1.06,
  glow: 0.12,
  glowReach: 0.9,
};
