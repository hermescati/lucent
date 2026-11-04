import { ColorPicker, Form, Section } from '@expo/ui/swift-ui';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

const none = () => {};

// The colour well in a form row; it opens the system colour sheet on tap.
const Wells = () => (
  <Fill>
    <Form>
      <Section title="Color picker">
        <ColorPicker label="Accent" selection="#0A84FF" onSelectionChange={none} />
        <ColorPicker label="With opacity" selection="#FF375F99" supportsOpacity onSelectionChange={none} />
      </Section>
    </Form>
  </Fill>
);

export default { slug: 'color-picker', pages: [filled(Wells)], reference: true } satisfies Comparison;
