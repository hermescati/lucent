import { Switch } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import { Photo } from './Photo';
import type { Comparison } from './types';

const none = () => {};

const Pair = ({ disabled }: { disabled?: boolean }) => (
  <View style={styles.row}>
    <Switch value onValueChange={none} disabled={disabled} />
    <Switch value={false} onValueChange={none} disabled={disabled} />
  </View>
);

// On and off, enabled and disabled; as a labelled row; and over the photo.
const States = () => (
  <>
    <Pair />
    <Pair disabled />
    <Switch label="Airplane Mode" value onValueChange={none} />
    <Switch label="Airplane Mode" value={false} onValueChange={none} />
    <Photo>
      <Pair />
      <Pair disabled />
    </Photo>
  </>
);

export default { slug: 'switch', pages: [States] } satisfies Comparison;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 24 },
});
