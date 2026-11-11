import { useFonts } from 'expo-font';
import type { Href } from 'expo-router';
import { SymbolView, type SFSymbol, type AndroidSymbol } from 'expo-symbols';
import regular from 'expo-symbols/androidWeights/regular';
import { Platform, StyleSheet, Text, View } from 'react-native';

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
    slug: 'swipes',
    name: 'Swipe styles',
    summary: 'Swipe actions on one-line and two-line rows, and without icons',
  },
  {
    slug: 'contacts',
    name: 'Contacts',
    summary: 'A plain list by first letter, with the index along its edge',
  },
  {
    slug: 'headers',
    name: 'Headers and actions',
    summary: 'Header actions, a prominent header, the ⓘ accessory and action rows',
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
// On Android, SymbolView draws its glyph as text that grows with the font scale inside a box that doesn't, clipping it;
// the glyph is drawn here unscaled instead, as Settings' icons keep their size at any text size.
const symbolFonts = { [regular.name]: regular.font };

export const RowIcon = ({ ios, android, color }: { ios: SFSymbol; android: AndroidSymbol; color: string }) => {
  const [loaded] = useFonts(symbolFonts);
  return (
    <View style={[styles.icon, { backgroundColor: color }]}>
      {Platform.OS !== 'android' ? (
        <SymbolView name={{ ios, android }} size={18} tintColor="#FFFFFF" />
      ) : loaded ? (
        <Text aria-hidden allowFontScaling={false} style={[styles.glyph, { fontFamily: regular.name }]}>
          {android}
        </Text>
      ) : null}
    </View>
  );
};

/** An unread message's blue dot, read out as "Unread". */
export const UnreadDot = () => <View accessible accessibilityLabel="Unread" style={styles.dot} />;

const styles = StyleSheet.create({
  icon: { width: 29, height: 29, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 18, lineHeight: 18, color: '#FFFFFF' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#007AFF' },
});
