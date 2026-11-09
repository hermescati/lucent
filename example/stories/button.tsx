import { Button, type ButtonIcon, type ButtonSize, type ButtonVariant } from 'expo-lucent';
import { StyleSheet, View } from 'react-native';

import { Section } from '@/components/ui';
import { attribute, element } from './code';
import { story } from './types';

const icons: Record<string, ButtonIcon> = {
  plus: { sf: 'plus', md: 'add' },
  share: { sf: 'square.and.arrow.up', md: 'share' },
};

const Actions = () => (
  <Section title="Together">
    <View style={styles.actions}>
      <Button label="Cancel" variant="glass" size="large" onPress={() => {}} />
      <Button label="Save" variant="glassProminent" size="large" onPress={() => {}} />
      <Button icon={icons.share} accessibilityLabel="Share" variant="glass" size="large" onPress={() => {}} />
    </View>
    <View style={styles.actions}>
      <Button label="Delete" destructive variant="outlined" onPress={() => {}} />
      <Button label="Learn more" variant="text" onPress={() => {}} />
    </View>
  </Section>
);

// With neither a label nor an icon there'd be nothing to show, so the demo falls back to the plus.
const iconOf = (props: Record<string, unknown>) =>
  (props.icon as ButtonIcon | undefined) ?? (props.label ? undefined : icons.plus);

export default story({
  slug: 'button',
  group: 'controls',
  name: 'Button',
  summary: 'Filled, outlined, text and glass buttons',
  component: 'Button',
  controls: {
    variant: {
      type: 'select',
      options: ['filled', 'outlined', 'text', 'glass', 'glassProminent'].map((value) => ({ label: value, value })),
      default: 3,
      fallback: 'filled',
    },
    size: {
      type: 'select',
      options: ['small', 'regular', 'large'].map((value) => ({ label: value, value })),
      default: 2,
      fallback: 'regular',
    },
    label: {
      type: 'select',
      detail: 'Without a label, an icon button is a circle',
      options: [
        { label: 'Continue', value: 'Continue' },
        { label: 'None', value: undefined },
      ],
      default: 0,
    },
    icon: {
      type: 'select',
      options: [
        { label: 'None', value: undefined },
        { label: 'Plus', value: icons.plus },
        { label: 'Share', value: icons.share },
      ],
      default: 0,
    },
    destructive: { type: 'boolean', default: false, fallback: false },
    disabled: { type: 'boolean', default: false, fallback: false },
    tintColor: { type: 'color', detail: 'Overrides the app accent' },
  },
  render: ({ props }) => (
    <Button
      label={props.label as string | undefined}
      icon={iconOf(props)}
      accessibilityLabel={props.label ? undefined : 'Add'}
      variant={props.variant as ButtonVariant}
      size={props.size as ButtonSize}
      destructive={Boolean(props.destructive)}
      disabled={Boolean(props.disabled)}
      tintColor={props.tintColor as string | undefined}
      onPress={() => {}}
    />
  ),
  code: (props) =>
    element(
      'Button',
      [
        attribute('label', props.label),
        attribute('icon', iconOf(props)),
        props.label ? null : attribute('accessibilityLabel', 'Add'),
        props.variant === 'filled' ? null : attribute('variant', props.variant),
        props.size === 'regular' ? null : attribute('size', props.size),
        props.destructive ? 'destructive' : null,
        props.disabled ? 'disabled' : null,
        attribute('tintColor', props.tintColor),
        'onPress={() => {}}',
      ].filter((line): line is string => line !== null),
    ),
  stage: { height: 180, photo: 'optional' },
  footer:
    'Glass buttons need iOS 26; below it they fall back to outlined and filled. On Android they are Lucent glass.',
  extra: Actions,
});

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, padding: 16 },
});
