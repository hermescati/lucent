import type { GlassMaterial } from '../../core/glass/presets';

export const sliderMetrics = {
  height: 28,
  track: 6,
  thumb: { width: 37, height: 24 },
  glass: { width: 57, height: 36 },
  grabSlop: 12,
  dragFrom: 2,
  failFrom: 10,
  hitSlop: 12,
  disabledOpacity: 0.5,
  labelGap: 8,
  labelSize: 17,
  accessibilitySteps: 10,
} as const;

export const sliderMotion = {
  follow: { duration: 120, dampingRatio: 1, overshootClamping: true },
  overhang: {
    reach: 9,
    from: 6,
    softness: 25,
    thin: 0.05,
    shift: 0.33,
    out: { duration: 80, dampingRatio: 1 },
    back: { duration: 300, dampingRatio: 1 },
    bump: 1.6,
  },
  fill: { duration: 120, dampingRatio: 1 },
  lens: {
    glide: true,
    holdAfterRelease: 0,
    settleWithin: 60,
    solidAt: 0.45,
    shrink: { duration: 950, dampingRatio: 0.65 },
    whiten: { duration: 300, dampingRatio: 1 },
    stretchMax: 0.19,
    carry: 0.3,
    squash: 1.7,
    wobble: { period: 0.85, damping: 0.75 },
    landKick: 0.0032,
    landSpring: { period: 0.7, damping: 0.9 },
  },
} as const;

export const lensSlider: GlassMaterial = { rimPull: 9, rimPullBand: 5.8 };
