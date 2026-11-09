# Lucent docs

Lucent copies Expo's own APIs, so each page lists the Expo API it copies, what Lucent adds and how Android behaves. Expo's docs apply too.

Glass, theming and the controls come from `expo-lucent`. The tab bar, navigation bar and search bar come from `expo-lucent/navigation`, which is the only entry point that needs expo-router.

To see each component working and change its props on a device, run the [playground](../example).

## Components

| Component                                                     | Exports                                                                                               | Copies                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| [Glass](components/glass.md)                                  | `GlassView`, `GlassContainer`, `GlassBackdrop`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable` | `expo-glass-effect`                    |
| [Tab bar](components/tabs.md)                                 | `NativeTabs`, `TabScrollView`, `TabScrollMarker`, `useTabBarScroll`, `useTabBarInset`                 | `expo-router/native-tabs`              |
| [Navigation bar](components/stack.md)                         | `Stack`, `useHeaderScroll`, `useHeaderInset`, `useToolbarInset`                                       | expo-router's `Stack`                  |
| [Search bar](components/search.md)                            | `SearchBar`, `useTabSearch`                                                                           | expo-router's `Stack.SearchBar`        |
| [Switch](components/switch.md)                                | `Switch`                                                                                              | `@expo/ui`                             |
| [Slider](components/slider.md)                                | `Slider`                                                                                              | `@expo/ui`                             |
| [Segmented control](components/segmented-control.md)          | `SegmentedControl`                                                                                    | `@expo/ui/community/segmented-control` |
| [Button](components/button.md)                                | `Button`                                                                                              | `@expo/ui`                             |
| [Progress view](components/progress-view.md)                  | `ProgressView`                                                                                        | SwiftUI (no Expo counterpart)          |
| [Stepper](components/stepper.md)                              | `Stepper`                                                                                             | SwiftUI (no Expo counterpart)          |
| [Content unavailable view](components/content-unavailable.md) | `ContentUnavailableView`                                                                              | `@expo/ui` (SwiftUI only)              |

## Guides

- [Theming](theming.md): `LucentProvider`, glass opacity and colour overrides.
- [API design](design.md): the rules Lucent's API follows, and what's planned next.
