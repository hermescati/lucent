import type { ViewProps } from 'react-native';

import { InsideGlassBackdrop } from '../../core/glass/BackdropContext';
import { NativeGlassBackdrop } from '../../core/glass/NativeGlass';

export const GlassBackdrop = (props: ViewProps) => (
  <InsideGlassBackdrop.Provider value>
    <NativeGlassBackdrop {...props} />
  </InsideGlassBackdrop.Provider>
);
