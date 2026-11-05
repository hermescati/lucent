import { GlassView, isLiquidGlassAvailable, useLucentTheme, type GlassViewProps } from 'expo-lucent';
import { StyleSheet, Text } from 'react-native';

import { story } from './types';

// White over the photo through glass; drawn solid, the glass is an opaque surface, so the theme's text colour.
const Label = () => {
  const { solid, color } = useLucentTheme();
  return (
    <Text style={[styles.label, solid && { color: color.text, textShadowColor: 'rgba(255, 255, 255, 0)' }]}>
      Liquid Glass
    </Text>
  );
};

const effect = (style: 'regular' | 'clear' | 'none') => ({ style, animate: true });

export default story({
  slug: 'glass',
  group: 'materials',
  name: 'Glass',
  summary: 'GlassView, the Liquid Glass material',
  component: 'GlassView',
  controls: {
    glassEffectStyle: {
      type: 'select',
      options: [
        { label: 'Regular', value: effect('regular') },
        { label: 'Clear', value: effect('clear') },
        { label: 'None', value: effect('none') },
      ],
      default: 0,
    },
    style: {
      type: 'select',
      detail: 'The shape comes from the size and borderRadius',
      options: [
        { label: 'Capsule', value: { width: 220, height: 64, borderRadius: 32 } },
        { label: 'Card', value: { width: 220, height: 130, borderRadius: 28 } },
        { label: 'Circle', value: { width: 110, height: 110, borderRadius: 55 } },
      ],
      default: 0,
    },
    tintColor: { type: 'color', alpha: '55' },
    isInteractive: { type: 'boolean', default: true, fallback: false, detail: 'Press the glass to see it react' },
  },
  render: ({ props }) => (
    <GlassView
      glassEffectStyle={props.glassEffectStyle as GlassViewProps['glassEffectStyle']}
      tintColor={props.tintColor as string | undefined}
      isInteractive={Boolean(props.isInteractive)}
      style={[styles.glass, props.style as object]}>
      <Label />
    </GlassView>
  ),
  stage: { height: 260, photo: 'always' },
  footer: `isLiquidGlassAvailable() is ${isLiquidGlassAvailable()} on this device. Outside NativeTabs on Android, wrap the content behind glass in GlassBackdrop.`,
});

const styles = StyleSheet.create({
  glass: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 4,
  },
});
