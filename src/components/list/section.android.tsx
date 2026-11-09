import { FieldGroup as UniversalFieldGroup, List as UniversalList } from '@expo/ui';
import { Children, Fragment, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

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

/** Where a row sits in its section: the last one draws no separator under it. */
export const RowLastContext = createLucentContext<boolean>('ListRowLast', true);

export const useListColors = () => listColors[useLucentTheme().scheme === 'dark' ? 'dark' : 'light'];

export const SectionHeader = UniversalFieldGroup.SectionHeader;
export const SectionFooter = UniversalFieldGroup.SectionFooter;

// `List.ForEach`'s rows, drawn all at once: Android's list scrolls in one view, so a section can number its rows.
export const ListForEach = <T,>({ data, keyExtractor, children }: ListForEachProps<T>) => (
  <>
    {data.map((item, index) => (
      <Fragment key={keyExtractor(item, index)}>{children({ item, index })}</Fragment>
    ))}
  </>
);

// A section's rows, flattened out of fragments and `List.ForEach`, its header and footer taken out.
const rowsOf = (children: ReactNode) => {
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
        const { data, keyExtractor, children: render } = child.props as unknown as ListForEachProps<unknown>;
        data.forEach((item, index) =>
          rows.push(<Fragment key={keyExtractor(item, index)}>{render({ item, index })}</Fragment>),
        );
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
  const { header: slot, footer, rows } = rowsOf(children);
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
      <View
        style={[
          inset ? styles.card : null,
          { backgroundColor: inset ? colors.card : colors.plain, borderRadius: inset ? list.cardRadius : 0 },
        ]}>
        {rows.map((row, index) => (
          <RowLastContext key={row.key ?? index} value={index === rows.length - 1}>
            {row}
          </RowLastContext>
        ))}
      </View>
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
  card: { overflow: 'hidden' },
  captionBlock: { paddingHorizontal: list.rowPadding },
  caption: { textAlign: 'auto' },
});
