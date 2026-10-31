import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { lensMotion } from './tokens';
import type { LensProps } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';
import { AnimatedNativeGlassView } from '../glass/NativeGlass';
import { continuousCapsule } from '../glass/continuous';
import { lensFrost, lensFrostTint, lensPresets, lensThumb } from '../glass/presets';

const lerp = (from: number, to: number, progress: number) => {
  'worklet';
  return from + (to - from) * progress;
};

const bendOverrides = { pull: { refraction: 0 }, bulge: { rimPull: 0 }, both: {} } as const;

export const Lens = ({
  lens,
  thumb,
  glass,
  centerY,
  color,
  variant = 'knob',
  bend = 'both',
  continuous = true,
  tune,
  frostTune,
  hazeRadius = lensMotion.hazeRadius,
  hazeInset = lensMotion.hazeInset,
  hazeFlatten = 0,
  frostAlpha,
  solidLead = 1,
  hazeMagnify,
  hazeMagnifyY,
  hazeBlurLead = 1,
  landGlass = false,
  children,
}: LensProps) => {
  const frosted = variant === 'knob';
  const { scheme } = useLucentTheme();
  const thumbPath = useMemo(() => continuousCapsule(thumb.width, thumb.height), [thumb.width, thumb.height]);
  const shape = () => {
    'worklet';
    const form = lens.form.get();
    const stretch = lens.stretch.get();
    return [
      {
        translateX:
          lens.x.get() - (lens.anchor.get() * Math.min(stretch, 0) * lerp(thumb.width, glass.width, form)) / 2,
      },
      {
        scaleX:
          (lerp(thumb.width / glass.width, 1, form) * (1 + stretch) + lens.spread.get() / glass.width) *
          (landGlass ? 1 + lens.land.get() : 1),
      },
      {
        scaleY:
          lerp(thumb.height / glass.height, 1, form) *
          (1 - lens.squash * stretch) *
          (landGlass ? 1 - lens.landSquash * lens.land.get() : 1),
      },
    ];
  };

  const whiteOf = () => {
    'worklet';
    const handover = hazeMagnify === undefined || lens.white.get() === 0 ? 0 : Math.min(1, lens.haze.get() * 20);
    return Math.max(1 - Math.min(1, lens.form.get() / lens.frostUntil.get()), lens.white.get(), handover);
  };

  const frostOf = () => {
    'worklet';
    return frosted ? whiteOf() : 0;
  };

  const material = { ...(frosted ? lensPresets : lensThumb)[scheme], ...bendOverrides[bend], ...tune };
  const refraction = material.refraction ?? 0;
  const rimPull = material.rimPull ?? 0;
  const edgeSharp = material.edgeSharp ?? 0;
  const edgeSoft = material.edgeSoft ?? 0;
  const specular = material.specular ?? 0;
  const shadowAlpha = Number(/,\s*([\d.]+)\)$/.exec(String(material.shadow ?? ''))?.[1] ?? 0);
  const hazeProps = useAnimatedProps(() => {
    const haze = frosted ? lens.haze.get() : 0;
    const flat = Math.min(1, haze * hazeBlurLead);
    return hazeFlatten > 0
      ? {
          frost: haze * lensMotion.hazeMax,
          refraction: refraction * (1 - hazeFlatten * flat),
          rimPull: rimPull * (1 - hazeFlatten * flat),
          edgeSharp: edgeSharp * (1 - hazeFlatten * haze),
          edgeSoft: edgeSoft * (1 - hazeFlatten * haze),
          specular: specular * (1 - hazeFlatten * haze),
          magnify: (hazeMagnify ?? 0) * haze,
          magnifyY: hazeMagnifyY === undefined ? -999 : hazeMagnifyY * haze,
          shadow: `rgba(0, 0, 0, ${shadowAlpha * Math.min(1, Math.max(0, (lens.form.get() - 0.5) * 2))})`,
        }
      : { frost: haze * lensMotion.hazeMax };
  });

  const [r, g, b, schemeAlpha] = lensFrostTint[scheme];
  const a = frostAlpha ?? schemeAlpha;
  const frostMaterial = { ...lensFrost[scheme], ...frostTune };
  const frostMagnify = frostMaterial.magnify ?? 0;
  const frostBlur = frostMaterial.blurRadius ?? 0;
  const frostRefraction = frostMaterial.refraction ?? 0;
  const frostRimPull = frostMaterial.rimPull ?? 0;
  const frostProps = useAnimatedProps(() => {
    const tint = `rgba(${r}, ${g}, ${b}, ${a})`;
    if (hazeMagnify === undefined) {
      return {
        tint,
        magnify: frostMagnify,
        magnifyY: -999,
        blurRadius: frostBlur,
        refraction: frostRefraction,
        rimPull: frostRimPull,
      };
    }
    const haze = lens.haze.get();
    return {
      tint: `rgba(${r}, ${g}, ${b}, ${a * Math.min(1, haze * hazeBlurLead)})`,
      magnify: hazeMagnify * haze,
      magnifyY: hazeMagnifyY === undefined ? -999 : hazeMagnifyY * haze,
      blurRadius: frostBlur * Math.min(1, haze * hazeBlurLead),
      refraction: frostRefraction * (1 - hazeFlatten * Math.min(1, haze * hazeBlurLead)),
      rimPull: frostRimPull * (1 - hazeFlatten * Math.min(1, haze * hazeBlurLead)),
    };
  });

  const glassStyle = useAnimatedStyle(() => ({
    opacity: (1 - lens.solid.get()) * (1 - frostOf()),
    transform: shape(),
  }));

  const frostStyle = useAnimatedStyle(() => ({
    opacity: (1 - lens.solid.get()) * frostOf(),
    transform: shape(),
  }));

  const thumbStyle = useAnimatedStyle(() => {
    const land = lens.land.get();
    const form = lens.form.get();
    const stretch = lens.stretch.get();
    return {
      opacity: Math.min(1, lens.solid.get() * solidLead),
      transform: [
        { translateX: lens.x.get() },
        {
          scaleX:
            (lerp(1, glass.width / thumb.width, form) * (1 + stretch) + lens.spread.get() / thumb.width) * (1 + land),
        },
        {
          scaleY:
            lerp(1, glass.height / thumb.height, form) * (1 - lens.squash * stretch) * (1 - lens.landSquash * land),
        },
      ],
    };
  });

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          {
            left: -thumb.width / 2,
            top: centerY - thumb.height / 2,
            width: thumb.width,
            height: thumb.height,
          },
          !continuous && { borderRadius: thumb.height / 2, backgroundColor: color },
          thumbStyle,
        ]}>
        {continuous ? (
          <Svg width={thumb.width} height={thumb.height}>
            <Path d={thumbPath} fill={color} />
          </Svg>
        ) : null}
      </Animated.View>
      {children}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { left: -glass.width / 2, top: centerY - glass.height / 2, width: glass.width, height: glass.height },
          glassStyle,
        ]}>
        <AnimatedNativeGlassView
          {...material}
          animatedProps={hazeProps}
          frostLeft={hazeInset}
          frostTop={hazeInset}
          frostRight={glass.width - hazeInset}
          frostBottom={glass.height - hazeInset}
          frostRadius={hazeRadius}
          lift
          continuous={1}
          cornerRadius={glass.height / 2}
          style={styles.fill}
        />
      </Animated.View>
      {frosted ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.layer,
            { left: -glass.width / 2, top: centerY - glass.height / 2, width: glass.width, height: glass.height },
            frostStyle,
          ]}>
          <AnimatedNativeGlassView
            {...frostMaterial}
            animatedProps={frostProps}
            lift
            continuous={1}
            cornerRadius={glass.height / 2}
            style={styles.fill}
          />
        </Animated.View>
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  layer: { position: 'absolute' },
  fill: { flex: 1 },
});
