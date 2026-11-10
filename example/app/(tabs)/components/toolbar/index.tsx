import { FieldGroup, List } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';

import { toolbarGroups, toolbarModeHref, toolbarModes } from '@/components/toolbar';
import { LinkItem } from '@/components/ui';

const about =
  "Every look the iOS 26 bottom toolbar takes in Apple's apps, one screen each. As in Apple's apps, the tab bar hides on them: in a tab, iOS draws the tab bar over the toolbar, and Lucent does the same.";

export default function ToolbarScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Toolbar' }} />
      <List>
        {toolbarGroups.map((group, index) => (
          <FieldGroup.Section key={group.key} title={group.title}>
            {toolbarModes
              .filter((mode) => mode.group === group.key)
              .map((mode) => (
                <LinkItem key={mode.slug} href={toolbarModeHref(mode)} label={mode.name} detail={mode.summary} />
              ))}
            {index === toolbarGroups.length - 1 ? <FieldGroup.SectionFooter>{about}</FieldGroup.SectionFooter> : null}
          </FieldGroup.Section>
        ))}
      </List>
    </>
  );
}
