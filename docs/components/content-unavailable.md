# Content unavailable view

An empty state: a symbol, a title, a description and the actions that fill an empty screen. The API follows `@expo/ui`'s SwiftUI `ContentUnavailableView`, with the symbol named `sf` + `md` as in `NativeTabs.Trigger.Icon`, and `actions` taking React Native views.

- **iOS:** SwiftUI's `ContentUnavailableView`, through `@expo/ui`.
- **Android:** Lucent's recreation: the same grey symbol, bold title and secondary description, centred as iOS centres them.

> Try it: in the [playground](../../example), open **Components → Content Unavailable View**.

## Usage

```tsx
import { Button, ContentUnavailableView } from 'expo-lucent';

<ContentUnavailableView
  title="No Messages"
  sf="tray"
  md="inbox"
  description="Messages you receive appear here."
  actions={<Button label="Refresh" onPress={refresh} />}
/>;
```

It fills the space it's given and centres its content there, so put it in the screen or in a box with a size or `flex: 1`.

## Props

| Prop          | Type                   | Default | Notes                                                     |
| ------------- | ---------------------- | ------- | --------------------------------------------------------- |
| `title`       | `string`               | —       | Bold, in the label colour.                                |
| `sf`          | `SFSymbol`             | —       | The SF Symbol on iOS.                                     |
| `md`          | `AndroidSymbol`        | —       | The Material Symbol on Android. Without it, no symbol.    |
| `description` | `string`               | —       | In the secondary label colour, wrapping and centred.      |
| `actions`     | `ReactNode`            | —       | Shown below the description, centred: usually a `Button`. |
| `testID`      | `string`               | —       |                                                           |
| `style`       | `StyleProp<ViewStyle>` | —       | Layout only: margins and size.                            |

## Android behaviour

- A 48pt symbol, a 21pt bold title and a 20pt description, in iOS's label and secondary label colours.
- The text wraps inside a 64pt margin each side.
- Without a symbol, the content sits a little above the middle, as on iOS.
