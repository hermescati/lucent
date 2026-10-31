import { Platform } from 'react-native';

const refractionApi = 33;

export const isLiquidGlassAvailable = () => typeof Platform.Version === 'number' && Platform.Version >= refractionApi;

export const isGlassEffectAPIAvailable = () => true;
