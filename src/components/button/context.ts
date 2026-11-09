import { useContext } from 'react';
import { createLucentContext } from '../../theme/context';

export const ButtonColorContext = createLucentContext<string | undefined>('ButtonColor', undefined);

/**
 * The colour the button gives its label, for custom `children` to match: it follows the variant, `destructive` and
 * `disabled`. Android only; on iOS SwiftUI colours `children` itself and this is `undefined`.
 */
export const useButtonColor = () => useContext(ButtonColorContext);
