# Changelog

All notable changes to Lucent are listed here. Each release's entries come from the changesets merged since the last one (see [.changeset](.changeset/README.md)).

## 0.1.0

The first version of Lucent: iOS 26 Liquid Glass for Expo, on Android too. Each component copies an Expo API. On iOS it renders Expo's own component, and on Android Lucent draws an iOS-styled recreation.

### Glass

- `GlassView`, `GlassContainer`, `isLiquidGlassAvailable` and `isGlassEffectAPIAvailable`, with the same API as `expo-glass-effect`. On Android, Lucent draws the glass with its own refraction shader, matched to iOS in light and dark, with colour tints, the outline and the press physics.
- `GlassBackdrop`, which marks the content Android glass refracts. On iOS it's a plain `View`.

### Tab bar

- `NativeTabs`, with the same API as `expo-router/native-tabs`, including triggers, icons, labels, badges, vector icons and `NativeTabs.BottomAccessory`. On Android, Lucent draws the floating glass bar with the lens bubble, dragging between tabs, disabled tabs and minimize on scroll.
- On Android, the selected tab's pill takes the tab's width, so longer labels fit inside it, and in dark mode it sits a shade lighter than the bar.
- On Android, a search tab without an icon gets a magnifier, as on iOS, and the tabs paint the navigation theme's background behind screens that have none, so the glass always has something to refract.
- On iOS, `NativeTabs` takes `LucentProvider`'s `tintColor` when it isn't given one, so the accent reaches the tab bar and the native controls inside it.
- SVG tab icons.
- `TabScrollView`, `TabScrollMarker`, `useTabBarScroll` and `useTabBarInset`, for minimize on scroll and keeping content clear of the bar.

### Search bar

- `SearchBar`, with the same props as expo-router's `Stack.SearchBar`. On Android, the search tab morphs into the field, shows the clear button and rides the keyboard.
- `useTabSearch`, for reading the search text and state from any screen.

### Controls

- `Switch` and `Slider`, with the same API as `@expo/ui`.
- `SegmentedControl`, with the same API as `@expo/ui/community/segmented-control`.
- On Android, all three use a shared glass lens whose motion and bend are matched frame by frame to iOS.

### Theming

- `LucentProvider` and `useLucentTheme`, for the colour scheme, accent colour, glass opacity and colour overrides across the app.

### Docs and playground

- A docs page for each component, plus guides for theming and API design.
- The example app is a playground with a page for every component, where its props can be changed live and the code copied.
