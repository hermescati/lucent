import { useWindowDimensions } from 'react-native';

import { bar, barItem, search, title } from '../tokens';

// UIKit's Dynamic Type sizes, extra small to the largest accessibility size, for the styles the bar uses: body and
// headline (its buttons, search text and inline title) and large title. On the iOS 27 simulator the large title grows
// all the way (38pt at XXL, about 60pt at the largest), but the bar's row stops at XXL's 21pt: past it, iOS shows a
// large-content viewer instead.
const body = [14, 15, 16, 17, 19, 21, 23, 28, 33, 40, 47, 53];
const large = [31, 32, 33, 34, 36, 38, 40, 44, 48, 52, 56, 60];
const standard = 3;
const rowCap = 5;
// The large title's block holds titles up to this size as it is, the title growing up into it with its bottom where it
// was; past it the block grows by as much again (iOS 27 simulator: content 2pt lower at 40pt, 21pt at 60pt).
const blockHolds = 38;

const largeGrowth = (fontSize: number) => Math.max(0, fontSize - blockHolds);

/** The iOS text size nearest Android's font scale, as an index into the tables above. */
const categoryFor = (fontScale: number) => {
  const want = body[standard] * fontScale;
  return body.reduce((best, size, index) => (Math.abs(size - want) < Math.abs(body[best] - want) ? index : best), 0);
};

const scaled = (style: { fontSize: number; lineHeight: number }, by: number) => ({
  fontSize: style.fontSize * by,
  lineHeight: Math.round(style.lineHeight * by),
});

/**
 * The bar's text at the user's text size, as iOS sizes it: from its own tables rather than Android's scaling, which
 * barely grows a large title. The texts these go on turn Android's own scaling off.
 */
export const useBarType = () => {
  const index = categoryFor(useWindowDimensions().fontScale);
  const bodyBy = body[Math.min(index, rowCap)] / body[standard];
  const largeBy = large[index] / large[standard];
  const largeType = scaled(title.large, largeBy);
  return {
    inline: scaled(title.inline, bodyBy),
    // Its bottom stays a fixed way up from the block's.
    large: {
      ...largeType,
      marginTop: title.large.top + largeGrowth(largeType.fontSize) - (largeType.lineHeight - title.large.lineHeight),
    },
    item: scaled(barItem, bodyBy),
    search: { fontSize: search.fontSize * bodyBy },
  };
};

/** The large title's block, which grows with the title past `blockHolds`, as iOS's does. */
export const useLargeBlock = () => bar.large + largeGrowth(useBarType().large.fontSize);
