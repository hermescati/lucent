# Lucent playground

Every Lucent component, live on a device. Each one has a page where you change its props, watch it react and copy the code for what you set. The app runs inside Lucent's own tab bar, so the components are tested in the setup an app really uses.

```sh
cd example
npm install
npx expo run:android   # or: npx expo run:ios
```

- **Components:** the catalogue, with one page per component, in sections: controls (what you press, drag or type into), views (what shows something, like a progress view or an empty state), navigation, and materials (glass).
- **Gallery:** a long scrolling feed, for minimize-on-scroll and badges.
- **Settings:** `LucentProvider`'s colour scheme, accent and glass opacity, applied to the whole app.
- **Search:** the search tab; it filters the catalogue.

## Adding a component

Each component is one story file in [`stories/`](stories). The page, the controls and the code sample come from it.

1. Create `stories/<component>.tsx`:

   ```tsx
   import { Switch } from 'expo-lucent';

   import { story } from './types';

   export default story({
     slug: 'switch', // the route: /components/switch
     group: 'controls', // its section in the catalogue: controls, views, navigation or materials
     name: 'Switch',
     summary: 'An on/off toggle with a glass thumb',
     component: 'Switch', // the name in the code sample
     controls: {
       value: { type: 'boolean', default: true },
       disabled: { type: 'boolean', default: false, fallback: false },
     },
     // Props the component changes itself, through a callback
     bindings: { value: { handler: 'onValueChange' } },
     render: ({ props, set }) => (
       <Switch
         value={Boolean(props.value)}
         onValueChange={(value) => set({ value })}
         disabled={Boolean(props.disabled)}
       />
     ),
     stage: { photo: 'optional' },
   });
   ```

2. Add it to the `stories` list in [`stories/index.ts`](stories/index.ts).

3. Write its docs page in [`docs/components/`](../docs/components).

### Controls

| Type      | Shows as                                             | Fields                                                         |
| --------- | ---------------------------------------------------- | -------------------------------------------------------------- |
| `boolean` | a `Switch`                                           | `default`                                                      |
| `number`  | a `Slider`                                           | `default`, `min`, `max`, `step`, `unit`                        |
| `select`  | a `SegmentedControl`                                 | `options: { label, value }[]`, `default` (an index)            |
| `color`   | swatches of the accents, plus "None"                 | `default`, `alpha` (hex appended, e.g. `'55'`)                 |
| `preset`  | a `SegmentedControl` that sets several props at once | `label`, `options: { label, props }[]`, `default`, `fallbacks` |

Every control also takes:

- `detail`: a hint under the prop name.
- `fallback`: the component's own default. The code sample leaves the prop out while it has this value.
- `virtual`: the control is only for the demo, and the code sample never prints it as a prop.

### Other story fields

- `stage`: `height`, and `photo: 'optional'` (adds a Plain/Photo choice) or `'always'` (for glass, which needs something behind it to bend).
- `footer`: a hint under the controls.
- `code(props)`: replaces the generated code sample, for components that need children or wrappers.
- `extra`: a component shown under the code, for extra demos such as "in a list".

A component whose demo needs a whole screen, like the tab bar or search, gets its own route in `app/(tabs)/components/` instead, plus an entry in `screens` in `stories/index.ts`.

## Comparing with iOS

Each component also has comparison pages in [`compare/`](compare). A page renders Lucent's components the same way on both platforms. On iOS they are Apple's own, so the iOS capture is the reference and the Android capture is Lucent's recreation. From the repository root:

```sh
npm run compare -- button                                  # every page, light and dark
npm run compare -- button --scheme dark --page 2 --probe glass=40,500
```

The script opens each page on the booted iOS simulator and the connected Android emulator, captures both in each scheme and writes `.compare/<component>/<scheme>-p<page>.png`: iOS, Android and a diff side by side, at the same scale. Red in the diff is where they differ. `--probe name=x,y` prints both platforms' colour at a point, in points from the top-left of the page. It needs Metro running here and the app installed on both devices.

To add a component's comparison, write `compare/<component>.tsx`, which exports `{ slug, pages }`, and list it in `compare/index.ts`. Keep each page within one phone screen. Use the component's own props on both platforms, never platform-specific code, so both captures show the same thing.

### References for components Lucent doesn't have yet

[`compare/references/`](compare/references) holds iOS pages for components Lucent hasn't built: Apple's own, rendered by SwiftUI through `@expo/ui`. They exist only on iOS (`*.ios.tsx`, listed in `compare/references.ios.ts`) and are marked `reference: true`, so `npm run compare -- <component>` captures them on iOS alone, as the target to build against. Wrap a form, list or navigation page in `filled()` so it fills the screen. Presentations (alerts, sheets, popovers) are captured open: get `isPresented` from `usePresentedForCapture()`, which closes them before the next page.

When Lucent's version exists, move the page out of `references/`, render Lucent's component instead of SwiftUI's, and drop `reference: true`. The script then compares both platforms.
