import { requireNativeModule } from 'expo';
import { PixelRatio, type ImageURISource } from 'react-native';

import { parseSvg, type VectorLayer } from './svg';

interface LucentIconModule {
  renderVectorIcon(
    key: string,
    viewBox: number[],
    layers: VectorLayer[],
    size: number,
    scale: number,
  ): string;
}

const LucentIcons = requireNativeModule<LucentIconModule>('Lucent');

const sources = new Map<string, ImageURISource>();

const fnv1a = (text: string) => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

export const vectorIconSource = (markup: string, size: number): ImageURISource => {
  const scale = PixelRatio.get();
  const key = `${fnv1a(markup)}-${size}-${scale}`;
  const cached = sources.get(key);
  if (cached) {
    return cached;
  }
  const icon = parseSvg(markup);
  const uri = LucentIcons.renderVectorIcon(key, icon.viewBox, icon.layers, size, scale);
  const source = { uri, width: size, height: size, scale };
  sources.set(key, source);
  return source;
};
