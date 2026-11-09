/** SwiftUI's `ContentUnavailableView` on iOS 26, measured on the iPhone 18 Pro simulator, in points. */
export const layout = {
  // Each side of the text, which wraps inside what's left.
  margin: 64,
  // The symbol, and the space under it to the title.
  symbol: 48,
  symbolGap: 14,
  // From the title to the description, and from the description to the actions.
  descriptionGap: 0,
  actionsGap: 30,
  // iOS sits a view with no symbol a little above the middle.
  lift: 9,
} as const;

export const title = { fontSize: 21, lineHeight: 27 } as const;
export const description = { fontSize: 20, lineHeight: 25 } as const;

export const contentColors = {
  light: { secondary: 'rgba(60, 60, 67, 0.6)', text: '#000000' },
  dark: { secondary: 'rgba(235, 235, 245, 0.6)', text: '#FFFFFF' },
} as const;
