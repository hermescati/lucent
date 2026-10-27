import type { GlassViewProps } from 'expo-glass-effect';
import { useContext, useEffect, useId, useState, type ComponentRef, type Ref } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedNativeGlassView } from './NativeGlass';
import { glassPress } from './presets';
import { ContainerContext, radiusOf, resolveEffectStyle, useGlassMaterial } from './shared';

export const GlassView = ({
  glassEffectStyle,
  tintColor,
  isInteractive = false,
  colorScheme = 'auto',
  style,
  children,
  onLayout,
  ref,
  ...rest
}: GlassViewProps) => {
  const container = useContext(ContainerContext);
  const id = useId();
  const effect = resolveEffectStyle(glassEffectStyle);
  const material = useGlassMaterial(effect.style, colorScheme);
  const radius = radiusOf(style);
  const [side, setSide] = useState(0);
  const presence = useSharedValue(effect.style === 'none' ? 0 : 1);

  useEffect(() => {
    const target = effect.style === 'none' ? 0 : 1;
    presence.set(effect.animate ? withTiming(target, { duration: effect.duration }) : target);
  }, [effect.style, effect.animate, effect.duration, presence]);

  useEffect(() => () => container?.set(id, null), [container, id]);

  const animatedProps = useAnimatedProps(() => ({ presence: presence.get() }));

  const layout = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setSide(Math.max(width, height));
    container?.set(id, { x, y, width, height, radius, style: effect.style, interactive: isInteractive });
    onLayout?.(event);
  };

  if (container) {
    return (
      <View ref={ref} style={style} onLayout={layout} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedNativeGlassView
      ref={ref as unknown as Ref<ComponentRef<typeof AnimatedNativeGlassView>>}
      {...material}
      lift
      animatedProps={animatedProps}
      cornerRadius={radius}
      glassTint={tintColor}
      interactive={isInteractive}
      pressGrow={glassPress.grow}
      pressGlow={side >= glassPress.wideFrom ? glassPress.wideGlow : glassPress.glow}
      pressGlowSpread={glassPress.glowSpread}
      style={style}
      onLayout={layout}
      {...rest}>
      {children}
    </AnimatedNativeGlassView>
  );
};
