import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

// A flat colour under the bars, for measuring how much of what's behind them the glass lets through:
// lucent-example://components/backdrop/000000
export default function BackdropScreen() {
  const { color } = useLocalSearchParams<{ color: string }>();
  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      <View style={{ flex: 1, backgroundColor: `#${color}` }} />
    </>
  );
}
