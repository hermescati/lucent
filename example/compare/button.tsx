import { Button, type ButtonVariant } from 'expo-lucent';
import { Image, StyleSheet, View } from 'react-native';

import type { Comparison } from './types';

const variants: ButtonVariant[] = ['filled', 'outlined', 'text', 'glass', 'glassProminent'];
const sizes = ['small', 'regular', 'large'] as const;

const Row = ({
  variant,
  destructive,
  disabled,
}: {
  variant: ButtonVariant;
  destructive?: boolean;
  disabled?: boolean;
}) => (
  <View style={styles.row}>
    {sizes.map((size) => (
      <Button key={size} label="Button" variant={variant} size={size} destructive={destructive} disabled={disabled} />
    ))}
    <Button
      icon={{ sf: 'plus', md: 'add' }}
      accessibilityLabel="Add"
      variant={variant}
      size="large"
      destructive={destructive}
      disabled={disabled}
    />
  </View>
);

// Every style at every size, then icons with labels.
const Styles = () => (
  <>
    {variants.map((variant) => (
      <Row key={variant} variant={variant} />
    ))}
    {(['filled', 'outlined', 'glass'] as const).map((variant) => (
      <View key={variant} style={styles.row}>
        <Button label="Edit" icon={{ sf: 'pencil', md: 'edit' }} variant={variant} size="small" />
        <Button label="Edit" icon={{ sf: 'pencil', md: 'edit' }} variant={variant} />
        <Button label="Share" icon={{ sf: 'square.and.arrow.up', md: 'share' }} variant={variant} size="large" />
      </View>
    ))}
  </>
);

// Destructive and disabled, then glass over a photo and over a bright panel.
const States = () => (
  <>
    <Row variant="filled" destructive />
    <Row variant="outlined" destructive />
    <Row variant="glassProminent" destructive />
    <Row variant="filled" disabled />
    <Row variant="glass" disabled />
    <View style={styles.panel}>
      <Image source={require('@/assets/backdrop.jpg')} style={StyleSheet.absoluteFill} />
      <Row variant="glass" />
      <Row variant="glassProminent" />
    </View>
    <View style={[styles.panel, styles.bright]}>
      <Row variant="glass" />
    </View>
  </>
);

export default { slug: 'button', pages: [Styles, States] } satisfies Comparison;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panel: { borderRadius: 24, overflow: 'hidden', padding: 16, gap: 12, alignItems: 'flex-start' },
  bright: { backgroundColor: '#FFFFFF' },
});
