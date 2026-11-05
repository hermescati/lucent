/**
 * Which glass Lucent draws on Android: the device's own (`'auto'`), or the solid fallback (`'solid'`), to see it on a
 * newer phone. Liquid glass needs Android 13; older Androids, and any phone with high-contrast text on, draw a solid
 * surface instead. iOS always draws Apple's own.
 */
export type GlassFallback = 'auto' | 'solid';
