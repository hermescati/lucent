import { ProgressView } from 'expo-lucent';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Section } from '@/components/ui';
import { story } from './types';

// A download that fills over a few seconds and starts again.
const Download = () => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setValue((current) => (current >= 1 ? 0 : Math.min(1, current + 0.05))), 150);
    return () => clearInterval(id);
  }, []);
  return (
    <Section title="Live">
      <View style={styles.live}>
        <ProgressView value={value} label="Downloading" />
      </View>
    </Section>
  );
};

export default story({
  slug: 'progress-view',
  group: 'views',
  name: 'Progress View',
  summary: 'A spinner, or a bar for how far along',
  component: 'ProgressView',
  controls: {
    value: {
      type: 'select',
      detail: 'Without a value, a spinner',
      options: [
        { label: 'None', value: undefined },
        { label: '0.3', value: 0.3 },
        { label: '0.7', value: 0.7 },
        { label: '1', value: 1 },
      ],
      default: 0,
    },
    label: {
      type: 'select',
      options: [
        { label: 'None', value: undefined },
        { label: 'Loading', value: 'Loading' },
      ],
      default: 0,
    },
    tintColor: { type: 'color' },
  },
  render: ({ props }) => (
    <View style={styles.stage}>
      <ProgressView
        value={props.value as number | undefined}
        label={props.label as string | undefined}
        tintColor={props.tintColor as string | undefined}
      />
    </View>
  ),
  stage: { height: 160 },
  extra: Download,
});

const styles = StyleSheet.create({
  stage: { alignSelf: 'stretch', alignItems: 'center', paddingHorizontal: 24 },
  live: { padding: 16 },
});
