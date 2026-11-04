/** SwiftUI's `Stepper` on iOS 26, measured on the iPhone 18 Pro simulator, in points. */
export const stepper = {
  width: 93,
  height: 32,
  // The hairline between the halves, inset from the capsule's top and bottom.
  dividerWidth: 1 / 3,
  dividerInset: 4,
  // The minus and plus: as wide as each other, a bar this thick.
  glyph: 12.7,
  stroke: 1.7,
} as const;

export const stepperMotion = {
  // Held, a side steps again after this long, then at this interval, as iOS's does.
  repeatAfter: 500,
  repeatEvery: 100,
} as const;

export const stepperLabel = { fontSize: 17, lineHeight: 22 } as const;

export const stepperColors = {
  light: {
    fill: 'rgba(118, 118, 128, 0.12)',
    divider: 'rgba(60, 60, 67, 0.3)',
    glyph: '#000000',
    glyphDisabled: 'rgba(60, 60, 67, 0.3)',
    pressed: 'rgba(0, 0, 0, 0.06)',
    label: '#000000',
  },
  dark: {
    fill: 'rgba(118, 118, 128, 0.15)',
    divider: 'rgba(235, 235, 245, 0.3)',
    glyph: '#FFFFFF',
    glyphDisabled: 'rgba(235, 235, 245, 0.3)',
    pressed: 'rgba(255, 255, 255, 0.08)',
    label: '#FFFFFF',
  },
} as const;
