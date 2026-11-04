// TEMP: iOS reference for Lucent's Button. Remove before committing.
import { Host, HStack, Button as SwiftButton } from '@expo/ui/swift-ui';
import { buttonBorderShape, buttonStyle, controlSize, disabled, labelStyle } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { Image, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

type Style = 'borderedProminent' | 'bordered' | 'plain' | 'glass' | 'glassProminent';
const styles_: Style[] = ['borderedProminent', 'bordered', 'plain', 'glass', 'glassProminent'];
const sizes = ['small', 'regular', 'large'] as const;

const Row = ({ style, role, off }: { style: Style; role?: 'destructive'; off?: boolean }) => (
  <Host matchContents>
    <HStack spacing={12}>
      {sizes.map((size) => (
        <SwiftButton
          key={size}
          label="Button"
          role={role}
          onPress={() => {}}
          modifiers={[buttonStyle(style), controlSize(size), ...(off ? [disabled(true)] : [])]}
        />
      ))}
      <SwiftButton
        label="Add"
        systemImage="plus"
        role={role}
        onPress={() => {}}
        modifiers={[
          buttonStyle(style),
          controlSize('large'),
          labelStyle('iconOnly'),
          buttonBorderShape('circle'),
          ...(off ? [disabled(true)] : []),
        ]}
      />
    </HStack>
  </Host>
);

const IconRow = ({ style }: { style: Style }) => (
  <Host matchContents>
    <HStack spacing={12}>
      <SwiftButton label="Edit" systemImage="pencil" onPress={() => {}} modifiers={[buttonStyle(style)]} />
      <SwiftButton
        label="Share"
        systemImage="square.and.arrow.up"
        onPress={() => {}}
        modifiers={[buttonStyle(style), controlSize('large')]}
      />
    </HStack>
  </Host>
);

// Icon-only circles and icon + label at every size, for measuring.
const Sizes = ({ dark }: { dark: boolean }) => (
  <View style={{ flex: 1, backgroundColor: dark ? '#000' : '#F2F2F7', padding: 16, paddingTop: 230, gap: 16 }}>
    {(['borderedProminent', 'bordered', 'glass'] as Style[]).map((style) => (
      <Host key={style} matchContents>
        <HStack spacing={12}>
          {sizes.map((size) => (
            <SwiftButton
              key={size}
              label="Add"
              systemImage="plus"
              onPress={() => {}}
              modifiers={[buttonStyle(style), controlSize(size), labelStyle('iconOnly'), buttonBorderShape('circle')]}
            />
          ))}
          {sizes.map((size) => (
            <SwiftButton
              key={`${size}-label`}
              label="Edit"
              systemImage="pencil"
              onPress={() => {}}
              modifiers={[buttonStyle(style), controlSize(size)]}
            />
          ))}
        </HStack>
      </Host>
    ))}
  </View>
);

export default function ButtonReference() {
  const dark = useColorScheme() === 'dark';
  const part = useLocalSearchParams<{ part?: string }>().part;
  const second = part === '2';
  if (part === '3') {
    return <Sizes dark={dark} />;
  }
  const label = { color: dark ? '#8E8E93' : '#6C6C70', fontSize: 12, marginTop: 14, marginBottom: 6 };
  return (
    <ScrollView
      style={{ backgroundColor: dark ? '#000' : '#F2F2F7' }}
      contentContainerStyle={{ padding: 16, paddingTop: 110, paddingBottom: 140 }}>
      <Stack.Screen options={{ title: 'Button reference' }} />
      {second
        ? null
        : styles_.map((style) => (
            <View key={style}>
              <Text style={label}>{style}</Text>
              <Row style={style} />
            </View>
          ))}
      {second ? null : <Text style={label}>glassProminent + icon · bordered + icon</Text>}
      {second ? null : <IconRow style="glassProminent" />}
      {second ? null : <View style={{ height: 8 }} />}
      {second ? <IconRow style="bordered" /> : null}
      <Text style={label}>destructive: borderedProminent · bordered · glassProminent</Text>
      <Row style="borderedProminent" role="destructive" />
      <View style={{ height: 8 }} />
      <Row style="bordered" role="destructive" />
      <View style={{ height: 8 }} />
      <Row style="glassProminent" role="destructive" />
      <Text style={label}>disabled: borderedProminent · glass</Text>
      <Row style="borderedProminent" off />
      <View style={{ height: 8 }} />
      <Row style="glass" off />
      <Text style={label}>over a photo: glass · glassProminent</Text>
      <View style={styles.photo}>
        <Image source={require('@/assets/backdrop.jpg')} style={StyleSheet.absoluteFill} />
        <Row style="glass" />
        <View style={{ height: 12 }} />
        <Row style="glassProminent" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  photo: { borderRadius: 24, overflow: 'hidden', padding: 16, alignItems: 'flex-start' },
});
