/**
 * Which glass Lucent draws on Android: the device's own (`'auto'`), or an older Android's, to see the fallbacks on a
 * newer phone. Refraction needs Android 13 and blur Android 12, so `'android12'` keeps the blur without refraction and
 * `'android11'` draws flat, tinted glass. iOS always draws Apple's own.
 */
export type GlassFallback = 'auto' | 'android12' | 'android11';
