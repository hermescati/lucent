# Switch

An on/off toggle. Same API as the `Switch` from [`@expo/ui`](https://docs.expo.dev/versions/v58.0.0/sdk/ui/).

- **iOS:** SwiftUI's `Toggle`, through `@expo/ui`.
- **Android:** Lucent's recreation of it: a green track with a thumb that turns into a glass lens while you hold or drag it.

<p align="center">
  <img src="../media/switch.webp" width="540" alt="Lucent's switch on Android in dark mode: tapping it on, holding and dragging the glass lens, then dragging it off" />
</p>

> Try it: in the [playground](../../example), open **Components → Switch**.

## Usage

```tsx
import { Switch } from 'expo-lucent';

const [enabled, setEnabled] = useState(false);

<Switch value={enabled} onValueChange={setEnabled} />;
```

With a label, the switch becomes a full-width row: the label on the left, the switch on the right.

```tsx
<Switch label="Airplane Mode" value={airplane} onValueChange={setAirplane} />
```

## Props

| Prop            | Type                       | Default | Notes                                                             |
| --------------- | -------------------------- | ------- | ----------------------------------------------------------------- |
| `value`         | `boolean`                  | —       | Whether the switch is on. Required.                               |
| `onValueChange` | `(value: boolean) => void` | —       | Called when the user flips the switch. Required.                  |
| `label`         | `string`                   | —       | Text shown next to the switch; makes the switch a full-width row. |
| `disabled`      | `boolean`                  | `false` | Dims the switch and ignores touches.                              |
| `testID`        | `string`                   | —       |                                                                   |
| `modifiers`     | `ModifierConfig[]`         | —       | iOS only: `@expo/ui/swift-ui` modifiers. Ignored on Android.      |

The switch is controlled: it shows `value`, so update `value` in `onValueChange` or the switch slides back.

## Android behaviour

- Tap to flip it, or drag the thumb: when you let go it lands on whichever side is nearer.
- While held, the thumb turns into a glass lens that bends the track under it, as on iOS 26.
- The on colour is system green, like iOS. Change it per scheme with `LucentProvider`'s `colors` (`switchOn`, `switchOff`, `switchThumb`). See [Theming](../theming.md).
- Accessibility: announced as a switch with its checked state; the screen reader's activate action flips it.
