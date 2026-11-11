# Lists

`List`, `ListItem` and `FieldGroup`: scrolling lists of rows, as iOS 26 and 27 draw them. They copy `@expo/ui`'s universal `List`, `ListItem` and `FieldGroup`, so Expo's docs apply, with a few Lucent extras for what iOS rows show.

- **iOS:** SwiftUI's `List` and `Form`, through `@expo/ui`. Lucent places the `Host` and draws its extras as SwiftUI does.
- **Android:** Lucent's recreation, in a scroll view that the navigation bar and tab bar follow: the large title collapses as the list scrolls, the tab bar minimizes, and the list clears both bars.

> Try it: in the [playground](../../example), open **Components → Lists**.

## Usage

A settings screen:

```tsx
import { FieldGroup, ListItem } from 'expo-lucent';

<FieldGroup>
  <FieldGroup.Section title="Account">
    <ListItem detail="ClickFlare" accessory="disclosure" onPress={openOrganization}>
      Organization
    </ListItem>
  </FieldGroup.Section>
  <FieldGroup.Section>
    <ListItem destructive onPress={signOut}>
      Sign Out
    </ListItem>
    <FieldGroup.SectionFooter>Signed in as {email}</FieldGroup.SectionFooter>
  </FieldGroup.Section>
</FieldGroup>;
```

A picker, the chosen row ticked:

```tsx
<List listStyle="plain">
  {currencies.map((currency) => (
    <ListItem
      key={currency.code}
      supportingText={currency.name}
      accessory={chosen === currency.code ? 'checkmark' : undefined}
      onPress={() => setChosen(currency.code)}>
      {currency.code}
    </ListItem>
  ))}
</List>
```

Swipe actions and pull to refresh:

```tsx
<List onRefresh={reload}>
  {messages.map((message) => (
    <ListItem
      key={message.id}
      supportingText={message.body}
      swipeActions={{
        trailing: [
          {
            label: 'Archive',
            icon: { sf: 'archivebox.fill', md: 'archive' },
            destructive: true,
            onPress: () => archive(message.id),
          },
        ],
      }}>
      {message.title}
    </ListItem>
  ))}
</List>
```

## `List`

| Prop                | Type                        | Default          | Notes                                                                                                                                                                     |
| ------------------- | --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `children`          | `ReactNode`                 | —                | Rows, `FieldGroup.Section`s, or `List.ForEach`.                                                                                                                           |
| `onRefresh`         | `() => Promise<void>`       | —                | Pull to refresh; the spinner shows until the promise settles.                                                                                                             |
| `listStyle`         | `'insetGrouped' \| 'plain'` | `'insetGrouped'` | **Lucent.** Rows on rounded cards, or edge to edge, as SwiftUI's styles.                                                                                                  |
| `editMode`          | `boolean`                   | `false`          | **Lucent.** SwiftUI's edit mode: delete controls and reorder handles; see below.                                                                                          |
| `selection`         | `string[]`                  | —                | **Lucent.** The selected rows' keys, as SwiftUI's `List(selection:)`; in edit mode a tap selects.                                                                         |
| `onSelectionChange` | `(keys: string[]) => void`  | —                | **Lucent.** Called as rows are selected in edit mode.                                                                                                                     |
| `indexLens`         | `boolean`                   | `false`          | **Lucent, Android only.** While a finger is on the section index, a Liquid Glass lens beside it shows the section's letter large. iOS draws none, so it's off by default. |
| `testID`            | `string`                    | —                |                                                                                                                                                                           |
| `style`             | `StyleProp<ViewStyle>`      | —                | **Lucent.** Layout only.                                                                                                                                                  |

`List.ForEach` takes `@expo/ui`'s `data`, `keyExtractor` and render function, and SwiftUI's `onDelete` and `onMove`. It also takes `@expo/ui`'s `recycling` (on by default), `overscanCount` (10) and `estimatedItemSize` (64): on Android only the rows near the screen are drawn, with room kept for the rest at the height each had, or `estimatedItemSize` until drawn, so set it near your rows' height. Rows are drawn by key rather than reused for other items, so a row's own state stays with its item.

- `onDelete(indices)`: its rows get SwiftUI's Delete action, swiped to from the trailing edge unless a row has trailing actions of its own, and a delete control in edit mode that opens it.
- `onMove(from, to)`: its rows show a reorder handle in edit mode. The destination counts places before the row is taken out, as SwiftUI's; update the data in it, or the row goes back.

## `ListItem`

| Prop               | Type                                        | Default | Notes                                                                                                                                  |
| ------------------ | ------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `children`         | `ReactNode`                                 | —       | The headline. `ListItem.Leading`, `.Trailing` and `.Supporting` slots work too.                                                        |
| `onPress`          | `() => void`                                | —       | Makes the row tappable; its content dims under a finger.                                                                               |
| `leading`          | `ReactNode`                                 | —       | Before the text, as a Settings icon.                                                                                                   |
| `trailing`         | `ReactNode`                                 | —       | At the end, before `detail` and the accessory.                                                                                         |
| `supportingText`   | `string \| ReactNode`                       | —       | A second line, in secondary text.                                                                                                      |
| `detail`           | `string`                                    | —       | **Lucent.** A value at the end in secondary text, as a settings row's choice.                                                          |
| `accessory`        | `'disclosure' \| 'checkmark' \| 'info'`     | —       | **Lucent.** A chevron, the accent's checkmark, or UIKit's ⓘ detail button.                                                             |
| `onAccessoryPress` | `() => void`                                | —       | **Lucent.** Called when the `info` accessory is tapped, apart from `onPress`.                                                          |
| `button`           | `boolean`                                   | `false` | **Lucent.** An action row, as a SwiftUI `Button` in a list: the headline in the accent (red when `destructive`, grey when `disabled`). |
| `destructive`      | `boolean`                                   | `false` | **Lucent.** The headline in red.                                                                                                       |
| `disabled`         | `boolean`                                   | `false` | **Lucent.** Greyed out and not tappable.                                                                                               |
| `swipeActions`     | `{ leading?, trailing?, allowsFullSwipe? }` | —       | **Lucent.** Buttons a swipe reveals; see below.                                                                                        |
| `testID`           | `string`                                    | —       |                                                                                                                                        |

Each swipe action has a `label`, an `icon` (`sf` on iOS, `md` on Android), `onPress`, and optionally `destructive` (red) or a `tintColor`. The first action in each array is the outermost, and a full swipe runs it unless `allowsFullSwipe` is `false`.

## `FieldGroup`

SwiftUI's `Form`: inset grouped sections. `FieldGroup.Section` takes a `title`, or a `FieldGroup.SectionHeader` child, and a `FieldGroup.SectionFooter`. **Lucent:** `headerProminence: 'increased'` draws its header larger and in the primary colour, as SwiftUI's `headerProminence`; `headerAction: { label, onPress }` puts an action at the header's end, in the accent, on its baseline; and its `indexLabel` (usually a letter) puts the section in the list's index, as SwiftUI's `sectionIndexLabel`: a list whose sections have them shows the index along its trailing edge, and a tap or drag along it jumps to the section. A header or footer given as a string is drawn as iOS's caption text. Sections also work inside a `List`.

## Android behaviour

- Measured on the iOS 27 simulator, light and dark:
  - Cards 16 from the screen's edges, with 26 corners.
  - Rows at least 52 tall, content 16 in, and separators from the text's start.
  - Headers in 17pt semibold and footers in 13pt, both in secondary grey.
- The value and chevron follow the Settings app: the chevron ends 20 inside the card, 12 after the value.
- Pressed, a row's content (icon, title, value, chevron) draws at 75%, as iOS 27's does, with no fill behind it. Like UIScrollView, a row waits 150ms before showing it, so a touch that becomes a scroll never presses a row.
- Swipe actions are iOS 27's capsules beside the row, drawn as iOS draws them for the row (measured): on a one-line row each capsule holds its icon and label side by side, on a taller row the label sits under the capsule, and an action without an icon has its label alone in a rounded rectangle, a 16pt continuous corner on any row, where one with an icon is a capsule. A button with its label in it is the row's height less 8, its content 13 from its ends, its label 13pt regular. A side's buttons all take its widest one's width when they're about the same size; one much wider than the others keeps each its own. The slid row takes the card's corners on Apple's continuous curve, full height, and as it starts to move it greys on a soft spring, on a clock rather than with the slide (about 0.45s, and the same back as it closes), and its slot in the card turns the page's grey at once, as iOS 27's do. One row is open at a time, and a tap or a scroll closes it, more softly than a finger lets it go (measured: half way in about 0.12s).
  - Measured frame by frame on the simulator at several speeds: each capsule, label and all, sits behind the row and grows out from its middle as the row slides past it, fading in as it does, and shrinks back the same way as the row closes. Its size trails the slide on a spring, about 0.2s from start to full however fast the row goes, so a flick opens the row ahead of its buttons. Flicked open, a button comes up against the row's edge and glides out to its place as the row settles. A finger, edit mode's delete control and a closing tap all show it the same.
  - Dragged further, the row keeps following the finger and the outermost capsule stretches into the room, while the others, labels too, dim to about 62% in a quarter second, and to about 32% once a full swipe arms, and come back as the finger lets go. With a destructive outermost action, past 79% of the row's width a full swipe arms, with a haptic tick: the row jumps on, the icon moves to the capsule's leading end and the label fades. Let go there, and the action runs. With any other, as iOS 27 does, it arms at half the row's width, where the row starts to resist (following a fifth of the finger), and the outermost capsule grows over the others, which fade out; let go there, and the row closes as the action runs, its button shrinking away at once.
  - A destructive action, from its button, a full swipe or a screen reader, takes its row away as iOS does: the row slides out as its height closes up, and the action runs once it's gone. If the app keeps the row, it comes back. Any other action closes the row and runs.
- With Reduce Motion on, iOS animates its swipe actions, edit mode and reordering as usual. Android has only "Remove animations", which Lucent follows: rows, their buttons and edit-mode controls settle at once.
- Pull to refresh, measured on the simulator with slow held drags:
  - The content follows the finger one to one for 60, then with UIScrollView's rubber band.
  - A screen's large title comes down with it, and iOS's spinner, 30 across, draws its spokes one by one in the title's place.
  - The refresh starts as the last spoke is drawn, finger still down, with a haptic tick (the simulator can't show iOS's).
  - Let go, the content rests 60 down while it runs; once done, the spinner shrinks and fades, then the content goes back.
- Screen readers read each row as a button, a ticked row as selected, and its swipe actions as custom actions.
- At accessibility text sizes a row's value moves under its title, as iOS's Settings rows do, so neither breaks mid-word.
- Edit mode, measured on the simulator: rows its `List.ForEach` can delete move their content 40 along for a red delete control, and rows it can move show a reorder handle that slides in from the end as it fades in. All on one spring, about 0.35s each way. Swipes are off while editing. The delete control opens the row's Delete action on a softer spring than a swipe's (settled in about 0.6s, as iOS 27's), its button growing as a swipe's does; a tap on the row closes it the same way back.
- Margins follow UIKit's: 16 on phones under 414 across, 20 on wider ones (the Plus and Max iPhones, and most Android phones), for a card's margin and a row's padding alike. Separators end that far short of the row's end, inset grouped and plain alike, as iOS 27's.
- A plain list's rows are white on the grouped grey, with a separator over the first row and under the last, as iOS 27's.
- Reordering, measured on the simulator: a row dragged by its handle lifts at once, 85% opaque on a square-cornered card that reaches 6 further out at each end, its content where it was, with a soft shadow. It lifts as the handle is pressed, before it moves, and follows the finger every way, off the screen's edges too. Rows slide aside as its middle crosses their edges, and let go it glides into its place and settles there, its card and shadow easing away over about 0.45s. Lifted, it draws over the navigation bar and its buttons, and a copy of it at half opacity on a faint grey holds the place it would land in, seen once it's dragged away from it, inside the card's corners, and gone as it's let go, as iOS 27's does. Dragged up past the list's visible top, under the navigation bar, the rows go back to their order and the copy to the row's own place, where a drop there leaves it. Screen readers get Move up and Move down actions in edit mode.
- Multi-select, measured on the simulator: with `selection`, edit mode puts a selection circle in the delete control's place and a tap toggles the row (on iOS too, where Lucent's row then isn't a button, so SwiftUI's list takes the tap). A selected row's circle fills with the accent and its white tick draws itself on, as iOS's does (the fill in about 40ms, the tick over the next quarter second), and the row turns grey, without the separators beside it; deselected, the fill and tick fade together. On iOS a tap anywhere on the row ticks it with SwiftUI's own animation, and the circles slide in and out with the rows, as with edit mode's delete controls.
- Secondary text and chevrons are iOS's translucent label colours, so they darken on a selected row as iOS's do.
- A dragged row near the list's visible top or bottom (below the navigation bar, above the tab bar or toolbar) scrolls the list, faster the deeper it goes into the last 50, as iOS's does.
- Long lists: a recycling `List.ForEach` draws the rows on screen and `overscanCount` either side, three times as many ahead of a scroll, and draws more while twice `overscanCount` rows are still ahead, so flings don't outrun it. A dragged row and every row between it and the screen stay drawn while it scrolls the list. A row is drawn with only what it can do: swipes, edit-mode motion and reordering are left out of rows that have none, so plain rows mount several times faster.
- Into or out of edit mode, a row whose actions are open closes them, as iOS's does.
- A plain list's section headers pin under the navigation bar as their section scrolls under it, as iOS 27's do (measured): the header's text 14 under the bar, with no grey behind it and the bar's scroll edge reaching down over it, so the rows under it wash out while the text stays sharp. The next header pushes it up, the two moving together, and it fades evenly over 15 of the push. On Android the bar's scroll edge stays down at the pinned header's height through every hand over, where iOS draws it back to the bar for a moment as one lets go: a height lands a frame or more behind the scroll there, which would show as a strip under the bar, and the next header draws over the edge as it comes up. A plain header sits 62 from the rows above to the rows below, of which 40 pin.
- The section index, measured on the simulator: 11pt semibold letters in the accent colour, about 14 apart, along the trailing edge and centred between the compact navigation bar and the bottom. A touch or drag along it jumps the list, without animating, so the section's header sits under the bar, with a tick for each new section, and stops at the list's end. It can be touched a little inward of the letters too, since Android's back gesture takes a drag that starts at the screen's edge. With `indexLens`, Lucent's own addition (iOS shows nothing while the index is touched, measured on iOS 27.2), a glass circle comes up beside the finger on a quick spring, centred on it, with the section's letter large in the accent, each new letter coming in with the tick, and goes as the finger lifts. To TalkBack it's one adjustable element, as VoiceOver's index is: "Section index" with the current letter, and a swipe up or down moves a section.
