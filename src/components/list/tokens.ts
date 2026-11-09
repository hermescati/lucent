// iOS 27's lists, measured on the simulator (iPhone 18 Pro, 3x screenshots): SwiftUI's `List` and `Form`, and the
// Settings app for a value and chevron UIKit draws itself.

export const list = {
  // Inset grouped: each section's rows on a card this far from the screen's edges, with these corners.
  cardMargin: 16,
  cardRadius: 26,
  // A row's content starts and ends this far inside it; a leading view (a Settings icon) is followed by this gap.
  rowPadding: 16,
  leadingGap: 12,
  // Rows are at least this tall, and this much room above and below taller content: a one-line row is 52, a row with a
  // second line 72, a 29pt icon's row 55.
  rowMinHeight: 52,
  rowPaddingVertical: 13,
  // The headline (body) and a second line under it (subheadline), 2 apart.
  title: { fontSize: 17, lineHeight: 22 },
  supporting: { fontSize: 15, lineHeight: 20 },
  supportingGap: 2,
  // A value, and a chevron after it: Settings' About, 11.7 between them and the chevron's end 20 inside the card.
  detailGap: 12,
  chevron: { width: 7, height: 12, stroke: 2, end: 4 },
  checkmark: { width: 15, height: 14, stroke: 2.2 },
  // Section headers (body, sentence case) and footers (footnote), in the card's inset; spacing around them.
  header: { fontSize: 17, lineHeight: 22, above: 26, below: 10, first: 6 },
  footer: { fontSize: 13, lineHeight: 18, above: 7, below: 0 },
  // Between two sections without a header between them.
  sectionGap: 22,
  // iOS 27's swipe actions: capsules beside the row, labels under them, the row slid aside on a grey fill.
  swipe: {
    width: 60,
    height: 44,
    gap: 10,
    edge: 10,
    labelSize: 12,
    labelGap: 2,
    iconSize: 22,
    // How far past its buttons a row can be dragged before a full swipe runs the outermost one, of the row's width.
    fullSwipe: 0.6,
    spring: { duration: 380, dampingRatio: 0.9 },
  },
  // Pull to refresh: the spinner shows as the content comes down, and lets go into a refresh past `threshold`, held
  // `rest` down while it runs. Not measured on iOS (a held drag can't be scripted there): set to feel like it.
  refresh: { threshold: 70, rest: 60, resistance: 0.55, spring: { duration: 420, dampingRatio: 1 } },
} as const;

// Measured light and dark (simulator screenshots, sRGB).
export const listColors = {
  light: {
    page: '#F2F2F7',
    card: '#FFFFFF',
    plain: '#FFFFFF',
    separator: '#E8E8E8',
    plainSeparator: '#E8E8E8',
    text: '#000000',
    secondary: '#8A8A8E',
    caption: '#85858B',
    chevron: '#C5C5C7',
    destructive: '#FF383C',
    pressed: '#E5E5EA',
  },
  dark: {
    page: '#000000',
    card: '#1C1C1E',
    plain: '#000000',
    separator: '#38383B',
    plainSeparator: '#2A2A2C',
    text: '#FFFFFF',
    secondary: '#98989F',
    caption: '#8D8D93',
    chevron: '#5A5A5E',
    destructive: '#FF4245',
    pressed: '#2C2C2E',
  },
} as const;
