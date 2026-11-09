import { ListItem as UniversalListItem } from '@expo/ui';
import { Children, isValidElement, useContext, useState, type ReactNode } from 'react';
import { I18nManager, PixelRatio, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { ListStyleContext, nextRowId, OpenRowContext, RowLastContext, useListColors } from './section.android';
import { list } from './tokens';
import type { ListItemProps, SwipeAction } from './types';
import { MaterialSymbol } from '../../core/icons/MaterialSymbol';
import { useLucentTheme } from '../../theme/LucentProvider';

const { Leading, Trailing, Supporting } = UniversalListItem;
const mirrored = I18nManager.isRTL;

// The row's slot children, as `@expo/ui` takes them: `<ListItem.Leading>` and the rest over the shorthand props.
const slotsOf = (children: ReactNode) => {
  const slots: { leading?: ReactNode; trailing?: ReactNode; supporting?: ReactNode } = {};
  const headline: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === Leading) slots.leading = child.props.children;
    else if (isValidElement<{ children?: ReactNode }>(child) && child.type === Trailing)
      slots.trailing = child.props.children;
    else if (isValidElement<{ children?: ReactNode }>(child) && child.type === Supporting)
      slots.supporting = child.props.children;
    else headline.push(child);
  });
  return { ...slots, headline };
};

const textual = (node: ReactNode) => typeof node === 'string' || typeof node === 'number';

// SF Symbols' `chevron.right` at footnote semibold, and `checkmark` at body semibold, as a cell's accessories draw.
const Chevron = ({ color }: { color: string }) => {
  const { width, height, stroke } = list.chevron;
  const inset = stroke / 2;
  return (
    <Svg width={width} height={height} style={mirrored ? styles.flipped : null}>
      <Polyline
        points={`${inset},${inset} ${width - inset},${height / 2} ${inset},${height - inset}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

const Checkmark = ({ color }: { color: string }) => {
  const { width, height, stroke } = list.checkmark;
  const inset = stroke / 2;
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={`${inset},${height * 0.55} ${width * 0.36},${height - inset} ${width - inset},${inset}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
};

/** One action's button: a coloured capsule with its icon, its label under it. */
const ActionButton = ({ action, onDone }: { action: SwipeAction; onDone: () => void }) => {
  const colors = useListColors();
  const fill = action.tintColor ?? (action.destructive ? colors.destructive : '#8E8E93');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => {
        onDone();
        action.onPress();
      }}
      style={styles.action}>
      <View style={[styles.capsule, { backgroundColor: fill }]}>
        {action.icon?.md ? (
          <MaterialSymbol name={action.icon.md} size={list.swipe.iconSize} tintColor="#FFFFFF" />
        ) : null}
      </View>
      <Text numberOfLines={1} style={[styles.actionLabel, { color: colors.caption }]}>
        {action.label}
      </Text>
    </Pressable>
  );
};

// How far the row slides to show `count` buttons: each one and the gaps around them.
const openWidth = (count: number) =>
  count > 0 ? count * list.swipe.width + (count - 1) * list.swipe.gap + list.swipe.gap + list.swipe.edge : 0;

/**
 * `@expo/ui`'s `ListItem`, drawn as iOS 27 draws a list row: the headline with a second line under it, a leading view,
 * trailing content, Lucent's value and chevron or checkmark, a separator to the next row from the text's start, a grey
 * fill under a finger, and swipe actions that slide the row aside onto capsule buttons.
 */
export const ListItem = ({
  children,
  onPress,
  leading: leadingProp,
  trailing: trailingProp,
  supportingText,
  detail,
  accessory,
  destructive = false,
  swipeActions,
  disabled = false,
  testID,
}: ListItemProps) => {
  const colors = useListColors();
  const { color } = useLucentTheme();
  const style = useContext(ListStyleContext) ?? 'insetGrouped';
  const last = useContext(RowLastContext);
  const slots = slotsOf(children);
  const leading = slots.leading ?? leadingProp;
  const trailing = slots.trailing ?? trailingProp;
  const supporting = slots.supporting ?? supportingText;
  const [leadingWidth, setLeadingWidth] = useState(0);
  const [rowWidth, setRowWidth] = useState(0);
  // Rows grow with the text size, as iOS's do.
  const scale = PixelRatio.getFontScale();

  const leadingActions = swipeActions?.leading ?? [];
  const trailingActions = swipeActions?.trailing ?? [];
  const full = swipeActions?.allowsFullSwipe ?? true;
  // The row's slide: positive reveals the leading actions, negative the trailing ones (flipped right to left).
  const offset = useSharedValue(0);
  const start = useSharedValue(0);
  const leadingOpen = openWidth(leadingActions.length);
  const trailingOpen = openWidth(trailingActions.length);
  const close = () => offset.set(withSpring(0, list.swipe.spring));
  // One row open at a time in a list: another opening closes this one.
  const openRow = useContext(OpenRowContext);
  const [id] = useState(nextRowId);
  useAnimatedReaction(
    () => openRow?.get() ?? -1,
    (open) => {
      if (open !== id && offset.get() !== 0) offset.set(withSpring(0, list.swipe.spring));
    },
  );
  const run = (action: SwipeAction | undefined) => {
    close();
    action?.onPress();
  };
  const pan = usePanGesture({
    enabled: !disabled && (leadingActions.length > 0 || trailingActions.length > 0),
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onActivate: () => {
      start.set(offset.get());
      openRow?.set(id);
    },
    onUpdate: (event) => {
      const dx = mirrored ? -event.translationX : event.translationX;
      let next = start.get() + dx;
      // Only toward a side with actions; past its buttons it follows the finger more slowly, as iOS's does.
      if (next > 0 && leadingOpen === 0) next = 0;
      if (next < 0 && trailingOpen === 0) next = 0;
      const open = next > 0 ? leadingOpen : trailingOpen;
      const past = Math.abs(next) - open;
      if (past > 0 && !full) next = Math.sign(next) * (open + past * 0.3);
      offset.set(next);
    },
    onDeactivate: (event) => {
      const now = offset.get();
      const velocity = mirrored ? -event.velocityX : event.velocityX;
      const open = now > 0 ? leadingOpen : trailingOpen;
      const width = rowWidth || 1;
      // Dragged most of the way across, the outermost action runs.
      if (full && open > 0 && Math.abs(now) > width * list.swipe.fullSwipe) {
        offset.set(withSpring(0, list.swipe.spring));
        scheduleOnRN(run, now > 0 ? leadingActions[0] : trailingActions[0]);
        return;
      }
      const flung = Math.abs(velocity) > 500 && Math.sign(velocity) === Math.sign(now);
      const keep = open > 0 && (Math.abs(now) > open / 2 || flung);
      offset.set(withSpring(keep ? Math.sign(now) * open : 0, list.swipe.spring));
    },
  });
  const slide = useAnimatedStyle(() => ({
    transform: [{ translateX: mirrored ? -offset.get() : offset.get() }],
  }));
  // Slid aside, the row sits on a grey fill with rounded ends, as iOS 27's does.
  const slidFill = useAnimatedStyle(() => ({ opacity: Math.min(Math.abs(offset.get()) / 24, 1) }));
  const leadingShown = useAnimatedStyle(() => ({ opacity: offset.get() > 0 ? 1 : 0 }));
  const trailingShown = useAnimatedStyle(() => ({ opacity: offset.get() < 0 ? 1 : 0 }));

  const textColor = destructive ? colors.destructive : colors.text;
  const separatorStart = list.rowPadding + (leading != null ? leadingWidth + list.leadingGap : 0);
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        { minHeight: list.rowMinHeight * scale },
        pressed && !disabled ? { backgroundColor: colors.pressed } : null,
      ]}>
      <View style={[styles.inner, disabled && styles.disabled]}>
        {leading != null ? (
          <View
            style={styles.leading}
            onLayout={(event: LayoutChangeEvent) => setLeadingWidth(event.nativeEvent.layout.width)}>
            {leading}
          </View>
        ) : null}
        <View style={styles.texts}>
          {slots.headline.length > 0 ? (
            slots.headline.every(textual) ? (
              <Text style={[styles.title, { color: textColor }]}>{slots.headline}</Text>
            ) : (
              slots.headline
            )
          ) : null}
          {supporting != null ? (
            textual(supporting) ? (
              <Text style={[styles.supporting, { color: colors.secondary }]}>{supporting}</Text>
            ) : (
              supporting
            )
          ) : null}
        </View>
        {trailing != null ? (
          <View style={styles.trailing}>
            {textual(trailing) ? <Text style={[styles.title, { color: colors.text }]}>{trailing}</Text> : trailing}
          </View>
        ) : null}
        {detail != null ? (
          <Text numberOfLines={1} style={[styles.title, styles.detail, { color: colors.secondary }]}>
            {detail}
          </Text>
        ) : null}
        {accessory === 'disclosure' ? (
          <View style={styles.chevron}>
            <Chevron color={colors.chevron} />
          </View>
        ) : accessory === 'checkmark' ? (
          <View style={styles.checkmark}>
            <Checkmark color={color.tint} />
          </View>
        ) : null}
      </View>
      {last ? null : (
        <View
          style={[
            styles.separator,
            {
              start: separatorStart,
              end: style === 'plain' ? list.rowPadding : 0,
              backgroundColor: style === 'plain' ? colors.plainSeparator : colors.separator,
            },
          ]}
        />
      )}
    </View>
  );

  const row = (
    <Pressable
      testID={testID}
      disabled={disabled || !onPress}
      onPress={() => {
        // A tap while a row's actions are open closes them, as iOS's does, rather than pressing the row.
        if (openRow && openRow.get() !== -1) return openRow.set(-1);
        if (Math.abs(offset.get()) > 1) return close();
        onPress?.();
      }}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      accessibilityActions={[...leadingActions, ...trailingActions].map((action) => ({
        name: action.label,
        label: action.label,
      }))}
      onAccessibilityAction={(event) =>
        run([...leadingActions, ...trailingActions].find((action) => action.label === event.nativeEvent.actionName))
      }>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
  if (leadingActions.length === 0 && trailingActions.length === 0) return row;
  return (
    <View onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}>
      <Animated.View style={[styles.actions, styles.actionsLeading, leadingShown]} pointerEvents="box-none">
        {leadingActions.map((action, index) => (
          <ActionButton key={`${action.label}-${index}`} action={action} onDone={close} />
        ))}
      </Animated.View>
      <Animated.View style={[styles.actions, styles.actionsTrailing, trailingShown]} pointerEvents="box-none">
        {[...trailingActions].reverse().map((action, index) => (
          <ActionButton key={`${action.label}-${index}`} action={action} onDone={close} />
        ))}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={slide}>
          <Animated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.slidFill, { backgroundColor: colors.pressed }, slidFill]}
          />
          {row}
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

ListItem.Leading = Leading;
ListItem.Trailing = Trailing;
ListItem.Supporting = Supporting;

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: list.rowPadding,
    paddingVertical: list.rowPaddingVertical,
  },
  disabled: { opacity: 0.5 },
  leading: { marginEnd: list.leadingGap },
  texts: { flex: 1, gap: list.supportingGap },
  title: { fontSize: list.title.fontSize, lineHeight: list.title.lineHeight },
  supporting: { fontSize: list.supporting.fontSize, lineHeight: list.supporting.lineHeight },
  trailing: { marginStart: list.leadingGap },
  detail: { marginStart: list.leadingGap, flexShrink: 1, textAlign: 'right' },
  chevron: { marginStart: list.detailGap, marginEnd: list.chevron.end },
  checkmark: { marginStart: list.detailGap },
  separator: { position: 'absolute', bottom: 0, height: StyleSheet.hairlineWidth },
  flipped: { transform: [{ scaleX: -1 }] },
  actions: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: list.swipe.gap,
  },
  actionsLeading: { start: list.swipe.edge },
  actionsTrailing: { end: list.swipe.edge },
  action: { alignItems: 'center', gap: list.swipe.labelGap },
  capsule: {
    width: list.swipe.width,
    height: list.swipe.height,
    borderRadius: list.swipe.height / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: list.swipe.labelSize },
  slidFill: { borderRadius: list.cardRadius },
});
