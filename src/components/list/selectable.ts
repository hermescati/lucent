import { createLucentContext } from '../../theme/context';

/**
 * Whether the list's rows select rather than press: a list with `selection`, in edit mode. On iOS a row is then no
 * button, so SwiftUI's list takes the tap and selects it.
 */
export const ListSelectableContext = createLucentContext<boolean>('ListSelectable', false);
