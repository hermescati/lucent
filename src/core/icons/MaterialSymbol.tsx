import { loadAsync, useFonts } from 'expo-font';
import type { AndroidSymbol } from 'expo-symbols';
import regular from 'expo-symbols/androidWeights/regular';
import { Text, View, type ColorValue, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  name: AndroidSymbol;
  size: number;
  tintColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
}

// Loaded once for every symbol, as expo-symbols' SymbolView loads it.
const fonts = { [regular.name]: regular.font };
loadAsync(fonts).catch(() => {});

/**
 * A Material Symbol at a fixed size, as iOS's SF Symbols in bars and buttons keep theirs whatever the text size.
 * expo-symbols' SymbolView draws its glyph as text that grows with the system font scale, inside a box that doesn't,
 * which clips it at larger text sizes. The font draws each symbol from its name (a required ligature), so this draws the
 * name in it, unscaled.
 */
export const MaterialSymbol = ({ name, size, tintColor, style }: Props) => {
  const [loaded] = useFonts(fonts);
  return (
    <View collapsable={false} style={[{ width: size, height: size }, style]}>
      {loaded ? (
        <Text
          aria-hidden
          allowFontScaling={false}
          style={{ fontFamily: regular.name, fontSize: size, lineHeight: size, color: tintColor }}>
          {name}
        </Text>
      ) : null}
    </View>
  );
};
