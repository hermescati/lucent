import { Host, Stepper as SwiftStepper } from '@expo/ui/swift-ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import type { StepperProps } from './types';

export const Stepper = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  disabled = false,
  hidden = false,
  testID,
  style,
}: StepperProps) => {
  const bare = label == null;
  return (
    <Host
      matchContents={bare ? true : { vertical: true }}
      style={[!bare && styles.row, hidden && styles.hidden, style]}
      pointerEvents={hidden ? 'none' : 'auto'}
      testID={testID}>
      <SwiftStepper
        label={label ?? ''}
        value={value}
        // `@expo/ui`'s stepper doesn't take SwiftUI's `disabled`; with no room either way, iOS greys both sides, which
        // is how it draws a disabled stepper.
        min={disabled ? value : min}
        max={disabled ? value : max}
        step={step}
        onValueChange={onValueChange}
        modifiers={bare ? [labelsHidden()] : []}
      />
    </Host>
  );
};

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch' },
  hidden: { opacity: 0 },
});
