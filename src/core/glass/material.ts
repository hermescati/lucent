import type { LucentTheme } from '../../theme/LucentProvider';
import { colorTint, glass, glassOpacity } from '../../theme/tokens';

const parseColor = (value: string): [number, number, number, number] | null => {
  const text = value.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(text);
  if (hex) {
    const number = parseInt(hex[1], 16);
    return [(number >> 16) & 255, (number >> 8) & 255, number & 255, 1];
  }
  const rgba = /^rgba?\(([^)]+)\)$/i.exec(text);
  if (!rgba) {
    return null;
  }
  const [r, g, b, a = 1] = rgba[1].split(',').map((part) => parseFloat(part));
  return [r, g, b, a];
};

const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

const tintAt = (base: string, tinted: string, amount: number) => {
  const from = parseColor(base);
  const to = parseColor(tinted);
  if (!from || !to) {
    return base;
  }
  const level = Math.min(1, Math.max(0, amount));
  if (level <= glassOpacity.default) {
    const keep = lerp(glassOpacity.clearFloor, 1, level / glassOpacity.default);
    return `rgba(${from[0]}, ${from[1]}, ${from[2]}, ${from[3] * keep})`;
  }
  const toward = (level - glassOpacity.default) / (1 - glassOpacity.default);
  const [r, g, b] = [0, 1, 2].map((channel) => Math.round(lerp(from[channel], to[channel], toward)));
  return `rgba(${r}, ${g}, ${b}, ${lerp(from[3], glassOpacity.opaque, toward)})`;
};

export const regularMaterial = ({ scheme, color, glassOpacity: level }: LucentTheme) => ({
  blurRadius: glass.blurRadius[scheme],
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
  tint: tintAt(color.barTint, color.barFallback, level),
  fallback: color.barFallback,
  shadow: color.barShadow,
  rim: color.barRim,
  rimWidth: glass.rimWidth,
  rimOutside: true,
  rimSide: glass.rimSide,
  insetShade: glass.insetShade[scheme],
  insetOffset: glass.insetOffset,
  insetBlur: glass.insetBlur,
  tintDarken: colorTint[scheme].darken,
  tintMix: colorTint[scheme].mix,
});
