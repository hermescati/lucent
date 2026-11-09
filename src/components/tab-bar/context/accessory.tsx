import { useContext } from 'react';

import { createLucentContext } from '../../../theme/context';

/** Which copy of the bottom accessory a component is in: above the bar, or in its row once it minimizes. */
export const AccessoryPlacementContext = createLucentContext<'regular' | 'inline'>('AccessoryPlacement', 'regular');

export const useAccessoryPlacement = () => useContext(AccessoryPlacementContext);

/** Whether the tab bar shows a bottom accessory, for the room screens leave under their content. */
export const AccessoryShownContext = createLucentContext<boolean>('AccessoryShown', false);

export const useAccessoryShown = () => useContext(AccessoryShownContext);
