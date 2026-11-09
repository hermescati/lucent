import { requireNativeModule } from 'expo';

import type { GlassFallback } from './fallback';
import { forceSolidGlass, isSolidGlass } from '../../../theme/solid';

const native = requireNativeModule<{ setGlassFallback(level: number): void }>('Lucent');

const levels: Record<GlassFallback, number> = { auto: 0, solid: 1 };

export const isLiquidGlassAvailable = () => !isSolidGlass();

export const isGlassEffectAPIAvailable = () => true;

/** Draws the solid fallback on this device, every glass view redrawing at once (see GlassFallback). */
export const setGlassFallback = (next: GlassFallback) => {
  native.setGlassFallback(levels[next]);
  forceSolidGlass(next === 'solid');
};
