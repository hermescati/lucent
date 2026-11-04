// Shared by the stack, which pushes and pops its screens so, and More's list on the tab bar, which a tab's screen
// slides over as iOS's More pushes it.

/** UIKit's push and pop, measured on iOS 27 (simulator). */
export const pushMotion = {
  // The screen below starts 30% of the width to the left and slides in with the top one, as UIKit's.
  parallax: 0.3,
  // It's dimmed by black, this strong at the start and fading as the top screen goes: 0.1 x (1 - progress)^1.1,
  // fitted to recorded drags over a light page (within half a percent). iOS dims in linear light, so a photo's
  // mid-tones darken more than this; a page's background is most of what shows.
  dim: 0.1,
  dimCurve: 1.1,
  // A push, or a pop without a finger: an overdamped spring, which sets off at once and eases in on a decay of about
  // 14/s, settled in about 330ms. Fitted to recorded pushes and pops on iOS 27.
  tap: { omega: 60, damping: 2.2 },
  // The top screen's shadow on the screen below, around its rounded outline: about 1.5% dark at its edge, gone 20dp out.
  shadow: '0px 0px 20px 0px rgba(0, 0, 0, 0.032)',
} as const;

/** How dark the screen below is, 0 to 1, with the top one this far gone (0 covering it, 1 off to the right). */
export const pushDimAt = (progress: number) => {
  'worklet';
  return progress < 0 ? 0 : pushMotion.dim * Math.pow(1 - Math.min(progress, 1), pushMotion.dimCurve);
};

/** The push's spring as Reanimated takes it, settling without overshoot. */
export const pushSpring = {
  mass: 1,
  stiffness: pushMotion.tap.omega * pushMotion.tap.omega,
  damping: 2 * pushMotion.tap.damping * pushMotion.tap.omega,
  overshootClamping: true,
} as const;
