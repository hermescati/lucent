import type {
  FieldGroupProps as ExpoFieldGroupProps,
  FieldSectionFooterProps,
  FieldSectionHeaderProps,
  FieldSectionProps as ExpoFieldSectionProps,
  ListForEachProps as ExpoListForEachProps,
  ListItemProps as ExpoListItemProps,
  ListProps as ExpoListProps,
} from '@expo/ui';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import type { ColorValue, StyleProp, ViewStyle } from 'react-native';

/**
 * How a list draws its rows, as SwiftUI's `listStyle`: `insetGrouped` sets each section's rows on a rounded card with
 * the page's grouped grey around them, SwiftUI's default; `plain` runs them edge to edge on the page.
 */
export type ListStyle = 'insetGrouped' | 'plain';

/** `@expo/ui`'s `List`: a scrolling list of rows, with pull to refresh. */
export interface ListProps extends ExpoListProps {
  /** Lucent. @default 'insetGrouped' */
  listStyle?: ListStyle;
  /** Lucent. Layout only: margins, alignment and size. */
  style?: StyleProp<ViewStyle>;
  /**
   * Lucent. Edit mode, as SwiftUI's `editMode` environment: rows show a delete control where their `List.ForEach` has
   * `onDelete`, a reorder handle where it has `onMove`, and a selection circle where the list has `selection`.
   * @default false
   */
  editMode?: boolean;
  /** Lucent. The selected rows' keys (their `List.ForEach` `keyExtractor`), as SwiftUI's `List(selection:)`. */
  selection?: string[];
  /** Lucent. Called with the selected keys as rows are tapped in edit mode. */
  onSelectionChange?: (selection: string[]) => void;
}

/** `@expo/ui`'s `List.ForEach`, with SwiftUI's `onDelete` and `onMove`. */
export interface ListForEachProps<T> extends ExpoListForEachProps<T> {
  /** Called with the deleted rows' indices: from a swipe, or edit mode's delete control. */
  onDelete?: (indices: number[]) => void;
  /**
   * Called as a row is dragged to a new place in edit mode, with its index and where it goes: the destination counts
   * places before the row is taken out, so it can equal `data.length`.
   */
  onMove?: (sourceIndices: number[], destination: number) => void;
}

/** An SF Symbol on iOS and a Material Symbol on Android, as in `NativeTabs.Trigger.Icon`. */
export interface ListIcon {
  sf?: SFSymbol;
  md?: AndroidSymbol;
}

/**
 * What a row shows at its trailing edge, as UIKit's cell accessories: `disclosure` is the chevron of a row that opens
 * another screen, `checkmark` the tick of the chosen row in a list of choices, `info` the ⓘ button of UIKit's detail
 * button, which `onAccessoryPress` answers apart from the row.
 */
export type ListItemAccessory = 'disclosure' | 'checkmark' | 'info';

/** A button revealed by swiping a row, as SwiftUI's `swipeActions`. */
export interface SwipeAction {
  label: string;
  icon?: ListIcon;
  onPress: () => void;
  /** Red, as a delete is: iOS also takes a destructive action's row away as it runs. */
  destructive?: boolean;
  /** Its fill: grey by default, red when `destructive`. */
  tintColor?: ColorValue;
}

/** The buttons a row reveals from each edge. */
export interface SwipeActions {
  /** Revealed swiping right (left in right to left), first action outermost. */
  leading?: SwipeAction[];
  /** Revealed swiping left, first action outermost. */
  trailing?: SwipeAction[];
  /** A swipe all the way across runs the outermost action. @default true */
  allowsFullSwipe?: boolean;
}

/** `@expo/ui`'s `ListItem`: a row, tappable with `onPress`. */
export interface ListItemProps extends Omit<ExpoListItemProps, 'colors'> {
  /** Lucent. A value shown in secondary text at the trailing edge, as a settings row's current choice. */
  detail?: string;
  /** Lucent. A chevron, a checkmark or an ⓘ at the trailing edge, after `trailing` and `detail`. */
  accessory?: ListItemAccessory;
  /** Lucent. Called when the `info` accessory is tapped, apart from the row's `onPress`. */
  onAccessoryPress?: () => void;
  /**
   * Lucent. The row is an action rather than an item, as a SwiftUI `Button` in a list: its headline in the accent
   * colour (red when `destructive`, grey when `disabled`).
   */
  button?: boolean;
  /** Lucent. The headline in red, for a row that deletes or signs out. */
  destructive?: boolean;
  /** Lucent. Buttons revealed by swiping the row. */
  swipeActions?: SwipeActions;
  /** Lucent. Greyed out and not tappable. */
  disabled?: boolean;
}

/** `@expo/ui`'s `FieldGroup`: grouped settings rows, as SwiftUI's `Form`. */
export type FieldGroupProps = ExpoFieldGroupProps;
/** `@expo/ui`'s `FieldGroup.Section`, in a `List` or `FieldGroup`. */
export interface FieldSectionProps extends ExpoFieldSectionProps {
  /**
   * Lucent. The section's letter in the list's index, as SwiftUI's `sectionIndexLabel`: a list whose sections have them
   * shows the index along its trailing edge, and a tap or a drag along it scrolls to the section.
   */
  indexLabel?: string;
  /** Lucent. SwiftUI's `headerProminence`: `increased` draws the header larger, in the primary colour. */
  headerProminence?: 'standard' | 'increased';
  /** Lucent. An action at the header's trailing end, in the accent colour, as an "Edit" or "See All". */
  headerAction?: { label: string; onPress: () => void };
}
export type { FieldSectionFooterProps, FieldSectionHeaderProps };
