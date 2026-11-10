import { FieldGroup, List } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';

import { LinkItem } from '@/components/ui';
import { catalogue } from '@/stories';

const about =
  "Every component in Lucent, live. Open one to change its props and see the code for what you set. On iOS these are Apple's own components; on Android they are Lucent's recreation.";

export default function ComponentsScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Components' }} />
      <List>
        {catalogue.map(({ title, entries }, index) => (
          <FieldGroup.Section key={title} title={title}>
            {entries.map((entry) => (
              <LinkItem key={entry.name} href={entry.href} label={entry.name} detail={entry.summary} />
            ))}
            {index === catalogue.length - 1 ? <FieldGroup.SectionFooter>{about}</FieldGroup.SectionFooter> : null}
          </FieldGroup.Section>
        ))}
      </List>
    </>
  );
}
