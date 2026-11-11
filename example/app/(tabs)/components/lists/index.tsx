import { FieldGroup, List } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';

import { listHref, listModes } from '@/components/lists';
import { LinkItem } from '@/components/ui';

const about =
  "List, ListItem and FieldGroup, a screen each, as iOS 27 draws them. On iOS these are SwiftUI's List and Form; on Android they are Lucent's recreation.";

export default function ListsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Lists' }} />
      <List>
        <FieldGroup.Section>
          {listModes.map((mode) => (
            <LinkItem key={mode.slug} href={listHref(mode)} label={mode.name} detail={mode.summary} />
          ))}
          <FieldGroup.SectionFooter>{about}</FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </List>
    </>
  );
}
