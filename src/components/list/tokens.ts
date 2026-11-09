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
  // From this text size (about where iOS's accessibility sizes begin) a row's value goes under its title.
  stackedFrom: 1.35,
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
    // Each button pops in once the row has slid past its slot (the edge and the buttons up to it, gaps aside), from
    // this scale, and all shrink away together as the row closes.
    popFrom: 0.35,
    pop: { duration: 300, dampingRatio: 1 },
    drop: 170,
    // Dragged past this much of the row's width, a full swipe is armed: the row jumps on by `armJump`, the outermost
    // button's icon moves to its leading end and its label fades; let go there, it runs.
    fullSwipe: 0.79,
    armJump: 45,
    commit: 200,
    // A full swipe arming jumps the row on this quickly, measured (iOS: 291 to 336 in about 120ms).
    arm: { duration: 150, dampingRatio: 1 },
    // A destructive action takes its row away: the row's height closes up, measured on the simulator.
    remove: 120,
    spring: { duration: 380, dampingRatio: 0.9 },
  },
  // Edit mode (SwiftUI's, measured on the simulator): a row that can be deleted moves its content `shift` along for the
  // delete control, a red circle centred `controlAt` in with a white minus; one that can be moved shows the reorder
  // handle, three lines `handle.end` from the row's end, sliding in from it as it fades in, and its content ends
  // `handleRoom` from the row's end. All of it on one spring (critically damped, about 0.35s in and out).
  edit: {
    shift: 40,
    control: 21,
    controlAt: 28,
    minus: { width: 10, height: 1.5 },
    handle: { width: 21, line: 1, gap: 3.8, end: 18 },
    handleRoom: 47,
    spring: { duration: 350, dampingRatio: 1 },
    // Dragging by the handle (measured): the row lifts at once, 85% opaque on a card that reaches `widen` further out
    // at its leading end, with a soft shadow; the rows it passes slide aside, and let go it settles into its place.
    lift: { duration: 150, opacity: 0.85, widen: 11, radius: 10, shadow: '0px 0px 30px rgba(0, 0, 0, 0.25)' },
    move: { duration: 250, dampingRatio: 1 },
    drop: { duration: 330, dampingRatio: 1 },
    // Selecting (measured): a 22 circle in the delete control's place, ringed in grey or filled with the accent and a
    // white tick; a selected row turns grey and loses the separators beside it. Deselected, the fill fades.
    select: { circle: 22, ring: 1.5, tick: { width: 10, height: 8, stroke: 1.8 }, fade: 120 },
    // A dragged row near the list's visible top or bottom (under the bars) scrolls it, faster the deeper into this zone,
    // as iOS's does (measured: from about 50 above the tab bar, about 140 a second 7 in and 220 at 16).
    autoScroll: { zone: 50, speed: 700 },
  },
  // Pull to refresh, measured on the simulator with slow held drags. The content follows the finger one to one for
  // `lead`, then with UIScrollView's rubber band (`band` against the list's height). The spinner, 30 across, draws its
  // spokes as the content comes down (spokes drawn against pull, in `spokes`) and the refresh starts as the last one is
  // drawn, finger still down. Let go, the content settles `rest` down while it runs; once it's done, the spinner shrinks
  // and fades over `fade`, then the content goes back.
  refresh: {
    lead: 60,
    band: 0.55,
    spokes: { pull: [82, 86, 112, 126, 135, 140, 144, 147, 149], drawn: [0, 1, 2, 3, 4, 5, 6, 7, 8] },
    size: 30,
    // With a large title, the spinner sits in the title's place as the title comes down: its middle this far above
    // the content's top.
    overTitle: 22,
    rest: 60,
    fade: 450,
    spring: { duration: 420, dampingRatio: 1 },
  },
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
    // iOS's secondary and tertiary labels, translucent: #8A8A8E and #C5C5C7 on white, darker on a selected row's grey.
    secondary: 'rgba(60, 60, 67, 0.6)',
    caption: '#85858B',
    chevron: 'rgba(60, 60, 67, 0.3)',
    destructive: '#FF383C',
    pressed: '#E5E5EA',
    handle: '#C8C8CA',
    selectRing: '#C5C5C7',
    selected: '#D1D1D6',
  },
  dark: {
    page: '#000000',
    card: '#1C1C1E',
    plain: '#000000',
    separator: '#38383B',
    plainSeparator: '#2A2A2C',
    text: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.6)',
    caption: '#8D8D93',
    chevron: 'rgba(235, 235, 245, 0.3)',
    destructive: '#FF4245',
    pressed: '#2C2C2E',
    handle: '#5A5A5E',
    selectRing: '#5A5A5E',
    selected: '#3A3A3C',
  },
} as const;
