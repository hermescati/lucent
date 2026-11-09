---
'expo-lucent': patch
---

Search plays one motion wherever it opens. The field grows out of what was tapped, starting at the press, its content coming in blurred, and the close button buds off its end, necked to it until it breaks free. Closing runs it backwards: the close button rides the field's end and melts into it, and the field draws back into what it came out of. A field in the navigation bar also sags and swells as it stretches out of its capsule. The magnifier's circle at the bottom keeps its magnifier as the field grows out of it and shrinks back into it, at the circle's size there, and the keyboard waits until the field has grown. The field at the bottom grows from where it rests and lands back there with its content.

A field in the toolbar's slot now grows out of the slot at the press too, rather than a render later, when the slot showed empty for two frames. The toolbar's other items blur away as it grows, so the close button no longer comes out over them with a hardware keyboard. Closing, its text and close button fade with its glass, and the toolbar fades back in as it goes, rather than after a gap. As a field's sides move with the keyboard, its glass follows on the UI thread, where the close button's circle used to trail its cross for a few frames.

A field under the navigation bar's title rises, and its close button buds off its end, on the frame after it's tapped rather than a render later: the close button is free of it about 120ms sooner, as on iOS. Closing, it goes back down from the frame after the close button's press.

A search field's placeholder and typed text sit on the magnifier's and clear button's middle line, where they sat about 2pt above it.

With a floating keyboard, a field at the bottom keeps its width once open: the keyboard takes no room under it, and the field used to snap wider a moment later as the keyboard said it was up. Above a docked keyboard it still widens as the keyboard comes up.

A field opened from the magnifier in the navigation bar has its magnifier, text and clear button in the middle of its capsule, where they sat 2pt low. A search field now always takes the keyboard as it opens: now and then, right after the app started, Android let go of it at once and it stayed unfocused.
