// Shared by the navigation bar's island and the tab bar, which moves as it does as tabs come and go.

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
  // An item back in its kept slot, as iOS 27's magnifier is once a search field has drawn back into its capsule
  // (simulator, frame by frame): the capsule swells further than for one showing, about 23% taller and 13pt wider on the
  // side the item's on and 9pt on the other, peaking about 100ms in and easing back over about 200ms; the glyph comes out
  // of a blur, soft for about 200ms.
  back: { glyph: 260, swell: 1.5, swellUp: 110, swellDown: 220 },
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

/**
 * A capsule splitting off the island or melting back into it, as the tab bar's search circle does: on a spring, the
 * circle comes out of (or goes into) the island's end from `from` of its size, the two blend together up to `blend` at
 * the midpoint, and the island's width follows on the same spring. The circle's glyph shows from `iconFrom` of the way
 * out and is gone by `iconMeltFrom` of the way back.
 */
export const islandSplit = {
  spring: { duration: 780, dampingRatio: 0.74 },
  from: 0.55,
  blend: 26,
  iconFrom: 0.04,
  iconMeltFrom: 0.5,
  // A held neck breaks over this long: at once, as iOS 27's search close button's does.
  neckBreak: 33,
} as const;

/**
 * Glass coming back beside glass that's closing up to it, as the tab bar's search circle does when the bar grows back
 * after search, or iOS 27's back button when search in the bar closes: it sinks `dip` points and springs back up, quick
 * in and slower out. A capsule that had gone also grows back from `from` of its size on `spring`, a little past it and
 * back: iOS's back button, measured frame by frame, comes back at 40%, about 8% past its size by 130ms and settled by
 * 200ms, low by about 4pt all the while.
 */
export const islandReturn = {
  dip: 4,
  dipIn: { duration: 90, dampingRatio: 1 },
  dipOut: { duration: 200, dampingRatio: 1 },
  from: 0.4,
  spring: { duration: 350, dampingRatio: 0.6 },
} as const;
