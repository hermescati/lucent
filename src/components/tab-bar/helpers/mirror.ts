import { I18nManager } from 'react-native';

/**
 * In a right-to-left language iOS mirrors the tab bar: the first tab at the right, search's circle at the left, and the
 * bar minimizing to the right. Lucent lays the bar out left to right and draws it mirrored (FloatingTabBar), so every
 * place, gesture and motion mirrors with it; the glass sees its backdrop through its whole transform, so what's behind
 * stays put. What has to read the right way round is flipped back: icons, labels, the field's text and the accessory's
 * content.
 */
export const mirrored = I18nManager.isRTL;

/** Mirrors the bar, about its own middle. */
export const mirror = mirrored ? { transform: [{ scaleX: -1 }] } : null;

/** Flips content back inside the mirrored bar, about its own middle. */
export const unmirror = mirror;
