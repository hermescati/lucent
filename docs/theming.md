# Theming

`LucentProvider` sets the colour scheme, accent colour and glass opacity for the whole app. It's optional: without it, Lucent follows the system scheme and uses system blue.

> Try it: in the [playground](../example), open the **Settings** tab.

## Usage

```tsx
// app/_layout.tsx
import { LucentProvider } from 'expo-lucent';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <LucentProvider tintColor="#FF8433">
      <Stack />
    </LucentProvider>
  );
}
```

## Props

| Prop           | Type                                                              | Default     | Notes                                                                                                                      |
| -------------- | ----------------------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------- |
| `colorScheme`  | `'auto' \| 'light' \| 'dark'`                                     | `'auto'`    | Which scheme Lucent's Android components draw in, `Stack`'s bar on iOS, and the status bar icons under `Stack` on Android. |
| `tintColor`    | `string`                                                          | system blue | The app's accent: the selected tab, the search caret, the slider's fill.                                                   |
| `glassOpacity` | `number`, `0`–`1`                                                 | `0.5`       | Android only. See below.                                                                                                   |
| `colors`       | `{ light?: Partial<LucentColors>; dark?: Partial<LucentColors> }` | —           | Overrides single colours per scheme.                                                                                       |

### Glass opacity

iOS lets people choose how Liquid Glass looks, from Clear to Tinted (Settings → Display & Brightness), and native glass follows that choice. Android has no such setting, so `glassOpacity` makes the choice for the whole app: `0` is clearest, `1` most tinted. The default, `0.5`, matches iOS's default. On iOS the system setting applies and this prop is ignored.

```tsx
<LucentProvider glassOpacity={0.7}>{children}</LucentProvider>
```

### Colours

`colors` overrides any of the colours Lucent draws its Android components with, per scheme:

```tsx
<LucentProvider
  colors={{
    light: { switchOn: '#007AFF' },
    dark: { switchOn: '#0A84FF' },
  }}>
  {children}
</LucentProvider>
```

| Group             | Colours                                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Text              | `text`, `placeholder`, `placeholderActive`                                                                                |
| Tab bar           | `barTint`, `barFallback`, `barShadow`, `tabBarRim`, `barRim`, `glassOutline`, `legibilityShadow`                          |
| Tabs              | `tabAccent`, `tabActive`, `tabActiveOver` (mixed from `tintColor` unless set)                                             |
| Lens              | `lens`, `lensActive`, `lensRim`, `lensRimEarly`, `lensTint`, `lensTintEarly`, `lensHeldTint`, `lensHeldRim`, `lensShadow` |
| Press             | `pressFill`, `pressLift`                                                                                                  |
| Badge and search  | `badge`, `badgeText`, `clearButton`                                                                                       |
| Switch            | `switchOn`, `switchOff`, `switchThumb`                                                                                    |
| Slider            | `sliderTrack`, `sliderThumb`, `sliderShadow`                                                                              |
| Segmented control | `segmentedTrack`, `segmentedThumb`, `segmentedShadow`                                                                     |
| Button            | `buttonFill`, `buttonDestructive`, `buttonDisabled`                                                                       |

## Reading the theme

`useLucentTheme()` returns the resolved `scheme`, `color` (all of the above) and `glassOpacity`. Use it to match your own UI to Lucent's.

```tsx
const { scheme, color } = useLucentTheme();
```

Glass presets, springs, radii and type sizes are fixed to Apple's values for now.
