---
'expo-lucent': minor
---

Move the tab bar, navigation bar and search bar to `expo-lucent/navigation`. `NativeTabs`, `TabScrollView`, `TabScrollMarker`, `useTabBarScroll`, `useTabBarInset`, `Stack`, `useHeaderScroll`, `useHeaderInset`, `useToolbarInset`, `SearchBar` and `useTabSearch` now import from there; glass, theming and the controls stay in `expo-lucent`. The navigation entry is the only one that needs expo-router, react-native-screens, react-native-safe-area-context and react-native-keyboard-controller, which are now optional peer dependencies, so an app that only wants glass and controls installs only what those need.

To update, change the import of each of those names from `'expo-lucent'` to `'expo-lucent/navigation'`.
