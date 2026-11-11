// UIKit's body sizes, extra small to the largest accessibility size: the scale Android's font scale is matched against.
const body = [14, 15, 16, 17, 19, 21, 23, 28, 33, 40, 47, 53];
const large = 3;

/**
 * The iOS text size nearest Android's font scale, as an index from extra small (0) through Large (3) to the largest
 * accessibility size (11), for components that size their text from iOS's Dynamic Type tables.
 */
export const textCategory = (fontScale: number) => {
  const want = body[large] * fontScale;
  return body.reduce((best, size, index) => (Math.abs(size - want) < Math.abs(body[best] - want) ? index : best), 0);
};
