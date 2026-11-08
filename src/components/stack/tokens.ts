import { pushMotion } from '../../core/motion/push';

/**
 * iOS 26's navigation bar, measured on the iPhone 18 Pro simulator, in points from the safe area's top.
 *
 * The bar's items sit in a row at the top; an inline bar takes `inline` of content inset, and a large title adds a block
 * of `large` below it, which the title scrolls out of.
 */
export const bar = {
  row: 44,
  inline: 54,
  large: 52,
  // UIKit's layout margin: 16pt on most phones, 20pt from 414pt wide (the Plus and Pro Max phones). The iPhone 18 Pro
  // (402pt) and Pro Max (440pt) simulators put the capsules, the large title and the search field this far in.
  margin: 16,
  wideMargin: 20,
  wideFrom: 414,
  // Between a camera cutout's bottom and the row, as iOS leaves under the Dynamic Island (its bottom at about 48pt, the
  // row at 62pt).
  cutoutGap: 14,
  // Between the capsules on one side, in the bar and in the bottom toolbar alike (iOS 27 simulator).
  groupGap: 12,
  // How far the capsules on one side melt into each other. A pressed capsule grows until it nearly meets its neighbour,
  // and on iOS a neck of glass about 19pt tall joins them; at rest, 12pt apart, they stay apart.
  bridge: 13,
} as const;

/** The bar's side margin on a window this wide. */
export const barMargin = (width: number) => (width >= bar.wideFrom ? bar.wideMargin : bar.margin);

export { barItemMotion, islandReturn, islandSplit } from '../../core/motion/island';

export const barItem = {
  height: 44,
  // A lone icon button is a circle this wide; in a group, icons sit `groupIcon` apart, centre to centre.
  icon: 44,
  groupIcon: 54,
  iconSize: 22,
  // A Material Symbol's glyph fills less of its box than SF's: at this size bar glyphs come out iOS 27's size, about a
  // third larger than at `iconSize` (plus 17.3pt, cross 16.3, checkmark 18, ellipsis 19.7, shipping box 21.3).
  symbolSize: 29,
  // A group of two or more icon buttons gets this much at each end, beyond its icons' slots: less than nothing, since
  // iOS ends the capsule about 23pt past the outer icons' centres. iOS spaces icons by their glyphs' widths, so this
  // splits the cases measured: share and ellipsis 100.7pt wide, plus, trash and ellipsis 153.7pt.
  groupPadding: -4,
  // Around a text button's label: an "Edit" capsule is 62pt wide on iOS.
  textPadding: 17,
  fontSize: 17,
  lineHeight: 22,
  // iOS draws a text button's label and the back button's in SF Regular, which Roboto Regular is lighter than beside it;
  // Roboto Medium looks as heavy.
  labelWeight: '500',
  // A `selected` button (iOS 27 simulator): a fill 36pt tall in its capsule, a circle for a lone icon, 41pt wide and
  // centred on the glyph for an icon among others (41.3pt for a filter, 41 for a shipping box), and the capsule less 4pt
  // each side for a label. Its glyph shows the glass through it. In light mode the fill is the system blue; in dark mode iOS draws
  // it lighter than the prominent button's #0A84FF.
  selected: {
    height: 36,
    groupWidth: 41,
    fill: { light: '#007AFF', dark: '#1D97FF' },
    ink: { light: '#F7F7FC', dark: '#202020' },
  },
} as const;

/**
 * The bottom toolbar (`Stack.Toolbar` with `placement="bottom"`), measured the same way: bigger items than the bar's,
 * a lone icon a 48pt circle centred 52pt from the screen's bottom and side edges, icons in a group 54pt apart.
 */
export const toolbar = {
  height: 48,
  icon: 48,
  groupIcon: 54,
  // As in the bar, between the cases measured: plus and trash 103.7pt wide, share, heart and trash 162pt.
  groupPadding: -1,
  // A text button's label: medium here, where the bar's is regular (iOS 27 simulator: 5px stems against 4px at 3x, the
  // same cap height).
  labelWeight: '500',
  margin: 28,
  // Above the screen's bottom edge over gesture navigation; over a taller inset (three-button navigation), this far above
  // it instead. The same as the floating tab bar.
  bottom: 28,
  gestureNavInsetMax: 32,
  aboveButtons: 8,
  // Above the floating tab bar, inside NativeTabs, and above the keyboard while it's up.
  aboveTabBar: 8,
  aboveKeyboard: 8,
  // A bare item swapped in fades in after this delay, by when the icons it splits off have opened their place
  // (islandSplit), over this long.
  bareIn: { delay: 120, duration: 200 },
  // With an item on it that has no glass (\`hidesSharedBackground\`), iOS 27 blurs and washes what scrolls under the
  // toolbar, as the navigation bar's scroll edge does, so the bare glyph stays legible: from this far above its capsules
  // down to the screen's bottom, sharp at its top (simulator, iPhone 18 Pro: 11pt above, an 87pt band). Washed towards
  // white (242 to 249 over grouped grey) or a near-black grey (black lifts to 12, a 28 card dims to 20), lightly blurred, with the navigation bar's hairline along its top (223 against 248 in light mode).
  edge: {
    above: 11,
    blur: 5,
    wash: { light: 'rgba(255, 255, 255, 0.54)', dark: 'rgba(18, 18, 18, 0.71)' },
    fade: 250,
  },
  // Between the toolbar's top and the end of content scrolled to the bottom.
  contentGap: 8,
} as const;

/**
 * `Stack.Toolbar.Badge` on a bar button: a red pill over its top-right corner, measured on iOS 27 with "3" and "128". Its
 * right edge ends 2pt past the capsule's and its top stands 3.3pt above the capsule's; it grows to the left. `top` and
 * `right` are from the button, whose slot runs a little past the capsule.
 */
export const badge = {
  size: 20.3,
  padding: 4,
  fontSize: 13.5,
  top: -4,
  right: 1.8,
} as const;

export const backButton = {
  chevronWidth: 11,
  chevronHeight: 19,
  chevronStroke: 2.6,
  // Before the chevron, between it and the label, and after the label. iOS's chevron starts 13.3pt into the capsule and
  // its label about 11.7pt after the chevron's ink.
  leading: 13.3,
  gap: 10.5,
  trailing: 16,
  // In the circle without a label, the chevron sits this far left of centre (measured on the simulator).
  aloneShift: 1.5,
} as const;

export const title = {
  inline: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  large: { fontSize: 34, lineHeight: 41, fontWeight: '700', top: 3 },
} as const;

export const barMotion = {
  // The titles cross-fade once the large title's block (`useLargeBlock`) has scrolled away. A large title on the bar's
  // row (`headerLargeTitleInline`) has no block: it goes once content runs about 6pt under the bar.
  rowTitleAt: 6,
  // The cross-fade's durations: the large title goes quickly, the inline one comes in more slowly.
  largeFade: 150,
  inlineFade: 300,
  // Scrolled back, the inline title goes slowly at first, eased in and out over longer than it came (iOS 27 simulator:
  // 6% gone by 66ms, half by 200ms, 80% by 300ms); the large one is back about 130ms in, as `largeFade` gives it.
  inlineFadeOut: 400,
  // Each title blurs as it fades, to about this radius out of focus (iOS 27 simulator: the inline title arrives soft and
  // sharpens, the large one goes soft as it goes).
  titleBlur: 8,
  // The inline title also rises into the row as it comes, from `inlineRise` below, eased out over `inlineRiseIn`, and
  // sinks back as it goes over `inlineRiseOut`; going, it's soft by `inlineBlurBy` of the way (iOS 27 simulator: 14pt
  // below at first, half way by 120ms, settled by 430ms; going, down 13.6pt over 420ms, soft within 70ms).
  inlineRise: 14,
  // A side's buttons widening for longer than a split or melt takes (islandSplit's spring): only then does the inline
  // title move for it.
  sideSettle: 450,
  inlineRiseIn: 430,
  inlineRiseOut: 420,
  inlineBlurBy: 0.2,
  // A pushed screen's opaque-bar inline title fades in over `itemsFade`, this long after the push starts. Its buttons pop
  // in from the start of a push Lucent slides, and this long after the bar shows for one it doesn't.
  itemsDelay: 70,
  itemsFade: 170,
  // A push or a swipe back leaves the bar's buttons where they stand, as iOS's one bar does. Melting away, they blur to
  // this radius (dp, Android's blur): iOS's icon edges spread to about 20pt.
  swipeBlur: 12,
  // Buttons only one of the two screens has don't just fade: iOS pops them. Going, their icons blur within the first
  // 30ms, the capsules swell about 12% as they fade, and capsules close together run into one through necks of glass;
  // coming, not quite backwards: the capsules are there almost at once and the icons sharpen after, half by about 150ms
  // and fully by about 250ms, so the melt comes in eased out over `meltIn`. Recorded on the iOS 27 simulator, popping
  // from and pushing to screens with bar buttons.
  meltOut: 220,
  meltIn: 260,
  // A capsule of its own that comes this long after its row has split off; sooner, it came with the screen.
  splitAfter: 300,
  meltGrow: 0.12,
  // Coming, the capsules' scale from where they start, to their peak, reached `at` of the way back (the melt eased out
  // over `meltIn`, so about 60ms in).
  meltCome: { from: 0.55, peak: 1.08, at: 0.45 },
  // How much further the capsules' glass blends, melted: a shared group's capsules, 12pt apart, neck together as they
  // swell, as iOS's do.
  meltBridge: 10,
  // The scroll edge, left to the system: how far under the row it reaches, how much it blurs, how far it washes, and
  // over how much scroll it comes in. iOS's edge ends sharply at the reach, with no fade. Measured with text under it in
  // both schemes: iOS washes 72% of the way to white, or to a near-black grey that lifts black, and blurs only lightly,
  // so the text shows through as a dim ghost (white text peaks at 32 in dark mode, black text at 234 in light).
  edgeReach: 10,
  edgeBlur: { light: 5, dark: 5 },
  edgeTint: 0.72,
  // A hairline along the edge's bottom: one device pixel, lifting what's under it by about 24 levels in dark mode.
  edgeLine: { light: 'rgba(0, 0, 0, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
  // iOS's edge blurs harder towards the top: this much more under the status bar, easing off to nothing by this far
  // down the row.
  edgeFade: 8,
  edgeFadeTo: 0.5,
  // The soft edge (`scrollEdgeEffects: { top: 'soft' }`) has no line and no sharp bottom. Its wash fades, to white or
  // to a near-black grey that lifts black, under and past the blur. Measured on iOS 27 with a solid orange block filling
  // the screen's top: how far it washes at heights from the middle of the bar's row, gentle above the row and gone 70pt
  // below its middle, a little stronger in dark mode.
  edgeWash: {
    dark: '#0F0F10',
    stops: {
      light: [
        [0.47, -60],
        [0.41, -10],
        [0.36, 0],
        [0.24, 20],
        [0.11, 40],
        [0, 70],
      ],
      dark: [
        [0.64, -60],
        [0.56, -10],
        [0.51, 0],
        [0.35, 20],
        [0.15, 40],
        [0, 70],
      ],
    },
  },
  // Its blur: lighter all the way down, this much more at the top, easing off to none by the row's bottom.
  softBlur: 2,
  softFade: 24,
  // Below the reach, its blur doesn't stop at once: a block's side still spreads 4.5pt at the row's bottom and tapers
  // off below it, while text there stays sharp. A strip this tall starts at this much blur and eases off to none.
  edgeTail: { blur: 2.5, reach: 24 },
  // With no title, iOS 27's edge covers only the status bar: on the iPhone 18 Pro (a 62pt inset) text is washed and
  // blurred to about 40pt down, and sharp again by 52pt, well above the buttons. As fractions of the top inset: the
  // wash holds until `washTo` and is gone, with the blur, at `reach`.
  untitledEdge: { wash: 0.92, washTo: 0.65, reach: 0.82 },
  // Drawn solid (the fallback), the edge is the page's colour down to the row's bottom, then fades to clear over this
  // much, to where iOS's soft edge wash is gone (70pt below the row's middle, edgeWash), so what scrolls under it
  // dissolves rather than meeting a hard line. With no title, it fades over the stretch where iOS's wash eases off
  // (untitledEdge washTo to reach).
  solidFade: 48,
  edgeOver: 12,
  // An opaque bar (`headerTransparent: false`) without a colour of its own, with no line under it: on the iOS 27
  // simulator, grouped grey in light mode over a white page and a grey one alike, and black in dark mode.
  opaqueFill: { light: '#F2F2F7', dark: '#000000' },
  // The hard edge (`scrollEdgeEffects: { top: 'hard' }`): the same reach, but blurred until the content under it is
  // a smear, and washed further. Over an orange block on iOS 27, it washes about half way, to white in light mode
  // (green 65 → 161) and to black in dark (65 → 31), and blurs so a block's top edge still reads under it.
  hardBlur: 18,
  hardTint: { light: 0.5, dark: 0.5 },
  // iOS's light wash keeps more of the colour than a plain mix: red 239 where a half-white mix of the block gives 224.
  // Its dark one is a plain half-black mix (94, 30, 5).
  hardSaturation: { light: 1.75, dark: 1 },
} as const;

/**
 * `Stack.Toolbar.Menu`'s menu, measured on the iPhone 18 Pro simulator in points. It opens from its button's corner,
 * 250 wide; rows go in sections split by a hairline, and the columns line up across the menu.
 */
export const menu = {
  width: 250,
  radius: 34,
  // Above the first row and below the last, and either side of a section's hairline.
  padding: 10,
  row: 42,
  fontSize: 17,
  lineHeight: 22,
  subtitleSize: 15,
  subtitleLineHeight: 20,
  // Where things start from the menu's leading edge: a menu with a checkmark anywhere in it keeps a column for them.
  leading: 20,
  check: { centre: 28, size: 17 },
  // With the checkmark column; without it, everything moves `checkColumn` closer to the edge.
  checkColumn: 24,
  icon: { centre: 55.5, size: 20 },
  text: 44,
  textAfterIcon: 80,
  trailing: 20,
  chevron: { size: 20, right: 27.5 },
  separatorInset: 24,
  header: { height: 28, fontSize: 13, lineHeight: 18, top: 2 },
  // Away from the screen's edges, wherever the button is.
  screenMargin: 8,
  blurRadius: 20,
  // A wide, soft shadow, which lifts the menu off a page as light as it is.
  shadowRadius: 24,
  shadowOffset: 4,
  shadowSpread: 0,
  // A submenu opens as a card over its row, this much above it, and the menu behind it dims.
  submenuLift: 19,
  dimmed: 0.5,
} as const;

/** The menu's colours, which iOS 26 keeps light in both schemes, over a dark page as well. */
export const menuColors = {
  light: {
    tint: 'rgba(252, 252, 255, 0.8)',
    rim: 'rgba(0, 0, 0, 0.16)',
    shadow: 'rgba(0, 0, 0, 0.1)',
    text: '#000000',
    secondary: 'rgba(60, 60, 67, 0.6)',
    separator: 'rgba(0, 0, 0, 0.08)',
    destructive: '#FF383C',
    pressed: 'rgba(0, 0, 0, 0.06)',
  },
  dark: {
    tint: 'rgba(153, 153, 155, 0.9)',
    rim: 'rgba(255, 255, 255, 0.3)',
    shadow: 'rgba(0, 0, 0, 0.3)',
    text: '#000000',
    secondary: 'rgba(0, 0, 0, 0.6)',
    separator: 'rgba(0, 0, 0, 0.08)',
    destructive: '#D0161A',
    pressed: 'rgba(0, 0, 0, 0.08)',
  },
} as const;

// Drawn solid, the menu is One UI's surface (barFallback): dark mode's ink turns light on it, where iOS 27 inks a light
// grey glass in black.
export const menuSolidColors = {
  light: menuColors.light,
  dark: {
    ...menuColors.dark,
    text: '#FFFFFF',
    secondary: 'rgba(235, 235, 245, 0.6)',
    separator: 'rgba(255, 255, 255, 0.08)',
    destructive: '#FF4245',
    pressed: 'rgba(255, 255, 255, 0.08)',
  },
} as const;

export const menuMotion = {
  open: { damping: 26, stiffness: 320, mass: 1 },
  close: 180,
  // The items come in over the last part of the open, once the glass has room for them.
  contentFrom: 0.35,
} as const;

/**
 * `Stack.SearchBar`, measured the same way. iOS 26 puts it in the bottom toolbar: a glass capsule the toolbar's height
 * across the screen on its own, or in a `Stack.Toolbar.SearchBarSlot` between the toolbar's items. Beside a bottom
 * toolbar without a slot, or with `placement="stacked"`, it goes in the navigation bar instead, as a glass field
 * below the title, which scrolls away with the content; focused, it rises into the bar's row beside a close button.
 */
export const search = {
  // Material's magnifier and close glyphs draw smaller in their box than SF's: these sizes give iOS 27's 16pt-wide
  // magnifier and 16.4pt-wide close cross.
  iconSize: 22.4,
  // The magnifier on the search button: SF's glyph is bolder and fuller than Material's at a bar item's size.
  buttonIcon: 28,
  // The magnifier's middle and where the text starts, from the field's leading edge.
  iconCentre: 21,
  // Material's magnifier draws its ink a little left of its box's middle, where SF's sits centred: moved by this much,
  // its ink sits where iOS 27's does, 22pt in. Up and down its ink is centred, as iOS's is in the field.
  iconNudge: { x: 2.4, y: 0 },
  text: 42,
  fontSize: 17,
  // Placeholder and typed text alike (iOS 27 simulator and kit).
  fontWeight: '500',
  // Placeholder and typed text, one text box, moved down this much: iOS 27 centres them on the magnifier, a third of a
  // point below it (simulator), where Android's box leaves them about 2pt above it.
  textNudge: 1.3,
  // The resting field's label, drawn as text rather than a text box, sits this much lower than the box would put it:
  // iOS centres its text about a point below the field's middle.
  displayNudge: 1.3,
  // iOS 27's clear button: a 17pt circle with a 7pt cross, about 1.9pt thick, cut out of it.
  clearSize: 17,
  clearCross: 7,
  clearStroke: 1.9,
  // The clear button's right edge from the field's trailing edge: its middle sits 24.5pt in on iOS 27.
  clearTrailing: 16,
  trailing: 12,
  // In the navigation bar: below the bar's row, and the room it takes, with the gap under it.
  header: { height: 44, block: 52 },
  // A field that scrolls away under the title is no glass at rest on iOS 27, but a flat pill of UIKit's tertiary fill
  // (simulator): it turns to glass as it rises, focused, by `glassBy` of the way.
  fill: { light: 'rgba(118, 118, 128, 0.12)', dark: 'rgba(118, 118, 128, 0.24)' },
  glassBy: 0.5,
  // The placeholder in dark mode, lighter than the theme's: (59, 59, 61) of glass goes to (138, 138, 141) under it on
  // iOS 27 (simulator). In light mode it's the theme's.
  placeholderDark: 'rgba(235, 235, 245, 0.45)',
  // Focused, the field and a close button sit above the keyboard, this far from the screen's edges.
  focused: { margin: 8, gap: 12, close: 48, closeIcon: 29 },
} as const;

export const searchMotion = {
  focus: 220,
  // Focusing a field in the navigation bar, measured on the iOS 27 simulator: the field rises into the row as it
  // narrows for the close button, which slides in from the screen's edge. It moves at once and eases out
  // exponentially, a time constant of about 60ms: 47% of the way by 45ms, 80% by 110ms, 97% by 155ms. The row's title
  // and buttons are mostly gone by the first frame. It ends a point past the row, at about 240ms, and settles back by
  // about 390ms. Closing, it goes back down on a
  // critically damped spring of about 30 rad/s, with no overshoot: 30% by 37ms, 67% by 77ms, 93% by 145ms.
  lift: { duration: 240, settle: 60, overshoot: 1, back: 150 },
  drop: { stiffness: 900, damping: 60 },
  // The magnifier among the bar's items, opening (iOS 27 simulator, frame by frame): the row's title and back button are
  // gone by the first frame, and the trailing capsule stretches left into a field across the row on a strong ease-out,
  // 41% of the way by 33ms, 85% by 83ms, 97% by 167ms. The field's content and the close cross come in blurred and are
  // sharp by about 170ms. The close button buds off the field's end from the start, necked to it, and breaks free at
  // about 250ms. Stretching, the field sags: its bottom drops about 11pt by 60ms, its top staying put, eases back to
  // about 6pt by 160ms, and snaps back up as the close button breaks free: it gets bigger, its content too, rather than
  // moving down.
  bar: {
    stretch: 230,
    // How much of the field's glass shows parked, out of sight: none to the eye, enough to keep it drawing.
    parked: 0.004,
    // The trailing capsule's items, inside the field as it grows, are gone by its third frame.
    itemsOut: 50,
    // The close button buds off the field's end as it starts to stretch, a round bud a third its size at its own place,
    // and grows there whole by about 150ms, as big as the sagging field, as the field's end draws back to it, the two
    // overlapping a little, joined by a tight neck; at about 235ms the neck breaks at once and the gap between them opens.
    close: {
      // It buds off this long after the field starts stretching, rather than at once, so the field's end isn't pulled
      // into a long bump while it's still a circle; it stays well inside the field until the neck breaks at about the
      // same moment as before (`at`, from when it starts).
      budAfter: 90,
      spring: { duration: 260, dampingRatio: 1 },
      from: 0.35,
      neck: { at: 112, overlap: 12, blend: 7 },
      // Its cross comes in blurred, readable by about 120ms and a little soft until the neck breaks.
      cross: { soft: 0.7, softBy: 120 },
      // Closing, it melts into the field's end quickly, gone well before the field lands, as iOS 27's is: the field
      // draws back as a plain pill.
      meltTime: 130,
      // Its cross goes as it starts melting in, gone by the time it's 70% of the way back.
      glyphGoneBy: 0.7,
      // Its cross comes out of the field's end into the circle from this far in, and goes back in shrinking to this, as
      // the tab bar's search close button's does.
      glyphShift: 28,
      glyphScale: 0.6,
      blurOut: 80,
    },
    content: 60,
    blur: 10,
    sharpBy: 170,
    sag: { by: 11, up: 60, hold: 30, eased: 6, ease: 70, snapAt: 90, snap: 33 },
    // Its content with it: 8% bigger at the deepest, 4.5% as it eases, and a little small once the close button breaks
    // free, settled by about 400ms.
    grow: { by: 1.08, eased: 1.045, snapped: 0.96, settle: 170 },
    // Closing (iOS 27 simulator, frame by frame), all at once: the field's start draws back into the trailing capsule
    // over about 160ms, the placeholder fading in about 100ms, as the close button melts into its end and the back button
    // buds off its start, growing back; the title fades in from about 50ms, the capsule's items from about 150ms, and
    // the magnifier last, at about 400ms.
    // The back button budding off the field's start as it draws back (simulator, frame by frame): from about a third its
    // size, three quarters by 100ms, whole by about 170ms and a little past, its chevron soft until then.
    backReturn: { from: 0.35, spring: { duration: 700, dampingRatio: 0.7 } },
    // Opened from the magnifier's press, search mode starts this far in, its render done before the field is sharp.
    commitAt: 90,
    // Landing back in the trailing capsule (simulator, frame by frame): the field arrives about 18% taller and a little
    // wider than the capsule, swelling over the last `from` of its stretch, arriving at `at` (about 150ms in), and
    // deflates from there, the capsule taking it over, by about 270ms.
    land: { from: 0.3, at: 0.06, peak: 1, settle: 120 },
    closeFade: 100,
    // As a field's sides move with the keyboard, its glass follows its layout on the UI thread this long after each move.
    followSide: 100,
    // The field draws back on the curve of a critically damped spring of about 31 rad/s, as iOS 27's does (11% of the way
    // by 17ms, 49% by 50ms, 75% by 83ms, 92% by 117ms): the same spring as a field rising into the row going back down.
    // Run over a fixed `closeShrink`, so it lands, and hands over to the capsule, on time rather than when a spring
    // would call itself at rest, 400ms on.
    closeOmega: 0.03,
    closeShrink: 240,
    // The title shows as the field's stretch goes from `from` to `to`: about 50ms to 120ms into its draw back.
    titleIn: { from: 0.55, to: 0.1 },
    // The trailing items show over the last part of its draw back, as stretch goes from this to 0.
    itemsIn: 0.04,
    // The magnifier comes back as an item showing on its capsule does (`barItemMotion.show`): the capsule swells, peaking
    // about 530ms in as iOS 27's does, and the magnifier grows out of a blur, showing from about 400ms and sharp by
    // about 600ms.
    magnifierIn: { delay: 350, duration: 0 },
  },
  // Search mode from the bottom (iOS 27 simulator). The bar fades within about 100ms as the content moves up into its
  // place on a critically damped spring of about 25 rad/s: 44% by 63ms, 78% by 116ms, 93% by 170ms.
  hide: { stiffness: 625, damping: 50 },
  barFade: 100,
  // The field rides the keyboard up, so it moves as the keyboard does, and grows out of what was tapped (the toolbar's
  // capsule, the bottom field, or the magnifier's circle) to the screen's width as it goes; the close button buds off
  // its end, and the toolbar's other items blur away. As fractions of the keyboard's way up, from frame-by-frame
  // recordings: the field is full width by about 60%, the close button whole by about 90%, the toolbar's items gone
  // by 40%.
  bottom: {
    // Into a magnifier's circle: the field's text goes over `circleEmpty` and its magnifier rides the glass into the
    // circle. Out of one, it starts at the circle's size and widens over `circleStretch` as it rides the keyboard up.
    circleEmpty: 60,
    circleStretch: 300,
    // A field drawing back into a magnifier's circle, at the bottom or among the toolbar's items: as the navigation
    // bar's lands in its capsule (bar.land), it swells as it nears, from `from` of its stretch to `at`, up to `peak`,
    // and the circle takes the swell over and settles on a looser spring, wobbling as it comes round.
    land: { from: 0.3, at: 0.06, peak: 1.3, settle: { duration: 650, dampingRatio: 0.3 } },
    // In the toolbar's slot, the toolbar's items give way to the field as it grows out of the slot this far. The field's
    // own motion, out of what was tapped and back, is every search field's (`SearchMorph`, `searchMotion.bar`).
    melt: [0.1, 0.4],
    // Grown out of the magnifier's circle, its content's cut this far inside the circle's end, so only the magnifier
    // shows in it.
    circleClip: 8,
    // Closed, it's taken away by this long after the keyboard starts down, if the keyboard hasn't said it's down.
    closeBy: 600,
    // The toolbar, beside a field in its slot, with no keyboard coming up (a hardware one): a clock stands in for it.
    fallback: 500,
    fallbackOver: 250,
    // Closing, the field draws back into what it came out of as it rides the keyboard down; the toolbar's items come
    // back once the keyboard is nearly down (below a quarter of its way).
    toolbarBack: [0.02, 0.25],
  },
  rowOut: 50,
  rowIn: 200,
} as const;

/**
 * The swipe back. It starts anywhere on the screen once a drag goes this far right, gives way to a drag that goes as
 * far up or down first, and goes back past half the screen's width, counting a flick's speed as iOS does.
 */
export const swipeMotion = {
  // Before a page's scroll takes a drag that leans down (Android's touch slop, 8dp), so a swipe back can lean too.
  activateAfter: 10,
  // Android's back gesture takes drags that start this close to either side; the swipe leaves them to it.
  systemEdge: 32,
  verticalSlack: 15,
  commit: 0.5,
  velocityFactor: 0.3,
  velocityCap: 100,
  // A flick to the right this fast, in points a second, goes back however short, as on iOS.
  flick: 500,
  // Frames a push waits for its screen to be known to the swipe before it gives up on the slide and shows it in place.
  pushWait: 30,
  // The screen below's slide and dim, the springs' push and pop, and the top screen's shadow: UIKit's (core/motion/push).
  parallax: pushMotion.parallax,
  dim: pushMotion.dim,
  dimCurve: pushMotion.dimCurve,
  // Let go, and the screen settles on a critically damped spring that starts at the finger's speed: about 200ms from
  // anywhere, going back or staying, as recorded on iOS.
  settle: { omega: 25, damping: 1 },
  tap: pushMotion.tap,
  shadow: pushMotion.shadow,
} as const;
