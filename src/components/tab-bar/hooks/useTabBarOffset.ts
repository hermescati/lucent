import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space } from '../../../theme/tokens';
import { layout } from '../tokens';

export const useTabBarOffset = (): number => {
  const bottom = useSafeAreaInsets().bottom;
  return bottom > layout.gestureNavInsetMax ? bottom + space[8] : layout.tabBarBottomOffsetAndroid;
};
