# Lucent API

Status: glass, tabs and the search bar are built (Android implementation, iOS pass-through). Everything under Header and toolbar, controls, community drop-ins and Lucent-designed components is planned. Targets Expo SDK 58 (`expo` 58.0.x, `expo-router` 58.0.x, `expo-glass-effect` 58.0.x, `@expo/ui` 58.0.x). Prop names below were read from those packages' installed type definitions.

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

## Setup

```tsx
import { LucentProvider } from 'expo-lucent';

export default function RootLayout() {
  return (
    <LucentProvider>
      <Stack />
    </LucentProvider>
  );
}
```

| Prop          | Type                                                              | Default     | Notes                                                                                                             |
| ------------- | ----------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `colorScheme` | `'auto' \| 'light' \| 'dark'`                                     | `'auto'`    |                                                                                                                   |
| `tintColor`   | `ColorValue`                                                      | system blue | App accent, used for the selected tab and the search caret.                                                       |
| `colors`      | `{ light?: Partial<LucentColors>; dark?: Partial<LucentColors> }` | —           | **Lucent.** Overrides individual chrome colours per scheme, for example the tab colours derived from `tintColor`. |

The provider is optional: without it Lucent follows the system scheme and uses system blue. Glass needs no setup: on Android, `NativeTabs` captures the screen behind its bar itself. An app that shows glass without `NativeTabs` wraps the content behind the glass in `GlassBackdrop` (a plain `View` on iOS).

## Components

Each component lists the Expo API it copies. "Same as Expo" means identical props; only Lucent additions are listed.

### Glass

**`GlassView`, `GlassContainer`, `isLiquidGlassAvailable`, `isGlassEffectAPIAvailable`**: same as `expo-glass-effect`.

| Prop                     | Type                                                                        | Default                                     |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------- |
| `glassEffectStyle`       | `'regular' \| 'clear' \| 'none' \| { style, animate?, animationDuration? }` | `'regular'`                                 |
| `tintColor`              | `ColorValue`                                                                | —                                           |
| `isInteractive`          | `boolean`                                                                   | `false`                                     |
| `colorScheme`            | `'auto' \| 'light' \| 'dark'`                                               | `'auto'`                                    |
| `GlassContainer.spacing` | `number`                                                                    | — (distance at which shapes start to merge) |

Android notes: glass can sit anywhere in a screen and see the content behind it. It sees other glass one layer deep, so glass on glass on glass is not supported. `isLiquidGlassAvailable()` returns `true` on Android 13+ (refraction) and `false` below, where Lucent falls back to blur (Android 12) or a tinted fill.

Expo's caveat applies to Lucent too: opacity below 1 on glass or a parent can stop it rendering; animate a wrapper's opacity instead.

### Tabs

**`NativeTabs`**: same as `expo-router/native-tabs`, including `NativeTabs.Trigger`, `.Trigger.Icon`, `.Trigger.Label`, `.Trigger.Badge`, `.Trigger.VectorIcon`, `NativeTabs.BottomAccessory`.

```tsx
import { NativeTabs } from 'expo-lucent';

<NativeTabs tintColor={accent} minimizeBehavior="onScrollDown">
  <NativeTabs.Trigger name="home">
    <NativeTabs.Trigger.Icon sf="house" md="home" />
    <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
  <NativeTabs.Trigger name="search" role="search">
    <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
  </NativeTabs.Trigger>
</NativeTabs>;
```

Android draws the floating glass bar (lens bubble, drag between tabs, press physics, minimize on scroll). Expo props that only describe Android's Material bar (`indicatorColor`, `rippleColor`, `labelVisibilityMode`, `disableIndicator`) are accepted and ignored, since the bar is iOS-styled. Props that only affected iOS before 26 (`blurEffect`, `shadowColor`, `backgroundColor`) are ignored on both platforms, matching iOS 26.

`role="search"` puts the tab in its own circle next to the bar, as on iOS 26. Together with `SearchBar` below, it produces the search morph.

On Android, Lucent draws Apple's behaviour for each of these:

- **Without a `role="search"` trigger**, the bar spans the full width, as on iOS.
- **`Badge`** draws a red capsule at the icon's top-right; an empty badge is a plain red circle. `badgeBackgroundColor`, `badgeTextColor` and the badge's `selectedBackgroundColor` apply. In search mode the back button keeps its tab's badge.
- **A `disabled` tab** looks normal and still reacts to a tap or drag, but the lens slides back to the current tab and nothing navigates.
- **`minimizeBehavior`**: `onScrollDown` and `onScrollUp` work as on iOS. `automatic` doesn't minimize, which is what iOS does on iPhone. Scroll views report scrolling through `useTabBarScroll()` and pad their content with `useTabBarInset()`; both are no-ops on iOS, where `TabScrollMarker` marks the scroll view instead.
- **Icons** use `md` (Material Symbol), an image `src` or Lucent's `svg`; `VectorIcon` isn't drawn yet.
- **Tapping the current tab again** pops the tab's stack back to its first screen, or, when already there, scrolls its `TabScrollView` to the top, as on iOS. The trigger's `disablePopToTop` and `disableScrollToTop` switch each off.

| Lucent addition                                     | Type                                | Default | Notes                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NativeTabs.Trigger` `automaticallyActivatesSearch` | `boolean`                           | `true`  | Selecting the search tab focuses the field. On iOS this sets the native flag that expo-router only exposes through `unstable_nativeProps`.                                                                                                                                                                                                                                                                                     |
| `NativeTabs.Trigger.Icon` `svg`                     | `string \| { default?, selected? }` | –       | SVG markup for the icon, in place of `src`, `sf` or `md`. Lucent draws it natively at the screen's scale (28pt) and caches the image, on both platforms. Supports `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` and `g`, with `fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin` and `fill-rule`; masks, gradients and transforms are ignored. `renderingMode` defaults to `template`. |

```tsx
<NativeTabs.Trigger.Icon svg={{ default: homeOutline, selected: homeFilled }} />
```

**`TabScrollView`** (Lucent): a scroll view for tab screens that does the tab bar wiring itself. It takes `ScrollView` props, except `onScroll`, which must be a Reanimated handler (`useAnimatedScrollHandler`).

- Shrinks the bar on scroll when `NativeTabs` has `minimizeBehavior`; without it the bar stays put.
- Pads the bottom of the content so it clears the bar (adds to your own `paddingBottom`).
- Scrolls to the top when the current tab is tapped again.

`TabScrollMarker`, `useTabBarScroll` and `useTabBarInset` remain for lists and custom scroll views.

```tsx
<TabScrollView contentContainerStyle={{ padding: 16 }}>…</TabScrollView>
```

### Search bar

**`SearchBar`**: same props as expo-router's `Stack.SearchBar` (react-native-screens `SearchBarProps`): `placeholder`, `onChangeText`, `onFocus`, `onBlur`, `onSearchButtonPress`, `onCancelButtonPress`, `autoFocus`, `autoCapitalize`, `tintColor`, `ref` (`focus`, `blur`, `setText`, `clearText`, `cancelSearch`).

Place it inside the search tab's screen, exactly as with expo-router:

```tsx
import { SearchBar } from 'expo-lucent';

<SearchBar placeholder="Games, library, platforms" onChangeText={(e) => setQuery(e.nativeEvent.text)} />;
```

- iOS: renders `Stack.SearchBar`; iOS 26 moves it into the tab bar.
- Android: renders nothing in the header; it hands its props to the tab bar, which morphs into the field, shows the X, rides the keyboard and handles drag-out.

On Android the field supports `placeholder`, `onChangeText`, `onFocus`, `onBlur`, `onSearchButtonPress`, `onCancelButtonPress` (the X), `autoCapitalize` and `tintColor`, and shows iOS's clear button while it has text. The `ref` methods follow iOS: `focus`, `blur`, `setText` (doesn't fire `onChangeText`), `clearText`, and `cancelSearch` (clears the text, fires `onChangeText` and closes the keyboard, staying in search). `toggleCancelButton` does nothing, as iOS 26 has no cancel button there. Focusing on open follows the trigger's `automaticallyActivatesSearch`.

**`useTabSearch()`** (Lucent): the search tab's state and commands, from any screen inside `NativeTabs`, without a ref or your own query state.

| Field                           | Type      | Notes                                                                  |
| ------------------------------- | --------- | ---------------------------------------------------------------------- |
| `query`                         | `string`  | The field's text, updated as the user types                            |
| `isFocused`                     | `boolean` | Whether the field has focus                                            |
| `setText(text)`                 | function  | Sets the field and `query`, and fires the `SearchBar`'s `onChangeText` |
| `clearText()`                   | function  | Same as `setText('')`                                                  |
| `focus()`, `blur()`, `cancel()` | function  | Same as the `SearchBar` ref's `focus`, `blur` and `cancelSearch`       |

```tsx
const { query, isFocused, setText } = useTabSearch();
```

### Header and toolbar

**`Stack.Toolbar`, header buttons**: same as expo-router's stack header API (verify exact components when we reach them). Android renders iOS-style glass header buttons and a scroll-edge blur.

### Universal controls (copy `@expo/ui`)

All accept `testID`, `disabled`, `hidden` and layout `style`, like the `@expo/ui` universal base props.

| Component                          | Props (same as `@expo/ui`)                                                                                                                                          | Lucent additions                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                           | `label`, `children`, `onPress`, `variant: 'filled' \| 'outlined' \| 'text'`                                                                                         | `variant: 'glass' \| 'glassProminent'` (iOS 26 glass buttons), `systemImage`/`icon`, `size: 'small' \| 'regular' \| 'large'`, `destructive` |
| `Switch`                           | `value`, `onValueChange`, `label`                                                                                                                                   | —                                                                                                                                           |
| `Checkbox`                         | `value`, `onValueChange`, `label`                                                                                                                                   | — (iOS has no checkbox: renders a checkmark row)                                                                                            |
| `Slider`                           | `value`, `onValueChange`, `min`, `max`, `step`                                                                                                                      | —                                                                                                                                           |
| `Picker` + `Picker.Item`           | `selectedValue`, `onValueChange`, `appearance: 'wheel' \| 'menu'`, `enabled`; items `label`, `value`                                                                | —                                                                                                                                           |
| `TextInput`                        | React Native `TextInput` props (`value`, `onChangeText`, `placeholder`, `secureTextEntry`, …)                                                                       | —                                                                                                                                           |
| `BottomSheet`                      | `isPresented`, `onDismiss`, `snapPoints: ('half' \| 'full' \| { fraction } \| { height })[]`, `showDragIndicator`, `contentPadding`, `containerColor`, `scrimColor` | Glass sheet background by default                                                                                                           |
| `List`, `ListItem`                 | `List`: `onRefresh`; `ListItem`: `onPress`, `leading`, `trailing`, `supportingText`                                                                                 | `ListItem` `chevron`, `destructive`                                                                                                         |
| `FieldGroup`, `FieldGroup.Section` | `title`, `titleUppercase`, header/footer slots                                                                                                                      | — (iOS inset grouped form)                                                                                                                  |
| `Collapsible`                      | `isOpen`, `onOpenChange`, `label`                                                                                                                                   | —                                                                                                                                           |
| `Icon`                             | `name: SFSymbol \| image \| { ios, android }`, `size`, `color`                                                                                                      | `md` (Material Symbol) as an alternative to `{ ios, android }`                                                                              |
| `Text`                             | `@expo/ui` `Text` props                                                                                                                                             | iOS text styles: `textStyle: 'body' \| 'headline' \| 'caption' …`                                                                           |

### Community drop-ins (copy `@expo/ui/community/*`)

| Component          | Copies                                 | Props                                                                                                                                                                                                                                           |
| ------------------ | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Menu`             | `@expo/ui/community/menu` (`MenuView`) | `actions: MenuAction[]` (`id`, `title`, `image`, `state`, `attributes: { destructive, disabled, hidden }`, `subactions`, `displayInline`), `onPressAction`, `onOpenMenu`, `onCloseMenu`, `shouldOpenOnLongPress`, `title`, `children` (trigger) |
| `SegmentedControl` | `@expo/ui/community/segmented-control` | `values`, `selectedIndex`, `onValueChange`, `onChange`, `enabled`, `tintColor`                                                                                                                                                                  |
| `DateTimePicker`   | `@expo/ui/community/datetime-picker`   | to verify when we reach it                                                                                                                                                                                                                      |

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

Lucent ships Apple's defaults: system colours, iOS spacing and radii, glass presets and spring configs. Today only colours are themable, through `LucentProvider` (`tintColor`, `colors`). `LucentColors` holds the chrome colours: `tint`, `text`, `placeholder`, the bar's tint, fallback, shadow and rim, the lens set, the press fill and lift, `tabAccent`, `tabActive`, `tabActiveOver` and `legibilityShadow`. The three tab colours are mixed from `tintColor` unless overridden.

Glass presets, springs, radii and typography are fixed for now; they may open up once more components exist.

## Platform support

|           | iOS                                                                                                                                                                                                                                                                                  | Android                                                                        |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Minimum   | iOS 26 for the full look; earlier iOS gets whatever Expo renders there                                                                                                                                                                                                               | API 31 (Android 12): blur glass. API 33+: refraction glass. Below: tinted fill |
| Rendering | Native (Expo / SwiftUI / UIKit)                                                                                                                                                                                                                                                      | Lucent native module (shader, glass views) + React Native + Reanimated         |
| Requires  | Both platforms: expo-router, expo-glass-effect, expo-symbols, expo-haptics, react-native-reanimated 4, react-native-worklets, react-native-gesture-handler 3, react-native-keyboard-controller, react-native-screens, react-native-safe-area-context. `@expo/ui` once controls land. |                                                                                |

## Open questions

1. **Package shape:** one package (`expo-lucent`) with everything, or a core (`expo-lucent` glass + provider) plus feature entry points (`expo-lucent/tabs`, `expo-lucent/controls`)? Proposal: one package with subpath exports, so apps only bundle what they import.
2. **Peer dependencies:** `expo-router` is required for `NativeTabs`/`SearchBar`. Apps without expo-router could still use glass and controls if those live in separate entry points (see 1).
3. **Icons:** Expo uses `sf` + `md` (Material Symbols via `expo-symbols`). Should Lucent also map SF Symbol names to bundled lookalikes on Android so one name works on both? Proposal: no for now; `sf` + `md` is Expo's pattern.
4. **Where Expo's universal API is thinner than SwiftUI** (e.g. `Button` has no icon, `Slider` no labels), Lucent adds props. They must stay additive, so dropping Lucent back to `@expo/ui` only means deleting props.
