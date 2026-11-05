import { Stack } from 'expo-lucent/navigation';

import { useSettings, type Minimize, type SearchPlacement, type TabCount } from '@/components/settings';
import { Code, LinkRow, Options, Page, Paragraph, Row, Section } from '@/components/ui';

export default function TabBarScreen() {
  const { tint, minimize, accessory, tabs, search, prominent, set } = useSettings();

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
          <Options<`${TabCount}`>
            options={(['1', '2', '3', '4', '5'] as const).map((value) => ({ label: value, value }))}
            value={`${tabs}`}
            onChange={(next) => {
              const count = Number(next) as TabCount;
              set(count === 5 && search === 'circle' ? { tabs: count, search: 'tab' } : { tabs: count });
            }}
          />
        </Row>
        <Row
          label="Search"
          detail='role="search": in a circle of its own while it activates its field (automaticallyActivatesSearch), a tab like the others when it does not'
          stacked>
          <Options<SearchPlacement>
            options={[
              { label: 'Off', value: 'off' },
              { label: 'Circle', value: 'circle' },
              { label: 'Tab', value: 'tab' },
            ]}
            value={search}
            onChange={(next) =>
              set(next === 'circle' ? { search: next, tabs: Math.min(tabs, 4) as TabCount } : { search: next })
            }
          />
        </Row>
        <Row
          label="prominent"
          detail="iOS 27 sets any one tab apart in a circle of its own, as an action. Search then joins the tabs"
          stacked>
          <Options<'off' | 'on'>
            options={[
              { label: 'None', value: 'off' },
              { label: 'Profile', value: 'on' },
            ]}
            value={prominent ? 'on' : 'off'}
            onChange={(next) => set({ prominent: next === 'on' })}
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
