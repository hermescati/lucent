import { Stack } from 'expo-lucent/navigation';
import { View } from 'react-native';

/** The screen under every comparison page; its title is what a back button shows. */
export default function CompareIndex() {
  return (
    <>
      <Stack.Screen options={{ title: 'Compare' }} />
      <View />
    </>
  );
}
