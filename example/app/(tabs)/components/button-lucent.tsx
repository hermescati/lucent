// TEMP: Lucent's Button laid out like button-ref, to compare. Remove before committing.
import { Button, type ButtonVariant } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

const variants: ButtonVariant[] = ['filled', 'outlined', 'text', 'glass', 'glassProminent'];
const sizes = ['small', 'regular', 'large'] as const;

const Row = ({ variant, destructive, off }: { variant: ButtonVariant; destructive?: boolean; off?: boolean }) => (
  <View style={styles.row}>
    {sizes.map((size) => (
      <Button key={size} label="Button" variant={variant} size={size} destructive={destructive} disabled={off} />
    ))}
    <Button
      icon={{ sf: 'plus', md: 'add' }}
      accessibilityLabel="Add"
      variant={variant}
      size="large"
      destructive={destructive}
      disabled={off}
    />
  </View>
);

export default function ButtonLucent() {
  const dark = useColorScheme() === 'dark';
  const second = useLocalSearchParams<{ part?: string }>().part === '2';
  const label = { color: dark ? '#8E8E93' : '#6C6C70', fontSize: 12, marginTop: 14, marginBottom: 6 };
  return (
    <ScrollView
      style={{ backgroundColor: dark ? '#000' : '#F2F2F7' }}
      contentContainerStyle={{ padding: 16, paddingTop: 110, paddingBottom: 140 }}>
      <Stack.Screen options={{ title: 'Lucent Button' }} />
      {second
        ? null
        : variants.map((variant) => (
            <View key={variant}>
              <Text style={label}>{variant}</Text>
              <Row variant={variant} />
            </View>
          ))}
      {second ? null : <Text style={label}>glassProminent + icon · outlined + icon</Text>}
      <View style={styles.row}>
        <Button label="Edit" icon={{ sf: 'pencil', md: 'edit' }} variant={second ? 'outlined' : 'glassProminent'} />
        <Button
          label="Share"
          icon={{ sf: 'square.and.arrow.up', md: 'share' }}
          variant={second ? 'outlined' : 'glassProminent'}
          size="large"
        />
      </View>
      <Text style={label}>destructive: filled · outlined · glassProminent</Text>
      <Row variant="filled" destructive />
      <View style={{ height: 8 }} />
      <Row variant="outlined" destructive />
      <View style={{ height: 8 }} />
      <Row variant="glassProminent" destructive />
      <Text style={label}>disabled: filled · glass</Text>
      <Row variant="filled" off />
      <View style={{ height: 8 }} />
      <Row variant="glass" off />
      <Text style={label}>over a photo: glass · glassProminent</Text>
      <View style={styles.photo}>
        <Image source={require('@/assets/backdrop.jpg')} style={StyleSheet.absoluteFill} />
        <Row variant="glass" />
        <View style={{ height: 12 }} />
        <Row variant="glassProminent" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photo: { borderRadius: 24, overflow: 'hidden', padding: 16, alignItems: 'flex-start' },
});
