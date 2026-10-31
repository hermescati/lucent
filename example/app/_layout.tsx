import { Stack } from 'expo-router';

import { PlaygroundProvider } from '../components/settings';

export default function RootLayout() {
  return (
    <PlaygroundProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </PlaygroundProvider>
  );
}
