# Search on iOS 27: reference notes

What iOS 27 does with a stack's `Stack.SearchBar` on iPhone, measured on the iPhone 18 Pro simulator from screen recordings and screenshots, against which Lucent's Android search is built. The numbers live in `src/components/stack/tokens.ts` (`search`, `searchMotion`); this page is the why.

## Where it goes

| Screen                             | No placement / `automatic`                | `integratedButton`                      |
| ---------------------------------- | ----------------------------------------- | --------------------------------------- |
| In a tab (tab bar shown or hidden) | Under the title, hidden until pulled down | Magnifier on the bar's trailing capsule |
| Outside tabs, no toolbar           | Field floating at the bottom              | Glass magnifier centred at the bottom   |
| Bottom toolbar with a slot         | In the toolbar's slot                     | In the toolbar's slot                   |
| Bottom toolbar, no slot            | Under the title                           | Magnifier on the bar's trailing capsule |

`integratedCentered` on iPhone draws as `integratedButton` beside a toolbar, and under the title without one.

## The field under the title

- 44pt tall, 16pt from the screen's sides.
- A field that scrolls away (`hideWhenScrolling`, the default) is no glass at rest: a flat pill of UIKit's tertiary fill, rgba(118, 118, 128, 0.12) in light mode and 0.24 in dark, which comes out (227, 227, 233) over the grouped background. One that stays (`hideWhenScrolling={false}`) is glass.
- Pulled into view, the pill grows from a sliver as its magnifier and placeholder fade in.
- The magnifier is the label colour (black in light mode); the placeholder is the secondary label colour, (127, 127, 133).

## Focusing it

- The field rises into the bar's row and narrows as the close button slides in from the screen's edge; the title and back button are mostly gone by the first frame.
- The rise is an exponential ease-out with a time constant of about 60ms: 47% by 45ms, 80% by 110ms, 97% by 155ms. It goes a point past the row, peaking at about 240ms, and settles back by about 390ms.
- A grey field turns to glass in the first half of the rise.
- Typing: the clear button is `xmark.circle.fill`, a 17pt circle in the label colour with a 7pt cross, about 1.9pt thick, cut out of it. The cursor is the search bar's `tintColor`, or the system blue, not the app's accent.

## Closing it

- The close button drops the field back under the title on a critically damped spring of about 30 rad/s (a response of about 0.21s), with no overshoot: 30% by 37ms, 46% by 54ms, 73% by 97ms, 93% by 145ms.

## The magnifier in the bar

- Its capsule stretches left across the row into the field over about 90ms as the title and back button go, the placeholder coming in and the close button's cross at the field's end, in the same glass.
- About 330ms in, the close button buds off the field's end into a 44pt glass circle, the glass necking apart, over about 80ms. It ends as a focused field under the title does: the field and the close button in the bar's row.
- The bottom toolbar stays where it is.
- Closing plays it back over about 200ms: the placeholder goes, the close button merges back, and the field shrinks into the trailing capsule as the title and buttons come back.

## Search mode from the bottom

Tapping the field in the toolbar's slot, the field at the bottom, or the magnifier at the bottom starts the same search mode, played three ways (h264 recordings; the simulator's default HEVC recording leaves out the bottom toolbar).

- The navigation bar fades within about 100ms (a large title within about 30ms) and the content moves up into the space it showed, on a critically damped spring of about 25 rad/s: 44% by 63ms, 78% by 116ms, 93% by 170ms.
- The field rides the keyboard up and ends just above it: 8pt from the screen's sides, beside a 48pt glass close button. The keyboard's own curve is close to a critically damped spring of about 30 rad/s.
- From the slot, the whole toolbar rides up as one capsule; its other items blur away by about 40% of the way, the field is the screen's width by about 60%, and the close button buds off its end, blurring in, by about 90%. The cursor is the tab bar's tint inside tabs (orange in the example app), where the field in the navigation bar keeps the system blue.
- From the bottom field, the field rides up whole and its end pulls in for the close button, which blurs in.
- From the magnifier, the circle sinks behind the rising keyboard, and the field comes out of it narrow and centred, widening to the screen's width as it rises.

Closing:

- From the slot, the field fades where it is within about 50ms and its close button within about 120ms, as the keyboard drops (gone by about 110ms); the bar and content come back over about 100ms, and the toolbar blurs back in at the bottom once the keyboard is down.
- From the bottom field, the large title and content are back at once, and the field rides the keyboard down, widening again as the close button fades.
- From the magnifier, the field shrinks at once to its empty circle, which rides the keyboard down; the magnifier fades back in at the end.

With the keyboard down in search mode (searched with text, or with a hardware keyboard), the field and close button keep the toolbar's margins, 28pt from the screen's sides, rather than the 8pt they take above the keyboard. While a field in the navigation bar has the keyboard, a bottom toolbar stays down under it.

Typing: the search key leaves search mode on with the text, the keyboard down. Android's keyboard behaves the same from its own search key; a hardware Enter key can commit an autocorrection first.

In dark mode the placeholder is lighter than the theme's: (59, 59, 61) of glass goes to (138, 138, 141) under it, about rgba(235, 235, 245, 0.45). The magnifier and text are white, the clear button a white circle with the cross cut out, and the cursor the system blue.

Lucent drives the morphs off the keyboard's progress rather than a clock, so they keep step with Android's keyboard; with no keyboard (a hardware one), a clock stands in.

## The field at the bottom

- Matches the bar's capsule metrics: 16pt-ish margins, 47pt tall, the magnifier's middle about 21pt in and the text about 42pt in. Lucent's is within a point.

## Not matched yet on Android

- The search field is still React Native's `TextInput` inside the glass, not a rebuild of `UISearchTextField`; the magnifier is Material's glyph, a little lighter than SF's.
- The magnifier in the bar: iOS's field settles within a point, no overshoot to speak of, so Lucent's has none.
- On the emulator, the close button buds off later than 330ms when the keyboard is opening: the emulator's UI thread is busy with it.
- The example app redraws at about 60fps while idle on the emulator, which goes back to before this work. Left for the glass pass at the end, with the shaders' GPU cost.
