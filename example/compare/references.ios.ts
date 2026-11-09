import colorPicker from './references/color-picker.ios';
import datePicker from './references/date-picker.ios';
import list from './references/list.ios';
import menu from './references/menu.ios';
import navigationSwiftUI from './references/navigation-swiftui.ios';
import picker from './references/picker.ios';
import presentation from './references/presentation.ios';
import progress from './references/progress.ios';
import textField from './references/text-field.ios';
import type { Comparison } from './types';

/** iOS components Lucent doesn't have yet, rendered by SwiftUI, as targets to build against. */
export const references: Comparison[] = [
  navigationSwiftUI,
  list,
  picker,
  menu,
  datePicker,
  colorPicker,
  textField,
  progress,
  presentation,
];
