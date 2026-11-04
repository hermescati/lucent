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
