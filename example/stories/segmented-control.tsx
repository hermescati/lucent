import { SegmentedControl } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import { story } from './types';

const sets = [
  ['Day', 'Week'],
  ['Day', 'Week', 'Month'],
  ['Day', 'Week', 'Month', 'Year'],
  ['S', 'M', 'L', 'XL', 'XXL'],
];

export default story({
  slug: 'segmented-control',
  name: 'Segmented Control',
  summary: 'Choose one of a few options',
  component: 'SegmentedControl',
  controls: {
    values: {
      type: 'preset',
      label: 'values',
      options: sets.map((values) => ({ label: String(values.length), props: { values, selectedIndex: 0 } })),
      default: 1,
    },
    tintColor: { type: 'color', detail: 'The selected thumb' },
    enabled: { type: 'boolean', default: true, fallback: true },
  },
  bindings: {
    selectedIndex: { handler: 'onChange', code: '(event) => setSelectedIndex(event.nativeEvent.selectedSegmentIndex)' },
  },
  render: ({ props, set }) => (
    <View style={styles.control}>
      <SegmentedControl
        values={props.values as string[]}
        selectedIndex={props.selectedIndex as number}
        tintColor={props.tintColor as string | undefined}
        enabled={Boolean(props.enabled)}
        onChange={(event) => set({ selectedIndex: event.nativeEvent.selectedSegmentIndex })}
      />
    </View>
  ),
  stage: { height: 160, photo: 'optional' },
  footer: 'Tap a segment, or drag the thumb across.',
});

const styles = StyleSheet.create({
  control: {
    alignSelf: 'stretch',
  },
});
