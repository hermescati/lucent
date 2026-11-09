import { GlassView, type GlassViewProps } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import { Photo } from './Photo';
import type { Comparison } from './types';

const styles_: GlassViewProps['glassEffectStyle'][] = ['regular', 'clear', 'none'];

const Shapes = ({ glass, tint }: { glass: GlassViewProps['glassEffectStyle']; tint?: string }) => (
  <View style={styles.row}>
    <GlassView glassEffectStyle={glass} tintColor={tint} style={styles.capsule} />
    <GlassView glassEffectStyle={glass} tintColor={tint} style={styles.circle} />
    <GlassView glassEffectStyle={glass} tintColor={tint} style={styles.card} />
  </View>
);

// Each style over the photo, then tinted.
const OverPhoto = () => (
  <Photo>
    {styles_.map((glass) => (
      <Shapes key={String(glass)} glass={glass} />
    ))}
    <Shapes glass="regular" tint="#0A84FF55" />
    <Shapes glass="clear" tint="#FF375F55" />
  </Photo>
);

// The same on the plain page background, where glass has only flat colour to bend.
const OverPage = () => (
  <>
    {styles_.map((glass) => (
      <Shapes key={String(glass)} glass={glass} />
    ))}
    <Shapes glass="regular" tint="#0A84FF55" />
    <Shapes glass="clear" tint="#FF375F55" />
  </>
);

export default { slug: 'glass', pages: [OverPhoto, OverPage] } satisfies Comparison;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  capsule: { width: 140, height: 56, borderRadius: 28 },
  circle: { width: 56, height: 56, borderRadius: 28 },
  card: { width: 90, height: 90, borderRadius: 24 },
});
