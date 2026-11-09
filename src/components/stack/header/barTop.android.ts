import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { topCutoutBottom } from '../../../core/display/cutout.android';
import { bar } from '../tokens';

/**
 * Where the bar's row starts, in dp from the screen's top. iOS starts it below the status bar, which on an iPhone with
 * the Dynamic Island already leaves about 14pt under the island. Android's status bar ends right at a punch-hole camera,
 * so the row would touch it: with a cutout in the top's middle, the row starts that far under it instead.
 */
export const useBarTop = () => {
  const statusBar = useSafeAreaInsets().top;
  return Math.max(statusBar, topCutoutBottom() + bar.cutoutGap);
};
