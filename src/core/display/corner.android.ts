import { requireNativeModule } from 'expo';

const native = requireNativeModule<{ displayCornerRadius(): number }>('Lucent');

let cached: number | undefined;

/** The screen's corner radius in dp: 0 before Android 12, on a square screen, or before the window is attached. */
export const displayCornerRadius = () => {
  if (cached === undefined || cached === 0) cached = native.displayCornerRadius();
  return cached;
};
