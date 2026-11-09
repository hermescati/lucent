import { ProgressView } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import type { Comparison } from './types';

// The spinner, with and without a label; bars along the way; and a bar with a label.
const States = () => (
  <>
    <View style={styles.spinners}>
      <ProgressView />
      <ProgressView label="Loading" />
    </View>
    {[0, 0.3, 0.7, 1].map((value) => (
      <ProgressView key={value} value={value} />
    ))}
    <ProgressView value={0.45} label="Downloading" />
  </>
);

export default { slug: 'progress-view', pages: [States] } satisfies Comparison;

const styles = StyleSheet.create({
  spinners: { flexDirection: 'row', alignItems: 'flex-start', gap: 40 },
});
