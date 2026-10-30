import type { ReactNode } from 'react';

import type { LensState } from './useLens';
import type { GlassMaterial } from '../glass/presets';

interface Size {
  width: number;
  height: number;
}

export type LensBend = 'pull' | 'bulge' | 'both';

export interface LensProps {
  lens: LensState;
  continuous?: boolean;
  thumb: Size;
  glass: Size;
  centerY: number;
  color: string;
  variant?: 'knob' | 'thumb';
  bend?: LensBend;
  tune?: Partial<GlassMaterial>;
  frostTune?: Partial<GlassMaterial>;
  hazeRadius?: number;
  hazeInset?: number;
  hazeFlatten?: number;
  frostAlpha?: number;
  solidLead?: number;
  hazeMagnify?: number;
  hazeMagnifyY?: number;
  hazeBlurLead?: number;
  landGlass?: boolean;
  children?: ReactNode;
}
