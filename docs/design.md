# Lucent API design

Status: glass, tabs, the search bar, `Switch`, `Slider` and `SegmentedControl` are built (Android implementation, iOS pass-through); see [Built](#built). Everything under [Planned](#planned) is not built yet. Targets Expo SDK 58 (`expo` 58.0.x, `expo-router` 58.0.x, `expo-glass-effect` 58.0.x, `@expo/ui` 58.0.x). Prop names below were read from those packages' installed type definitions.

## What Lucent is

Lucent gives an Expo app Apple's iOS 26 look on both platforms from one component API:

- **iOS:** every component is the real system one. Lucent passes through to Expo (`expo-glass-effect`, `expo-router`, `@expo/ui`), so the app gets Apple's rendering, motion and future updates.
- **Android:** Lucent draws an iOS-styled recreation: Liquid Glass via our shader, plus iOS shapes, spacing and springs.

A screen never branches on the platform. It imports from `expo-lucent` and gets the right implementation automatically.

## The rules

1. **Copy Expo's API where Expo has the component.** Lucent props are the same names, types and defaults as the Expo component we copy, so Expo's docs apply to Lucent too. If Expo later covers a component properly on Android, Lucent can step aside without screens changing.
2. **Which Expo API we copy, in order of preference:**
   1. The dedicated Expo package, when one exists: `expo-glass-effect` for glass, `expo-router` for tabs, headers and the search bar.
   2. `@expo/ui` universal components (imported from the `@expo/ui` root). They have one shared, React Native–style API across platforms.
   3. `@expo/ui/community/*` drop-ins (menu, segmented control, …), which copy well-known React Native library APIs.
   4. No Expo counterpart: we design the API ourselves, taking the **structure** from SwiftUI (because the look is Apple's) and the **naming** from React Native (see conventions).
3. **Never copy the platform-specific layers' naming.** `@expo/ui/swift-ui` (`isOn`, `isPresented`) and `@expo/ui/jetpack-compose` (`onClick`, `onCheckedChange`, `onDismissRequest`) are references for behaviour only.
4. **Lucent-only features are optional props with defaults.** Leaving them out gives exactly the Expo behaviour. They're marked **Lucent** in the tables below.
5. **Plumbing stays hidden.** Expo's native components need a `Host` wrapper, and our Android glass needs a backdrop that captures the screen behind it. Lucent places both itself; screens never mention them.

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
- [Search bar](components/search.md): `SearchBar`, `useTabSearch`
- [Switch](components/switch.md), [Slider](components/slider.md), [Segmented control](components/segmented-control.md)
- [Theming](theming.md): `LucentProvider`

## Planned

Each component lists the Expo API it copies. "Same as Expo" means identical props; only Lucent additions are listed.

### Header and toolbar

**`Stack.Toolbar`, header buttons**: same as expo-router's stack header API (verify exact components when we reach them). Android renders iOS-style glass header buttons and a scroll-edge blur.

### Universal controls (copy `@expo/ui`)

All accept `testID`, `disabled`, `hidden` and layout `style`, like the `@expo/ui` universal base props.

| Component                          | Props (same as `@expo/ui`)                                                                                                                                          | Lucent additions                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                           | `label`, `children`, `onPress`, `variant: 'filled' \| 'outlined' \| 'text'`                                                                                         | `variant: 'glass' \| 'glassProminent'` (iOS 26 glass buttons), `systemImage`/`icon`, `size: 'small' \| 'regular' \| 'large'`, `destructive` |
| `Checkbox`                         | `value`, `onValueChange`, `label`                                                                                                                                   | — (iOS has no checkbox: renders a checkmark row)                                                                                            |
| `Picker` + `Picker.Item`           | `selectedValue`, `onValueChange`, `appearance: 'wheel' \| 'menu'`, `enabled`; items `label`, `value`                                                                | —                                                                                                                                           |
| `TextInput`                        | React Native `TextInput` props (`value`, `onChangeText`, `placeholder`, `secureTextEntry`, …)                                                                       | —                                                                                                                                           |
| `BottomSheet`                      | `isPresented`, `onDismiss`, `snapPoints: ('half' \| 'full' \| { fraction } \| { height })[]`, `showDragIndicator`, `contentPadding`, `containerColor`, `scrimColor` | Glass sheet background by default                                                                                                           |
| `List`, `ListItem`                 | `List`: `onRefresh`; `ListItem`: `onPress`, `leading`, `trailing`, `supportingText`                                                                                 | `ListItem` `chevron`, `destructive`                                                                                                         |
| `FieldGroup`, `FieldGroup.Section` | `title`, `titleUppercase`, header/footer slots                                                                                                                      | — (iOS inset grouped form)                                                                                                                  |
| `Collapsible`                      | `isOpen`, `onOpenChange`, `label`                                                                                                                                   | —                                                                                                                                           |
| `Icon`                             | `name: SFSymbol \| image \| { ios, android }`, `size`, `color`                                                                                                      | `md` (Material Symbol) as an alternative to `{ ios, android }`                                                                              |
| `Text`                             | `@expo/ui` `Text` props                                                                                                                                             | iOS text styles: `textStyle: 'body' \| 'headline' \| 'caption' …`                                                                           |

### Community drop-ins (copy `@expo/ui/community/*`)

| Component        | Copies                                 | Props                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Menu`           | `@expo/ui/community/menu` (`MenuView`) | `actions: MenuAction[]` (`id`, `title`, `image`, `state`, `attributes: { destructive, disabled, hidden }`, `subactions`, `displayInline`), `onPressAction`, `onOpenMenu`, `onCloseMenu`, `shouldOpenOnLongPress`, `title`, `children` (trigger) |
| `DateTimePicker` | `@expo/ui/community/datetime-picker`   | to verify when we reach it                                                                                                                                                                                                                      |

### Lucent-designed (no Expo counterpart)

Structure from SwiftUI, naming from the conventions above. Each gets its own short spec before it's built.

| Component                          | SwiftUI reference                       | Sketch                                                                                                               |
| ---------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `ContextMenu`                      | `ContextMenu` (trigger, preview, items) | `<ContextMenu actions={…} onPressAction={…} preview={…}>{children}</ContextMenu>`, same `MenuAction` shape as `Menu` |
| `Toolbar` (floating)               | `.toolbar` / bottom bar                 | glass capsule of buttons, merges via `GlassContainer`                                                                |
| `Popover`                          | `Popover`                               | `isPresented`, `onDismiss`, `anchor`                                                                                 |
| `Alert`                            | `Alert`                                 | prefer React Native `Alert.alert`; restyle on Android                                                                |
| `Stepper`, `ProgressView`, `Gauge` | same names                              | `value` + `onValueChange`                                                                                            |
| `ContentUnavailableView`           | same                                    | `title`, `description`, `systemImage`, `actions`                                                                     |

## Theming

Lucent ships Apple's defaults: system colours, iOS spacing and radii, glass presets and spring configs. Today colours and glass opacity are themable through `LucentProvider`; see [Theming](theming.md). Glass presets, springs, radii and typography are fixed for now; they may open up once more components exist.

## Platform support

|           | iOS                                                                                                                                                                                                                                                                                 | Android                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Minimum   | iOS 26 for the full look; earlier iOS gets whatever Expo renders there                                                                                                                                                                                                              | API 31 (Android 12): blur glass. API 33+: refraction glass. Below: tinted fill |
| Rendering | Native (Expo / SwiftUI / UIKit)                                                                                                                                                                                                                                                     | Lucent native module (shader, glass views) + React Native + Reanimated         |
| Requires  | Both platforms: expo-router, expo-glass-effect, expo-symbols, expo-haptics, react-native-reanimated 4, react-native-worklets, react-native-gesture-handler 3, react-native-keyboard-controller, react-native-screens, react-native-safe-area-context, `@expo/ui`, react-native-svg. |                                                                                |

## Open questions

1. **Package shape:** one package (`expo-lucent`) with everything, or a core (`expo-lucent` glass + provider) plus feature entry points (`expo-lucent/tabs`, `expo-lucent/controls`)? Proposal: one package with subpath exports, so apps only bundle what they import.
2. **Peer dependencies:** `expo-router` is required for `NativeTabs`/`SearchBar`. Apps without expo-router could still use glass and controls if those live in separate entry points (see 1).
3. **Icons:** Expo uses `sf` + `md` (Material Symbols via `expo-symbols`). Should Lucent also map SF Symbol names to bundled lookalikes on Android so one name works on both? Proposal: no for now; `sf` + `md` is Expo's pattern.
4. **Where Expo's universal API is thinner than SwiftUI** (e.g. `Button` has no icon, `Slider` no labels), Lucent adds props. They must stay additive, so dropping Lucent back to `@expo/ui` only means deleting props.
