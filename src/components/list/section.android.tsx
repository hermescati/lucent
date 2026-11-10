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
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { useNativeGesture } from 'react-native-gesture-handler';
import Animated, {
  makeMutable,
  measure,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  type AnimatedRef,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { list, listColors } from './tokens';
import type { FieldSectionProps, ListForEachProps, ListStyle } from './types';
import { ScreenOverlayContext } from '../../core/overlay';
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

/**
 * A dragged row and the list scrolling under it: the finger's height on the screen (-1 when no row is dragged), which
 * scrolls the list near its visible ends, and how far the list has scrolled, which the dragged row adds to stay under it.
 */
export interface ListAutoScroll {
  finger: SharedValue<number>;
  scrollY: SharedValue<number>;
  // The scroll view, which a recycling `List.ForEach` measures itself against to find the rows on screen.
  scrollRef: AnimatedRef<Animated.ScrollView>;
  // How far down the scroll view its content shows from, under the navigation bar.
  barTop: number;
}

export const ListAutoScrollContext = createLucentContext<ListAutoScroll | null>('ListAutoScroll', null);

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
  // Whether a drop has called `onMove` and React hasn't laid the rows out in their new order yet: until it has, the
  // rows keep drawing themselves at their places in `order`, however long that takes.
  pending: SharedValue<boolean>;
  onMove?: (sourceIndices: number[], destination: number) => void;
  // Whether a row is lifted: its section lets its rows draw outside its card meanwhile, for the lifted row's shadow.
  lifted: SharedValue<boolean>;
  // Whether that row is still held: drawn in the screen's overlay, its card clips its faded copy; let go, it settles in
  // the list with its widened card and shadow, so the card lets it draw outside until it has.
  held: SharedValue<boolean>;
  // The rows' heights on the JS thread too, for the room a recycling `List.ForEach` keeps for the rows it doesn't draw.
  sizes: Map<string, number>;
}

const reorderGroup = (keys: string[]): ReorderGroup => ({
  sizes: new Map(),
  order: makeMutable(keys),
  heights: makeMutable<Record<string, number>>({}),
  active: makeMutable(''),
  drag: makeMutable(0),
  moving: makeMutable(false),
  pending: makeMutable(false),
  lifted: makeMutable(false),
  held: makeMutable(false),
});

/** What a row can do in edit mode, from its `List.ForEach`: be deleted, and be moved. */
export interface RowEdit {
  onDelete?: () => void;
  movable: boolean;
  reorder?: { group: ReorderGroup; key: string; index: number; keys: string[] };
  // Its key, for selection, and the next row's, whose selection hides the separator between them.
  key?: string;
  nextKey?: string;
  // A movable row reports its height here: a recycling `List.ForEach` can't wrap it to measure it, which would keep
  // the lifted row from drawing over the others.
  onHeight?: (height: number) => void;
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
  onHeight?: (height: number) => void,
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
        onHeight,
      }}>
      {render({ item, index })}
    </RowEditContext>
  );
};

export const useListColors = () => listColors[useLucentTheme().scheme === 'dark' ? 'dark' : 'light'];

/** A list's margins: a card's from the screen's edges and a row's content from the card's, 20 on wide phones. */
export const useListMargin = () => (useWindowDimensions().width >= list.wide.from ? list.wide.margin : list.rowPadding);

export const SectionHeader = UniversalFieldGroup.SectionHeader;
export const SectionFooter = UniversalFieldGroup.SectionFooter;

// `List.ForEach`'s rows, drawn all at once: Android's list scrolls in one view, so a section can number its rows.
export const ListForEach = <T,>(props: ListForEachProps<T>) => {
  const keys = props.data.map((item, index) => props.keyExtractor(item, index));
  return <>{props.data.map((item, index) => editableRow(props, item, index, keys))}</>;
};

/**
 * A recycling `List.ForEach`'s rows, as `@expo/ui`'s web one draws them: only the rows on screen and `overscanCount`
 * either side (three times as many ahead of a scroll), with room kept above and below for the rest, at the height each had when drawn, or `estimatedItemSize`
 * until it has been. The rows on screen are found on the UI thread as the list scrolls, and React draws again only as
 * they near the edge of what's drawn. A dragged row, and every row between it and the screen, stay drawn, so a drag that
 * scrolls the list keeps its row; each row is drawn once for its data, so drawing more doesn't interrupt the drag.
 */
const RecycledRows = <T,>({
  each,
  keys,
  group,
  scroll,
}: {
  each: ListForEachProps<T>;
  keys: string[];
  group: ReorderGroup;
  scroll: ListAutoScroll;
}) => {
  const { data, overscanCount = 10, estimatedItemSize = 64 } = each;
  const count = keys.length;
  const endsSection = useContext(RowLastContext);
  const { height: screen } = useWindowDimensions();
  // Before the list is laid out, as many rows as would fill the screen and `overscanCount` more: the rest come once
  // it's on screen, so a screen with a long list opens as quickly as one with a short list.
  const [range, setRange] = useState(() => ({ start: 0, end: Math.ceil(screen / estimatedItemSize) + overscanCount }));
  const drawn = useSharedValue(range);
  // Which way the list last scrolled: down, or up.
  const down = useSharedValue(true);
  const container = useAnimatedRef<Animated.View>();
  const laidOut = useSharedValue(0);
  // Each row's element, made once for what it's made from, so a row React draws again unchanged is left alone.
  const [cache] = useState(() => new Map<string, { from: unknown[]; row: ReactElement }>());

  useAnimatedReaction(
    () => {
      scroll.scrollY.get();
      laidOut.get();
      const box = measure(container);
      const view = measure(scroll.scrollRef);
      if (!box || !view) return null;
      const top = view.pageY - box.pageY;
      const bottom = top + view.height;
      const heights = group.heights.get();
      let y = 0;
      let first = count;
      let last = count - 1;
      for (let i = 0; i < count; i++) {
        if (y >= bottom) {
          last = i - 1;
          break;
        }
        const height = heights[keys[i]] ?? estimatedItemSize;
        if (first === count && y + height > top) first = i;
        y += height;
      }
      return { first, last: Math.max(last, first - 1), active: keys.indexOf(group.active.get()) };
    },
    (now, before) => {
      if (!now) return;
      const { start, end } = drawn.get();
      // Drawn ahead of a scroll three times as far as behind it, and drawn again while twice `overscanCount` rows are
      // still ahead: a fling reaches rows faster than they mount.
      if (before && now.first !== before.first) down.set(now.first > before.first);
      const ahead = down.get();
      const covered =
        (start === 0 || now.first >= start + (ahead ? 0 : 2 * overscanCount)) &&
        (end >= count || now.last < end - (ahead ? 2 * overscanCount : 0)) &&
        (now.active < 0 || (now.active >= start && now.active < end));
      if (covered) return;
      const first = Math.min(now.first, count);
      let next = {
        start: Math.max(0, first - overscanCount * (ahead ? 1 : 3)),
        end: Math.min(count, now.last + 1 + overscanCount * (ahead ? 3 : 1)),
      };
      if (now.active >= 0) next = { start: Math.min(next.start, now.active), end: Math.max(next.end, now.active + 1) };
      drawn.set(next);
      scheduleOnRN(setRange, next);
    },
  );
  // Over the section's other rows while one of these is lifted.
  const lifted = useAnimatedStyle(() => ({ zIndex: group.active.get() === '' ? 0 : 1 }));

  const start = Math.min(range.start, count);
  const end = Math.min(Math.max(range.end, start), count);
  const room = (from: number, to: number) => {
    let height = 0;
    for (let i = from; i < to; i++) height += group.sizes.get(keys[i]) ?? estimatedItemSize;
    return height;
  };
  // Rows deleted from the data go from the cache now and then.
  if (cache.size > count * 2 + 50) cache.clear();
  const row = (index: number) => {
    const key = keys[index];
    const from = [data, index, each.children, each.keyExtractor, each.onDelete, each.onMove, endsSection];
    const known = cache.get(key);
    if (known && known.from.every((part, i) => part === from[i])) return known.row;
    const movable = Boolean(each.onMove) && count > 1;
    const sized = (height: number) => group.sizes.set(key, height);
    const made = (
      <RowLastContext key={key} value={endsSection && index === count - 1}>
        {movable ? (
          editableRow(each, data[index], index, keys, group, sized)
        ) : (
          // Wrapped to be measured, for the room kept for it once it's no longer drawn.
          <View
            onLayout={(event) => {
              const height = event.nativeEvent.layout.height;
              sized(height);
              group.heights.modify((heights) => {
                'worklet';
                return heights[key] === height ? heights : { ...heights, [key]: height };
              });
            }}>
            {editableRow(each, data[index], index, keys, group)}
          </View>
        )}
      </RowLastContext>
    );
    cache.set(key, { from, row: made });
    return made;
  };
  return (
    <Animated.View ref={container} style={lifted} onLayout={() => laidOut.set(laidOut.get() + 1)}>
      <View style={{ height: room(0, start) }} />
      {Array.from({ length: end - start }, (_, i) => row(start + i))}
      <View style={{ height: room(end, count) }} />
    </Animated.View>
  );
};

// A section's rows, flattened out of fragments and `List.ForEach`, its header and footer taken out. Each `List.ForEach`
// takes the next of the section's reorder groups, made as first needed, and recycles its rows unless told not to (or
// it's outside a list's scroll view).
const rowsOf = (
  children: ReactNode,
  groupFor: (n: number, keys: string[], props: ListForEachProps<unknown>) => ReorderGroup,
  scroll: ListAutoScroll | null,
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
        const n = groups++;
        const group = groupFor(n, keys, props);
        if (scroll && props.recycling !== false)
          rows.push(<RecycledRows key={`lucent-each-${n}`} each={props} keys={keys} group={group} scroll={scroll} />);
        else props.data.forEach((item, index) => rows.push(editableRow(props, item, index, keys, group)));
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
  // A lifted row draws outside the card, for its shadow, without a render mid-drag; where the screen has an overlay it
  // draws there instead, and the card keeps its corners over the faded copy left in the row's place.
  const [lifted] = useState(() => makeMutable(false));
  const [held] = useState(() => makeMutable(false));
  const overlaid = useContext(ScreenOverlayContext) !== null;
  const card = useAnimatedStyle(() => ({
    overflow: lifted.get() && !(overlaid && held.get()) ? 'visible' : 'hidden',
  }));
  const scroll = useContext(ListAutoScrollContext);
  const {
    header: slot,
    footer,
    rows,
  } = rowsOf(
    children,
    (n, keys, props) => {
      const known = groups.get(n) ?? { group: reorderGroup(keys), keys };
      known.keys = keys;
      known.group.onMove = props.onMove;
      known.group.lifted = lifted;
      known.group.held = held;
      groups.set(n, known);
      return known.group;
    },
    scroll,
  );
  // Laid out again (after a move, or new data), each group draws its rows in their new order, unless one is being
  // dragged.
  useEffect(() => {
    for (const { group, keys } of groups.values()) {
      if (group.active.get() !== '') continue;
      group.order.set(keys);
      group.pending.set(false);
    }
  });
  const margin = useListMargin();
  if (hidden) return null;
  const header = slot ?? title;
  const inset = style === 'insetGrouped';
  return (
    <View testID={testID} style={inset ? { marginHorizontal: margin } : null}>
      {header != null ? (
        <View
          style={[
            { paddingHorizontal: margin },
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
        {/* A plain list draws a separator over its first row, as iOS 27's does. */}
        {!inset && first && header == null ? (
          <View
            pointerEvents="none"
            style={[styles.topSeparator, { start: margin, end: margin, backgroundColor: colors.plainSeparator }]}
          />
        ) : null}
      </Animated.View>
      {footer != null ? (
        <View style={[{ paddingHorizontal: margin }, { paddingTop: list.footer.above }]}>
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
  topSeparator: { position: 'absolute', top: 0, height: StyleSheet.hairlineWidth },
  caption: { textAlign: 'auto' },
});
