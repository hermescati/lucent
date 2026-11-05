# Tab bar

The iOS 26 floating glass tab bar. Same API as [`expo-router`'s `NativeTabs`](https://docs.expo.dev/versions/v58.0.0/sdk/router-native-tabs/), including `NativeTabs.Trigger`, `.Trigger.Icon`, `.Trigger.Label`, `.Trigger.Badge`, `.Trigger.VectorIcon` and `NativeTabs.BottomAccessory`.

- **iOS:** expo-router's `NativeTabs`, so you get the system tab bar.
- **Android:** Lucent draws the same floating glass bar, with the lens bubble, dragging between tabs, press physics and minimize on scroll.

<p align="center">
  <img src="../media/tab-bar.webp" width="540" alt="Lucent's glass tab bar on Android in dark mode with a now-playing accessory: switching tabs, dragging the lens between tabs, then minimizing on scroll as the accessory drops into the bar's row, and expanding again" />
</p>

> Try it: the [playground](../../example) runs inside `NativeTabs`. Open **Components → Tab Bar** to change its props live.

## Usage

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-lucent/navigation';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor="#FF8433" minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Icon sf="books.vertical" md="library_books" />
        <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Badge>3</NativeTabs.Trigger.Badge>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="search" role="search">
        <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

`role="search"` puts that tab in its own circle next to the bar, as on iOS 26. Together with [`SearchBar`](search.md) it gives you the search morph.

## Scroll views

Use `TabScrollView` in tab screens. It's a `ScrollView` that:

- shrinks the bar on scroll when `NativeTabs` has a `minimizeBehavior`,
- pads the bottom of the content so it clears the bar (on top of your own `paddingBottom`),
- scrolls to the top when the current tab is tapped again.

```tsx
import { TabScrollView } from 'expo-lucent/navigation';

<TabScrollView contentContainerStyle={{ padding: 16 }}>…</TabScrollView>;
```

It takes `ScrollView` props, except that `onScroll` must be a Reanimated handler (`useAnimatedScrollHandler`).

For lists and custom scroll views, wire them up yourself:

```tsx
import { TabScrollMarker, useTabBarInset, useTabBarScroll } from 'expo-lucent/navigation';
import Animated from 'react-native-reanimated';

const onScroll = useTabBarScroll();
const inset = useTabBarInset();

<TabScrollMarker>
  <Animated.FlatList onScroll={onScroll} contentContainerStyle={{ paddingBottom: inset }} … />
</TabScrollMarker>;
```

On Android `useTabBarScroll` and `useTabBarInset` do the work. On iOS they're no-ops, and `TabScrollMarker` tells the system tab bar which view scrolls.

Keep `expo-router` in your app config's `plugins`: its config plugin turns on the react-native-screens feature that `TabScrollMarker` needs to minimize the iOS tab bar.

## Bottom accessory

`NativeTabs.BottomAccessory` shows any content in a glass capsule above the tabs, as `UITabBarController.bottomAccessory` does: a now-playing bar, an upload's progress, a row of actions.

```tsx
function NowPlaying() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return placement === 'inline' ? <ShortRow /> : <FullRow />;
}

<NativeTabs minimizeBehavior="onScrollDown">
  <NativeTabs.BottomAccessory>
    <NowPlaying />
  </NativeTabs.BottomAccessory>
  {/* triggers */}
</NativeTabs>;
```

- **Two placements.** `regular` spans the bar's width just above it; once the bar minimizes, `inline` sits in the bar's row between its circles. As on iOS, the content is rendered once per placement, so keep its state outside it (a store, context or props) for both copies to agree.
- **The bar fills its room** while there's an accessory, so the two line up.
- **Search** hides it while its field is open.
- **Screens** leave room under their content for it (`TabScrollView`, `useTabBarInset`).
- To hide it, stop rendering the element: it fades out.

On Android it moves as iOS 27's does when the bar minimizes: the bar and accessory shrink a little together, the bar gathers into its circle as the content swaps to the inline copy, and the accessory narrows, drops into the row and settles with a little give. Pressed, it swells as glass does.

## Lucent additions

| Prop                                                | Type                                | Default | Notes                                                                                                                                      |
| --------------------------------------------------- | ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `NativeTabs.Trigger` `automaticallyActivatesSearch` | `boolean`                           | `true`  | Selecting the search tab focuses the field. On iOS this sets the native flag that expo-router only exposes through `unstable_nativeProps`. |
| `NativeTabs.Trigger.Icon` `svg`                     | `string \| { default?, selected? }` | —       | SVG markup for the icon, in place of `src`, `sf` or `md`. Drawn natively at the screen's scale and cached, on both platforms.              |

```tsx
<NativeTabs.Trigger.Icon svg={{ default: homeOutline, selected: homeFilled }} />
```

The `svg` icon supports `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` and `g`, with `fill`, `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin` and `fill-rule`. Masks, gradients and transforms are ignored. `renderingMode` defaults to `template`.

## Android behaviour

- **Layout**, as iOS 27 lays it out on the iPhone 18 Pro Max:
  - The bar sits 21dp from the sides and, with gesture navigation, 21dp above the bottom.
  - It fits its tabs: centred without a circle, or beside search's circle with an 8dp gap. With three tabs or more beside the circle, or under a bottom accessory, it fills its room.
  - With five entries, or four beside the circle, the tabs keep iOS's proportions, a long label's tab wider than the rest, scaled to the room. Tabs are sized from their labels as SF Pro would set them, about 11% wider than Roboto.
- **`prominent`** on a trigger sets that tab apart in the circle, as iOS 27 does (one at a time; it takes the circle over search).
- **Drag across the bar** and the lens follows your finger, landing on the tab you let go over.
- **Tapping the current tab again** pops the tab's stack back to its first screen or, when already there, scrolls its `TabScrollView` to the top. The trigger's `disablePopToTop` and `disableScrollToTop` turn each off.
- **`Badge`** draws a red capsule at the icon's top-right; an empty badge is a plain red dot. `badgeBackgroundColor`, `badgeTextColor` and the badge's `selectedBackgroundColor` apply. In search mode the back button keeps its tab's badge.
- **In search mode** the search tab's first screen hides its navigation bar, as iOS 27 does, and the content moves up into its place. The ref's `cancelSearch` brings it back.
- **A `disabled` tab** looks normal and still reacts to a tap or drag, but the lens slides back to the current tab and nothing navigates.
- **`minimizeBehavior`:** `onScrollDown` and `onScrollUp` work as on iOS. `automatic` and `never` don't minimize, which is what iOS does on iPhone. Minimizing, the bar shrinks a little before gathering into its circle; expanding, it springs back with iOS 27's timing, a little past and back.
- **The selected tab's ink** follows what's under the bar, as on iOS: lighter over light content in dark mode, darker over dark content in light mode, and under a finger it brightens or deepens the same way.
- **Glass level:** `LucentProvider`'s `glassOpacity` stands in for iOS 27's Liquid Glass setting, `0` its Clear and `1` its Tinted. See [Theming](../theming.md).
- **Icons** use `md` (Material Symbol), an image `src` or Lucent's `svg`. `VectorIcon` isn't drawn yet.
- **`NativeTabs.BottomAccessory`** is drawn as on iOS 26 and 27. See [Bottom accessory](#bottom-accessory).
- **Older Android:** without refraction (Android 12) the bar, its circle and the accessory are blurred glass; on Android 11 and older, a flat fill. The selected pill, the lens under a finger and search's field keep every state either way, the lens showing the tab under it.
- **Ignored props:** the Material-only props (`indicatorColor`, `rippleColor`, `labelVisibilityMode`, `disableIndicator`) are accepted and ignored, since the bar is iOS-styled. Props that only affected iOS before 26 (`blurEffect`, `shadowColor`, `backgroundColor`) are ignored on both platforms, matching iOS 26.

## Accessibility

On Android, as on iOS:

- **Larger text:** tab labels, icons and badges keep their size at any font scale, as iOS's do. The search field's text grows with it: beside the magnifier up to iOS's Extra Extra Extra Large, then without it, the field growing taller with its circles centred on it.
- **TalkBack** reads the tabs in order, then search's field and circle, as VoiceOver does. Each tab is a `tab` with its label, its badge and whether it's selected. Search's back button and field are out of reach while search is closed, the tabs while it's open, and a bottom accessory's own controls are read rather than its capsule.
- **Right-to-left languages** mirror the bar as iOS does: the first tab at the right, search's circle at the left, and the bar minimizing to the right. Icons and labels read the right way round, and the field's text sits on the reading side.
- **Reduce Motion:** with Android's "Remove animations" on, the bar jumps to each state rather than animating, as Reanimated does by default. iOS cross-fades instead.
- **Touch targets** are at least 48dp, the search field's clear button included.
- **High contrast text** (Android) draws the glass as an opaque fill, as iOS's Reduce Transparency does.
