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
  bumpPeak?: number;
  bumpShape?: number;
  bumpInset?: number;
  bumpSplit?: number;
  bumpShapeY?: number;
  bumpCurve?: number;
  dispersion?: number;
  magnify?: number;
  magnifyY?: number;
  frostMagnify?: number;
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
  // Which of `shapes` the glow stays inside; the first, without it.
  glowShape?: number;
  shadowRadius?: number;
  shadowOffset?: number;
  shadowSpread?: number;
  shadowGap?: number;
  shadowSoft?: number;
  insetSide?: number;
  insetSideWidth?: number;
  insetRamp?: number;
  pinch?: number;
  pinchWidth?: number;
  pinchSpread?: number;
  rimPrism?: number;
  rimWidth?: number;
  rimOutside?: boolean;
  rimSide?: number;
  rimFloor?: number;
  rimCrisp?: boolean;
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
  continuous?: number;
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
  rimPull?: number;
  rimPullBand?: number;
  wideRadius?: number;
  wideMix?: number;
  frost?: number;
  frostClear?: number;
  frostRadius?: number;
  // A blur on top of `blurRadius` that eases off down the view: this much at the top, easing off from `fadeFrom` to
  // nothing at `fadeTo` (dp from the view's top).
  fadeBlur?: number;
  fadeFrom?: number;
  fadeTo?: number;
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
  clipContent?: boolean;
  aboveTone?: boolean;
  radiusBottom?: number;
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
  tintDarken?: number;
  tintMix?: number;
  interactive?: boolean;
  pressScale?: number;
  pressGrow?: number;
  pressGlow?: number;
  pressGlowSpread?: number;
  pressShapes?: number[];
}

interface NativeGlassBlurProps extends ViewProps {
  radius?: number;
}

export interface NativeGlassBackdropProps extends ViewProps {
  group?: string;
  offscreen?: boolean;
  saturation?: number;
  brightness?: number;
}

export const NativeGlassView = requireNativeView<NativeGlassViewProps>('Lucent', 'LucentGlassView');

export const AnimatedNativeGlassView = Animated.createAnimatedComponent(NativeGlassView);

export const NativeGlassBackdrop = requireNativeView<NativeGlassBackdropProps>('Lucent', 'LucentGlassBackdropView');

export const AnimatedNativeGlassBackdrop = Animated.createAnimatedComponent(NativeGlassBackdrop);

export const NativeGlassBlur = requireNativeView<NativeGlassBlurProps>('Lucent', 'LucentGlassBlurView');

export const AnimatedNativeGlassBlur = Animated.createAnimatedComponent(NativeGlassBlur);
