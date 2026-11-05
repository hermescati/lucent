export const layout = {
  tabBarHeight: 62,
  tabBarCompactHeight: 48,
  tabLabelHeight: 14,
  tabLabelSize: 10,
  // How much wider iOS sets a tab label than Android does (SF Pro against Roboto, measured over the tab labels): the tabs
  // are sized from labels this much wider, as iOS would size them.
  tabLabelScale: 1.11,
  tabBarSideInset: 21,
  // Above gesture navigation: 21, as iOS 27 sits it above the home indicator (iPhone 18 Pro Max), as far as its sides.
  tabBarBottomOffsetAndroid: 21,
  // iOS 27's tab bar outline is a crisp hairline, a pixel at its ends, thinner than the other glass's rim.
  tabBarInlinePadding: 7,
  // The tabs (helpers/slots), as Apple's iOS 27 Figma kit builds the bar: 4pt of glass and 2pt of padding at each end,
  // tabs overlapping 8pt, the bubble 2pt past its tab; the tabs' widths as the simulator (iPhone 18 Pro) lays them out.
  tabSpacing: { edge: 6, overlap: 8, crowdedOverlap: 16, ideal: 100.5, min: 77, contentPad: 19, outset: 2 },
  bubbleRestWidth: 76,
  bubbleRestHeight: 54,
  tabBarGap: 8,
  // The bottom accessory (iOS 27 simulator, iPhone 18 Pro Max): a capsule 48pt tall across the bar's whole span, 8pt
  // above it; minimized, the same height in the bar's row, 14pt from the circles beside it.
  accessory: { height: 48, gap: 8, inlineGap: 14 },
  // More's list (iOS 27 simulator, iPhone 18 Pro): rows 51pt tall from just under the status bar; icons centred 25pt
  // in, labels from 50pt (a point's bearing after), hairlines from 50pt to 20.3pt short of the edge, above the first
  // row and under each; a chevron 6.4 by 11pt ending 21.3pt in. A Material symbol at 22 draws about SF's 16.6pt glyph.
  moreList: {
    rowHeight: 51,
    separator: 1,
    textInset: 50,
    labelNudge: 1,
    separatorInset: 20.3,
    chevronInset: 21.3,
    iconSize: 22,
    chevron: { width: 7, height: 12, stroke: 2 },
    colors: {
      light: {
        background: '#FFFFFF',
        separator: '#E8E8E8',
        label: '#000000',
        chevron: '#C5C5C7',
        pressed: '#D1D1D6',
      },
      dark: {
        background: '#000000',
        separator: '#2A2A2C',
        label: '#FFFFFF',
        chevron: '#464649',
        pressed: '#2C2C2E',
      },
    },
  },
  searchModeHeight: 48,
  searchModeGap: 12,
  gestureNavInsetMax: 32,
  legibilityShadowRadius: 4,
  tabIconSize: 28,
  // The magnifier's ink is 22.7pt across on iOS 27 at full height; Material's search glyph fills less of its box.
  searchIconSize: 30.7,
  // How much of the bar's shrink the magnifier follows as the bar minimises: on iOS it keeps 22pt of its 22.7.
  searchIconShrink: 0.137,
  closeIconSize: 44,
  searchFieldIconSize: 24,
  // Larger text (iOS 27 simulator, iPhone 18 Pro Max): the tab labels and badges keep their size, as iOS's do; the
  // search field's text grows with it (17pt by default). Up to 23pt (Extra Extra Extra Large) it fits the 48pt field
  // beside its magnifier; from 28pt (the accessibility sizes) the magnifier goes and the text starts `bareInset` in;
  // past that the field grows upward, `rate` x the text + `base` (53pt for 33pt text, 79 for 53), its circles
  // centred on it. The clear button grows with the text, then a little slower (37pt for 47pt text, 42 for 53).
  searchFieldGrowth: { text: 17, glyphUpTo: 25.5, bareInset: 22, rate: 1.3, base: 10.1, clearUpTo: 28, clearRate: 0.79 },
  searchFieldInset: 10,
  tabBadgeHeight: 19,
  tabBadgePadding: 4.5,
  tabBadgeOffsetX: 12,
  tabBadgeRise: 7.7,
  backBadgeOffsetX: 8.5,
  backBadgeRise: 12.3,
} as const;

export const searchFieldText = {
  dark: { fontWeight: '400' },
  light: { fontWeight: '500' },
} as const;

export const clearButton = {
  size: 17,
  span: 5,
  stroke: 1.8,
  inset: 4.5,
  // 17 + 16 a side: Android's 48dp touch target.
  hitSlop: 16,
} as const;

export const closeGlyph = {
  grid: 24,
  span: 10,
  stroke: 1.45,
} as const;

export const placeholderBlend = { dark: 'plus-lighter', light: 'multiply' } as const;

/**
 * The bar going and coming as a screen hides it (`hidden`), as iOS 27's does (measured on the simulator): gone in a
 * couple of frames, its glyphs at once and its glass just after; back over about 300ms, eased out, glass and glyphs
 * together.
 */
export const barPresence = {
  hide: 60,
  show: 300,
};

export const motion = {
  // The ref's \`cancelSearch\` leaves the search tab's field inactive, as iOS's does: the close button folds back into the
  // field's end and its cross fades this fast.
  searchIdle: { glyphFade: 120 },
  springs: {
    track: { duration: 110, dampingRatio: 1 },
    snappy: { duration: 160, dampingRatio: 1 },
    morph: { duration: 420, dampingRatio: 1 },
    // The bar expanding from its minimized circles, fitted to iOS 27's, frame by frame (iPhone 18 Pro Max): its edge
    // 47% of the way at 50ms, 81% at 100ms, 97% at 150ms, a little past (1%) at 200 and back by 370.
    expand: { mass: 1, stiffness: 462, damping: 34.4 },
    lens: { duration: 380, dampingRatio: 1 },
    lift: { duration: 220, dampingRatio: 1 },
    tapLift: { duration: 330, dampingRatio: 1 },
    tapDip: { duration: 120, dampingRatio: 0.5, overshootClamping: true },
    landIn: { duration: 160, dampingRatio: 1, energyThreshold: 2e-3 },
    landOut: { duration: 430, dampingRatio: 1 },
    dripKick: { mass: 1, stiffness: 121, damping: 8.8 },
    compactPopIn: { duration: 140, dampingRatio: 1 },
    compactPopOut: { duration: 300, dampingRatio: 1 },
    landFall: { duration: 190, dampingRatio: 1 },
    tapRise: { duration: 240, dampingRatio: 1, energyThreshold: 2e-3 },
    tapGlowOut: { duration: 420, dampingRatio: 1 },
    pokeIn: { duration: 160, dampingRatio: 1 },
    pokeHold: { duration: 320, dampingRatio: 1 },
    pokeOut: { duration: 560, dampingRatio: 0.85 },
    release: { duration: 360, dampingRatio: 1 },
    settleFill: { duration: 260, dampingRatio: 1 },
    inkTone: { duration: 80, dampingRatio: 1 },
    tapSettle: { duration: 260, dampingRatio: 1 },
    edgeLead: { duration: 200, dampingRatio: 1 },
    edgeTrail: { duration: 320, dampingRatio: 0.85 },
    edgeSettle: { duration: 320, dampingRatio: 1 },
    searchMorph: { duration: 280, dampingRatio: 1 },
    searchOpen: { duration: 240, dampingRatio: 1 },
    searchBumpIn: { duration: 110, dampingRatio: 1 },
    searchBumpOut: { duration: 300, dampingRatio: 1 },
    searchPop: { duration: 420, dampingRatio: 1 },
    searchAbsorb: { duration: 260, dampingRatio: 1 },
    searchDrag: { duration: 220, dampingRatio: 1 },
    searchKeyboardMorph: { duration: 170, dampingRatio: 1 },
    searchKeyboardAbsorb: { duration: 140, dampingRatio: 1 },
    searchDipIn: { duration: 90, dampingRatio: 1 },
    searchDipOut: { duration: 200, dampingRatio: 1 },
    press: { duration: 160, dampingRatio: 1 },
    closeFlash: { duration: 300, dampingRatio: 1 },
    stretch: { duration: 340, dampingRatio: 0.55 },
    jellyLead: { duration: 240, dampingRatio: 0.75 },
    barPressIn: { duration: 160, dampingRatio: 1 },
    barGrowIn: { duration: 130, dampingRatio: 1 },
    barPressOut: { duration: 140, dampingRatio: 1 },
    jellyTrail: { duration: 340, dampingRatio: 0.6 },
    jellySettle: { duration: 420, dampingRatio: 0.55 },
  },
  lensLift: { grow: 10, y: 1.38 },
  deflateTravel: 1.2,
  deflateRamp: 0.8,
  deflateSpeed: 0.6,
  jelly: {
    period: 0.42,
    damping: 0.2,
    stretch: 0.14,
    kick: 0,
    pressKick: 0,
    max: 0.3,
    smoothing: 30,
    lean: 0.55,
    endZone: 0.04,
  },
  squish: {
    period: 0.5,
    dragPeriod: 0.65,
    damping: 0.36,
    dragDamping: 0.55,
    impact: 0,
    dragImpact: 0.8,
    dragHeight: 0.3,
    speedCap: 12,
    bulge: 1.1,
    barBulge: 14,
    flatRate: 3.5,
    flatRound: 0.15,
    leadRound: 0.88,
    max: 0.3,
    memory: 3,
    contact: 2,
  },
  lensPushTravel: 4,
  endMelt: 0.7,
  meltReach: 12,
  lensMoveSpeed: 9,
  edgeEpsilon: 0.25,
  minLensSquash: 0.7,
  itemMagnify: 0,
  canal: { overflow: 2, give: 0.3, spread: 0.8, soft: 6 },
  tapSlide: {
    canal: 0,
    drop: 0.5,
    lead: 490,
    leadPerSlot: 140,
    leadDamping: 0.9,
    farDamping: 0.78,
    trail: 600,
    trailPerSlot: 105,
    arrival: 0.92,
    holdDelay: 160,
    minSquash: 0.78,
    jellyX: 0,
    wallSpread: 0.2,
    impact: 0,
    glassRamp: 2.5,
    pinch: 0.2,
    bend: 0.6,
  },
  // Held, iOS 27's tab bar (simulator, over flat grey) reaches about 11.7pt out at its end, most of it the lens
  // bulging past it, while the bar itself grows about 1.7pt above and below; it's 90% there by about 110ms and back
  // about 130ms after letting go. Its end toward search grows three times as far, necking into the search circle 31pt
  // thick at the middle of the gap.
  barGrow: { x: 2.5, y: 1.25, towardSearch: 2, held: 1.25 },
  dragSettle: { near: 0.15 },
  disabledBounce: { delay: 120 },
  poke: { tap: 0.5, holdDelay: 120, flat: 0.12, bulge: 0.04, lean: 8 },
  lensEdgeReach: -1.6,
  // A tapped tab: iOS 27's lens (simulator) sets off at once and closes in on the tab exponentially, about 85ms to
  // go a third of the way that's left for a neighbour and 20ms more for each tab further (half a neighbour's way in
  // 50ms, 90% in about 200ms), lifting as it goes, as one piece, not stretched, about 120pt wide mid-way against a 100pt
  // pill. Its glass clears as it lifts and fills again as it lowers (liftFor, fillDelay).
  switchTravel: {
    tau: 85,
    tauPerSlot: 20,
    rise: 40,
    fall: { duration: 450, dampingRatio: 1 },
    delay: 0,
    height: 0.87,
    optics: 1,
    wide: 0.97,
    // However long the finger stays (a quick tap or a 100ms click alike), iOS 27's lens (iPhone 18 Pro Max) stays lifted
    // and clear about 220ms from the touch, then lowers in place, darkening into the pill from about 230ms to 400.
    liftFor: 220,
    fillDelay: 230,
    // Gliding, its glass bends the tabs under it cleanly, with little of a held lens's colour fringe.
    dispersion: 0.3,
    lingerPerSlot: 25,
    holdArrive: 0.1,
    // iOS 27 shows the tapped tab's page as the finger lifts (simulator), not once the lens lands.
    navigateDelay: 0,
    squishPeriod: 0.75,
    squishDamping: 0.75,
    squishKick: 0,
    pressKick: 2.4,
    topBend: 0.8,
    contactZone: 0.1,
    railGap: 2,
    heightToWidth: 0.5,
    squishBulge: 2.6,
    clearFrom: 0.35,
  },
  // A tap on the selected tab lifts its lens briefly, as far and as wide as a hold does (iOS 27 simulator: 118 by 70pt
  // at its peak, about 170ms in, against a hold's 120 by 74), rather than spreading it flat.
  tapLanding: {
    wide: 0,
    flat: 0,
    drop: 6,
    tint: 0.5,
    hold: 1.5,
    glassHold: 4,
    iconHold: 4,
    iconBend: 2,
    iconDepth: 2.3,
    dripDelay: 70,
    dripKick: 18,
  },
  tapLens: {
    iconCoverRamp: 20,
    coverLift: 0.05,
    ellipse: 0.35,
    heldEllipse: 0.35,
    coverFrom: 0.8,
    revealOverhang: 5.5,
    dip: 0.3,
    dipFrom: 0.5,
    dentFrom: 55,
    dentFull: 120,
    glowHold: 40,
    glassRamp: 1.4,
    liftY: 1.31,
    holdLiftY: 1.31,
    fallGrey: { from: 0.15, to: 0.6 },
    iconHalf: 0.35,
  },
  pressGrow: 0.26,
  // The search field held by its clear button (iOS 27 simulator): the field and everything in it grow about 5% about
  // its middle on the press spring, necking into the close button's circle beside it, and its glass brightens, settling
  // back after the finger lifts, the neck thinning to a strand before it lets go. A tap of 50ms grows it fully, as a
  // hold does (simulator, which can't press lightly).
  fieldPressGrow: 0.05,
  // Touched in its text rather than on the clear button, it swells about 4%: this much of `fieldPressGrow`.
  fieldTapPeak: 0.8,
  // How much its glass brightens held: iOS's goes from about 245 to 253 over white content.
  fieldPressGlow: 0.05,
  pressIconDim: { dark: 0.4, light: 0.9 },
  backTravel: { handoff: 0.001, settle: 0.995, textRate: 2, textDelay: 0.6 },
  searchClose: {
    fadeFrom: 0.35,
    delay: 40,
    fillFrom: 0.25,
    fillTo: 0.05,
    glyphScale: 0.6,
    circleScale: 0.6,
    lightHold: 1.5,
    circleHold: 4,
    glyphGone: 0.3,
  },
  searchMorph: { heightLag: 2.2, openVelocity: 3, delay: 100 },
  searchBump: { at: 0.55, overshoot: 3, squish: 4 },
  searchTabs: { fade: 1, closeFade: 1, blur: 10, pressFade: 1.5, textBlur: 8 },
  // Search moving between its circle and the tabs: the circle starts (or ends) this much of its size inside the bar's
  // end, and the two melt together this much at the midpoint.
  searchSplit: {
    spring: { duration: 780, dampingRatio: 0.74 },
    from: 0.55,
    blend: 26,
    iconFrom: 0.04,
    iconMeltFrom: 0.5,
  },
  searchPop: { delay: 80, shift: 28, hiddenScale: 0.96, tuckScale: 0.78, glyphScale: 1 },
  pressSquashX: 0,
  pressSquashY: 0,
  nudgeMax: 4,
  nudgeRange: 60,
  nudgeFollow: 1,
  dragThreshold: 4,
  searchDrag: { start: 10 },
  searchKeyboard: { edge: 12, focusDelay: 180, dipAt: 0.05, dip: 4, minHeight: 120 },
  inkTone: { threshold: 0.04 },
  labelFadeRate: 1.8,
  collapseDistance: 24,
  compactPop: { delay: 110, depth: 0.06 },
  // Minimizing (iOS 27 simulator, iPhone 18 Pro Max): the bar and its accessory first shrink about their middle to
  // `scale` over `duration`, icons and labels with them, and gather into their circles from `gatherAfter`.
  // The gather itself is quick, an ease-out: iOS's bar is 45% of the way in 40ms, 86% in 100 and a circle by ~150.
  tuck: { scale: 0.953, duration: 120, gatherAfter: 140, gather: 180 },
  collapseTopOffset: 24,
  // The bottom accessory (iOS 27 simulator, frame by frame), from when the bar starts to gather: its content swaps to
  // the inline copy at once (`swap`); its near end slides along (`slide`) and its far end draws in (`narrow`), both
  // ease-outs; and from 50ms it drops into the bar's row on a spring with a little give (`drop`: iOS's fall measured
  // 26% at 40ms, 48% at 73, 80% at 140, 90% at 172, then just past its place and back). The bar gathers fast enough to be its circle before the
  // accessory reaches the row.
  accessory: {
    swap: { after: 0, duration: 50 },
    slide: { after: 30, duration: 220 },
    narrow: { after: 60, duration: 180 },
    drop: { after: 50, spring: { mass: 1, stiffness: 529, damping: 37 } },
    // Landed, it grows out of the bar's first shrink with a little give (iOS: 255pt wide on arrival, 260 by ~570ms,
    // its top 1.3pt past its place and back by ~690ms).
    land: { after: 260, spring: { duration: 360, dampingRatio: 0.55 } },
    expand: { duration: 380, dampingRatio: 0.78 },
    show: 270,
    hide: 150,
    pressX: 8.7,
    pressY: 1,
  },
} as const;
