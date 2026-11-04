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
  margin: 16,
  // Between a camera cutout's bottom and the row, as iOS leaves under the Dynamic Island (its bottom at about 48pt, the
  // row at 62pt).
  cutoutGap: 14,
  // Between the capsules on one side, in the bar and in the bottom toolbar alike (iOS 27 simulator).
  groupGap: 12,
  // How far the capsules on one side melt into each other. A pressed capsule grows until it nearly meets its neighbour,
  // and on iOS a neck of glass about 19pt tall joins them; at rest, 12pt apart, they stay apart.
  bridge: 13,
} as const;

/**
 * A bar item shown or hidden in place (`hidden`), measured on iOS 27 frame by frame with a heart beside a trash button.
 * The capsule and every glyph on it swell together, about 17% taller and up to 8pt wider each side (a circle grows evenly,
 * so it stays round), while its width eases out
 * (a quadratic ease-out: 30% of the way at 33ms, 55% at 67ms) a little past the new size and back. Showing, the swell
 * peaks at 150ms and the new glyph grows out of a small blur from 30ms, riding the opening edge, settled by about
 * 350ms; hiding, the glyph rides the closing edge, shrinking as it blurs away over 130ms, and the swell peaks at 90ms,
 * the width settling by about 450ms.
 */
export const barItemMotion = {
  show: { width: 250, swellUp: 150, swellDown: 140, glyphDelay: 30, glyph: 140 },
  hide: { width: 220, swellUp: 90, swellDown: 170, glyph: 130 },
  // How far past the new width it goes, of the way it moves, and how long it takes to come back.
  overshoot: 0.03,
  settle: 200,
  blur: 10,
  // How far into fading the glyph is fully blurred: iOS's leaving heart is soft by about 60ms of its 130.
  blurBy: 0.4,
  swellY: 0.17,
  swellX: 8,
  glyphSwell: 0.17,
  // How small a glyph is as it fades in or out.
  leaveScale: 0.4,
} as const;

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
  margin: 28,
  // Above the screen's bottom edge over gesture navigation; over a taller inset (three-button navigation), this far above
  // it instead. The same as the floating tab bar.
  bottom: 28,
  gestureNavInsetMax: 32,
  aboveButtons: 8,
  // Above the floating tab bar, inside NativeTabs, and above the keyboard while it's up.
  aboveTabBar: 8,
  aboveKeyboard: 8,
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
  // How far the scroll has to go before the titles cross-fade: the large title's block, scrolled away. A large title on
  // the bar's row (`headerLargeTitleInline`) has no block: it goes once content runs about 6pt under the bar.
  inlineAt: bar.large,
  rowTitleAt: 6,
  // The cross-fade's durations: the large title goes quickly, the inline one comes in more slowly.
  largeFade: 150,
  inlineFade: 300,
  // Each title blurs as it fades, to about this radius out of focus (iOS 27 simulator: the inline title arrives soft and
  // sharpens, the large one goes soft as it goes).
  titleBlur: 8,
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
  meltGrow: 0.12,
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
  edgeOver: 12,
  // An opaque bar (`headerTransparent: false`) without a colour of its own: iOS's system background, as
  // `configureWithOpaqueBackground` gives it, with no line under it (iOS 27 simulator).
  opaqueFill: { light: '#FFFFFF', dark: '#000000' },
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
  // A thin outline and a wide, soft shadow, which lift the menu off a page as light as it is.
  rimWidth: 0.7,
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
  text: 42,
  fontSize: 17,
  // iOS 27's clear button: a 17pt circle with a 7pt cross, about 1.9pt thick, cut out of it.
  clearSize: 17,
  clearCross: 7,
  clearStroke: 1.9,
  trailing: 12,
  // In the navigation bar: below the bar's row, and the room it takes, with the gap under it.
  header: { height: 44, block: 52, margin: 16 },
  // A field that scrolls away under the title is no glass at rest on iOS 27, but a flat pill of UIKit's tertiary fill
  // (simulator): it turns to glass as it rises, focused, by `glassBy` of the way.
  fill: { light: 'rgba(118, 118, 128, 0.12)', dark: 'rgba(118, 118, 128, 0.24)' },
  glassBy: 0.5,
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
  // The magnifier among the bar's items, opening (iOS 27 simulator): its capsule stretches left into a field across the
  // row over about 90ms as the row's title and buttons go, the placeholder coming in, with the close cross at its end.
  // About 330ms in, the close button buds off the field's end, the glass necking apart, over about 80ms.
  // Closing plays it back over about 200ms: the placeholder goes, the close button merges back, and the field shrinks
  // into the capsule as the row's title and buttons come back.
  bar: { stretch: 90, content: 90, budAt: 330, bud: 80, closeFade: 60, closeMerge: 100, closeAt: 50, closeShrink: 170 },
  rowOut: 50,
  rowIn: 200,
} as const;

/**
 * The swipe back. It starts anywhere on the screen once a drag goes this far right, gives way to a drag that goes as
 * far up or down first, and goes back past half the screen's width, counting a flick's speed as iOS does.
 */
export const swipeMotion = {
  activateAfter: 20,
  // Android's back gesture takes drags that start this close to either side; the swipe leaves them to it.
  systemEdge: 32,
  verticalSlack: 15,
  commit: 0.5,
  velocityFactor: 0.3,
  velocityCap: 100,
  // The screen below starts 30% of the width to the left and slides in with the drag (iOS 27 simulator, as UIKit's).
  parallax: 0.3,
  // It's dimmed by black, this strong at the start and fading as the drag goes: 0.1 x (1 - progress)^1.1, fitted to
  // recorded drags over a light page (within half a percent). iOS dims in linear light, so a photo's mid-tones darken
  // more than this; a page's background is most of what shows.
  dim: 0.1,
  dimCurve: 1.1,
  // Let go, and the screen settles on a critically damped spring that starts at the finger's speed: about 200ms from
  // anywhere, going back or staying, as recorded on iOS.
  settle: { omega: 25, damping: 1 },
  // A push, or a pop without a finger (the back button, the Back key): an overdamped spring, which sets off at once and
  // eases in on a decay of about 14/s, settled in about 330ms. Fitted to recorded pushes and pops on iOS 27.
  tap: { omega: 60, damping: 2.2 },
  // The top screen's shadow on the screen below, around its rounded outline: about 1.5% dark at its edge, gone 20dp out
  // (iOS 27 simulator).
  shadow: '0px 0px 20px 0px rgba(0, 0, 0, 0.032)',
} as const;
