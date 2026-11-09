import {
  DisclosureGroup,
  Form,
  LabeledContent,
  List,
  NavigationLink,
  NavigationStack,
  Section,
  Text,
  Toggle,
} from '@expo/ui/swift-ui';
import { listStyle } from '@expo/ui/swift-ui/modifiers';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

const none = () => {};

// The settings-style form: value rows, a toggle, navigation rows with chevrons, a footer and a disclosure group.
const Settings = () => (
  <Fill>
    <NavigationStack>
      <Form>
        <Section title="General" footer={<Text>Section footers explain the rows above.</Text>}>
          <LabeledContent label="Version">
            <Text>26.1</Text>
          </LabeledContent>
          <Toggle label="Airplane Mode" isOn onIsOnChange={none} />
          <NavigationLink value="wifi">
            <Text>Wi-Fi</Text>
          </NavigationLink>
          <NavigationLink value="bluetooth">
            <Text>Bluetooth</Text>
          </NavigationLink>
        </Section>
        <Section title="Disclosure">
          <DisclosureGroup label="Advanced" isExpanded>
            <Text>Hidden until expanded</Text>
            <Text>A second row</Text>
          </DisclosureGroup>
        </Section>
      </Form>
    </NavigationStack>
  </Fill>
);

const Rows = () => (
  <Section title="Section">
    <Text>First row</Text>
    <Text>Second row</Text>
    <Text>Third row</Text>
  </Section>
);

// The plain list style, edge to edge.
const Plain = () => (
  <Fill>
    <List modifiers={[listStyle('plain')]}>
      <Rows />
    </List>
  </Fill>
);

// The grouped style: full-width sections.
const Grouped = () => (
  <Fill>
    <List modifiers={[listStyle('grouped')]}>
      <Rows />
    </List>
  </Fill>
);

export default {
  slug: 'list',
  pages: [filled(Settings), filled(Plain), filled(Grouped)],
  reference: true,
} satisfies Comparison;
