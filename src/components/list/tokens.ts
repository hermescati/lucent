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
  // Separators, and the lines over a plain list's first row and under its last, are a full point thick, not a device
  // pixel (measured: 3px at 3x, plain and inset grouped, light and dark).
  separatorWidth: 1,
  // Pressed, a row's content draws at 75% (measured on iOS 27: title, value, icon and chevron alike, the row's fill
  // unchanged), once the touch has been down `pressDelay` without becoming a scroll, as UIScrollView holds it.
  pressedOpacity: 0.75,
  // On wide phones (414 across and up, the Plus and Max iPhones) UIKit's margins are 20, not 16: a card's margin and a
  // row's padding alike, measured on the iPhone 18 Pro (402, 16) and Pro Max (440, 20).
  wide: { from: 414, margin: 20 },
  pressDelay: 150,
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
  // UIKit's detail button, the accent ⓘ (measured: about 22 across, 9 after the value, its end the row's padding in);
  // Material's glyph fills less of its box, so it's drawn larger.
  info: { size: 26, gap: 7, hitSlop: 10 },
  // A borderless button's highlight, a header's action and the ⓘ alike: at once to `pressed` (21%, measured on iOS 27.2,
  // held as long as the finger is), back over `back` ms, quick at first, as UIKit's.
  highlight: { pressed: 0.21, back: 450 },
  // Section headers (body semibold, sentence case) and footers (footnote), in the card's inset; spacing around them.
  header: { fontSize: 17, lineHeight: 22, fontWeight: '600', above: 26, below: 10, first: 6 },
  // A plain list's header: further from the rows above it, and pinned under the navigation bar while its section scrolls
  // under it, `pinned` above its text, until the next one pushes it up, the two moving together, and it fades evenly
  // over `fade` of the push; while pinned it has no grey, and the bar's scroll edge reaches down to its bottom, following
  // it up as it's pushed until its section's last row is under the bar (measured: 62 from the rows above to the rows below, of which 40 pin; the text's top 14 under
  // the bar; frame by frame, the pushed text half gone 7 up and gone by 15).
  plainHeader: { above: 31, below: 9, pinned: 9, fade: 15 },
  // SwiftUI's `headerProminence(.increased)`, and an action at a header's end: 17pt regular in the accent, on the
  // header's baseline (measured).
  prominent: { fontSize: 20, lineHeight: 25, fontWeight: '600' },
  headerAction: { fontSize: 17, lineHeight: 22 },
  footer: { fontSize: 13, lineHeight: 18, fontWeight: '400', above: 7, below: 0 },
  // Between two sections without a header between them.
  sectionGap: 22,
  // iOS 27's swipe actions: capsules beside the row, labels under them, the row slid aside on a grey fill.
  swipe: {
    width: 60,
    height: 43,
    // Slid more than this, the row's slot in the card turns the page's grey (measured: at once, both ways).
    slot: 4,
    // The row's grey comes in once it has slid `tintFrom`, and goes once it's closed, on this spring (measured: critically
    // damped, half way in about 0.14s and there by 0.45s, both ways).
    tintFrom: 1,
    tint: { stiffness: 144, damping: 24, mass: 1 },
    // Slid, the row draws with the card's corner radius on Apple's continuous curve (fitted to iOS's outline within
    // 0.2pt); the corners are all there by `quick` of the grey as it opens, and go with the grey as it closes (measured).
    shape: { quick: 0.12 },
    gap: 10,
    edge: 10,
    // A one-line row's buttons have their icon and label side by side in the capsule, from a row `under` tall their label
    // under it (measured: one-line rows beside, two-line under). A capsule with its label in it (side by side, or text
    // alone) is the row's height less `inset` (44 on a 52 row), its content `inside.pad` from its ends, a 13pt regular
    // label in white and a smaller icon `inside.gap` before it (measured: Delete 82, Read 55 without an icon). A side's buttons
    // all take its widest one's width while that's at most `equalUpTo` times its narrowest's (measured: about 1.2
    // times, all equal; 1.8 times or more, each its own).
    under: 60,
    inset: 8,
    // A text-only button is a rounded rectangle with this continuous corner on any row, where one with an icon is a
    // capsule (measured: fitted to iOS's outline within 0.1pt on one- and two-line rows).
    textCorner: 16,
    inside: { pad: 13, gap: 6, iconSize: 16 },
    equalUpTo: 1.5,
    labelSize: 13,
    labelGap: 2,
    iconSize: 22,
    // Each button grows out from its middle, behind the row, as the row slides past it (measured frame by frame at four
    // speeds): from `after` past its middle, full `over` further on (or once the row is open), easing into its size and
    // fading in over the first `fade` of the way; on `spring` (about 0.2s to full, a slight bulge), which trails a fast
    // slide. The same as the row closes, and whatever slides it.
    grow: {
      after: 5,
      over: 38,
      least: 20,
      ease: 1.3,
      fade: 0.66,
      spring: { stiffness: 484, damping: 35, mass: 1 },
      // Once it's `seen`, from against the row's edge into its place on `place` (critically damped, measured).
      seen: 0.02,
      place: { stiffness: 324, damping: 36, mass: 1 },
    },
    // Dragged past the buttons, the inner ones dim to `to` (labels too) while the finger is down, and come back once
    // it lets go; on a clock, measured: about 0.25s in, 0.3s out.
    // Armed for a full swipe, they dim on to `armedTo`, and stay so as the row slides out (measured).
    // A non-destructive outermost action's inner buttons dim to `softTo` (measured).
    dim: { to: 0.62, armedTo: 0.32, softTo: 0.35, in: 250, out: 300 },
    // Dragged past this much of the row's width, a full swipe is armed: the row jumps on by `armJump`, the outermost
    // button's icon moves to its leading end and its label fades; let go there, it runs.
    fullSwipe: 0.79,
    // A non-destructive outermost action arms at half the row's width, past which the row follows the finger at
    // `softBand` (measured: 1:1 to about 194 of 386, then a fifth).
    // Let go, the row opens if it would be past half its buttons this many seconds on at its speed (measured: a row let
    // go at 64 of 150, moving at about 150pt/s, opens).
    project: 0.2,
    softSwipe: 0.5,
    softBand: 0.2,
    // Let go armed, it runs and its button shrinks away (without fading) over `leave` ms, quickening, as the row
    // closes (measured: 58% at 0.08s).
    leave: 130,
    armJump: 45,
    commit: 200,
    // A full swipe arming jumps the row on this quickly, measured (iOS: 291 to 336 in about 120ms).
    arm: { duration: 150, dampingRatio: 1 },
    // A destructive action takes its row away: the row's height closes up, measured on the simulator.
    remove: 120,
    // Let go, the row settles open or shut carrying the finger's speed, on a critically damped spring (measured from
    // rows released past open and flicked: half way in about 0.14s, settled by 0.5s).
    spring: { stiffness: 144, damping: 24, mass: 1 },
    // Closed by a tap, or by another row opening, the row goes back more softly than a finger lets it go (measured:
    // half way in about 0.12s, 93% in 0.33s).
    close: { duration: 650, dampingRatio: 1 },
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
    // Dragging by the handle (measured): the row lifts at once, 85% opaque on a card a little wider than it, with a soft shadow; the rows it passes slide aside, and let go it settles into its place.
    // Lifted: square-cornered, on a card `widen` wider at each end, its content where it was.
    lift: { duration: 150, opacity: 0.85, widen: 6, radius: 0, shadow: '0px 0px 30px rgba(0, 0, 0, 0.25)' },
    // The faded copy a dragged row leaves in its place (measured): its content at half opacity, on `ghost`.
    ghost: { opacity: 0.5 },
    move: { duration: 250, dampingRatio: 1 },
    // Let go, it glides into its place and settles down there: its card and shadow going over `settle` ms,
    // gently in and out.
    drop: { duration: 450, dampingRatio: 1 },
    settle: 450,
    // Selecting (measured): a 22 circle in the delete control's place, ringed in grey or filled with the accent and a
    // white tick; a selected row turns grey and loses the separators beside it. Ticked, the fill comes in over `fillIn`
    // and the tick draws itself on, from `draw.delay` for `draw.duration` (measured: about 40ms, then 55 to 290ms, slow
    // at the short leg and quick through the long one); unticked, the fill and tick fade together over `fade`.
    select: {
      circle: 22,
      ring: 1.5,
      tick: { width: 10, height: 8, stroke: 1.8 },
      fillIn: 40,
      draw: { delay: 55, duration: 235 },
      fade: 130,
    },
    // A dragged row near the list's visible top or bottom (under the bars) scrolls it, faster the deeper into this zone,
    // as iOS's does (measured: from about 50 above the tab bar, about 140 a second 7 in and 220 at 16).
    autoScroll: { zone: 50, speed: 700 },
    // The delete control opens the row's Delete action on a softer spring than a swipe's (measured: 93% in about
    // 0.25s, settled by 0.6s); its button comes up as a swipe's does.
    reveal: { spring: { duration: 550, dampingRatio: 1 } },
  },
  // The section index (measured, iOS 26's `sectionIndexLabel`): 11pt semibold letters in the accent, about 13.7 apart,
  // their middles 8 from the screen's edge, centred between the compact bar and the bottom; a touch or drag along it
  // jumps the list (no animation) so the section's header sits under the bar. `touch` widens where it can be touched.
  index: { fontSize: 11, pitch: 13.67, width: 16, touch: 16 },
  // `indexLens`: Lucent's own, drawn as Apple draws a lens under a finger (the slider's thumb, the keyboard's key
  // preview): a glass circle `gap` inward of the index, centred on the finger, the letter in the accent. It comes up on
  // a quick spring from `from` of its size and goes in `out`; each new letter comes in over `swap`. While it's up, the
  // index's other letters draw at `dim`, the touched one at full, so the bar shows where the finger is too.
  indexLens: {
    dim: 0.3,
    size: 56,
    gap: 12,
    fontSize: 28,
    lineHeight: 34,
    from: 0.8,
    out: 120,
    swap: 160,
    spring: { duration: 250, dampingRatio: 0.8 },
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
    ghost: '#F9F9FB',
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
    ghost: '#0E0E0F',
  },
} as const;
