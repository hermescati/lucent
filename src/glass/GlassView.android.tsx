import type { GlassViewProps } from 'expo-glass-effect';
import { useContext, useEffect, useId, useState, type ComponentRef, type Ref } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';

import { AnimatedNativeGlassView } from './NativeGlass';
import { glassPresets, glassPress } from './presets';
import { ContainerContext, radiusOf, resolveEffectStyle, useGlassScheme } from './shared';

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
  const scheme = useGlassScheme(colorScheme);
  const effect = resolveEffectStyle(glassEffectStyle);
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
    setSide(Math.min(width, height));
    container?.set(id, { x, y, width, height, radius, style: effect.style });
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
      {...glassPresets[effect.style === 'clear' ? 'clear' : 'regular'][scheme]}
      lift
      animatedProps={animatedProps}
      cornerRadius={radius}
      glassTint={tintColor}
      interactive={isInteractive}
      pressScale={glassPress.scale}
      pressGlow={glassPress.glow}
      pressGlowSpread={side * glassPress.glowReach}
      style={style}
      onLayout={layout}
      {...rest}>
      {children}
    </AnimatedNativeGlassView>
  );
};
