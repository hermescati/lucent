# Progress view

A spinner for work of unknown length, or a bar for how far along it is. `@expo/ui` has no universal progress view, so Lucent's API follows SwiftUI's `ProgressView`.

- **iOS:** SwiftUI's `ProgressView`, through `@expo/ui`: the activity indicator, or the linear style for a value.
- **Android:** Lucent's recreation: iOS's grey spinner, turning a spoke at a time, and its thin capsule bar.

> Try it: in the [playground](../../example), open **Components → Progress View**.

## Usage

```tsx
import { ProgressView } from 'expo-lucent';

<ProgressView />;
<ProgressView label="Loading" />;
<ProgressView value={0.45} label="Downloading" />;
```

## Props

| Prop        | Type                   | Default | Notes                                                                                     |
| ----------- | ---------------------- | ------- | ----------------------------------------------------------------------------------------- |
| `value`     | `number \| null`       | —       | How far along, from 0 to 1. Leave it out for a spinner.                                   |
| `label`     | `string`               | —       | What's in progress: below the spinner, above the bar.                                     |
| `tintColor` | `string`               | accent  | The bar's fill. The spinner stays grey, as on iOS.                                        |
| `hidden`    | `boolean`              | `false` | Hidden, though still taking its room.                                                     |
| `testID`    | `string`               | —       |                                                                                           |
| `style`     | `StyleProp<ViewStyle>` | —       | Layout only: margins, alignment and size. A bar fills its row's width; a spinner its own. |

## Android behaviour

- The spinner is iOS's: 20pt, eight spokes, the head darkest and fading over the three behind it, one turn a second.
- The bar is 4pt high on the system fill, filled with `tintColor` or the app's accent.
- Screen readers hear a progress bar: busy for the spinner, the percentage for the bar.
