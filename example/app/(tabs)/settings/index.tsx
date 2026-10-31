import { Stack } from 'expo-router';
import { Slider, isLiquidGlassAvailable } from 'expo-lucent';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { accents, useSettings, type Scheme } from '../../../components/settings';
import { Code, Options, Page, Row, Section, Swatches, prop, usePalette } from '../../../components/ui';

export default function SettingsScreen() {
  const palette = usePalette();
  const { scheme, tint, glassOpacity, set, reset } = useSettings();

  return (
    <Page>
      <Stack.Screen options={{ title: 'Settings' }} />
      <Section title="Theme" footer="These are LucentProvider's props, applied to the whole app.">
        <Row label="colorScheme" stacked>
          <Options<Scheme>
            options={[
              { label: 'Auto', value: 'auto' },
              { label: 'Light', value: 'light' },
              { label: 'Dark', value: 'dark' },
            ]}
            value={scheme}
            onChange={(next) => set({ scheme: next })}
          />
        </Row>
        <Row label="tintColor" detail={accents.find((accent) => accent.color === tint)?.name} stacked>
          <Swatches colors={accents} value={tint} onChange={(color) => color && set({ tint: color })} />
        </Row>
        <Row
          label="glassOpacity"
          detail={`${glassOpacity.toFixed(2)}${Platform.OS === 'ios' ? ' · Android only; iOS uses the system setting' : ''}`}
          stacked
          last>
          <Slider value={glassOpacity} onValueChange={(next) => set({ glassOpacity: next })} min={0} max={1} />
        </Row>
      </Section>

      <Code>
        {`<LucentProvider${prop('colorScheme', scheme, 'auto')} tintColor="${tint}"${prop('glassOpacity', Number(glassOpacity.toFixed(2)), 0.5)}>
  {children}
</LucentProvider>`}
      </Code>

      <Section title="Device">
        <Row label="Platform" detail={`${Platform.OS} ${Platform.Version}`} />
        <Row label="isLiquidGlassAvailable()" detail={String(isLiquidGlassAvailable())} last />
      </Section>

      <Pressable onPress={reset} style={[styles.reset, { backgroundColor: palette.surface }]}>
        <Text style={[styles.resetText, { color: tint }]}>Reset to defaults</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  reset: {
    borderRadius: 26,
    borderCurve: 'continuous',
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 17,
  },
});
