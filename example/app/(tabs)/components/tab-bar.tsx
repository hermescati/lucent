import { Stack } from 'expo-lucent/navigation';

import { useSettings, type Minimize } from '@/components/settings';
import { Code, LinkRow, Options, Page, Paragraph, Row, Section } from '@/components/ui';

export default function TabBarScreen() {
  const { tint, minimize, accessory, tabs, searchApart, set } = useSettings();

  return (
    <Page>
      <Stack.Screen options={{ title: 'Tab Bar' }} />
      <Paragraph>
        This app runs inside NativeTabs, so the bar at the bottom is the demo. The props below change it live.
      </Paragraph>

      <Section title="Props">
        <Row
          label="Tabs"
          detail="Besides search. iPhone fits five entries, search's circle included: with five tabs, search becomes one of them"
          stacked>
          <Options<'2' | '3' | '4' | '5'>
            options={[
              { label: '2', value: '2' },
              { label: '3', value: '3' },
              { label: '4', value: '4' },
              { label: '5', value: '5' },
            ]}
            value={String(tabs) as '2' | '3' | '4' | '5'}
            onChange={(next) => {
              const count = Number(next) as 2 | 3 | 4 | 5;
              set(count === 5 ? { tabs: count, searchApart: false } : { tabs: count });
            }}
          />
        </Row>
        <Row
          label="Search"
          detail='role="search" puts it in a circle of its own; without it, it is a tab like the others'
          stacked>
          <Options<'apart' | 'tab'>
            options={[
              { label: 'Own circle', value: 'apart' },
              { label: 'A tab', value: 'tab' },
            ]}
            value={searchApart ? 'apart' : 'tab'}
            onChange={(next) =>
              set(
                next === 'apart' ? { searchApart: true, tabs: Math.min(tabs, 4) as 2 | 3 | 4 } : { searchApart: false },
              )
            }
          />
        </Row>
        <Row label="BottomAccessory" detail="A now-playing bar above the tabs, beside them once minimized" stacked>
          <Options<'off' | 'on'>
            options={[
              { label: 'None', value: 'off' },
              { label: 'Now playing', value: 'on' },
            ]}
            value={accessory ? 'on' : 'off'}
            onChange={(next) => set({ accessory: next === 'on' })}
          />
        </Row>
        <Row label="minimizeBehavior" detail="Scroll the Gallery to see it" stacked last>
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
    <NativeTabs.Trigger.Label>Gallery</NativeTabs.Trigger.Label>
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
