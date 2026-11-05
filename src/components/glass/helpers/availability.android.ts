import { requireNativeModule } from 'expo';
import { Platform } from 'react-native';

import type { GlassFallback } from './fallback';

const native = requireNativeModule<{ setGlassFallback(level: number): void }>('Lucent');

const refractionApi = 33;
const levels: Record<GlassFallback, number> = { auto: 0, solid: 1 };
let fallback: GlassFallback = 'auto';

export const isLiquidGlassAvailable = () =>
  fallback === 'auto' && typeof Platform.Version === 'number' && Platform.Version >= refractionApi;

export const isGlassEffectAPIAvailable = () => true;

/** Draws the solid fallback on this device, every glass view redrawing at once (see GlassFallback). */
export const setGlassFallback = (next: GlassFallback) => {
  fallback = next;
  native.setGlassFallback(levels[next]);
};
