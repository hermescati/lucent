import { Stack } from 'expo-lucent/navigation';

import { groups, modeHref, modes } from '@/components/navigation-bar';
import { LinkRow, Page, Paragraph, Section } from '@/components/ui';

export default function NavigationBarScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Navigation Bar' }} />
      <Paragraph>
        Every look the iOS 26 navigation bar takes in Apple&apos;s apps, one screen each. Each says where Apple uses it,
        what UIKit sets for it and how far Lucent gets, so you can hold it up against the Apple app.
      </Paragraph>
      {groups.map((group) => {
        const inGroup = modes.filter((mode) => mode.group === group.key);
        return (
          <Section key={group.key} title={group.title}>
            {inGroup.map((mode, index) => (
              <LinkRow
                key={mode.slug}
                href={modeHref(mode)}
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
