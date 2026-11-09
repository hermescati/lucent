import { FieldGroup as UniversalFieldGroup, List as UniversalList } from '@expo/ui';
import {
  Children,
  Fragment,
  isValidElement,
  useContext,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { useNativeGesture } from 'react-native-gesture-handler';
import Animated, { makeMutable, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';

import { list, listColors } from './tokens';
import type { FieldSectionProps, ListForEachProps, ListStyle } from './types';
import { useLucentTheme } from '../../theme/LucentProvider';
import { createLucentContext } from '../../theme/context';

/** The list a row is in, or null outside one. */
export const ListStyleContext = createLucentContext<ListStyle | null>('ListStyle', null);

/** The row whose swipe actions are open, by its number, or -1: opening one closes the rest, as iOS does. */
export const OpenRowContext = createLucentContext<SharedValue<number> | null>('ListOpenRow', null);

let rows = 0;
/** A number for a row, for `OpenRowContext`. */
export const nextRowId = () => (rows += 1);

/** The list's scroll view's gesture: a row's reorder drag blocks it, so the list doesn't scroll away under the finger. */
export const ListScrollGestureContext = createLucentContext<ReturnType<typeof useNativeGesture> | null>(
  'ListScrollGesture',
  null,
);

/** Where a row sits in its section: the last one draws no separator under it. */
export const RowLastContext = createLucentContext<boolean>('ListRowLast', true);

/** The list's edit mode: whether it's on, and how far rows have moved into it (0 to 1). */
export interface ListEdit {
  editing: boolean;
  progress: SharedValue<number>;
}

export const ListEditContext = createLucentContext<ListEdit | null>('ListEdit', null);

/**
 * A `List.ForEach`'s rows as a drag reorders them, on the UI thread: the order they're drawn in (`order`, by key), each
 * one's height, the row being dragged and how far, and whether rows are moving (from a lift until the drop settles).
 * Each row draws itself at its place in `order` less where React has laid it out, so as `onMove` reorders the data and
 * React lays the rows out again, the two meet and nothing jumps.
 */
export interface ReorderGroup {
  order: SharedValue<string[]>;
  heights: SharedValue<Record<string, number>>;
  active: SharedValue<string>;
  drag: SharedValue<number>;
  moving: SharedValue<boolean>;
  onMove?: (sourceIndices: number[], destination: number) => void;
  // Whether a row is lifted: its section lets its rows draw outside its card meanwhile, for the lifted row's shadow.
  lifted: SharedValue<boolean>;
}

const reorderGroup = (keys: string[]): ReorderGroup => ({
  order: makeMutable(keys),
  heights: makeMutable<Record<string, number>>({}),
  active: makeMutable(''),
  drag: makeMutable(0),
  moving: makeMutable(false),
  lifted: makeMutable(false),
});

/** What a row can do in edit mode, from its `List.ForEach`: be deleted, and be moved. */
export interface RowEdit {
  onDelete?: () => void;
  movable: boolean;
  reorder?: { group: ReorderGroup; key: string; index: number; keys: string[] };
  // Its key, for selection, and the next row's, whose selection hides the separator between them.
  key?: string;
  nextKey?: string;
}

export const RowEditContext = createLucentContext<RowEdit>('ListRowEdit', { movable: false });

/** A list's selection in edit mode: the selected keys, and a row's tap toggling its own. */
export interface ListSelection {
  selected: string[];
  toggle: (key: string) => void;
}

export const ListSelectionContext = createLucentContext<ListSelection | null>('ListSelection', null);

// A `List.ForEach` row, with what its `onDelete` and `onMove` let it do.
const editableRow = <T,>(
  { data, keyExtractor, children: render, onDelete, onMove }: ListForEachProps<T>,
  item: T,
  index: number,
  keys: string[],
  group?: ReorderGroup,
) => {
  const key = keyExtractor(item, index);
  const movable = Boolean(onMove) && data.length > 1;
  return (
    <RowEditContext
      key={key}
      value={{
        onDelete: onDelete ? () => onDelete([index]) : undefined,
        movable,
        reorder: movable && group ? { group, key, index, keys } : undefined,
        key,
        nextKey: keys[index + 1],
      }}>
      {render({ item, index })}
    </RowEditContext>
  );
};

export const useListColors = () => listColors[useLucentTheme().scheme === 'dark' ? 'dark' : 'light'];

export const SectionHeader = UniversalFieldGroup.SectionHeader;
export const SectionFooter = UniversalFieldGroup.SectionFooter;

// `List.ForEach`'s rows, drawn all at once: Android's list scrolls in one view, so a section can number its rows.
export const ListForEach = <T,>(props: ListForEachProps<T>) => {
  const keys = props.data.map((item, index) => props.keyExtractor(item, index));
  return <>{props.data.map((item, index) => editableRow(props, item, index, keys))}</>;
};

// A section's rows, flattened out of fragments and `List.ForEach`, its header and footer taken out. Each `List.ForEach`
// takes the next of the section's reorder groups, made as first needed.
const rowsOf = (
  children: ReactNode,
  groupFor: (n: number, keys: string[], props: ListForEachProps<unknown>) => ReorderGroup,
) => {
  let groups = 0;
  let header: ReactNode;
  let footer: ReactNode;
  const rows: ReactElement[] = [];
  const walk = (node: ReactNode) =>
    Children.forEach(node, (child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) return;
      if (child.type === SectionHeader) header = child.props.children;
      else if (child.type === SectionFooter) footer = child.props.children;
      else if (child.type === Fragment) walk(child.props.children);
      else if (child.type === ListForEach || child.type === UniversalList.ForEach) {
        const props = child.props as unknown as ListForEachProps<unknown>;
        const keys = props.data.map((item, index) => props.keyExtractor(item, index));
        const group = groupFor(groups++, keys, props);
        props.data.forEach((item, index) => rows.push(editableRow(props, item, index, keys, group)));
      } else rows.push(child);
    });
  walk(children);
  return { header, footer, rows };
};

const Caption = ({ children, kind }: { children: ReactNode; kind: 'header' | 'footer' }) => {
  const colors = useListColors();
  const type = kind === 'header' ? list.header : list.footer;
  if (typeof children !== 'string' && typeof children !== 'number') return <>{children}</>;
  return (
    <Text style={[styles.caption, { fontSize: type.fontSize, lineHeight: type.lineHeight, color: colors.caption }]}>
      {children}
    </Text>
  );
};

/**
 * A section of rows: its header above, its rows on a card (inset grouped) or edge to edge (plain), and its footer
 * below. `first` is the list's first section, which sits closer under the bar.
 */
export const Section = ({
  children,
  title,
  hidden,
  testID,
  first = false,
}: FieldSectionProps & { first?: boolean }) => {
  const style = useContext(ListStyleContext) ?? 'insetGrouped';
  const colors = useListColors();
  // The section's reorder groups, one per `List.ForEach`, kept for its life: shared values the rows draw from.
  const [groups] = useState(() => new Map<number, { group: ReorderGroup; keys: string[] }>());
  // A lifted row draws outside the card, for its shadow, without a render mid-drag.
  const [lifted] = useState(() => makeMutable(false));
  const card = useAnimatedStyle(() => ({ overflow: lifted.get() ? 'visible' : 'hidden' }));
  const {
    header: slot,
    footer,
    rows,
  } = rowsOf(children, (n, keys, props) => {
    const known = groups.get(n) ?? { group: reorderGroup(keys), keys };
    known.keys = keys;
    known.group.onMove = props.onMove;
    known.group.lifted = lifted;
    groups.set(n, known);
    return known.group;
  });
  // Laid out again (after a move, or new data), each group draws its rows in their new order, unless one is being
  // dragged.
  useEffect(() => {
    for (const { group, keys } of groups.values()) if (group.active.get() === '') group.order.set(keys);
  });
  if (hidden) return null;
  const header = slot ?? title;
  const inset = style === 'insetGrouped';
  return (
    <View testID={testID} style={inset ? styles.inset : null}>
      {header != null ? (
        <View
          style={[
            styles.captionBlock,
            { paddingTop: first ? list.header.first : list.header.above, paddingBottom: list.header.below },
          ]}>
          <Caption kind="header">{header}</Caption>
        </View>
      ) : (
        <View style={{ height: first ? 0 : list.sectionGap }} />
      )}
      <Animated.View
        style={[
          { backgroundColor: inset ? colors.card : colors.plain, borderRadius: inset ? list.cardRadius : 0 },
          inset ? card : null,
        ]}>
        {rows.map((row, index) => (
          <RowLastContext key={row.key ?? index} value={index === rows.length - 1}>
            {row}
          </RowLastContext>
        ))}
      </Animated.View>
      {footer != null ? (
        <View style={[styles.captionBlock, { paddingTop: list.footer.above }]}>
          <Caption kind="footer">{footer}</Caption>
        </View>
      ) : null}
    </View>
  );
};

/** A list's or a form's children as sections: rows given loose go together into one section without a header. */
export const sectionsOf = (children: ReactNode) => {
  const out: ReactNode[] = [];
  let loose: ReactElement[] = [];
  const flush = () => {
    if (loose.length === 0) return;
    out.push(
      <Section key={`loose-${out.length}`} first={out.length === 0}>
        {loose}
      </Section>,
    );
    loose = [];
  };
  const walk = (node: ReactNode) =>
    Children.forEach(node, (child) => {
      if (!isValidElement<{ children?: ReactNode }>(child)) return;
      if (child.type === Fragment) return walk(child.props.children);
      if (child.type === Section || child.type === UniversalFieldGroup.Section) {
        flush();
        out.push(
          <Section
            key={child.key ?? `section-${out.length}`}
            {...(child.props as FieldSectionProps)}
            first={out.length === 0}
          />,
        );
        return;
      }
      loose.push(child);
    });
  walk(children);
  flush();
  return out;
};

const styles = StyleSheet.create({
  inset: { marginHorizontal: list.cardMargin },
  captionBlock: { paddingHorizontal: list.rowPadding },
  caption: { textAlign: 'auto' },
});
