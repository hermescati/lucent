import type { Href } from 'expo-router';
import { SymbolView, type SFSymbol, type AndroidSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

export interface ListMode {
  slug: string;
  name: string;
  summary: string;
}

/** The lists demo's screens: each a whole screen, as a list fills one. */
export const listModes: ListMode[] = [
  {
    slug: 'settings',
    name: 'Settings',
    summary: 'FieldGroup: sections of rows with values, chevrons, a footer and a sign out',
  },
  {
    slug: 'picker',
    name: 'Picker',
    summary: 'A plain list of choices, the chosen one ticked',
  },
  {
    slug: 'inbox',
    name: 'Inbox',
    summary: 'Swipe actions on each row, and pull to refresh',
  },
  {
    slug: 'edit',
    name: 'Edit',
    summary: 'Edit mode: delete controls and reorder handles, with swipe to delete',
  },
  {
    slug: 'select',
    name: 'Select',
    summary: 'Multi-select: Select puts the rows in edit mode with selection circles',
  },
  {
    slug: 'long',
    name: 'Long list',
    summary: 'List.ForEach over 400 rows, rendered as they scroll in',
  },
];

export const listHref = (mode: ListMode) => `/components/lists/${mode.slug}` as Href;

export const findListMode = (slug: string) => listModes.find((mode) => mode.slug === slug);

/** A Settings-style icon: a white symbol on a coloured rounded square, as iOS's Settings rows have. */
export const RowIcon = ({ ios, android, color }: { ios: SFSymbol; android: AndroidSymbol; color: string }) => (
  <View style={[styles.icon, { backgroundColor: color }]}>
    <SymbolView name={{ ios, android }} size={18} tintColor="#FFFFFF" />
  </View>
);

/** An unread message's blue dot, read out as "Unread". */
export const UnreadDot = () => <View accessible accessibilityLabel="Unread" style={styles.dot} />;

const styles = StyleSheet.create({
  icon: { width: 29, height: 29, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
});
