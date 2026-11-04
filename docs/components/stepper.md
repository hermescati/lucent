# Stepper

Minus and plus buttons that step a value between a minimum and a maximum. `@expo/ui` has no universal stepper, so Lucent's API follows SwiftUI's `Stepper`, with React Native's naming.

- **iOS:** SwiftUI's `Stepper`, through `@expo/ui`.
- **Android:** Lucent's recreation: iOS 26's grey capsule split by a hairline, each side greying out at its end.

> Try it: in the [playground](../../example), open **Components → Stepper**.

## Usage

```tsx
import { Stepper } from 'expo-lucent';

const [quantity, setQuantity] = useState(1);

<Stepper value={quantity} min={1} max={10} onValueChange={setQuantity} />;
```

With a label, the stepper is a full-width row, as in an iOS list:

```tsx
<Stepper label={`Quantity: ${quantity}`} value={quantity} min={1} max={10} onValueChange={setQuantity} />
```

## Props

| Prop            | Type                      | Default | Notes                                                                |
| --------------- | ------------------------- | ------- | -------------------------------------------------------------------- |
| `value`         | `number`                  | —       | Whole numbers on iOS, where `@expo/ui`'s stepper counts in integers. |
| `onValueChange` | `(value: number) => void` | —       | Called with the new value on each step.                              |
| `min`           | `number`                  | `0`     | The minus side greys out here.                                       |
| `max`           | `number`                  | `100`   | The plus side greys out here.                                        |
| `step`          | `number`                  | `1`     |                                                                      |
| `label`         | `string`                  | —       | Makes the stepper a full-width row, the label at its leading edge.   |
| `disabled`      | `boolean`                 | `false` | Greys out both sides.                                                |
| `hidden`        | `boolean`                 | `false` | Hidden, though still taking its room.                                |
| `testID`        | `string`                  | —       |                                                                      |
| `style`         | `StyleProp<ViewStyle>`    | —       | Layout only: margins, alignment and size.                            |

## Android behaviour

- 93 × 32pt, on iOS's tertiary fill, with a hairline between the halves.
- A tap steps once; holding a side steps again after half a second and then ten times a second, until its end.
- Screen readers get an adjustable control: swipe up or down to step.
