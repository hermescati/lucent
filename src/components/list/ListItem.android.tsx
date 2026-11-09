import { ListItem as UniversalListItem } from '@expo/ui';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import { Children, isValidElement, useContext, useState, type ReactNode } from 'react';
import { I18nManager, PixelRatio, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Polyline } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ListEditContext,
  ListStyleContext,
  nextRowId,
  OpenRowContext,
  RowEditContext,
  RowLastContext,
  useListColors,
} from './section.android';
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

// A tick as a full swipe arms or disarms, as iOS's does.
const tick = () => {
  performAndroidHapticsAsync(AndroidHaptics.Segment_Tick);
};

// How far the row slides to show `count` buttons: each one and the gaps around them.
const openWidth = (count: number) =>
  count > 0 ? count * list.swipe.width + (count - 1) * list.swipe.gap + list.swipe.gap + list.swipe.edge : 0;

/** Edit mode's delete control: a red circle with a white minus. */
const DeleteControl = ({ color }: { color: string }) => {
  const { control, minus } = list.edit;
  return (
    <View
      style={[
        styles.deleteControl,
        { width: control, height: control, borderRadius: control / 2, backgroundColor: color },
      ]}>
      <View
        style={{ width: minus.width, height: minus.height, borderRadius: minus.height / 2, backgroundColor: '#FFFFFF' }}
      />
    </View>
  );
};

/** Edit mode's reorder handle: three grey lines. */
const ReorderHandle = ({ color }: { color: string }) => {
  const { width, line, gap } = list.edit.handle;
  return (
    <View style={{ gap }}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={{ width, height: line, borderRadius: line / 2, backgroundColor: color }} />
      ))}
    </View>
  );
};

/** The row's swipe state, which its buttons draw from. */
interface SwipeState {
  // The finger's slide (positive reveals the leading actions), how armed a full swipe is (0 to 1), and whether the row
  // is closing.
  offset: SharedValue<number>;
  armed: SharedValue<number>;
  closing: SharedValue<boolean>;
  rowWidth: number;
}

// The row's slide as drawn: the finger's, and the jump an armed full swipe makes.
const shownOffset = (offset: number, armed: number) => {
  'worklet';
  return offset + Math.sign(offset) * armed * list.swipe.armJump;
};

/**
 * One action's button: a coloured capsule with its icon, its label under it. It pops in once the row uncovers its slot
 * and shrinks away as the row closes; the outermost one stretches into the room past the buttons and, with a full
 * swipe armed, moves its icon to its leading end, and the others fade as it grows.
 */
const ActionButton = ({
  action,
  side,
  index,
  count,
  swipe,
  onRun,
}: {
  action: SwipeAction;
  side: 'leading' | 'trailing';
  index: number;
  count: number;
  swipe: SwipeState;
  onRun: (action: SwipeAction, side: 'leading' | 'trailing') => void;
}) => {
  const colors = useListColors();
  const fill = action.tintColor ?? (action.destructive ? colors.destructive : '#8E8E93');
  const { offset, armed, closing, rowWidth } = swipe;
  const { width, edge, popFrom, pop, drop } = list.swipe;
  const outermost = index === 0;
  const open = openWidth(count);
  const sign = side === 'leading' ? 1 : -1;
  // Where this button's slot is uncovered: the edge and the buttons up to it.
  const uncovered = edge + (index + 1) * width;
  const shown = useSharedValue(0);
  useAnimatedReaction(
    () => !closing.get() && offset.get() * sign >= uncovered,
    (now, before) => {
      if (now === before) return;
      shown.set(now ? withSpring(1, pop) : withTiming(0, { duration: drop, easing: Easing.out(Easing.cubic) }));
    },
  );
  const capsule = useAnimatedStyle(() => {
    const slid = Math.abs(shownOffset(offset.get(), armed.get()));
    const past = Math.max(0, slid - open);
    const p = shown.get();
    return {
      width: outermost ? width + past : width,
      opacity: Math.min(1, p * 3) * (outermost ? 1 : Math.max(0, 1 - past / (rowWidth || 1))),
      transform: [{ scale: popFrom + (1 - popFrom) * p }],
    };
  });
  // Toward the row: the icon's way to its capsule's leading end.
  const towardRow = (side === 'leading' ? 1 : -1) * (mirrored ? -1 : 1);
  const icon = useAnimatedStyle(() => {
    if (!outermost) return {};
    const slid = Math.abs(shownOffset(offset.get(), armed.get()));
    const room = Math.max(0, slid - open) / 2;
    return { transform: [{ translateX: towardRow * room * armed.get() }] };
  });
  const label = useAnimatedStyle(() => ({
    opacity: (outermost ? 1 - armed.get() : 1) * Math.min(1, shown.get() * 3),
  }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => onRun(action, side)}
      style={styles.action}>
      <Animated.View style={[styles.capsule, { backgroundColor: fill }, capsule]}>
        {action.icon?.md ? (
          <Animated.View style={icon}>
            <MaterialSymbol name={action.icon.md} size={list.swipe.iconSize} tintColor="#FFFFFF" />
          </Animated.View>
        ) : null}
      </Animated.View>
      <Animated.Text numberOfLines={1} style={[styles.actionLabel, { color: colors.caption }, label]}>
        {action.label}
      </Animated.Text>
    </Pressable>
  );
};

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
  // At accessibility text sizes iOS stacks a row's value under its title rather than beside it, where it would leave
  // the title too little room to fit a word.
  const stacked = scale >= list.stackedFrom;

  // Edit mode: a row its `List.ForEach` can delete makes room for the delete control, one it can move shows the handle.
  // Its content takes its edit-mode place at once and is drawn moving there, so only transforms run per frame.
  const edit = useContext(ListEditContext);
  const rowEdit = useContext(RowEditContext);
  const editing = edit?.editing ?? false;
  const editProgress = edit?.progress;
  const editStart = rowEdit.onDelete ? list.edit.shift : 0;
  const editEnd = rowEdit.movable ? list.edit.handleRoom : 0;
  const along = mirrored ? -1 : 1;
  const from = editing ? 1 : 0;
  const startMoved = useAnimatedStyle(() => ({
    transform: [{ translateX: along * editStart * ((editProgress?.get() ?? 0) - from) }],
  }));
  const endMoved = useAnimatedStyle(() => ({
    transform: [{ translateX: -along * editEnd * ((editProgress?.get() ?? 0) - from) }],
  }));
  const controlIn = useAnimatedStyle(() => {
    const p = editProgress?.get() ?? 0;
    return { opacity: p > 0.001 ? 1 : 0, transform: [{ translateX: along * editStart * (p - 1) }] };
  });
  const handleIn = useAnimatedStyle(() => {
    const p = editProgress?.get() ?? 0;
    return { opacity: p, transform: [{ translateX: along * list.edit.shift * (1 - p) }] };
  });

  // A row its `List.ForEach` can delete gets SwiftUI's Delete action: swiped to from the trailing edge unless the row
  // has trailing actions of its own, and in edit mode the only action, which the delete control opens.
  const deleteAction: SwipeAction | undefined = rowEdit.onDelete
    ? { label: 'Delete', icon: { sf: 'trash.fill', md: 'delete' }, destructive: true, onPress: rowEdit.onDelete }
    : undefined;
  const leadingActions = editing ? [] : (swipeActions?.leading ?? []);
  const trailingActions = editing
    ? deleteAction
      ? [deleteAction]
      : []
    : (swipeActions?.trailing ?? (deleteAction ? [deleteAction] : []));
  const full = swipeActions?.allowsFullSwipe ?? true;
  // The row's slide: positive reveals the leading actions, negative the trailing ones (flipped right to left).
  const offset = useSharedValue(0);
  const start = useSharedValue(0);
  const armed = useSharedValue(0);
  // Whether a full swipe is armed now, apart from its animation: a quick drag lets go the moment it arms.
  const fullArmed = useSharedValue(false);
  const closing = useSharedValue(false);
  const swipe: SwipeState = { offset, armed, closing, rowWidth };
  const leadingOpen = openWidth(leadingActions.length);
  const trailingOpen = openWidth(trailingActions.length);
  const close = () => {
    closing.set(true);
    armed.set(withSpring(0, list.swipe.spring));
    offset.set(withSpring(0, list.swipe.spring));
  };
  // One row open at a time in a list: another opening closes this one.
  const openRow = useContext(OpenRowContext);
  const [id] = useState(nextRowId);
  useAnimatedReaction(
    () => openRow?.get() ?? -1,
    (open) => {
      if (open === id || offset.get() === 0) return;
      closing.set(true);
      armed.set(withSpring(0, list.swipe.spring));
      offset.set(withSpring(0, list.swipe.spring));
    },
  );
  // Out the rest of the way: fast from the start, as the row is already moving.
  const slideOut = { duration: list.swipe.commit, easing: Easing.out(Easing.cubic) };
  // Edit mode's delete control opens the row's Delete action, as a swipe would.
  const revealDelete = () => {
    closing.set(false);
    openRow?.set(id);
    offset.set(withSpring(-trailingOpen, list.swipe.spring));
  };
  const run = (action: SwipeAction | undefined) => {
    close();
    action?.onPress();
  };
  // How far a destructive action has closed its row up (0 to 1), and the row's height before it did.
  const gone = useSharedValue(0);
  const rowHeight = useSharedValue(0);
  // The row is still there a moment after its action ran (the app kept it): it opens back up and closes its actions.
  const restore = () => {
    gone.set(withTiming(0, { duration: list.swipe.remove, easing: Easing.out(Easing.cubic) }));
    close();
  };
  const finish = (action: SwipeAction) => {
    action.onPress();
    setTimeout(restore, 300);
  };
  const collapse = (action: SwipeAction) => {
    gone.set(
      withTiming(1, { duration: list.swipe.remove, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(finish, action);
      }),
    );
  };
  // An action from its button or a screen reader. A destructive one takes its row away as iOS does: the row slides out
  // as its height closes up, and the action runs once it's gone. Any other closes the row and runs.
  const perform = (action: SwipeAction | undefined, side: 'leading' | 'trailing') => {
    if (!action) return;
    if (!action.destructive) return run(action);
    offset.set(withTiming((side === 'leading' ? 1 : -1) * (rowWidth || 1), slideOut));
    collapse(action);
  };
  const pan = usePanGesture({
    enabled: !disabled && !editing && (leadingActions.length > 0 || trailingActions.length > 0),
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onActivate: () => {
      start.set(offset.get());
      closing.set(false);
      fullArmed.set(false);
      // Caught while sliding out to run, the row drops the jump an armed swipe made.
      if (armed.get() > 0) armed.set(withSpring(0, list.swipe.arm));
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
      // Far enough across, a full swipe arms: the row jumps on and a tick marks it, and disarms the same way back.
      const now = full && open > 0 && Math.abs(next) > (rowWidth || 1) * list.swipe.fullSwipe;
      if (now !== fullArmed.get()) {
        fullArmed.set(now);
        armed.set(withSpring(now ? 1 : 0, list.swipe.arm));
        scheduleOnRN(tick);
      }
    },
    onDeactivate: (event) => {
      const now = offset.get();
      const velocity = mirrored ? -event.velocityX : event.velocityX;
      const open = now > 0 ? leadingOpen : trailingOpen;
      // Let go armed, the row slides the rest of the way out and the outermost action runs: a destructive one once the
      // row has closed up after it.
      if (fullArmed.get()) {
        fullArmed.set(false);
        const action = now > 0 ? leadingActions[0] : trailingActions[0];
        offset.set(
          withTiming(Math.sign(now) * (rowWidth || 1), slideOut, (finished) => {
            if (finished) scheduleOnRN(action?.destructive ? collapse : run, action);
          }),
        );
        return;
      }
      armed.set(withSpring(0, list.swipe.arm));
      const flung = Math.abs(velocity) > 500 && Math.sign(velocity) === Math.sign(now);
      const keep = open > 0 && (Math.abs(now) > open / 2 || flung);
      if (!keep) closing.set(true);
      // Settling open or shut, it carries on at the finger's speed.
      offset.set(withSpring(keep ? Math.sign(now) * open : 0, { ...list.swipe.spring, velocity }));
    },
  });
  const slide = useAnimatedStyle(() => {
    const shown = shownOffset(offset.get(), armed.get());
    return { transform: [{ translateX: mirrored ? -shown : shown }] };
  });
  // Slid aside, the row sits on a grey fill with rounded ends, as iOS 27's does.
  const slidFill = useAnimatedStyle(() => ({ opacity: Math.min(Math.abs(offset.get()) / 24, 1) }));
  const closedUp = useAnimatedStyle(() => ({
    maxHeight: gone.get() > 0 ? rowHeight.get() * (1 - gone.get()) : 100000,
  }));
  const leadingShown = useAnimatedStyle(() => ({ opacity: offset.get() > 0 ? 1 : 0 }));
  const trailingShown = useAnimatedStyle(() => ({ opacity: offset.get() < 0 ? 1 : 0 }));

  const textColor = destructive ? colors.destructive : colors.text;
  const separatorStart = list.rowPadding + (leading != null ? leadingWidth + list.leadingGap : 0);
  // From the text's start, wherever edit mode has it.
  const separatorAt = useAnimatedStyle(() => ({ start: separatorStart + editStart * (editProgress?.get() ?? 0) }));
  const content = (pressed: boolean) => (
    <View
      style={[
        styles.row,
        { minHeight: list.rowMinHeight * scale },
        pressed && !disabled ? { backgroundColor: colors.pressed } : null,
      ]}>
      <View
        style={[
          styles.inner,
          {
            paddingStart: list.rowPadding + (editing ? editStart : 0),
            paddingEnd: list.rowPadding + (editing ? editEnd : 0),
          },
          disabled && styles.disabled,
        ]}>
        {leading != null ? (
          <Animated.View
            style={[styles.leading, startMoved]}
            onLayout={(event: LayoutChangeEvent) => setLeadingWidth(event.nativeEvent.layout.width)}>
            {leading}
          </Animated.View>
        ) : null}
        <Animated.View style={[styles.texts, startMoved]}>
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
          {detail != null && stacked ? <Text style={[styles.title, { color: colors.secondary }]}>{detail}</Text> : null}
        </Animated.View>
        {trailing != null ? (
          <Animated.View style={[styles.trailing, endMoved]}>
            {textual(trailing) ? <Text style={[styles.title, { color: colors.text }]}>{trailing}</Text> : trailing}
          </Animated.View>
        ) : null}
        {detail != null && !stacked ? (
          <Animated.Text numberOfLines={1} style={[styles.title, styles.detail, { color: colors.secondary }, endMoved]}>
            {detail}
          </Animated.Text>
        ) : null}
        {accessory === 'disclosure' ? (
          <Animated.View style={[styles.chevron, endMoved]}>
            <Chevron color={colors.chevron} />
          </Animated.View>
        ) : accessory === 'checkmark' ? (
          <Animated.View style={[styles.checkmark, endMoved]}>
            <Checkmark color={color.tint} />
          </Animated.View>
        ) : null}
      </View>
      {edit && rowEdit.onDelete ? (
        <Animated.View
          pointerEvents={editing ? 'box-none' : 'none'}
          style={[styles.editSlot, styles.controlSlot, controlIn]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete"
            hitSlop={list.edit.controlAt - list.edit.control / 2}
            onPress={revealDelete}>
            <DeleteControl color={colors.destructive} />
          </Pressable>
        </Animated.View>
      ) : null}
      {edit && rowEdit.movable ? (
        <Animated.View pointerEvents="none" style={[styles.editSlot, styles.handleSlot, handleIn]}>
          <ReorderHandle color={colors.handle} />
        </Animated.View>
      ) : null}
      {last ? null : (
        <Animated.View
          style={[
            styles.separator,
            {
              // iOS 27 ends them short of the row's end, inset grouped and plain alike.
              end: list.rowPadding,
              backgroundColor: style === 'plain' ? colors.plainSeparator : colors.separator,
            },
            separatorAt,
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
      accessibilityState={{ disabled, selected: accessory === 'checkmark' }}
      accessibilityActions={[...leadingActions, ...trailingActions].map((action) => ({
        name: action.label,
        label: action.label,
      }))}
      onAccessibilityAction={(event) => {
        const named = (action: SwipeAction) => action.label === event.nativeEvent.actionName;
        const leadingAction = leadingActions.find(named);
        perform(leadingAction ?? trailingActions.find(named), leadingAction ? 'leading' : 'trailing');
      }}>
      {({ pressed }) => content(pressed)}
    </Pressable>
  );
  if (leadingActions.length === 0 && trailingActions.length === 0) return row;
  return (
    <Animated.View
      style={[styles.swipeable, closedUp]}
      onLayout={(event) => {
        setRowWidth(event.nativeEvent.layout.width);
        if (gone.get() === 0) rowHeight.set(event.nativeEvent.layout.height);
      }}>
      <Animated.View style={[styles.actions, styles.actionsLeading, leadingShown]} pointerEvents="box-none">
        {leadingActions.map((action, index) => (
          <ActionButton
            key={`${action.label}-${index}`}
            action={action}
            side="leading"
            index={index}
            count={leadingActions.length}
            swipe={swipe}
            onRun={perform}
          />
        ))}
      </Animated.View>
      <Animated.View style={[styles.actions, styles.actionsTrailing, trailingShown]} pointerEvents="box-none">
        {trailingActions
          .map((action, index) => (
            <ActionButton
              key={`${action.label}-${index}`}
              action={action}
              side="trailing"
              index={index}
              count={trailingActions.length}
              swipe={swipe}
              onRun={perform}
            />
          ))
          .reverse()}
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
    </Animated.View>
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
  editSlot: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  controlSlot: { start: list.edit.controlAt - list.edit.control / 2 },
  handleSlot: { end: list.edit.handle.end },
  deleteControl: { alignItems: 'center', justifyContent: 'center' },
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
  swipeable: { overflow: 'hidden' },
});
