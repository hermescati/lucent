import type { SharedValue } from 'react-native-reanimated';

import { createLucentContext } from '../../../theme/context';

/** Which part a screen plays in a swipe back: the one going, the one it uncovers, or neither. */
export type SwipeRole = 'top' | 'below' | null;

export const SwipeRoleContext = createLucentContext<SwipeRole>('StackSwipeRole', null);

/** Goes back from the screen, as its bar's back button does: with the swipe's motion where the stack runs it. */
export const StackBackContext = createLucentContext<(() => void) | null>('StackBack', null);

/**
 * Whether the screen is still held unseen, 1, until a push slides it in, then 0: its bar's buttons and title come in as
 * it turns, on the UI thread. Null outside a Lucent stack.
 */
export const ScreenHiddenContext = createLucentContext<SharedValue<number> | null>('StackScreenHidden', null);
