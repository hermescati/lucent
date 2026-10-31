import { GlassContainer, GlassView } from 'expo-lucent';
import { StyleSheet } from 'react-native';

import { story } from './types';

const blob = '<GlassView isInteractive style={{ width: 72, height: 72, borderRadius: 36 }} />';

export default story({
  slug: 'glass-container',
  name: 'Glass Container',
  summary: 'GlassContainer: glass shapes that blend together',
  component: 'GlassContainer',
  controls: {
    spacing: { type: 'number', default: 24, min: 0, max: 48, step: 1, unit: ' pt' },
    gap: { type: 'number', default: 12, min: 0, max: 48, step: 1, unit: ' pt', virtual: true },
  },
  render: ({ props }) => (
    <GlassContainer spacing={props.spacing as number} style={[styles.row, { gap: props.gap as number }]}>
      <GlassView isInteractive style={styles.blob} />
      <GlassView isInteractive style={styles.blob} />
      <GlassView isInteractive style={styles.blob} />
    </GlassContainer>
  ),
  code: (props) =>
    [
      `<GlassContainer spacing={${props.spacing}} style={{ flexDirection: 'row', gap: ${props.gap} }}>`,
      `  ${blob}`,
      `  ${blob}`,
      `  ${blob}`,
      '</GlassContainer>',
    ].join('\n'),
  stage: { height: 200, photo: 'always' },
  footer: 'Shapes blend once they are closer than spacing. gap is the row style, not a GlassContainer prop.',
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  blob: {
    width: 72,
    height: 72,
    borderRadius: 36,
  },
});
