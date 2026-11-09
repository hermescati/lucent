import { Stack } from 'expo-lucent/navigation';

import { useStackOptions } from '@/components/ui';

/**
 * A stack outside the tabs, for the stories that look different there: with no tab bar, iOS 26 puts a screen's search
 * at the bottom of an iPhone, where in a tab it goes up into the navigation bar. Its screens are the stack's first, so
 * they have no back button: swipe back, or use Back, to return to the tabs.
 */
export default function StandaloneStack() {
  return <Stack screenOptions={useStackOptions()} />;
}
