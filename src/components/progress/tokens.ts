/** SwiftUI's `ProgressView` on iOS 26, measured on the iPhone 18 Pro simulator, in points. */
export const spinner = {
  size: 20,
  spokes: 8,
  // From the middle: where each spoke starts and ends, and how thick it is.
  inner: 3.5,
  outer: 10,
  width: 2.6,
  // The spoke at the head of the turn, the three behind it fading off, and the rest.
  shade: [0.85, 0.69, 0.53, 0.38],
  rest: 0.3,
  // One turn, taken in a step per spoke.
  period: 1000,
  // Between the spinner and its label.
  gap: 5,
} as const;

export const bar = {
  height: 4,
  // Between the label's line and the bar.
  gap: 3,
} as const;

export const label = { fontSize: 17, lineHeight: 22 } as const;

export const progressColors = {
  light: { track: 'rgba(120, 120, 128, 0.2)', spinner: '#8E8E93', label: 'rgba(60, 60, 67, 0.6)', text: '#000000' },
  dark: { track: 'rgba(120, 120, 128, 0.36)', spinner: '#8E8E93', label: 'rgba(235, 235, 245, 0.6)', text: '#FFFFFF' },
} as const;
