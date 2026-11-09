import type { GlassFallback } from './fallback';

export { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';

/** Android only: iOS always draws Apple's own glass. */
export const setGlassFallback = (_next: GlassFallback) => {};
