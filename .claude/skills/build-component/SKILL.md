---
name: build-component
description: Lucent's workflow for building or reworking one component end to end — API, anatomy from Apple's Figma kit and HIG, stories first, measuring iOS, Liquid Glass on Android checked across glass levels, light and dark, then motion planned with apple-design and choreograph, built, measured and performance-checked, then the fallback glass, the review, the manual pass and the docs. Use when starting a new component, rebuilding one, or when the user says "let's do the <component>" or asks what's next for a component.
---

# Building a Lucent component

One component at a time, through every step below, before the next component starts. Each step has a check; don't
move on until it passes. Ask before every commit (never push, never add Claude attribution), and commit after each
step that passes so a regression can be found by commit.

Lucent passes through to Apple's real component on iOS and recreates it on Android. "Matches" always means matches
the iOS simulator, measured, not what looks right.

## 0. API

Follow the rules in `docs/design.md` ("The rules": copy Expo's API, which Expo layer to prefer, Lucent-only props stay
optional). Read Apple's API for the component (UIKit / SwiftUI) and what `expo-router`, `react-native-screens` and
`@expo/ui` expose, from their installed type definitions. Every prop the iOS side supports is in scope, including
ones that look minor (`prominent`, a bottom accessory): missing one now means a new feature popping up mid-build.

**Check:** the prop list is written down, each prop mapped to its iOS source.

## 1. Anatomy

- **Apple's iOS 27 Figma kit** — "iOS and iPadOS 27 (Community)", file `i8a1TGKR8toAgL4sQRFyI9`. The user is on free
  Figma: ask them for a node link to one instance of the component and read it with one or two `get_design_context`
  calls (a session first). Take its **structure**: each layer fixed, hug or fill; padding; gaps (negative ones too);
  what sits inside what.
- **Apple's Human Interface Guidelines** page for the component, for behaviour and states.

The kit gives structure, the simulator gives values. When they disagree, the simulator wins (the tab bar's kit padding
was 8pt, the simulator renders 19). Sizes are content plus fixed padding, with fixed minimums where iOS has them; no
caps or ratios measured on one screen (see the tab bar's history: a 360pt cap and a 103pt cap broke on the Pixel).

**Check:** an anatomy note — layers, sizing mode, padding, gaps, minimums — written as relationships.

## 2. Stories first

Before building, write the story page in `example/` with a control for every prop and variant from step 0, so the
component can be put in any state on both devices. The story is the test bench for every later step.

**Check:** every prop reachable from the story on iOS and Android.

## 3. Measure iOS

Decide the matrix before measuring: item counts, short and long labels, larger text, light and dark, and anything the
props change. Measure on the iPhone simulator; compare against the Pixel emulator.

- Static: screenshots at 3x; measure in points; record each value against the setup it came from, and derive the
  rule that covers all setups.
- Motion: `simctl recordVideo` on iOS, the emulator's screen recorder on Android; drive identical gestures (idb on iOS,
  emulator-console touches on Android for exact timing); step through frames side by side.
- Timing needs a headless emulator (`-no-window -gpu host`): a covered emulator window is throttled to ~12fps.
- Release builds only for timing: `./gradlew :app:createBundleReleaseJsAndAssets --rerun :app:assembleRelease -x lint`
  (without `--rerun` Gradle misses changes in `../src`).

**Check:** every value has a recording or screenshot behind it.

## 4. Build Liquid Glass, static

Build the Android component's anatomy from step 1's relationships and step 3's values, and compare it against iOS in
this order:

1. Glass at the default `glassOpacity` (0.5).
2. `glassOpacity` 0 and 1 — if both ends and the default match, every level between does.
3. Light vs dark mode.

Each over several backdrops: a photo, plain white, plain black, and text, because glass is mostly what's behind it.
Check spacing, padding, heights, widths, gaps, borders, corner radii (continuous corners) and shadows.

**Check:** side-by-side screenshots match at every glass level and scheme, over every backdrop.

## 5. Plan the motion

Load the `apple-design` skill for the rules of motion (respond on touch-down, 1:1 tracking, interruptible springs
that carry velocity, rubber-banding) and the `choreograph` skill when several parts move on one event (cast each as
lead, support, decoration or static; tie each secondary motion to a moment of the lead). Write a timeline per event —
tap, press, hold, drag, appear, disappear, state change — against the iOS recordings.

The skills' numbers (spring tables, duration budgets, "don't animate this") are defaults; the iOS recordings set
Lucent's values. Springs are written Apple's way, `{ duration, dampingRatio }`.

**Check:** a timeline per event, every value traced to a recording.

## 6. Build the motion

Reanimated worklets on the UI thread; shared values, not React state, for anything per frame; `scheduleOnRN` only at
commit moments; sequences that start from the current value so they can be interrupted.

## 7. Verify the motion

- Record the same gestures on both devices and compare frame by frame at fixed times (e.g. 25, 50, 75, 100, 135,
  170, 220, 280ms), for position, size, fill and every moving part.
- Load the `animation-performance` skill and check the component: no layout properties animated per frame where a
  transform would do, no React render per frame, no custom native prop riding React's commit where avoidable.

**Check:** recordings match; performance findings fixed or written down with the reason.

## 8. Improve

Fix what step 7 found, re-record, repeat until it matches.

## 9. Fallback glass

With `setGlassFallback` (Settings → Device in the example): `'android12'` (blur, no refraction) and `'android11'`
(flat), each in light and dark mode. There's no glass level to test here. The component must stay legible and keep
every state visible (the selected pill, pressed states) without the shader.

**Check:** both fallbacks readable in both schemes, nothing missing that the shader drew.

## 10. Review and manual pass

- Ask the user to run `/review-animations` on the component (only they can start it). Fix its findings or note why a
  measured iOS value overrides one.
- The user goes through every story by hand on both devices.

Also before calling it done:

- **Reduce Motion:** record iOS with it on and match what it does instead.
- **Reduce Transparency / Increase Contrast:** match iOS's changes to the glass.
- **Accessibility:** TalkBack roles and labels, 48dp touch targets, larger text.
- **Right to left:** match iOS's mirrored layout.
- **Haptics:** tick where iOS ticks.

## 11. Docs

Write or update `docs/components/<name>.md` in the existing pages' shape: what it is and what it copies, iOS and
Android lines, a recording in `docs/media/`, where to try it in the playground, usage, a props table (Lucent-only
props marked), platform differences and the fallback's look. Update the component's status in `docs/design.md`.

## Definition of done

API from `docs/design.md`'s rules · anatomy from the kit as relationships · a story for every prop · values measured
on iOS · glass matched at 0, 0.5 and 1, light and dark, over a photo, white, black and text · motion planned, built
and matched frame by frame · performance checked · fallbacks legible in light and dark · `/review-animations` run ·
Reduce Motion, Reduce Transparency, accessibility, RTL and haptics checked · manual pass done · docs written ·
committed step by step.
