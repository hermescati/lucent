import { Button, List, NavigationStack, Section, Text, Toolbar, ToolbarItem } from '@expo/ui/swift-ui';
import { labelStyle, navigationBarTitleDisplayMode, navigationTitle } from '@expo/ui/swift-ui/modifiers';
import type { SFSymbol } from 'expo-symbols';

import { Fill } from './Fill';
import { filled, type Comparison } from '../types';

const none = () => {};

// Bar buttons are icons; the label names them for VoiceOver, and a button without one draws nothing.
const BarButton = ({ label, icon }: { label: string; icon: SFSymbol }) => (
  <Button label={label} systemImage={icon} onPress={none} modifiers={[labelStyle('iconOnly')]} />
);

const Content = () => (
  <List>
    <Section title="Section">
      {['First', 'Second', 'Third', 'Fourth'].map((row) => (
        <Text key={row}>{row} row</Text>
      ))}
    </Section>
  </List>
);

// A navigation bar with glass bar buttons on each side: the large title, then the inline one.
const Bar = ({ mode }: { mode: 'large' | 'inline' }) => (
  <Fill>
    <NavigationStack>
      <Toolbar modifiers={[navigationTitle('Title'), navigationBarTitleDisplayMode(mode)]}>
        <Content />
        <Toolbar.Content>
          <ToolbarItem placement="topBarLeading">
            <BarButton label="Back" icon="chevron.left" />
          </ToolbarItem>
          <ToolbarItem placement="topBarTrailing">
            <BarButton label="Share" icon="square.and.arrow.up" />
          </ToolbarItem>
          <ToolbarItem placement="topBarTrailing">
            <BarButton label="More" icon="ellipsis" />
          </ToolbarItem>
        </Toolbar.Content>
      </Toolbar>
    </NavigationStack>
  </Fill>
);

const Large = () => <Bar mode="large" />;
const Inline = () => <Bar mode="inline" />;

export default {
  slug: 'navigation-swiftui',
  pages: [filled(Large), filled(Inline)],
  reference: true,
} satisfies Comparison;
