import { Stack } from 'expo-router';

import { useSettings, type Badge, type Minimize } from '../../../components/settings';
import { Code, LinkRow, Options, Page, Paragraph, Row, Section } from '../../../components/ui';

export default function TabBarScreen() {
  const { tint, minimize, badge, set } = useSettings();

  return (
    <Page>
      <Stack.Screen options={{ title: 'Tab Bar' }} />
      <Paragraph>
        This app runs inside NativeTabs, so the bar at the bottom is the demo. The props below change it live.
      </Paragraph>

      <Section title="Props">
        <Row label="minimizeBehavior" detail="Scroll the Gallery to see it" stacked>
          <Options<Minimize>
            options={[
              { label: 'Never', value: 'never' },
              { label: 'Scroll down', value: 'onScrollDown' },
              { label: 'Scroll up', value: 'onScrollUp' },
            ]}
            value={minimize}
            onChange={(next) => set({ minimize: next })}
          />
        </Row>
        <Row label="Gallery badge" detail="NativeTabs.Trigger.Badge" stacked last>
          <Options<Badge>
            options={[
              { label: 'None', value: 'none' },
              { label: 'Dot', value: 'dot' },
              { label: '3', value: 'count' },
            ]}
            value={badge}
            onChange={(next) => set({ badge: next })}
          />
        </Row>
      </Section>

      <Section title="Try" footer="tintColor comes from the accent colour in Settings.">
        <Row label="Drag across the bar" detail="The lens follows your finger and lands on the tab you release on" />
        <Row label="Tap the current tab again" detail="Scrolls to the top, or pops back to the first screen" />
        <LinkRow href="/gallery" label="Open the Gallery" detail="Scroll it to minimize the bar" />
        <LinkRow href="/settings" label="Change the accent" detail="Settings → Accent" last />
      </Section>

      <Code>
        {`<NativeTabs tintColor="${tint}" minimizeBehavior="${minimize}">
  <NativeTabs.Trigger name="components">
    <NativeTabs.Trigger.Icon sf="square.grid.2x2" md="widgets" />
    <NativeTabs.Trigger.Label>Components</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="gallery">
    <NativeTabs.Trigger.Icon sf="photo.on.rectangle" md="photo_library" />
    <NativeTabs.Trigger.Label>Gallery</NativeTabs.Trigger.Label>${
      badge === 'count'
        ? '\n    <NativeTabs.Trigger.Badge>3</NativeTabs.Trigger.Badge>'
        : badge === 'dot'
          ? '\n    <NativeTabs.Trigger.Badge />'
          : ''
    }
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="search" role="search">
    <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
</NativeTabs>`}
      </Code>

      <Code>
        {`// In each tab screen: shrinks the bar on scroll and clears it at the bottom
<TabScrollView>{content}</TabScrollView>`}
      </Code>
    </Page>
  );
}
