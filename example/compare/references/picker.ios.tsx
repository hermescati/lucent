import { Form, Host, Picker, Section, Text, VStack } from '@expo/ui/swift-ui';
import { pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

const flavours = ['Vanilla', 'Chocolate', 'Strawberry'];

const Options = () =>
  flavours.map((flavour) => (
    <Text key={flavour} modifiers={[tag(flavour)]}>
      {flavour}
    </Text>
  ));

// The menu picker in a form row, and the inline one, which lists its options as checkmark rows.
const InForm = () => (
  <Fill>
    <Form>
      <Section title="Menu">
        <Picker label="Flavour" selection="Chocolate" modifiers={[pickerStyle('menu')]}>
          <Options />
        </Picker>
      </Section>
      <Section title="Inline">
        <Picker label="Flavour" selection="Chocolate" modifiers={[pickerStyle('inline')]}>
          <Options />
        </Picker>
      </Section>
    </Form>
  </Fill>
);

// The wheel, and the palette, which draws its options as a row of buttons.
const Standalone = () => (
  <Host matchContents>
    <VStack spacing={24}>
      <Picker selection="Chocolate" modifiers={[pickerStyle('wheel')]}>
        <Options />
      </Picker>
      <Picker selection="Chocolate" modifiers={[pickerStyle('palette')]}>
        <Options />
      </Picker>
    </VStack>
  </Host>
);

export default { slug: 'picker', pages: [filled(InForm), Standalone], reference: true } satisfies Comparison;
