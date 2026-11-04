import { Stack } from 'expo-lucent/navigation';

import { toolbarGroups, toolbarModeHref, toolbarModes } from '@/components/toolbar';
import { LinkRow, Page, Paragraph, Section } from '@/components/ui';

export default function ToolbarScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Toolbar' }} />
      <Paragraph>
        Every look the iOS 26 bottom toolbar takes in Apple&apos;s apps, one screen each. As in Apple&apos;s apps, the
        tab bar hides on them: in a tab, iOS draws the tab bar over the toolbar, and Lucent does the same.
      </Paragraph>
      {toolbarGroups.map((group) => {
        const inGroup = toolbarModes.filter((mode) => mode.group === group.key);
        return (
          <Section key={group.key} title={group.title}>
            {inGroup.map((mode, index) => (
              <LinkRow
                key={mode.slug}
                href={toolbarModeHref(mode)}
                label={mode.name}
                detail={mode.summary}
                last={index === inGroup.length - 1}
              />
            ))}
          </Section>
        );
      })}
    </Page>
  );
}
