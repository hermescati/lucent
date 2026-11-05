export type LucentScheme = 'light' | 'dark';

export const space = {
  4: 4,
  6: 6,
  8: 8,
  16: 16,
} as const;

export const typography = {
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  badge: { fontSize: 13, lineHeight: 19, fontWeight: '400' },
} as const;

// iOS 27's Liquid Glass setting (Settings → Appearance), Clear to Tinted, which `glassOpacity` stands in for: 0.5 is
// iOS's default. Measured over a grey ramp at both ends of iOS's slider:
// - Clear lets this much of the backdrop back through the default glass, on the bar and under the selected pill (light
//   Clear is the default mixed 22% toward the backdrop, its pill 38%; dark Clear is the default).
// - Tinted leans the default glass toward what it makes of white (+) or black (−): light Tinted is 37% of the way to
//   its result over white, dark Tinted halfway to its result over black, on the bar and pill alike.
export const glassOpacity = {
  default: 0.5,
  clear: { light: [0.225, 0.38], dark: [0, 0] },
  tinted: { light: 0.374, dark: -0.5 },
} as const;

export const colorTint = {
  dark: { darken: 0, mix: 0.2 },
  light: { darken: 0.25, mix: 0 },
} as const;

export const glass = {
  pad: 28,
  blend: 8,
  shadowRadius: { dark: 12, light: 8 },
  shadowOffset: { dark: 6, light: 11 },
  shadowSpread: { dark: 0, light: -6 },
  blurRadius: { dark: 1, light: 2 },
  bezel: { dark: 14, light: 14 },
  refraction: { dark: 22, light: 22 },
  falloff: { dark: 0, light: 0 },
  pullBottom: { dark: 0, light: 0 },
  pullBand: { dark: 8, light: 17 },
  pullTop: { dark: 0, light: 0 },
  pullTopBand: { dark: 20, light: 1 },
  refractionYScale: { dark: 0.96, light: 0.96 },
  wideRadius: { dark: 16, light: 9 },
  // The wide blur drawn under the glass, now only for a press: at rest the haze is the material's wide blur.
  wideMix: { dark: 0, light: 0 },
  pressWideMix: { dark: 0.8, light: 0.85 },
  // How far colour sits from grey, after the tone: dark fitted over red, green, blue, orange and browns (simulator).
  chroma: { dark: 1.2, light: 1.9 },
  // iOS 27's dark glass over a grey ramp (simulator), backdrop luma x 0–1: the bar is 0.125 + 0.6x + 0.38x(1−x), and the
  // tab bar's selected pill, under the frost, 0.039 + 0.52x + 0.33x(1−x), within 3 levels from black to white.
  tone: {
    dark: {
      on: 1,
      base: 0.125,
      gain: 0.6,
      gamma: 1,
      bow: 0.38,
      frostBase: 0.039,
      frostGain: 0.52,
      frostGamma: 1,
      frostBow: 0.33,
      frostChroma: 1.4,
    },
    // Light glass is untoned (iOS 27's bar matches within 2 levels as it is); the selected pill, over the same grey
    // ramp, darkens more over dark content than the frost alone does: this curve, on the frost's own result, puts it
    // within 4 levels of iOS's (97 over black to 233 over white). Colour keeps light's chroma.
    light: {
      on: 1,
      base: 0,
      gain: 1,
      gamma: 1,
      bow: 0,
      frostBase: -0.368,
      frostGain: 1.349,
      frostGamma: 1,
      frostBow: 0.305,
      frostChroma: 1.9,
    },
  },
  dispersion: 0,
  saturation: { dark: 1, light: 1 },
  adaptive: { dark: 0, light: 0 },
  lightAngle: 30,
  specular: 0,
  highlightWidth: 2,
  edgeSharp: 0.18,
  edgeSoft: { dark: 0.08, light: 0.02 },
  sharpWidth: 1.17,
  softWidth: 2.2,
  // iOS 27's outline (simulator, over greys and colours): a ring 0.5pt wide just outside the glass, the backdrop under
  // it darkened rather than a stroke. Full at the sides; a quarter where it faces up or down in light mode, and none in
  // dark, where it also eases off over light backdrops.
  edge: { width: 0.5, top: { light: 0.25, dark: 0 }, darken: { light: 0, dark: 0.88 } },
  // Its material over stripes: a near-sharp image at about a quarter (light) or a third (dark) over a blur far wider
  // than 16pt, at every stripe period; in dark the blur averages after the tone (tonePre).
  haze: { weight: { light: 0.74, dark: 0.69 }, radius: 40, blur: 0.4 },
  outlineSide: 1.1,
  rimSide: 3,
  insetShade: { dark: 0, light: 0 },
  insetOffset: 10,
  insetBlur: 10,
  lensBlurRadius: 0,
  popBlend: 22,
  lensBezel: 10,
  lensRimOut: { amount: 14, band: 10, endReach: 0.5, endKeep: 0 },
  lensRefraction: 7,
  lensIconBend: 0.8,
  lensIconPrism: 1.2,
  lensRefractionYScale: 1,
  lensPinch: 18,
  lensPinchWidth: 11,
  lensPinchSpread: 0.26,
  lensRimPrism: { dark: 0.5, light: 0.2 },
  lensShadowRadius: 8,
  lensShadowOffset: 4,
  lensPinchSideReach: 0.25,
  lensPinchEndReach: 0.08,
  lensPad: 12,
  lensFrost: 1,
  // The selected ink lightens with what's under the bar in dark mode, read from the window under the bar's glass:
  // about 0.25 over a dark list and 0.36 over a photo on the emulator.
  inkLuma: { dark: { from: 0.26, to: 0.4, step: 0.1 }, light: { from: 0.72, to: 0.9, step: 0.1 } },
  lensFrostClear: { dark: 0.9, light: 0 },
  // iOS 27's dark pill over stripes (simulator): the bar's material blurred about 1.75pt more (39% of its 8pt stripes
  // left, 80% of its 16pt), at the bar's own scale. A disc 4.3pt wide is that blur, its taps too close to print copies.
  lensFrostRadius: { dark: 4.3, light: 10 },
  lensFrostMagnify: { dark: 0, light: 0.7 },
  lensFalloff: 0,
  lensDispersion: 0.95,
  lensMagnify: 0.2,
  lensSpecular: 0.22,
  lensEdgeShade: { dark: -0.08, light: -0.04 },
  lensHeldEdge: { dark: -0.08, light: -0.04 },
  lensHeldDispersion: { dark: 0.2, light: 1 },
  lensHeldPrismShift: { dark: 3, light: 0 },
  lensHeldPinchSpread: { dark: 0, light: 0.26 },
  lensGlidePinch: { dark: 0.3, light: 1 },
  lensRimSide: { dark: 1, light: 3 },
  lensRimWidth: { dark: 1, light: 1.25 },
  lensHeldRimWidth: { dark: 2, light: 1.25 },
  lensShadeWidth: 1,
  liftBlend: 12,
  meltBlend: 12,
  pressBlend: 6,
  pressGlow: 0.035,
  pressGlowSpread: 62,
  backGlow: { dark: 0.2, light: 0.1 },
  backGlowSpread: 0.75,
  backGlowFade: 2,
} as const;
