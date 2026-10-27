# Lucent

**iOS 26 Liquid Glass for Expo, on Android too.** Glass, the floating tab bar and the search morph, from one component API that copies Expo's own.

- **iOS:** every component is the real system one. Lucent passes straight through to Expo (`expo-glass-effect`, `expo-router`).
- **Android:** Lucent draws an iOS-styled recreation: Liquid Glass through its own refraction shader, with iOS shapes, spacing and springs.

<p align="center">
  <img src="docs/media/tab-bar.webp" width="540" alt="Lucent's glass tab bar on Android over photos: switching tabs, dragging the lens between tabs and minimizing on scroll" />
</p>

The props copy Expo's own APIs, so Expo's docs apply. See [docs/API.md](docs/API.md) for the full API and what's planned.

## What's in it

|                                                                                      |                                                                                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `GlassView`, `GlassContainer`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable` | Same as `expo-glass-effect`                                                                                                    |
| `NativeTabs`                                                                         | Same as `expo-router/native-tabs`; Android gets the floating glass bar with the lens, drag between tabs and minimize on scroll |
| `SearchBar`                                                                          | Same as expo-router's `Stack.SearchBar`; on Android the search tab morphs into the field and rides the keyboard                |
| `LucentProvider`                                                                     | Optional: colour scheme, tint and colour overrides                                                                             |
| `useTabBarScroll`, `useTabBarInset`, `TabScrollMarker`                               | Wire scroll views to the bar                                                                                                   |
| `GlassBackdrop`                                                                      | Only for glass outside `NativeTabs` on Android                                                                                 |

## Install

Lucent needs a development build (it ships a native Android module), Expo SDK 58 and expo-router.

```sh
npx expo install expo-lucent expo-router expo-glass-effect expo-symbols expo-haptics \
  react-native-reanimated react-native-worklets react-native-gesture-handler \
  react-native-keyboard-controller react-native-screens react-native-safe-area-context
npx expo run:android
```

Keep `expo-router` in your app config's `plugins`: its config plugin turns on the react-native-screens feature that `TabScrollMarker` needs to minimize the iOS tab bar.

## Use

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-lucent';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor="#FF8433" minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

```tsx
// app/(tabs)/search/index.tsx
import { SearchBar } from 'expo-lucent';

<SearchBar placeholder="Search" onChangeText={(event) => setQuery(event.nativeEvent.text)} />;
```

```tsx
// any tab screen
import { useTabBarInset, useTabBarScroll } from 'expo-lucent';
import Animated from 'react-native-reanimated';

const onScroll = useTabBarScroll();
const inset = useTabBarInset();

<Animated.ScrollView onScroll={onScroll} contentContainerStyle={{ paddingBottom: inset }} />;
```

## Example app

```sh
cd example
npm install
npx expo run:android   # or: npx expo run:ios
```

## Licence

MIT. See [LICENSE](LICENSE).
