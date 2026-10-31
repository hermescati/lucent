import { Switch } from 'expo-lucent';
import { useState } from 'react';

import { Row, Section } from '@/components/ui';
import { story } from './types';

const InAList = () => {
  const [wifi, setWifi] = useState(true);
  const [bluetooth, setBluetooth] = useState(false);
  return (
    <Section title="In a list">
      <Row label="Wi-Fi">
        <Switch value={wifi} onValueChange={setWifi} />
      </Row>
      <Row label="Bluetooth" last>
        <Switch value={bluetooth} onValueChange={setBluetooth} />
      </Row>
    </Section>
  );
};

export default story({
  slug: 'switch',
  name: 'Switch',
  summary: 'An on/off toggle with a glass thumb',
  component: 'Switch',
  controls: {
    value: { type: 'boolean', default: true },
    label: {
      type: 'select',
      detail: 'A label makes the switch a full-width row',
      options: [
        { label: 'None', value: undefined },
        { label: 'Airplane Mode', value: 'Airplane Mode' },
      ],
      default: 0,
    },
    disabled: { type: 'boolean', default: false, fallback: false },
  },
  bindings: { value: { handler: 'onValueChange' } },
  render: ({ props, set }) => (
    <Switch
      value={Boolean(props.value)}
      onValueChange={(value) => set({ value })}
      label={props.label as string | undefined}
      disabled={Boolean(props.disabled)}
    />
  ),
  stage: { height: 160, photo: 'optional' },
  footer: 'Tap the switch or drag its thumb. Hold it to see the lens.',
  extra: InAList,
});
