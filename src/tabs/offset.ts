import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, space } from '../theme/tokens';

export const useTabBarOffset = (): number => {
  const bottom = useSafeAreaInsets().bottom;
  return bottom > layout.gestureNavInsetMax ? bottom + space[8] : layout.tabBarBottomOffsetAndroid;
};
