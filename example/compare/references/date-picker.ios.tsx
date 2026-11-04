import { DatePicker, Form, Host, Section } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

// A fixed date, so every capture shows the same month and time.
const date = new Date(2026, 10, 2, 9, 41);

// Compact pickers in a form: a date, a time, and both.
const Compact = () => (
  <Fill>
    <Form>
      <Section title="Compact">
        <DatePicker title="Date" selection={date} displayedComponents={['date']} />
        <DatePicker title="Time" selection={date} displayedComponents={['hourAndMinute']} />
        <DatePicker title="Date and time" selection={date} displayedComponents={['date', 'hourAndMinute']} />
      </Section>
    </Form>
  </Fill>
);

const Graphical = () => (
  <Host matchContents>
    <DatePicker selection={date} displayedComponents={['date']} modifiers={[datePickerStyle('graphical')]} />
  </Host>
);

const Wheel = () => (
  <Host matchContents>
    <DatePicker
      selection={date}
      displayedComponents={['date', 'hourAndMinute']}
      modifiers={[datePickerStyle('wheel')]}
    />
  </Host>
);

export default {
  slug: 'date-picker',
  pages: [filled(Compact), Graphical, Wheel],
  reference: true,
} satisfies Comparison;
