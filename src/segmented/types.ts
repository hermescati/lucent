import type { NativeSegmentedControlChangeEvent } from '@expo/ui/community/segmented-control';

export type { SegmentedControlProps } from '@expo/ui/community/segmented-control';
export type SegmentedControlChangeEvent = NativeSegmentedControlChangeEvent;

export const changeEvent = (index: number, value: string): SegmentedControlChangeEvent => ({
  nativeEvent: { selectedSegmentIndex: index, value },
});
