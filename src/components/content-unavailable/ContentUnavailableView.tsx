import { ContentUnavailableView as SwiftContentUnavailableView, Host, RNHostView } from '@expo/ui/swift-ui';
import { StyleSheet, View } from 'react-native';

import type { ContentUnavailableViewProps } from './types';

export const ContentUnavailableView = ({
  title,
  sf,
  description,
  actions,
  testID,
  style,
}: ContentUnavailableViewProps) => (
  <Host style={[styles.fill, style]} testID={testID}>
    <SwiftContentUnavailableView
      title={title}
      systemImage={sf}
      description={description}
      // The actions are React Native views, such as Lucent's `Button`, hosted in SwiftUI's layout.
      actions={
        actions ? (
          <RNHostView matchContents>
            <View style={styles.actions}>{actions}</View>
          </RNHostView>
        ) : undefined
      }
    />
  </Host>
);

const styles = StyleSheet.create({
  fill: { flex: 1, alignSelf: 'stretch' },
  actions: { alignItems: 'center' },
});
