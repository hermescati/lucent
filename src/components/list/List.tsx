import { List as UniversalList } from '@expo/ui';
import { Host, List as SwiftList } from '@expo/ui/swift-ui';
import {
  Animation,
  animation,
  environment,
  listStyle as listStyleModifier,
  refreshable,
} from '@expo/ui/swift-ui/modifiers';
import type { ReactElement } from 'react';
import { StyleSheet } from 'react-native';

import { ListSelectingContext } from './selectable';
import type { ListForEachProps, ListProps } from './types';

/** SwiftUI's `List`, hosted for the screen: it fills its room and scrolls itself, under the bars. */
export const List = ({
  children,
  onRefresh,
  listStyle = 'insetGrouped',
  editMode = false,
  selection,
  onSelectionChange,
  testID,
  style,
}: ListProps) => (
  <ListSelectingContext value={selection === undefined ? null : editMode}>
    <Host style={[styles.fill, style]}>
      <SwiftList
        testID={testID}
        selection={selection}
        onSelectionChange={onSelectionChange ? (keys) => onSelectionChange(keys.map(String)) : undefined}
        modifiers={[
          listStyleModifier(listStyle),
          environment('editMode', editMode ? 'active' : 'inactive'),
          // Into and out of edit mode with SwiftUI's default animation, as `EditButton` toggles it.
          animation(Animation.default, editMode),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}>
        {children}
      </SwiftList>
    </Host>
  </ListSelectingContext>
);

// SwiftUI's own, which takes `onDelete` and `onMove` as well.
List.ForEach = UniversalList.ForEach as <T>(props: ListForEachProps<T>) => ReactElement;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
