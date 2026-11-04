import { TabScrollMarker, useTabBarInset, useTabBarScroll } from 'expo-lucent/navigation';
import { Image, Platform, ScrollView, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  seed: string;
}

const photo = (seed: string, index: number, width: number, height: number) => ({
  uri: `https://picsum.photos/seed/${seed}-${index}/${width}/${height}`,
});

export const Gallery = ({ title, seed }: Props) => {
  const dark = useColorScheme() === 'dark';
  const onScroll = useTabBarScroll();
  const inset = useTabBarInset();
  const { top } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const tile = (width - 16 * 2 - 12) / 2;
  const text = { color: dark ? '#FFFFFF' : '#000000' };
  const secondary = { color: dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)' };

  return (
    <TabScrollMarker>
      <Animated.ScrollView
        style={{ backgroundColor: dark ? '#000000' : '#FFFFFF' }}
        contentInsetAdjustmentBehavior="automatic"
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: Platform.OS === 'android' ? top + 16 : 16, paddingBottom: inset + 16 }}>
        <Text style={[styles.title, text]}>{title}</Text>
        <View style={styles.section}>
          <Image fadeDuration={0} source={photo(seed, 0, 720, 540)} style={styles.hero} />
          <Text style={[styles.heroTitle, text]}>Featured</Text>
          <Text style={[styles.caption, secondary]}>A fresh pick every day</Text>
        </View>
        <Text style={[styles.heading, text]}>Collections</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
          {Array.from({ length: 6 }, (_, index) => (
            <Image fadeDuration={0} key={index} source={photo(seed, index + 1, 300, 300)} style={styles.square} />
          ))}
        </ScrollView>
        <Text style={[styles.heading, text]}>For you</Text>
        <View style={styles.grid}>
          {Array.from({ length: 12 }, (_, index) => (
            <Image
              key={index}
              source={photo(seed, index + 10, 360, 480)}
              style={[styles.tile, { width: tile, height: tile * (index % 3 === 0 ? 1.4 : 1.1) }]}
            />
          ))}
        </View>
      </Animated.ScrollView>
    </TabScrollMarker>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 34,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  section: {
    marginHorizontal: 16,
  },
  hero: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
  },
  caption: {
    fontSize: 15,
    marginTop: 2,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    marginHorizontal: 16,
    marginTop: 28,
    marginBottom: 12,
  },
  shelf: {
    paddingHorizontal: 16,
    gap: 12,
  },
  square: {
    width: 150,
    height: 150,
    borderRadius: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 16,
  },
  tile: {
    borderRadius: 16,
  },
});
