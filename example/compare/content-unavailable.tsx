import { Button, ContentUnavailableView } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import type { Comparison } from './types';

const none = () => {};

// The empty state with everything: a symbol, a title, a description and an action, in a box it centres itself in.
const Empty = () => (
  <View style={styles.box}>
    <ContentUnavailableView
      title="No Messages"
      sf="tray"
      md="inbox"
      description="Messages you receive appear here."
      actions={<Button label="Refresh" onPress={none} />}
    />
  </View>
);

// A title and description alone, as search shows when nothing matches.
const TextOnly = () => (
  <View style={styles.box}>
    <ContentUnavailableView title="No Results" description="Check the spelling or try a new search." />
  </View>
);

export default { slug: 'content-unavailable', pages: [Empty, TextOnly] } satisfies Comparison;

const styles = StyleSheet.create({
  box: { height: 480 },
});
