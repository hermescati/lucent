import { Stack } from 'expo-lucent/navigation';

import { LinkRow, Page, Paragraph, Section } from '@/components/ui';
import { catalogue } from '@/stories';

export default function ComponentsScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Components' }} />
      <Paragraph>
        Every component in Lucent, live. Open one to change its props and see the code for what you set. On iOS these
        are Apple&apos;s own components; on Android they are Lucent&apos;s recreation.
      </Paragraph>
      {catalogue.map(({ title, entries }) => (
        <Section key={title} title={title}>
          {entries.map((entry, index) => (
            <LinkRow
              key={entry.name}
              href={entry.href}
              label={entry.name}
              detail={entry.summary}
              last={index === entries.length - 1}
            />
          ))}
        </Section>
      ))}
    </Page>
  );
}
