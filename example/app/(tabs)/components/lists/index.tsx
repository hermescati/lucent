import { Stack } from 'expo-lucent/navigation';

import { listHref, listModes } from '@/components/lists';
import { LinkRow, Page, Paragraph, Section } from '@/components/ui';

export default function ListsScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Lists' }} />
      <Paragraph>
        List, ListItem and FieldGroup, a screen each, as iOS 26 draws them. On iOS these are SwiftUI&apos;s List and
        Form; on Android they are Lucent&apos;s recreation.
      </Paragraph>
      <Section>
        {listModes.map((mode, index) => (
          <LinkRow
            key={mode.slug}
            href={listHref(mode)}
            label={mode.name}
            detail={mode.summary}
            last={index === listModes.length - 1}
          />
        ))}
      </Section>
    </Page>
  );
}
