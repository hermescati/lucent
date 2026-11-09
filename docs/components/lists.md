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

| Prop                | Type                        | Default          | Notes                                                                                             |
| ------------------- | --------------------------- | ---------------- | ------------------------------------------------------------------------------------------------- |
| `children`          | `ReactNode`                 | —                | Rows, `FieldGroup.Section`s, or `List.ForEach`.                                                   |
| `onRefresh`         | `() => Promise<void>`       | —                | Pull to refresh; the spinner shows until the promise settles.                                     |
| `listStyle`         | `'insetGrouped' \| 'plain'` | `'insetGrouped'` | **Lucent.** Rows on rounded cards, or edge to edge, as SwiftUI's styles.                          |
| `editMode`          | `boolean`                   | `false`          | **Lucent.** SwiftUI's edit mode: delete controls and reorder handles; see below.                  |
| `selection`         | `string[]`                  | —                | **Lucent.** The selected rows' keys, as SwiftUI's `List(selection:)`; in edit mode a tap selects. |
| `onSelectionChange` | `(keys: string[]) => void`  | —                | **Lucent.** Called as rows are selected in edit mode.                                             |
| `testID`            | `string`                    | —                |                                                                                                   |
| `style`             | `StyleProp<ViewStyle>`      | —                | **Lucent.** Layout only.                                                                          |

`List.ForEach` takes `@expo/ui`'s `data`, `keyExtractor` and render function, and SwiftUI's `onDelete` and `onMove`. It also takes `@expo/ui`'s `recycling` (on by default), `overscanCount` (10) and `estimatedItemSize` (64): on Android only the rows near the screen are drawn, with room kept for the rest at the height each had, or `estimatedItemSize` until drawn, so set it near your rows' height. Rows are drawn by key rather than reused for other items, so a row's own state stays with its item.

- `onDelete(indices)`: its rows get SwiftUI's Delete action, swiped to from the trailing edge unless a row has trailing actions of its own, and a delete control in edit mode that opens it.
- `onMove(from, to)`: its rows show a reorder handle in edit mode. The destination counts places before the row is taken out, as SwiftUI's; update the data in it, or the row goes back.

## `ListItem`

| Prop             | Type                                        | Default | Notes                                                                           |
| ---------------- | ------------------------------------------- | ------- | ------------------------------------------------------------------------------- |
| `children`       | `ReactNode`                                 | —       | The headline. `ListItem.Leading`, `.Trailing` and `.Supporting` slots work too. |
| `onPress`        | `() => void`                                | —       | Makes the row tappable, grey under a finger.                                    |
| `leading`        | `ReactNode`                                 | —       | Before the text, as a Settings icon.                                            |
| `trailing`       | `ReactNode`                                 | —       | At the end, before `detail` and the accessory.                                  |
| `supportingText` | `string \| ReactNode`                       | —       | A second line, in secondary text.                                               |
| `detail`         | `string`                                    | —       | **Lucent.** A value at the end in secondary text, as a settings row's choice.   |
| `accessory`      | `'disclosure' \| 'checkmark'`               | —       | **Lucent.** A chevron, or the accent's checkmark.                               |
| `destructive`    | `boolean`                                   | `false` | **Lucent.** The headline in red.                                                |
| `disabled`       | `boolean`                                   | `false` | **Lucent.** Greyed out and not tappable.                                        |
| `swipeActions`   | `{ leading?, trailing?, allowsFullSwipe? }` | —       | **Lucent.** Buttons a swipe reveals; see below.                                 |
| `testID`         | `string`                                    | —       |                                                                                 |

Each swipe action has a `label`, an `icon` (`sf` on iOS, `md` on Android), `onPress`, and optionally `destructive` (red) or a `tintColor`. The first action in each array is the outermost, and a full swipe runs it unless `allowsFullSwipe` is `false`.

## `FieldGroup`

SwiftUI's `Form`: inset grouped sections. `FieldGroup.Section` takes a `title`, or a `FieldGroup.SectionHeader` child, and a `FieldGroup.SectionFooter`. A header or footer given as a string is drawn as iOS's caption text. Sections also work inside a `List`.

## Android behaviour

- Measured on the iOS 27 simulator, light and dark:
  - Cards 16 from the screen's edges, with 26 corners.
  - Rows at least 52 tall, content 16 in, and separators from the text's start.
  - Headers in 17pt and footers in 13pt, both in secondary grey.
- The value and chevron follow the Settings app: the chevron ends 20 inside the card, 12 after the value.
- Swipe actions are iOS 27's capsules beside the row, with their labels under them. The row slides aside onto a grey fill. One row is open at a time, and a tap or a scroll closes it.
  - Measured frame by frame on the simulator: each capsule pops in as the row uncovers its slot, and they all shrink away as it closes.
  - Dragged further, the outermost capsule stretches into the room and the others fade. Past 79% of the row's width a full swipe arms, with a haptic tick: the row jumps on, the icon moves to the capsule's leading end and the label fades. Let go there, and the action runs.
  - A destructive action, from its button, a full swipe or a screen reader, takes its row away as iOS does: the row slides out as its height closes up, and the action runs once it's gone. If the app keeps the row, it comes back. Any other action closes the row and runs.
- With Reduce Motion on, iOS animates its swipe actions, edit mode and reordering as usual. Android has only "Remove animations", which Lucent follows: rows, their buttons and edit-mode controls settle at once.
- Pull to refresh, measured on the simulator with slow held drags:
  - The content follows the finger one to one for 60, then with UIScrollView's rubber band.
  - A screen's large title comes down with it, and iOS's spinner, 30 across, draws its spokes one by one in the title's place.
  - The refresh starts as the last spoke is drawn, finger still down, with a haptic tick (the simulator can't show iOS's).
  - Let go, the content rests 60 down while it runs; once done, the spinner shrinks and fades, then the content goes back.
- Screen readers read each row as a button, a ticked row as selected, and its swipe actions as custom actions.
- At accessibility text sizes a row's value moves under its title, as iOS's Settings rows do, so neither breaks mid-word.
- Edit mode, measured on the simulator: rows its `List.ForEach` can delete move their content 40 along for a red delete control, and rows it can move show a reorder handle that slides in from the end as it fades in. All on one spring, about 0.35s each way. Swipes are off while editing.
- Separators end 16 short of the row's end, inset grouped and plain alike, as iOS 27's.
- Reordering, measured on the simulator: a row dragged by its handle lifts at once, 85% opaque on a card that reaches 11 further out at its leading end, with a soft shadow. Rows slide aside as its middle crosses their edges, and let go it settles into its place. Screen readers get Move up and Move down actions in edit mode.
- Multi-select, measured on the simulator: with `selection`, edit mode puts a selection circle in the delete control's place and a tap toggles the row (on iOS too, where Lucent's row then isn't a button, so SwiftUI's list takes the tap). A selected row's circle fills with the accent and a white tick and the row turns grey, without the separators beside it; deselected, the fill fades.
- Secondary text and chevrons are iOS's translucent label colours, so they darken on a selected row as iOS's do.
- A dragged row near the list's visible top or bottom (below the navigation bar, above the tab bar or toolbar) scrolls the list, faster the deeper it goes into the last 50, as iOS's does.
- Long lists: a recycling `List.ForEach` draws the rows on screen and `overscanCount` either side, three times as many ahead of a scroll, and draws more while twice `overscanCount` rows are still ahead, so flings don't outrun it. A dragged row and every row between it and the screen stay drawn while it scrolls the list. A row is drawn with only what it can do: swipes, edit-mode motion and reordering are left out of rows that have none, so plain rows mount several times faster.
- Into or out of edit mode, a row whose actions are open closes them, as iOS's does.
