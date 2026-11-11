import { createLucentContext } from '../../theme/context';

/**
 * A list with `selection`, for its rows on iOS: whether it's selecting (in edit mode), or `null` without one. Its rows
 * are no buttons, drawn the same selecting or not, so SwiftUI moves them into edit mode, their selection circles
 * sliding in, rather than fading one row into another. A tap presses a row; selecting, the list takes it and ticks the
 * row, as its own selection animates it.
 */
export const ListSelectingContext = createLucentContext<boolean | null>('ListSelecting', null);
