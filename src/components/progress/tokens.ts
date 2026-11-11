/** SwiftUI's `ProgressView` on iOS 26, measured on the iPhone 18 Pro simulator, in points. */
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
