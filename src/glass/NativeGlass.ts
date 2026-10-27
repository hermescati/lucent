import { requireNativeView } from 'expo';
import type { ColorValue, ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';

export interface NativeGlassViewProps extends ViewProps {
  group?: string;
  underlay?: string;
  overlay?: string;
  shapes?: number[];
  inset?: number;
  cornerRadius?: number;
  blend?: number;
  blurRadius?: number;
  bezel?: number;
  refraction?: number;
  refractOutward?: boolean;
  refractOutwardY?: boolean;
  refractionYScale?: number;
  falloff?: number;
  dispersion?: number;
  magnify?: number;
  saturation?: number;
  adaptive?: number;
  dim?: number;
  lightAngle?: number;
  specular?: number;
  highlightWidth?: number;
  edgeSharp?: number;
  edgeSoft?: number;
  sharpWidth?: number;
  softWidth?: number;
  glowX?: number;
  glowY?: number;
  glowSpread?: number;
  glowStrength?: number;
  shadowRadius?: number;
  shadowOffset?: number;
  shadowSpread?: number;
  pinch?: number;
  pinchWidth?: number;
  pinchSpread?: number;
  rimPrism?: number;
  rimWidth?: number;
  rimOutside?: boolean;
  rimSide?: number;
  edgeAxis?: number;
  prismAxis?: number;
  prismShift?: number;
  insetShade?: number;
  insetOffset?: number;
  insetBlur?: number;
  pinchLeft?: number;
  pinchRight?: number;
  sampleMaxX?: number;
  ellipse?: number;
  wallSide?: number;
  wallRound?: number;
  wallLead?: number;
  topBend?: number;
  topDepth?: number;
  chroma?: number;
  pullBottom?: number;
  pullBand?: number;
  pullTop?: number;
  pullTopBand?: number;
  rimOut?: number;
  rimOutBand?: number;
  wideRadius?: number;
  wideMix?: number;
  frost?: number;
  frostClear?: number;
  frostRadius?: number;
  toneBase?: number;
  toneGain?: number;
  toneGamma?: number;
  toneOn?: number;
  frostBase?: number;
  frostGain?: number;
  frostGamma?: number;
  frostChroma?: number;
  sampleBackdrop?: boolean;
  onBackdropLuma?: (event: { luma: number }) => void;
  frostLeft?: number;
  frostTop?: number;
  frostRight?: number;
  frostBottom?: number;
  clipLeft?: number;
  clipTop?: number;
  clipRight?: number;
  clipBottom?: number;
  clipScaleX?: number;
  clipScaleY?: number;
  clipSoft?: number;
  clipOn?: number;
  tint?: ColorValue;
  rim?: ColorValue;
  fallback?: ColorValue;
  shadow?: ColorValue;
  plain?: boolean;
  alphaPass?: boolean;
  lift?: boolean;
  outset?: number;
  presence?: number;
  glassTint?: ColorValue;
  interactive?: boolean;
  pressScale?: number;
  pressGlow?: number;
  pressGlowSpread?: number;
}

interface NativeGlassBlurProps extends ViewProps {
  radius?: number;
}

export interface NativeGlassBackdropProps extends ViewProps {
  group?: string;
  offscreen?: boolean;
}

export const NativeGlassView = requireNativeView<NativeGlassViewProps>('Lucent', 'LucentGlassView');

export const AnimatedNativeGlassView = Animated.createAnimatedComponent(NativeGlassView);

export const NativeGlassBackdrop = requireNativeView<NativeGlassBackdropProps>('Lucent', 'LucentGlassBackdropView');

export const NativeGlassBlur = requireNativeView<NativeGlassBlurProps>('Lucent', 'LucentGlassBlurView');

export const AnimatedNativeGlassBlur = Animated.createAnimatedComponent(NativeGlassBlur);
