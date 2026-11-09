import { Stack } from 'expo-lucent/navigation';

import { useStackOptions } from '@/components/ui';

export default function TabStack() {
  return <Stack screenOptions={useStackOptions()} />;
}
