import type { GlassColorScheme, GlassStyle } from 'expo-glass-effect';
import { PixelRatio, StyleSheet } from 'react-native';

import { clearPresets } from './presets';
import { useLucentTheme, type LucentTheme } from '../../theme/LucentProvider';
import { colorTint, glass, glassOpacity } from '../../theme/tokens';

// The level's way from the default glass: toward the backdrop below it (Clear), toward white or black above (Tinted).
const levelOf = (scheme: LucentTheme['scheme'], amount: number) => {
  const level = Math.min(1, Math.max(0, amount));
  const clear = Math.max(0, 1 - level / glassOpacity.default);
  const tinted = Math.max(0, (level - glassOpacity.default) / (1 - glassOpacity.default));
  return {
    levelClear: glassOpacity.clear[scheme][0] * clear,
    levelFrostClear: glassOpacity.clear[scheme][1] * clear,
    levelLean: glassOpacity.tinted[scheme] * tinted,
  };
};

// iOS 27's outline and haze (see `glass.edge`, `glass.haze`), which every regular glass shares.
export const glassEdge = (scheme: LucentTheme['scheme']) => ({
  rimOutside: true,
  rimOptic: true,
  rimWidth: glass.edge.width * PixelRatio.get(),
  rimOpticTop: glass.edge.top[scheme],
  rimOpticDarken: glass.edge.darken[scheme],
});

// Drawn solid (below Android 13, or with high-contrast text), every glass is One UI 9's surface: opaque, with a pill
// for its frost, a soft drop shadow and a hairline.
const solidPaint = (color: LucentTheme['color']) => ({
  fallback: color.barFallback,
  fallbackPill: color.barFallbackPill,
  fallbackShadow: color.barFallbackShadow,
  fallbackRim: color.barFallbackRim,
  fallbackRimWidth: StyleSheet.hairlineWidth,
  fallbackShadowRadius: glass.fallbackShadow.radius,
  fallbackShadowOffset: glass.fallbackShadow.offset,
});

export const regularMaterial = ({ scheme, color, glassOpacity: level }: LucentTheme) => ({
  blurRadius: glass.haze.blur,
  haze: glass.haze.weight[scheme],
  hazeRadius: glass.haze.radius,
  bezel: glass.bezel[scheme],
  refraction: glass.refraction[scheme],
  pullBottom: glass.pullBottom[scheme],
  pullBand: glass.pullBand[scheme],
  pullTop: glass.pullTop[scheme],
  pullTopBand: glass.pullTopBand[scheme],
  refractionYScale: glass.refractionYScale[scheme],
  wideRadius: glass.wideRadius[scheme],
  wideMix: glass.wideMix[scheme],
  chroma: glass.chroma[scheme],
  toneOn: glass.tone[scheme].on,
  toneBase: glass.tone[scheme].base,
  toneGain: glass.tone[scheme].gain,
  toneGamma: glass.tone[scheme].gamma,
  frostBase: glass.tone[scheme].frostBase,
  frostGain: glass.tone[scheme].frostGain,
  frostGamma: glass.tone[scheme].frostGamma,
  frostChroma: glass.tone[scheme].frostChroma,
  toneBow: glass.tone[scheme].bow,
  frostBow: glass.tone[scheme].frostBow,
  // Dark is toned before the haze's blur, so detail averages as iOS 27's dark glass does (darker than flat). Light's
  // tone only shapes the pill, after the haze, which keeps its own averaging (HAZE_IN_SHADER).
  tonePre: scheme === 'dark',
  falloff: glass.falloff[scheme],
  dispersion: glass.dispersion,
  saturation: glass.saturation[scheme],
  adaptive: glass.adaptive[scheme],
  lightAngle: glass.lightAngle,
  specular: glass.specular,
  highlightWidth: glass.highlightWidth,
  edgeSharp: glass.edgeSharp,
  edgeSoft: glass.edgeSoft[scheme],
  sharpWidth: glass.sharpWidth,
  softWidth: glass.softWidth,
  shadowRadius: glass.shadowRadius[scheme],
  shadowOffset: glass.shadowOffset[scheme],
  shadowSpread: glass.shadowSpread[scheme],
  tint: color.barTint,
  ...levelOf(scheme, level),
  ...solidPaint(color),
  shadow: color.barShadow,
  rimSide: glass.rimSide,
  ...glassEdge(scheme),
  insetShade: glass.insetShade[scheme],
  insetOffset: glass.insetOffset,
  insetBlur: glass.insetBlur,
  tintDarken: colorTint[scheme].darken,
  tintMix: colorTint[scheme].mix,
});

// The regular or clear glass material for a GlassView-style surface, in the app's theme.
export const useGlassMaterial = (style: GlassStyle, colorScheme: GlassColorScheme = 'auto') => {
  const theme = useLucentTheme(undefined, colorScheme);
  if (style === 'clear') {
    return { ...clearPresets[theme.scheme], ...solidPaint(theme.color) };
  }
  return {
    ...regularMaterial(theme),
    outset: glass.pad,
    shadowRadius: 0,
    shadow: 'rgba(0, 0, 0, 0)',
    rimSide: glass.outlineSide,
    ...glassEdge(theme.scheme),
  };
};
