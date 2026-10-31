import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import { isValidElement } from 'react';
import { Image, type ColorValue, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';

import { isSvgIcon } from '../helpers/svgIcon';
import type { LucentNativeTabsTriggerIconProps } from '../types';

interface Props {
  icon?: LucentNativeTabsTriggerIconProps;
  selected: boolean;
  size: number;
  color: ColorValue;
}

type Variant<T> = T | { default?: T; selected?: T };

const isVariant = <T,>(value: Variant<T>): value is { default?: T; selected?: T } =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  !isValidElement(value) &&
  ('default' in value || 'selected' in value);

const templatePaint = /\b(fill|stroke)="(?!none")[^"]*"/g;

const pick = <T,>(value: Variant<T> | undefined, selected: boolean): T | undefined => {
  if (value === undefined) {
    return undefined;
  }
  if (!isVariant(value)) {
    return value;
  }
  return selected ? (value.selected ?? value.default) : (value.default ?? value.selected);
};

export const TabIcon = ({ icon, selected, size, color }: Props) => {
  if (!icon) {
    return null;
  }
  if (isSvgIcon(icon)) {
    const markup = pick(icon.svg, selected);
    if (!markup) {
      return null;
    }
    const original = icon.renderingMode === 'original';
    return (
      <SvgXml
        xml={original ? markup : markup.replace(templatePaint, '$1="currentColor"')}
        width={size}
        height={size}
        color={original ? undefined : color}
      />
    );
  }
  const material = 'md' in icon ? pick<AndroidSymbol>(icon.md, selected) : undefined;
  if (material) {
    return <SymbolView name={{ android: material }} size={size} tintColor={color} />;
  }
  const source = 'src' in icon ? pick(icon.src, selected) : undefined;
  if (!source || isValidElement(source)) {
    return null;
  }
  const original = 'renderingMode' in icon && icon.renderingMode === 'original';
  return (
    <Image
      source={source as ImageSourcePropType}
      tintColor={original ? undefined : color}
      resizeMode="contain"
      style={{ width: size, height: size }}
    />
  );
};
