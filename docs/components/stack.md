# Navigation bar

iOS 26's navigation bar: glass back button, glass bar buttons grouped into capsules, the large title that collapses into the bar as you scroll, and the scroll edge that blurs content away under it. Same API as [expo-router's `Stack`](https://docs.expo.dev/versions/v58.0.0/sdk/router/), including `Stack.Screen`, `Stack.Toolbar` (`.Button`, `.Spacer`, `.View`, `.Label`, `.Icon`), `Stack.Title`, `Stack.Screen.BackButton` and `Stack.Header`.

- **iOS:** expo-router's `Stack`, so you get UIKit's own bar.
- **Android:** Lucent draws the same bar over the screen, in glass, and pushes screens with iOS's slide.

> Try it: every screen in the [playground](../../example) sits in Lucent's `Stack`. Open any component to see the back button and the large title collapse as you scroll.

## Usage

```tsx
// app/(tabs)/home/_layout.tsx
import { Stack } from 'expo-lucent/navigation';

export default function HomeStack() {
  return <Stack screenOptions={{ headerLargeTitle: true }} />;
}
```

Bar buttons go in `Stack.Toolbar`, in a page or in the layout's `Stack.Screen`:

```tsx
import { Stack, TabScrollView } from 'expo-lucent/navigation';

export default function Album() {
  return (
    <>
      <Stack.Screen options={{ title: 'Album' }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={share} />
        <Stack.Toolbar.Button icon="ellipsis" md="more_horiz" accessibilityLabel="More" onPress={more} />
      </Stack.Toolbar>
      <TabScrollView>{/* … */}</TabScrollView>
    </>
  );
}
```

Neighbouring icon buttons share one glass capsule, as on iOS 26. A text button gets a capsule of its own, and so do `variant="done"` and `variant="prominent"`, which fill theirs with the button's `tintColor` or, as UIKit does, the system blue rather than the app's accent. A `selected` button keeps its place but gets a filled circle (a pill for a label) inside its capsule, in the same colours, with its glyph showing the glass through it. To split icon buttons, give one `separateBackground`. On Android, changing it melts the button's own capsule into its neighbours' or splits it back off, as the tab bar's search circle does. In the navigation bar iOS ignores `Stack.Toolbar.Spacer`, fixed or flexible, and so does Lucent; spacers only split capsules in the bottom toolbar. On Android, a capsule held down grows into its neighbour and a neck of glass joins them, as on iOS, then breaks as you let go. The capsules on one side share one piece of glass for this, so it needs two to four of them with no prominent capsule or search field among them; otherwise each keeps its own.

A `Stack.Toolbar` with no `placement` is the bottom toolbar: bigger glass capsules floating over the bottom of the content. As in expo-router, it goes in a page, not in a layout's `Stack.Screen`. There a `Stack.Toolbar.Spacer` starts a new capsule: without a `width` it's flexible and pushes the groups either side of it apart, and with one it adds that much to the usual gap:

```tsx
<Stack.Toolbar>
  <Stack.Toolbar.Button
    icon="line.3.horizontal.decrease"
    md="filter_list"
    accessibilityLabel="Filter"
    onPress={filter}
  />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={compose} />
</Stack.Toolbar>
```

## What Lucent adds

| Prop                     | On                                                                                             | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `md`                     | `Stack.Toolbar.Button`, `Stack.Toolbar.Icon`, `Stack.Toolbar.Menu`, `Stack.Toolbar.MenuAction` | A Material Symbol for Android, beside the SF Symbol in `icon` or `sf`. expo-router draws only image icons on Android; without `md` or an image, an SF Symbol button has no icon there.                                                                                                                                                                                                                                                                                           |
| `headerLargeTitleInline` | a screen's options                                                                             | With `headerLargeTitle`, the large title sits on the bar's row, beside its buttons, as in Photos › Collections, instead of under them: UIKit's `largeTitleDisplayMode = .inline`, SwiftUI's `.inlineLarge`. As UIKit does, only on a screen without a back button (a tab's first screen, or one with `headerBackVisible: false`); with one, the large title stays under the row. Scrolled, it cross-fades to the inline title once content runs under the bar. iOS 17 and later. |

expo-router has no subtitle option (iOS 26's `navigationItem.subtitle`, as in Photos › Library's "6 Photos"), and Lucent doesn't add one yet: set from outside on expo-router's stack, UIKit opens a pushed screen with its large title collapsed. It comes once expo-router moves to react-native-screens' newer stack, which has subtitles.

On iOS, the bar's light or dark appearance defaults to `LucentProvider`'s `colorScheme`, as on Android. expo-router alone takes it from React Navigation's theme, which is light when the app sets none. Set `headerUserInterfaceStyle` in a screen's options to choose it yourself.

## Scrolling

The bar is transparent over the content, as on iOS 26 (set `headerTransparent: false` for an opaque one: on Android, the system background, or `headerStyle.backgroundColor`, which follows a large title as it collapses). On iOS, UIKit insets scroll views and follows them. On Android:

- `TabScrollView` does both: it starts its content below the bar and tells the bar how far it has scrolled. With a large title, a scroll that stops partway through the title's block carries on to whichever end is nearer, as UIKit's does.
- For another scroll view, use the hooks: `useHeaderInset()` is the padding to start the content below the bar, `useToolbarInset()` the padding to end it above a bottom toolbar, and `useHeaderScroll()` is an `onScroll` handler for an `Animated.ScrollView`. Pass `useHeaderScroll` the scroll view's animated ref for the large title's snap too. All three do nothing on iOS.

```tsx
const ref = useAnimatedRef<Animated.ScrollView>();
const onScroll = useHeaderScroll(ref);
const inset = useHeaderInset();

<Animated.ScrollView
  ref={ref}
  onScroll={onScroll}
  scrollEventThrottle={16}
  contentContainerStyle={{ paddingTop: inset }}
/>;
```

## Android behaviour

- Screens push, pop and swipe back with one motion, iOS 26's. A pushed screen slides in from the right over the one it covers, which slides 30% of the way left and dims; the back button, the Back key and Android's back gesture pop the screen the same way in reverse, on iOS's spring for a push or pop (an overdamped one that sets off at once and settles in about 330ms). Swipe back as on iOS 26: drag right (left, in a right-to-left language, where the whole motion is mirrored) from anywhere on the screen but its edges and its bars (a drag that starts on the navigation bar's row or a bottom toolbar stays with their buttons), and the screen follows your finger with the one below sliding in behind it, dimmed as on iOS. The bar's buttons stay where they are while the pages and their titles slide, as under iOS's one bar, and buttons only one of the two screens has pop in and out as iOS's do: going, they blur, swell and fade, and capsules side by side run together; coming, each capsule grows out of a faint blob a little past its size, necked to its neighbours, and settles as its icon sharpens after it. A back button both screens have stays put. The screen going back rounds its corners to the display's while it slides (Android 12 and later), as on iOS 26. A `contentStyle` background in the stack's `screenOptions` rounds with it; one set on a single screen keeps square corners. Let go past halfway, or with a flick, to go back; the screen settles on iOS's spring from your finger's speed. Vertical scrolling and controls that drag sideways, such as `Slider`, keep their drags. `gestureEnabled: false` turns the swipe off for a screen, and so does `fullScreenGestureEnabled: false`: on iOS it keeps the swipe to the screen's edge, and on Android the edge is Android's own back gesture, so use it for screens full of sideways content, such as carousels or maps, and modal presentations don't have it. A screen with an `animation` of its own (anything but `'ios_from_right'`, the default) keeps react-native-screens' animation, and so does a pop of several screens at once, from the back button's menu; `router.back()` and `navigation.goBack()` called from your code also pop with react-native-screens' slide.
- The screen's edges are Android's back gesture's. With predictive back on (Android 14 and later), Lucent takes that gesture too: drag in from either edge and the screen follows your finger as in a swipe back, then goes or stays as Android decides when you let go. Android still shows its small arrow at the edge; apps can't hide it. Turn predictive back on in your app config, with Expo's `android.predictiveBackGestureEnabled`:

  ```json
  { "expo": { "android": { "predictiveBackGestureEnabled": true } } }
  ```

  Without it, or below Android 14, the gesture pops the screen when you let go, with the same motion as the Back key. While a stack's top screen can go back, Lucent handles Android's back for it, so a `BackHandler` listener on that screen isn't called; Lucent's menus still close first, and so does search mode on a screen with nowhere to go back to (see below), and a screen with `gestureEnabled: false` leaves back to your listeners.

- The large title rides up with the content into the bar's row. Once it has scrolled its own height, the large title blurs and fades out over 150ms, staying in view as it goes under the scroll edge, and the inline title fades in over 300ms, rising 14dp into the row out of a blur, as on iOS; scrolled back, the inline title goes more slowly, sinking as it blurs and fades over about 400ms, and the large one comes back out of a blur about 130ms in.
- The bar sits 16dp in from the screen's sides, and 20dp on phones 414dp and wider, as UIKit's layout margins do on Plus and Pro Max iPhones. Right to left, the bar is mirrored: the back button and its chevron point right and the large title sits at the right.
- The bar's text follows the user's text size as iOS's Dynamic Type sizes it, not as Android scales it: its buttons, inline title and search text grow up to 21dp and stop there, and the large title grows all the way, up into its block and then pushing the content down. The title is a heading for TalkBack.
- The inline title is centred when it fits between the bar's items, keeping the usual 12dp gap to them, and otherwise starts beside the leading items, as UIKit's does: Wallet's sits next to its back button.
- On a phone with a camera hole or notch in the top's middle, the bar starts 14dp below it, as iOS leaves room under the Dynamic Island; Android's status bar alone ends right at the camera. Elsewhere it starts below the status bar.
- `headerTintColor` colours the title, as on iOS 27, where the glass buttons stay in the text colour; an opaque bar in a colour of its own also sets the status bar's icons to read on it, unless the screen sets `statusBarStyle`.
- The bar's glass bends what's behind it. Inside `NativeTabs` that's already set up; a `Stack` elsewhere brings its own backdrop.
- The back button shows the previous screen's title, or the chevron alone in a glass circle with `headerBackButtonDisplayMode` `'generic'` or `'minimal'` (iOS 27 draws both that way). As UIKit does, it never cuts the title short: one that doesn't fit beside the bar's title gives way to "Back", and that to the chevron. When its label comes or goes, the capsule opens or closes about it as the bar's buttons do; brought beside leading items or taken away (`headerBackVisible`), it splits off their capsule or melts back into it. Its label and text buttons' are Roboto Medium, which looks as heavy as iOS's SF Regular beside it. Bar buttons' Material Symbols are drawn larger than their box, so their glyphs come out SF Symbols' size, and a `prominent` or `done` button fills with its own `tintColor`, or the system blue. Holding it opens a menu of the screens further back, the nearest first, as on iOS; pick one to go straight back to it. `headerBackButtonMenuEnabled: false` (or `Stack.Screen.BackButton withMenu={false}`) turns the menu off.
- The scroll edge washes the content under the bar most of the way towards white, or a near-black grey in dark mode, and blurs it, lightly down by the bar's buttons and harder up under the status bar, as iOS's does: text there shows through as a dim ghost. A one-pixel hairline at 10% marks its bottom once content scrolls under it. `scrollEdgeEffects: { top: 'soft' }` asks for iOS's soft edge by name, which looks different there: a lighter wash, even across the top, that fades out about 70pt below the middle of the bar's row as the blur tapers off, with no line, so a coloured block scrolling under it fades into the bar. A screen with no title gets only the top of it, as on iOS: a wash and blur under the status bar that fade out above the buttons. `scrollEdgeEffects: { top: 'hard' }` makes it iOS's hard edge: the same depth, but blurred and washed until the content under it is only a smear. With an opaque bar, `headerStyle.backgroundColor` is the bar's colour. In the solid fallback, with no blur, the edge covers what scrolls under the bar in the page's own colour, as One UI's bar does.
- The bottom toolbar sits 28pt above the screen's bottom edge, or just above three-button navigation. Inside `NativeTabs` it sits in the tab bar's row, under the bar, as on iOS 27: hidden while the bar is full, and once the bar minimizes, its middle shows between the bar's two circles while its end items stay under them. The tab bar's inset is then the content's. It rises with the keyboard, all of it showing, as expo-router's Android toolbar does; `disableImePadding` keeps it in place.
- `Stack.Toolbar.Menu` opens iOS 26's glass menu from its button's corner: sections split by hairlines, inline submenus as titled sections, `isOn` checkmarks, `subtitle`, `destructive`, `disabled`, and submenus that open as a card over their row. A tap outside or Back closes it. Give actions `md` for a Material Symbol icon, as for buttons. `palette` submenus draw as one row; `elementSize` and `image` are iOS only.
- `Stack.Toolbar.Badge` draws iOS's red pill on bar buttons and menus, its size and place measured on iOS 27: it stands out over the capsule's top-right corner rather than being cut off by its glass, and grows to the left. As on iOS, the bottom toolbar leaves badges out.
- A `Stack.Toolbar.View` with `hidesSharedBackground` (an avatar, say) sits bare, centred in at least a bar button's width, as iOS spaces it.
- `Stack.SearchBar` goes where iOS 27 puts it on iPhone. Inside `NativeTabs`, even with the tab bar hidden, it goes up into the navigation bar: below the title, or with `placement="integratedButton"` as a glass magnifier on the capsule of the bar's trailing items. Outside tabs it goes to the bottom: alone at the bottom of a screen without a toolbar, or as a centred glass magnifier with `"integratedButton"`. In a `Stack.Toolbar.SearchBarSlot` it sits among the toolbar's items; beside a toolbar without a slot, or with `placement="stacked"`, it's in the navigation bar, and `"integratedButton"` or `"integratedCentered"` beside a toolbar is the magnifier in the bar. A field in the navigation bar that hides when scrolling starts hidden under the title, as on iOS: pull the content down to bring it out. It's a flat grey pill at rest, as iOS draws it, and glass once focused; with `hideWhenScrolling={false}` it stays and is glass throughout.
- Every search field opens and closes with one motion, wherever it sits, as iOS 27's do. It grows out of what was tapped, starting on the frame after the tap rather than a render later, and its close button buds off its end, joined to it by a neck of glass until it breaks free, as the tab bar's search circle splits off. The close button's cross shows inside the field's end and slides out into its circle. Closing runs it backwards, from the frame after the close button's press: the cross slides back into the field's end, shrinking, as the circle melts in, and the field goes back where it came from.
  - A field below the title rises into the bar's row as the title and buttons step aside, with the content following it up; it ends a point past the row and settles back. Closing drops it back on a spring.
  - The magnifier in the bar stretches into the field, growing a little bigger as it goes. Closing, the field draws back into the trailing capsule, and the leading buttons grow back out of its end as it passes them, sinking a few points before they settle.
  - A bottom field, the toolbar's slot or the bottom magnifier starts search mode as iOS plays it: the navigation bar fades (unless `hideNavigationBar={false}`) and the content moves up into its place, and the field rides the keyboard up, growing to nearly the screen's width as the keyboard comes up and the toolbar's other items blur away; with a floating or hardware keyboard, which takes no room under it, it keeps the toolbar's margins, as iOS's does with a hardware keyboard. Closing, the bottom field rides the keyboard back down into its place, and the magnifier's shrinks back into its circle, keeping its magnifier. A field from the toolbar's slot fades where it is, as iOS 27's does, and the toolbar fades back in as it goes. Inside `NativeTabs`, the slot's cursor takes the tab bar's tint, as on iOS.
- Search mode lasts until the close button ends it, as on iOS. Pressing the keyboard's Search key drops the keyboard and keeps the field, its text and its close button; clearing the field then brings the keyboard back. A field that lets go of the keyboard empty ends search mode. Back works as iOS's swipe back does: with a screen to go back to, in this stack or one it's nested in, it leaves the screen, search mode and all; on a first screen, which iOS has no swipe back from, it ends search mode instead of leaving the app. With the on-screen keyboard up, Android's first Back closes the keyboard.
- The clear button is iOS's filled circle, and the cursor is `tintColor` or the system blue. `onChangeText`, `onSearchButtonPress`, `onFocus`, `onBlur`, `onOpen`, `onClose`, `onCancelButtonPress` and the ref's commands work; `placeholder`, `autoFocus`, `autoCapitalize`, `inputType`, `textColor`, `hintTextColor`, `headerIconColor`, `barTintColor` and `tintColor` style it. Put it in the page, as in the examples; Lucent doesn't read a `Stack.SearchBar` inside a layout's `Stack.Screen` on Android yet.
