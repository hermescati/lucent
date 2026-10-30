import { Host, Switch as ExpoSwitch, type SwitchProps } from '@expo/ui';
import { labelsHidden } from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

export const Switch = ({ modifiers, ...props }: SwitchProps) => {
  const bare = props.label == null;
  return (
    <Host matchContents={bare ? true : { vertical: true }} style={bare ? undefined : styles.row}>
      <ExpoSwitch {...props} modifiers={bare ? [labelsHidden(), ...(modifiers ?? [])] : modifiers} />
    </Host>
  );
};

const styles = StyleSheet.create({
  row: { alignSelf: 'stretch' },
});
