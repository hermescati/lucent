import { Host, ProgressView as SwiftProgressView, Text } from '@expo/ui/swift-ui';
import { hidden as hide, progressViewStyle, tint } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { ProgressViewProps } from './types';

export const ProgressView = ({ value, label, tintColor, hidden, testID, style }: ProgressViewProps) => {
  const determinate = value != null;
  return (
    // A bar takes the row's width; a spinner, only its own.
    <Host
      matchContents={determinate ? { vertical: true } : true}
      style={[determinate && styles.row, style]}
      testID={testID}>
      <SwiftProgressView
        value={value}
        modifiers={[
          progressViewStyle(determinate ? 'linear' : 'circular'),
          ...(tintColor ? [tint(tintColor)] : []),
          ...(hidden ? [hide(true)] : []),
        ]}>
        {label ? <Text>{label}</Text> : null}
      </SwiftProgressView>
    </Host>
  );
};

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch' },
});
