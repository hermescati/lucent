import { FieldGroup, List } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';

import { groups, modeHref, modes } from '@/components/navigation-bar';
import { LinkItem } from '@/components/ui';

const about =
  "Every look the iOS 26 navigation bar takes in Apple's apps, one screen each. Each says where Apple uses it, what UIKit sets for it and how far Lucent gets, so you can hold it up against the Apple app.";

export default function NavigationBarScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Navigation Bar' }} />
      <List>
        {groups.map((group, index) => (
          <FieldGroup.Section key={group.key} title={group.title}>
            {modes
              .filter((mode) => mode.group === group.key)
              .map((mode) => (
                <LinkItem key={mode.slug} href={modeHref(mode)} label={mode.name} detail={mode.summary} />
              ))}
            {index === groups.length - 1 ? <FieldGroup.SectionFooter>{about}</FieldGroup.SectionFooter> : null}
          </FieldGroup.Section>
        ))}
      </List>
    </>
  );
}
