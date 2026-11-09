import { Stepper } from 'expo-lucent';
import { useState } from 'react';

import { Row, Section } from '@/components/ui';
import { story } from './types';

const InAList = () => {
  const [guests, setGuests] = useState(2);
  const [nights, setNights] = useState(1);
  return (
    <Section title="In a list">
      <Row label={`Guests: ${guests}`}>
        <Stepper value={guests} min={1} max={8} onValueChange={setGuests} />
      </Row>
      <Row label={`Nights: ${nights}`} last>
        <Stepper value={nights} min={1} max={14} onValueChange={setNights} />
      </Row>
    </Section>
  );
};

export default story({
  slug: 'stepper',
  group: 'controls',
  name: 'Stepper',
  summary: 'Minus and plus buttons that step a value',
  component: 'Stepper',
  controls: {
    value: { type: 'number', default: 3, min: 0, max: 10, step: 1 },
    range: {
      type: 'preset',
      label: 'min / max / step',
      options: [
        { label: '0–10', props: { min: 0, max: 10, step: undefined } },
        { label: '0–100 by 5', props: { min: 0, max: 100, step: 5 } },
      ],
      default: 0,
      fallbacks: { min: 0, max: 100 },
    },
    label: {
      type: 'select',
      detail: 'A label makes the stepper a full-width row',
      options: [
        { label: 'None', value: undefined },
        { label: 'Quantity', value: 'Quantity' },
      ],
      default: 0,
    },
    disabled: { type: 'boolean', default: false, fallback: false },
  },
  bindings: { value: { handler: 'onValueChange' } },
  render: ({ props, set }) => (
    <Stepper
      value={Number(props.value)}
      onValueChange={(value) => set({ value })}
      min={props.min as number | undefined}
      max={props.max as number | undefined}
      step={props.step as number | undefined}
      label={props.label ? `${String(props.label)}: ${String(props.value)}` : undefined}
      disabled={Boolean(props.disabled)}
    />
  ),
  stage: { height: 160 },
  footer: 'Tap a side to step, or hold it to keep stepping. Each side greys out at its end.',
  extra: InAList,
});
