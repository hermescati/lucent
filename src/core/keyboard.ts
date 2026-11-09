import { useContext } from 'react';
import { KeyboardContext } from 'react-native-keyboard-controller';

/**
 * Whether a `KeyboardProvider` is above. Without one, keyboard-controller's context is its default, whose `update` is
 * `Promise.resolve`; its hooks then never move and warn.
 */
export const useHasKeyboardProvider = () => useContext(KeyboardContext).update !== Promise.resolve;
