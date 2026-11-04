import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

// Black and white stripes under the bars, for measuring how the glass's edge bends what's behind it:
// lucent-example://components/stripes/h8 (horizontal, 8pt period) or v8 (vertical).
export default function StripesScreen() {
  const { spec = 'h8' } = useLocalSearchParams<{ spec: string }>();
  const vertical = spec.startsWith('v');
  const period = Math.max(2, Number(spec.slice(1)) || 8);
  const count = Math.ceil(1200 / period);
  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      <View
        style={{ flex: 1, flexDirection: vertical ? 'row' : 'column', backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
        {Array.from({ length: count }, (_, i) => (
          <View
            key={i}
            style={{
              [vertical ? 'width' : 'height']: period / 2,
              [vertical ? 'marginRight' : 'marginBottom']: period / 2,
              backgroundColor: '#000000',
              ...(vertical ? { height: '100%' } : { width: '100%' }),
            }}
          />
        ))}
      </View>
    </>
  );
}
