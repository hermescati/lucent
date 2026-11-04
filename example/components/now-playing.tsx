import { SymbolView } from 'expo-symbols';
import { NativeTabs } from 'expo-lucent/navigation';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePalette } from '@/components/ui';

/** The tab bar's bottom accessory in the example: a now-playing bar, as in Music. */
export const NowPlaying = () => {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { text } = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.art} />
      <Text style={[styles.title, { color: text }]} numberOfLines={1}>
        {placement === 'inline' ? 'Liquid Glass' : 'Liquid Glass — The Lucent Band'}
      </Text>
      <Pressable hitSlop={8} accessibilityLabel="Play">
        <SymbolView name={{ ios: 'play.fill', android: 'play_arrow' }} size={20} tintColor={text} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  art: { width: 30, height: 30, borderRadius: 6, backgroundColor: '#FF8433' },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
});
