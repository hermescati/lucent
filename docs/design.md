# Lucent API design

Status: glass, tabs, the search bar, the navigation bar and bottom toolbar (`Stack`), `Switch`, `Slider`, `SegmentedControl`, `Button`, `ProgressView`, `Stepper` and `ContentUnavailableView` are built (Android implementation, iOS pass-through); see [Built](#built). Everything under [Planned](#planned) is not built yet. Targets Expo SDK 58 (`expo` 58.0.x, `expo-router` 58.0.x, `expo-glass-effect` 58.0.x, `@expo/ui` 58.0.x). Prop names below were read from those packages' installed type definitions.

## What Lucent is

Lucent gives an Expo app Apple's iOS 26 look on both platforms from one component API:

- **iOS:** every component is the real system one. Lucent passes through to Expo (`expo-glass-effect`, `expo-router`, `@expo/ui`), so the app gets Apple's rendering, motion and future updates.
- **Android:** Lucent draws an iOS-styled recreation: Liquid Glass via our shader, plus iOS shapes, spacing and springs.

A screen never branches on the platform. It imports from `expo-lucent` and gets the right implementation automatically.

Lucent is an add-on for Expo apps, not a framework beside Expo. Its users already have expo-router and `@expo/ui`; on iOS Lucent renders nothing of its own, so nothing is duplicated. A bare React Native app without Expo modules is out of scope: it can't reach Apple's glass or `NativeTabs` either way.

## The rules

1. **Copy Expo's API where Expo has the component.** Lucent props are the same names, types and defaults as the Expo component we copy, so Expo's docs apply to Lucent too. If Expo later covers a component properly on Android, Lucent can step aside without screens changing.
2. **Which Expo API we copy, in order of preference:**
   1. The dedicated Expo package, when one exists: `expo-glass-effect` for glass, `expo-router` for tabs, headers and the search bar.
   2. `@expo/ui` universal components (imported from the `@expo/ui` root). They have one shared, React Native–style API across platforms.
   3. `@expo/ui/community/*` drop-ins (menu, segmented control, …), which copy well-known React Native library APIs.
   4. No universal or community counterpart (the component is only in `@expo/ui/swift-ui`, or nowhere in Expo): we design the API ourselves, taking the **structure** from SwiftUI (because the look is Apple's) and the **naming** from React Native (see conventions).
3. **Never copy the platform-specific layers' naming.** `@expo/ui/swift-ui` (`isOn`, `isPresented`) and `@expo/ui/jetpack-compose` (`onClick`, `onCheckedChange`, `onDismissRequest`) are references for behaviour only.
4. **Lucent-only features are optional props with defaults.** Where Expo's universal API is thinner than SwiftUI (`Button` has no icon, `Slider` no labels), Lucent adds props, but only additively: leaving them out gives exactly the Expo behaviour, and dropping Lucent back to `@expo/ui` only means deleting props. They're marked **Lucent** in the tables below.
5. **Plumbing stays hidden.** Expo's native components need a `Host` wrapper, and our Android glass needs a backdrop that captures the screen behind it. Lucent places both itself; screens never mention them.
6. **The catalog is Apple's, not Expo's.** Lucent builds what iOS has, taken from Apple's Human Interface Guidelines. Expo decides what the props are called (rules 1 to 3), never whether a component gets built: Expo's universal list is a floor for naming, not a ceiling for scope. Four cases follow:
   - iOS has it and `@expo/ui` universal has it (Switch, Slider, Button, Picker): copy the universal props, pass through on iOS, recreate on Android.
   - iOS has it and Expo only has it in `@expo/ui/swift-ui` (Stepper, ProgressView, ContentUnavailableView, Popover, Gauge): Lucent defines the props in the conventions below, maps them to the SwiftUI component on iOS and recreates on Android. Shape the props as the universal layer would, so that if Expo promotes the component, swapping in Expo's type is at most a rename.
   - iOS has it and Expo has nothing: Lucent writes both sides, a small Expo module in its own native code on iOS, or a JS recreation when the native part is small.
   - Android has it and iOS doesn't (floating action button, chips, navigation drawer, snackbar): Lucent doesn't ship it. An app that needs one imports it from `@expo/ui/jetpack-compose` directly. Where a universal component has no iOS form (Checkbox), Lucent maps it to the nearest iOS convention (a checkmark row) rather than draw a Material control on iOS.
7. **Parity means the same on both platforms, not native on both.** An Android user of a Lucent app sees iOS 26, by design. Material on Android is `@expo/ui`'s job, not Lucent's, and a request for it is out of scope rather than a bug.
8. **One package, entry points by dependency.** `expo-lucent` is glass, theming and the controls; `expo-lucent/navigation` is the tab bar, the navigation bar and the search bar. Navigation's peers (expo-router, react-native-screens, react-native-safe-area-context, react-native-keyboard-controller) are optional and nothing in the root entry imports them, so an app that only wants glass controls installs only what those need. `@expo/ui` and `expo-glass-effect` stay required: the root entry's iOS files import them, and an optional peer that a bundle can't do without only moves the error from install time to build time. The install docs list the two tiers.

## Conventions

| Concept             | Lucent name                                                                                      | Not                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Press               | `onPress`                                                                                        | `onClick`, `action`                                                      |
| Boolean control     | `value` + `onValueChange`                                                                        | `isOn` / `onIsOnChange`, `checked`                                       |
| Selection           | `selectedValue` + `onValueChange` (Picker), `selectedIndex` + `onValueChange` (SegmentedControl) | `selection`                                                              |
| Text                | `value` + `onChangeText`                                                                         | `text` / `onTextChange`                                                  |
| Presentation        | `isPresented` + `onDismiss`                                                                      | mount/unmount, `onDismissRequest`                                        |
| Disabled            | `disabled`                                                                                       | `enabled` (except where the copied Expo API uses `enabled`, e.g. Picker) |
| Icons               | `name` / `sf` + `md` (SF Symbol on iOS, Material Symbol on Android) or an image `src`            | per-platform components                                                  |
| Colours             | `tintColor`, `color`, `backgroundColor`… as plain props                                          | `colors={{ … }}` objects, modifiers                                      |
| Destructive actions | `destructive: true` on the item                                                                  | `role: 'destructive'`                                                    |

Every component also accepts `testID`, and visual components accept `style` limited to layout (margin, size, alignment). Glass, colour and shape come from props and the theme, not from `style`.

## Built

These have their own pages, with props and Android behaviour:

- [Glass](components/glass.md): `GlassView`, `GlassContainer`, `GlassBackdrop`
- [Tab bar](components/tabs.md): `NativeTabs`, `TabScrollView` and the scroll hooks
- [Navigation bar](components/stack.md): `Stack` with its navigation bar, bottom toolbar and swipe back, `useHeaderScroll`, `useHeaderInset`, `useToolbarInset`
- [Search bar](components/search.md): `SearchBar`, `useTabSearch`
- [Switch](components/switch.md), [Slider](components/slider.md), [Segmented control](components/segmented-control.md), [Button](components/button.md), [Progress view](components/progress-view.md), [Stepper](components/stepper.md), [Content unavailable view](components/content-unavailable.md)
- [Theming](theming.md): `LucentProvider`

## Planned

Each component lists the Expo API it copies. "Same as Expo" means identical props; only Lucent additions are listed.

### Universal controls (copy `@expo/ui`)

All accept `testID`, `disabled`, `hidden` and layout `style`, like the `@expo/ui` universal base props.

| Component                          | Props (same as `@expo/ui`)                                                                                                                                          | Lucent additions                                                  |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `Checkbox`                         | `value`, `onValueChange`, `label`                                                                                                                                   | — (iOS has no checkbox: renders a checkmark row)                  |
| `Picker` + `Picker.Item`           | `selectedValue`, `onValueChange`, `appearance: 'wheel' \| 'menu'`, `enabled`; items `label`, `value`                                                                | —                                                                 |
| `TextInput`                        | React Native `TextInput` props (`value`, `onChangeText`, `placeholder`, `secureTextEntry`, …)                                                                       | —                                                                 |
| `BottomSheet`                      | `isPresented`, `onDismiss`, `snapPoints: ('half' \| 'full' \| { fraction } \| { height })[]`, `showDragIndicator`, `contentPadding`, `containerColor`, `scrimColor` | Glass sheet background by default                                 |
| `List`, `ListItem`                 | `List`: `onRefresh`; `ListItem`: `onPress`, `leading`, `trailing`, `supportingText`                                                                                 | `ListItem` `chevron`, `destructive`                               |
| `FieldGroup`, `FieldGroup.Section` | `title`, `titleUppercase`, header/footer slots                                                                                                                      | — (iOS inset grouped form)                                        |
| `Collapsible`                      | `isOpen`, `onOpenChange`, `label`                                                                                                                                   | —                                                                 |
| `Icon`                             | `name: SFSymbol \| image \| { ios, android }`, `size`, `color`                                                                                                      | `md` (Material Symbol) as an alternative to `{ ios, android }`    |
| `Text`                             | `@expo/ui` `Text` props                                                                                                                                             | iOS text styles: `textStyle: 'body' \| 'headline' \| 'caption' …` |

### Community drop-ins (copy `@expo/ui/community/*`)

| Component        | Copies                                 | Props                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Menu`           | `@expo/ui/community/menu` (`MenuView`) | `actions: MenuAction[]` (`id`, `title`, `image`, `state`, `attributes: { destructive, disabled, hidden }`, `subactions`, `displayInline`), `onPressAction`, `onOpenMenu`, `onCloseMenu`, `shouldOpenOnLongPress`, `title`, `children` (trigger) |
| `DateTimePicker` | `@expo/ui/community/datetime-picker`   | to verify when we reach it                                                                                                                                                                                                                      |

### Lucent-designed (SwiftUI-only or no Expo counterpart)

Rule 6's second and third cases. Structure from SwiftUI, naming from the conventions above. Each gets its own short spec before it's built.

| Component            | SwiftUI reference                       | Sketch                                                                                                               |
| -------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ContextMenu`        | `ContextMenu` (trigger, preview, items) | `<ContextMenu actions={…} onPressAction={…} preview={…}>{children}</ContextMenu>`, same `MenuAction` shape as `Menu` |
| `Toolbar` (floating) | `.toolbar` / bottom bar                 | glass capsule of buttons, merges via `GlassContainer`                                                                |
| `Popover`            | `Popover`                               | `isPresented`, `onDismiss`, `anchor`                                                                                 |
| `Alert`              | `Alert`                                 | prefer React Native `Alert.alert`; restyle on Android                                                                |
| `Gauge`              | same names                              | `value` + `onValueChange`                                                                                            |

## Theming

Lucent ships Apple's defaults: system colours, iOS spacing and radii, glass presets and spring configs. Today colours and glass opacity are themable through `LucentProvider`; see [Theming](theming.md). Glass presets, springs, radii and typography are fixed for now; they may open up once more components exist.

## Platform support

|           | iOS                                                                                                                                                                                                                                                                                                                | Android                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| Minimum   | iOS 26 for the full look; earlier iOS gets whatever Expo renders there                                                                                                                                                                                                                                             | API 33+ (Android 13): liquid glass. Below, or with high-contrast text: solid fallback |
| Rendering | Native (Expo / SwiftUI / UIKit)                                                                                                                                                                                                                                                                                    | Lucent native module (shader, glass views) + React Native + Reanimated                |
| Requires  | Per entry point (rule 8). Everything together: expo-router, expo-glass-effect, expo-symbols, expo-haptics, react-native-reanimated 4, react-native-worklets, react-native-gesture-handler 3, react-native-keyboard-controller, react-native-screens, react-native-safe-area-context, `@expo/ui`, react-native-svg. |                                                                                       |

## Open questions

1. **Icons:** Expo uses `sf` + `md` (Material Symbols via `expo-symbols`). Should Lucent also map SF Symbol names to bundled lookalikes on Android so one name works on both? Proposal: no for now; `sf` + `md` is Expo's pattern.
2. **Android's predictive back:** decided, Lucent takes it. On Android 14 and later, with `android.predictiveBackGestureEnabled` on, a native view holds an `OnBackPressedCallback` while the stack's top screen can go back, and hands each step of the gesture to a Reanimated worklet as a view event, on the UI thread: the screen follows the finger from either edge with no JS in between, as the full-screen swipe does (a prototype that went through JS lagged 23 to 48ms). Android's arrow still shows; apps can't hide it. Below Android 14, or with predictive back off, the gesture and the Back key pop with the stack's push and pop motion.
