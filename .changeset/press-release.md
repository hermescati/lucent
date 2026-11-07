---
'expo-lucent': patch
---

On Android, a navigation bar button no longer stays pressed after a drag off it. A gesture taking the touch over cancels the press as it starts, where the glass let that cancel pass and kept the press on until the next touch; a lift always ends a press; and pressing again before a press has settled lets the old one go. The stack's swipe back is only on with a screen to go back to: a stack around tabs took sideways drags from every screen in them, its bar's buttons too, and ended their presses. A done or prominent button, and any glass pressed as a whole, springs back when let go after a drag rather than freezing where it was released: its press asked for no frames once no touch was drawing them.
