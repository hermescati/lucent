# Lucent docs

Lucent copies Expo's own APIs, so each page lists the Expo API it copies, what Lucent adds and how Android behaves. Expo's docs apply too.

To see each component working and change its props on a device, run the [playground](../example).

## Components

| Component                                            | Exports                                                                                               | Copies                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [Glass](components/glass.md)                         | `GlassView`, `GlassContainer`, `GlassBackdrop`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable` | `expo-glass-effect`                    |
| [Tab bar](components/tabs.md)                        | `NativeTabs`, `TabScrollView`, `TabScrollMarker`, `useTabBarScroll`, `useTabBarInset`                 | `expo-router/native-tabs`              |
| [Search bar](components/search.md)                   | `SearchBar`, `useTabSearch`                                                                           | expo-router's `Stack.SearchBar`        |
| [Switch](components/switch.md)                       | `Switch`                                                                                              | `@expo/ui`                             |
| [Slider](components/slider.md)                       | `Slider`                                                                                              | `@expo/ui`                             |
| [Segmented control](components/segmented-control.md) | `SegmentedControl`                                                                                    | `@expo/ui/community/segmented-control` |

## Guides

- [Theming](theming.md): `LucentProvider`, glass opacity and colour overrides.
- [API design](design.md): the rules Lucent's API follows, and what's planned next.
