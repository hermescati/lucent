# Slider

Pick a number from a range by dragging. Same API as the `Slider` from [`@expo/ui`](https://docs.expo.dev/versions/v58.0.0/sdk/ui/).

- **iOS:** SwiftUI's `Slider`, through `@expo/ui`.
- **Android:** Lucent's recreation: a thin track that fills with your accent colour, and a thumb that turns into a glass lens while you drag.

<p align="center">
  <img src="../media/slider.webp" width="540" alt="Lucent's slider on Android in dark mode: dragging the glass lens up, flicking it down so it stretches, then dragging it back to the middle" />
</p>

> Try it: in the [playground](../../example), open **Components → Slider**.

## Usage

```tsx
import { Slider } from 'expo-lucent';

const [volume, setVolume] = useState(0.5);

<Slider value={volume} onValueChange={setVolume} />;
```

With a range and a step:

```tsx
<Slider value={size} min={0} max={100} step={10} onValueChange={setSize} />
```

The slider stretches to the width of its parent.

## Props

| Prop            | Type                      | Default | Notes                                                                        |
| --------------- | ------------------------- | ------- | ---------------------------------------------------------------------------- |
| `value`         | `number`                  | —       | The current value. Required.                                                 |
| `onValueChange` | `(value: number) => void` | —       | Called while the user drags. Required.                                       |
| `min`           | `number`                  | `0`     |                                                                              |
| `max`           | `number`                  | `1`     |                                                                              |
| `step`          | `number`                  | —       | Snaps to `min`, `min + step`, … `max`. Leave it out for a continuous slider. |
| `disabled`      | `boolean`                 | `false` | Dims the slider and ignores touches.                                         |
| `testID`        | `string`                  | —       |                                                                              |
| `modifiers`     | `ModifierConfig[]`        | —       | iOS only: `@expo/ui/swift-ui` modifiers. Ignored on Android.                 |

## Android behaviour

- Grab the thumb and drag. Tapping the track doesn't move it, as on iOS. With a `step`, the thumb snaps to each value with a light haptic tick.
- Pulling past either end stretches the thumb a little and springs back, as on iOS 26.
- The filled part of the track uses `LucentProvider`'s `tintColor`. The track, thumb and shadow come from `colors` (`sliderTrack`, `sliderThumb`, `sliderShadow`). See [Theming](../theming.md).
- Accessibility: announced as adjustable with its value; swipe up or down to change it by one `step` (or a tenth of the range without one).
