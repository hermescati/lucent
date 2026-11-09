import { useContext } from 'react';
import { createLucentContext } from '../../theme/context';

/** Whether a `NativeGlassBackdrop` already covers this part of the tree, so a navigator doesn't add a second one. */
export const InsideGlassBackdrop = createLucentContext('InsideGlassBackdrop', false);

export const useInsideGlassBackdrop = () => useContext(InsideGlassBackdrop);
