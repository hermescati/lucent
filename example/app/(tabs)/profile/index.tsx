import { Stack } from 'expo-lucent/navigation';

import { Page, Paragraph } from '@/components/ui';

// An extra tab for the tab bar story, shown when it asks for five tabs.
export default function ProfileScreen() {
  return (
    <Page>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Paragraph>An extra tab, to try the bar with four or five tabs. Components → Tab Bar sets how many.</Paragraph>
    </Page>
  );
}
