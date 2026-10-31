import { Stack } from 'expo-router';

import { useStackOptions } from '../../../components/ui';

export default function TabStack() {
  return <Stack screenOptions={useStackOptions()} />;
}
