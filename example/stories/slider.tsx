import { Slider } from 'expo-lucent';
import { StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/components/ui';
import { story } from './types';

const Readout = ({ value, step }: { value: number; step: number }) => {
  const palette = usePalette();
  return (
    <Text style={[styles.readout, { color: palette.text }]}>{step >= 1 ? value.toFixed(0) : value.toFixed(2)}</Text>
  );
};

export default story({
  slug: 'slider',
  group: 'controls',
  name: 'Slider',
  summary: 'Pick a value from a range by dragging',
  component: 'Slider',
  controls: {
    range: {
      type: 'preset',
      label: 'min / max / step',
      options: [
        { label: '0–1', props: { value: 0.5, min: 0, max: 1, step: undefined } },
        { label: '0–1 by 0.1', props: { value: 0.5, min: 0, max: 1, step: 0.1 } },
        { label: '0–100 by 10', props: { value: 50, min: 0, max: 100, step: 10 } },
      ],
      default: 0,
      fallbacks: { min: 0, max: 1 },
    },
    disabled: { type: 'boolean', default: false, fallback: false },
  },
  bindings: { value: { handler: 'onValueChange' } },
  render: ({ props, set }) => (
    <>
      <Readout value={Number(props.value)} step={Number(props.step ?? 0)} />
      <View style={styles.control}>
        <Slider
          value={Number(props.value)}
          onValueChange={(value) => set({ value })}
          min={props.min as number}
          max={props.max as number}
          step={props.step as number | undefined}
          disabled={Boolean(props.disabled)}
        />
      </View>
    </>
  ),
  stage: { height: 180, photo: 'optional' },
  footer: 'With a step, the thumb snaps to each value as you drag.',
});

const styles = StyleSheet.create({
  control: {
    alignSelf: 'stretch',
  },
  readout: {
    fontSize: 34,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
