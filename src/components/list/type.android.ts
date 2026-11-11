import { useWindowDimensions } from 'react-native';

import { textCategory } from '../../core/textSize';

// UIKit's Dynamic Type sizes and line heights, extra small to the largest accessibility size, for the text styles a
// list uses. Lists set their text from these rather than Android's scaling, which grows large text less than iOS does
// (Android 14's non-linear scaling): a row's height comes out as iOS's at every size (measured on iOS 27.2: a one-line
// row 52pt at Large and 59 at XXXL, a stacked one 99 at AX1 and 111 at AX2).
type Table = [number, number][];
// prettier-ignore
const body: Table = [
  [14, 19], [15, 20], [16, 21], [17, 22], [19, 24], [21, 26], [23, 29], [28, 34], [33, 40], [40, 48], [47, 56], [53, 62],
];
// prettier-ignore
const subheadline: Table = [
  [12, 16], [13, 18], [14, 19], [15, 20], [17, 22], [19, 24], [21, 28], [25, 31], [30, 37], [36, 43], [42, 50], [49, 58],
];
// prettier-ignore
const footnote: Table = [
  [12, 16], [12, 16], [12, 16], [13, 18], [15, 20], [17, 22], [19, 24], [23, 30], [27, 34], [33, 41], [38, 46], [44, 52],
];
// prettier-ignore
const title3: Table = [
  [18, 23], [19, 24], [19, 24], [20, 25], [22, 28], [24, 30], [26, 32], [31, 38], [37, 43], [43, 51], [49, 56], [55, 66],
];
const large = 3;
// The first accessibility size, from which a row's value goes under its title.
const accessibility = 7;

/** A list's text at the user's text size, as iOS sizes it. The texts these go on turn Android's own scaling off. */
export const useListType = () => {
  const index = textCategory(useWindowDimensions().fontScale);
  const style = (table: Table) => ({ fontSize: table[index][0], lineHeight: table[index][1] });
  return {
    // Body: a row's title and value, a header's action. Headline (a header) is the same size, semibold.
    title: style(body),
    supporting: style(subheadline),
    header: style(body),
    prominent: style(title3),
    footer: style(footnote),
    // How much bigger body text is than at Large, for the symbols that grow with it, and how much taller its line.
    grow: body[index][0] / body[large][0],
    taller: body[index][1] - body[large][1],
    stacked: index >= accessibility,
  };
};
