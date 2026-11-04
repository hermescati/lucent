import { GlassContainer, GlassView } from 'expo-lucent';
import { StyleSheet } from 'react-native';

import { Photo } from './Photo';
import type { Comparison } from './types';

// Three circles 12pt apart: apart below 12, blending from 12 up, merged by 48.
const Blobs = ({ spacing }: { spacing: number }) => (
  <GlassContainer spacing={spacing} style={styles.row}>
    <GlassView style={styles.blob} />
    <GlassView style={styles.blob} />
    <GlassView style={styles.blob} />
  </GlassContainer>
);

const Spacings = () => (
  <Photo>
    {[0, 12, 18, 24, 36, 48].map((spacing) => (
      <Blobs key={spacing} spacing={spacing} />
    ))}
  </Photo>
);

export default { slug: 'glass-container', pages: [Spacings] } satisfies Comparison;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12 },
  blob: { width: 64, height: 64, borderRadius: 32 },
});
