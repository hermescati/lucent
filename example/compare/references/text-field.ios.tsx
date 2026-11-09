import { Form, Host, SecureField, Section, TextField, VStack } from '@expo/ui/swift-ui';
import { textFieldStyle } from '@expo/ui/swift-ui/modifiers';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

// Fields in form rows, where they draw no border of their own.
const InForm = () => (
  <Fill>
    <Form>
      <Section title="Account">
        <TextField placeholder="Name" />
        <TextField placeholder="Email" />
        <SecureField placeholder="Password" />
      </Section>
      <Section title="Notes">
        <TextField placeholder="Multiple lines" axis="vertical" />
      </Section>
    </Form>
  </Fill>
);

// Outside a form: the rounded border style and the plain one.
const Standalone = () => (
  <Host matchContents>
    <VStack spacing={16}>
      <TextField placeholder="Rounded border" modifiers={[textFieldStyle('roundedBorder')]} />
      <TextField placeholder="Plain" modifiers={[textFieldStyle('plain')]} />
      <SecureField placeholder="Password" modifiers={[textFieldStyle('roundedBorder')]} />
    </VStack>
  </Host>
);

export default { slug: 'text-field', pages: [filled(InForm), Standalone], reference: true } satisfies Comparison;
