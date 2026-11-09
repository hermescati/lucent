import { List as UniversalList } from '@expo/ui';
import { Host, List as SwiftList } from '@expo/ui/swift-ui';
import { listStyle as listStyleModifier, refreshable } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { ListProps } from './types';

/** SwiftUI's `List`, hosted for the screen: it fills its room and scrolls itself, under the bars. */
export const List = ({ children, onRefresh, listStyle = 'insetGrouped', testID, style }: ListProps) => (
  <Host style={[styles.fill, style]}>
    <SwiftList
      testID={testID}
      modifiers={[listStyleModifier(listStyle), ...(onRefresh ? [refreshable(onRefresh)] : [])]}>
      {children}
    </SwiftList>
  </Host>
);

List.ForEach = UniversalList.ForEach;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
