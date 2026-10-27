import { Stack } from 'expo-router';
import { LucentProvider } from 'expo-lucent';

export default function RootLayout() {
  return (
    <LucentProvider tintColor="#FF8433">
      <Stack screenOptions={{ headerShown: false }} />
    </LucentProvider>
  );
}
