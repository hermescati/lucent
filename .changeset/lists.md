---
'expo-lucent': minor
---

Add `List`, `ListItem` and `FieldGroup`, with `@expo/ui`'s universal API plus `listStyle`, a row's `detail`, `accessory` (a chevron, a checkmark or UIKit's ⓘ, with `onAccessoryPress`), `button`, `destructive`, `disabled` and `swipeActions`, a list's `editMode`, `selection` and `onSelectionChange`, `List.ForEach`'s `onDelete` and `onMove`, and a section's `headerProminence`, `headerAction` and `indexLabel`. On iOS they're SwiftUI's `List` and `Form`; on Android Lucent draws iOS 27's, measured against the simulator: inset grouped cards or plain rows, section headers and footers, pinned under the bar in a plain list, values with a chevron, a checkmark or an ⓘ, action rows, swipe actions on capsule buttons drawn as iOS draws them for the row, full swipes, edit mode with delete controls, reordering and multi-select, the section index, and pull to refresh with iOS's spinner, scrolling under the navigation bar and tab bar as their own scroll views do.
