import { ListItem as UniversalListItem } from '@expo/ui';
import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';
import {
  Children,
  isValidElement,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { I18nManager, PixelRatio, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  measure,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path, Polyline } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  ListAutoScrollContext,
  ListEditContext,
  ListScrollGestureContext,
  ListSelectionContext,
  ListStyleContext,
  nextRowId,
  OpenRowContext,
  RowEditContext,
  RowLastContext,
  useListColors,
  useListMargin,
  type RowEdit,
} from './section.android';
import { list } from './tokens';
import type { ListItemProps, SwipeAction } from './types';
import { continuousRect } from '../../core/glass/continuous';
import { MaterialSymbol } from '../../core/icons/MaterialSymbol';
import { ScreenOverlayContext } from '../../core/overlay';
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

// How far the row slides to show buttons this wide: each one and the gaps around them.
const openWidth = (widths: number[]) =>
  widths.length > 0
    ? widths.reduce((sum, width) => sum + width, 0) + widths.length * list.swipe.gap + list.swipe.edge
    : 0;

// Where a side's button starts from the side's edge: past the ones outside it.
const startOf = (widths: number[], index: number) =>
  widths.slice(0, index).reduce((sum, width) => sum + width + list.swipe.gap, 0);

// A side's buttons all as wide as its widest, as iOS draws ones of about the same size; one much wider than the rest
// keeps them each their own width (measured: Pin, Read and Done all 84, but "Mute notifications" 152 beside an 82 Delete).
const sideWidths = (natural: number[]) => {
  if (natural.length === 0) return natural;
  const widest = Math.max(...natural);
  return widest <= Math.min(...natural) * list.swipe.equalUpTo ? natural.map(() => widest) : natural;
};

/**
 * How a button draws, from its row and its action (measured): on a one-line row its icon and label side by side in the
 * capsule, on a taller row its label under the capsule, and without an icon its label alone in the capsule.
 */
type ActionLook = 'beside' | 'under' | 'text';
const lookOf = (action: SwipeAction, tall: boolean): ActionLook =>
  !action.icon?.md ? 'text' : tall ? 'under' : 'beside';

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

/** A selecting row's circle: a grey ring, filled with the accent and a white tick as the row is selected. */
const SelectCircle = ({ ring, fill, selected }: { ring: string; fill: string; selected: boolean }) => {
  const { circle, ring: stroke, tick, fillIn, draw, fade } = list.edit.select;
  // Ticked, the fill comes in and the tick draws itself on, short leg first; unticked, the two fade together (measured).
  const filled = useSharedValue(selected ? 1 : 0);
  const drawn = useSharedValue(selected ? 1 : 0);
  const was = useRef(selected);
  useEffect(() => {
    if (was.current === selected) return;
    was.current = selected;
    if (selected) {
      filled.set(withTiming(1, { duration: fillIn, easing: Easing.linear }));
      drawn.set(
        withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(draw.delay, withTiming(1, { duration: draw.duration, easing: Easing.inOut(Easing.cubic) })),
        ),
      );
    } else filled.set(withTiming(0, { duration: fade, easing: Easing.out(Easing.cubic) }));
  }, [selected, filled, drawn, fillIn, draw, fade]);
  const fillStyle = useAnimatedStyle(() => ({ opacity: filled.get() }));
  const inset = tick.stroke / 2;
  const points: [number, number][] = [
    [inset, tick.height * 0.55],
    [tick.width * 0.38, tick.height - inset],
    [tick.width - inset, inset],
  ];
  const length =
    Math.hypot(points[1][0] - points[0][0], points[1][1] - points[0][1]) +
    Math.hypot(points[2][0] - points[1][0], points[2][1] - points[1][1]);
  const tickDrawn = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.get()) }));
  return (
    <View style={{ width: circle, height: circle, borderRadius: circle / 2, borderWidth: stroke, borderColor: ring }}>
      <Animated.View
        style={[
          styles.selectFill,
          { width: circle, height: circle, borderRadius: circle / 2, backgroundColor: fill },
          fillStyle,
        ]}>
        <Svg width={tick.width} height={tick.height}>
          <AnimatedPath
            d={`M${points[0].join(',')} L${points[1].join(',')} L${points[2].join(',')}`}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={tick.stroke}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={[length, length]}
            animatedProps={tickDrawn}
          />
        </Svg>
      </Animated.View>
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

// Where a row's slot starts in its `List.ForEach`: the heights of the rows before it, in `keys`' order.
const slotAt = (keys: string[], heights: Record<string, number>, key: string) => {
  'worklet';
  let y = 0;
  for (const other of keys) {
    if (other === key) return y;
    y += heights[other] ?? 0;
  }
  return y;
};

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** The row's swipe state, which its buttons draw from. */
interface SwipeState {
  // The finger's slide (positive reveals the leading actions) and how armed a full swipe is (0 to 1).
  offset: SharedValue<number>;
  armed: SharedValue<number>;
  // How far the inner buttons are dimmed (0 to 1), while a finger drags the row past them.
  dim: SharedValue<number>;
  // A non-destructive full swipe that ran: its button shrinks away (0 to 1) as the row closes.
  leaving: SharedValue<number>;
  // Opened by edit mode's delete control rather than a finger: the row then slides on a softer spring.
  following: SharedValue<boolean>;
}

// The row's slide as drawn: the finger's, and the jump an armed full swipe makes (a destructive one's only).
const shownOffset = (offset: number, armed: number, soft: boolean) => {
  'worklet';
  return soft ? offset : offset + Math.sign(offset) * armed * list.swipe.armJump;
};

/**
 * One action's button: a coloured capsule with its icon and label, drawn as its row has them (`ActionLook`). It sits
 * behind the row and grows out from its middle as the row slides past it, and back as the row closes, whatever moves
 * the row: a finger, edit mode's delete control, or a tap that closes it. The outermost one stretches into the room past
 * the buttons and, with a full swipe armed, moves its icon to its leading end, and the others fade as it grows.
 */
const ActionButton = ({
  action,
  side,
  index,
  look,
  at,
  width,
  height,
  open,
  swipe,
  soft,
  onRun,
  onMeasure,
}: {
  action: SwipeAction;
  side: 'leading' | 'trailing';
  index: number;
  look: ActionLook;
  // Where it starts from its side's edge, how wide and tall its capsule is, and how far its side opens.
  at: number;
  width: number;
  height: number;
  open: number;
  swipe: SwipeState;
  // Its side's outermost action isn't destructive: a full swipe then grows that one over the rest, without the jump.
  soft: boolean;
  onRun: (action: SwipeAction, side: 'leading' | 'trailing') => void;
  // Its own width, from its content: the side lays its buttons out from these.
  onMeasure: (index: number, width: number) => void;
}) => {
  const colors = useListColors();
  const fill = action.tintColor ?? (action.destructive ? colors.destructive : '#8E8E93');
  const { offset, armed, dim, leaving } = swipe;
  const { edge, grow, inside } = list.swipe;
  const outermost = index === 0;
  // Measured frame by frame on the simulator at four speeds: a button's size follows the row's slide, from `grow.after`
  // past its middle to full `grow.over` further on (or by the time the row is open for the innermost ones), but on a
  // spring that trails it: about 0.2s from start to full however fast the row goes, settling with a slight bulge.
  // Toward the row: the way a button comes in from, and its icon's way to its capsule's leading end.
  const towardRow = (side === 'leading' ? 1 : -1) * (mirrored ? -1 : 1);
  const middle = edge + at + width / 2;
  const from = middle + grow.after;
  const over = Math.max(grow.least, Math.min(grow.over, open - from));
  const size = useSharedValue(0);
  useAnimatedReaction(
    () => {
      const p = Math.max(0, Math.min(1, (Math.abs(offset.get()) - from) / over));
      return 1 - Math.pow(1 - p, grow.ease);
    },
    (now, before) => {
      if (now !== before) size.set(withSpring(now, grow.spring));
    },
  );
  // It comes up against the row's edge, wherever that is, and from there settles into its place: on a slow slide it
  // comes up in place, but flicked open it comes up well inside, and glides out as the row settles (measured).
  const shift = useSharedValue(0);
  useAnimatedReaction(
    () => size.get() > grow.seen,
    (seen, before) => {
      if (!seen || before !== false) return;
      const against = Math.abs(offset.get()) - (width * size.get()) / 2;
      shift.set(withSequence(withTiming(against - middle - grow.after, { duration: 0 }), withSpring(0, grow.place)));
    },
  );
  const button = useAnimatedStyle(() => {
    const scale = Math.max(0, size.get());
    // Fades in over the first two thirds of its growth.
    const p = scale >= 1 ? 1 : 1 - Math.pow(1 - scale, 1 / grow.ease);
    const shown = Math.min(1, p / grow.fade);
    // Dragged past the buttons, the inner ones dim while the outermost stretches, and further once a full swipe arms.
    // A non-destructive one's inner buttons dim further, and go once it arms, under the outermost.
    const { to, armedTo, softTo } = list.swipe.dim;
    const a = armed.get();
    const dimmed = 1 - (1 - (soft ? softTo : to)) * dim.get();
    const back = outermost ? 1 : soft ? dimmed * (1 - a) : dimmed * (1 - a + (a * armedTo) / to);
    const left = 1 - leaving.get();
    return {
      opacity: (1 - Math.pow(1 - shown, 1.5)) * back,
      transform: [{ translateX: towardRow * shift.get() }, { scale: scale * left }],
    };
  });
  // Its width now: the outermost one stretches as the row is dragged past its buttons.
  const widthNow = (slid: number, a: number) => {
    'worklet';
    if (!outermost) return width;
    const stretched = width + Math.max(0, slid - open);
    // Armed, a non-destructive one grows over the other buttons, up to a gap short of the row (measured).
    const grown = Math.max(stretched, slid - edge - list.swipe.gap);
    return soft ? stretched + (grown - stretched) * a : stretched;
  };
  const capsule = useAnimatedStyle(() => {
    const a = armed.get();
    return { width: widthNow(Math.abs(shownOffset(offset.get(), a, soft)), a) };
  });
  // Its fill on Apple's continuous curve: a capsule with an icon in it or under it, but text alone a rounded rectangle
  // of `textCorner` whatever the row's height (measured: one- and two-line rows alike).
  const corner = look === 'text' ? list.swipe.textCorner : height / 2;
  const shape = useAnimatedProps(() => {
    const a = armed.get();
    return { d: continuousRect(widthNow(Math.abs(shownOffset(offset.get(), a, soft)), a), height, corner) };
  });
  // Armed, a destructive one's content moves to its leading end, its label going.
  const content = useAnimatedStyle(() => {
    if (!outermost || soft) return {};
    const slid = Math.abs(shownOffset(offset.get(), armed.get(), soft));
    const room = Math.max(0, slid - open) / 2;
    return { transform: [{ translateX: towardRow * room * armed.get() }] };
  });
  const label = useAnimatedStyle(() => ({ opacity: outermost && !soft ? 1 - armed.get() : 1 }));
  const icon = action.icon?.md ? (
    <MaterialSymbol
      name={action.icon.md}
      size={look === 'beside' ? inside.iconSize : list.swipe.iconSize}
      tintColor="#FFFFFF"
    />
  ) : null;
  const words = (style: object) => (
    <Text numberOfLines={1} style={[styles.actionLabel, style]}>
      {action.label}
    </Text>
  );
  const own = look === 'under' ? words({ color: colors.caption }) : words(styles.actionLabelInside);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={() => onRun(action, side)}
      style={styles.action}>
      {/* Its content at its own size, unseen, for its width. */}
      <View
        pointerEvents="none"
        style={styles.measure}
        onLayout={(event) => {
          const own = event.nativeEvent.layout.width;
          onMeasure(index, look === 'under' ? Math.max(list.swipe.width, own) : own + 2 * inside.pad);
        }}>
        {look === 'beside' ? (
          <View style={styles.beside}>
            {icon}
            {own}
          </View>
        ) : (
          own
        )}
      </View>
      <Animated.View style={[styles.action, button]}>
        <Animated.View style={[styles.capsule, { height }, capsule]}>
          <Svg style={StyleSheet.absoluteFill}>
            <AnimatedPath animatedProps={shape} fill={fill} />
          </Svg>
          {look === 'under' ? (
            <Animated.View style={content}>{icon}</Animated.View>
          ) : (
            <Animated.View style={[styles.beside, content]}>
              {look === 'beside' ? icon : null}
              <Animated.View style={label}>{words(styles.actionLabelInside)}</Animated.View>
            </Animated.View>
          )}
        </Animated.View>
        {look === 'under' ? (
          <Animated.Text numberOfLines={1} style={[styles.actionLabel, { color: colors.caption }, label]}>
            {action.label}
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
};

/** How a row's parts move into and out of edit mode, for a row edit mode changes. */
interface EditMotionStyles {
  inner: ReturnType<typeof useAnimatedStyle>;
  controlIn: ReturnType<typeof useAnimatedStyle>;
  handleIn: ReturnType<typeof useAnimatedStyle>;
  separatorAt: ReturnType<typeof useAnimatedStyle>;
}

/**
 * A row edit mode changes: its content makes room for the delete control and the handle as the list's edit progress
 * springs, its padding following it frame by frame. Moving it by transforms from a layout that jumps at once would
 * flash for a frame, as Reanimated lands a layout change a frame after a transform. A row edit mode doesn't change goes
 * without, and is that much quicker to draw.
 */
const EditMotion = ({
  editStart,
  editEnd,
  separatorStart,
  children,
}: {
  editStart: number;
  editEnd: number;
  separatorStart: number;
  children: (motion: EditMotionStyles) => ReactElement;
}) => {
  const editProgress = useContext(ListEditContext)?.progress;
  const margin = useListMargin();
  const along = mirrored ? -1 : 1;
  const inner = useAnimatedStyle(() => {
    const p = editProgress?.get() ?? 0;
    return { paddingStart: margin + editStart * p, paddingEnd: margin + editEnd * p };
  });
  const controlIn = useAnimatedStyle(() => {
    const p = editProgress?.get() ?? 0;
    return { opacity: p > 0.001 ? 1 : 0, transform: [{ translateX: along * editStart * (p - 1) }] };
  });
  const handleIn = useAnimatedStyle(() => {
    const p = editProgress?.get() ?? 0;
    return { opacity: p, transform: [{ translateX: along * list.edit.shift * (1 - p) }] };
  });
  // From the text's start, wherever edit mode has it.
  const separatorAt = useAnimatedStyle(() => ({ start: separatorStart + editStart * (editProgress?.get() ?? 0) }));
  return children({ inner, controlIn, handleIn, separatorAt });
};

/** What a row's swipe actions let the rest of it do. */
interface SwipeControls {
  opened: () => boolean;
  close: () => void;
  revealDelete: () => void;
  perform: (action: SwipeAction | undefined, side: 'leading' | 'trailing') => void;
}

/**
 * A row with swipe actions: it slides aside onto their buttons. Only a row that has some, or that its `List.ForEach`
 * can delete, is drawn with it.
 */
const Swipeable = ({
  leadingActions,
  trailingActions,
  full,
  enabled,
  children,
}: {
  leadingActions: SwipeAction[];
  trailingActions: SwipeAction[];
  full: boolean;
  enabled: boolean;
  children: (controls: SwipeControls) => ReactElement;
}) => {
  const colors = useListColors();
  const [rowWidth, setRowWidth] = useState(0);
  const [rowTall, setRowTall] = useState(0);
  // Each button's own width, as it measures its content; a side lays its buttons out from these.
  const [leadingNatural, setLeadingNatural] = useState<number[]>(() => leadingActions.map(() => list.swipe.width));
  const [trailingNatural, setTrailingNatural] = useState<number[]>(() => trailingActions.map(() => list.swipe.width));
  const measured = (set: typeof setLeadingNatural, count: number) => (index: number, width: number) =>
    set((now) => {
      const next = Array.from({ length: count }, (_, i) => now[i] ?? list.swipe.width);
      if (Math.abs((next[index] ?? 0) - width) < 0.5) return now.length === count ? now : next;
      next[index] = width;
      return next;
    });
  const onLeadingMeasure = measured(setLeadingNatural, leadingActions.length);
  const onTrailingMeasure = measured(setTrailingNatural, trailingActions.length);
  const leadingWidths = sideWidths(leadingActions.map((_, i) => leadingNatural[i] ?? list.swipe.width));
  const trailingWidths = sideWidths(trailingActions.map((_, i) => trailingNatural[i] ?? list.swipe.width));
  // A one-line row's buttons have their icon and label side by side, a taller one's their label under (measured); a
  // capsule with its label in it is the row's height less `inset`.
  const tall = rowTall >= list.swipe.under;
  const insideHeight = rowTall > 0 ? rowTall - list.swipe.inset : list.rowMinHeight - list.swipe.inset;
  // The row's slide: positive reveals the leading actions, negative the trailing ones (flipped right to left).
  const offset = useSharedValue(0);
  const start = useSharedValue(0);
  const armed = useSharedValue(0);
  // Whether a full swipe is armed now, apart from its animation: a quick drag lets go the moment it arms.
  const fullArmed = useSharedValue(false);
  const following = useSharedValue(false);
  const dim = useSharedValue(0);
  const dimmed = useSharedValue(false);
  const dimTo = (on: boolean) => {
    'worklet';
    if (dimmed.get() === on) return;
    dimmed.set(on);
    dim.set(
      on
        ? withTiming(1, { duration: list.swipe.dim.in, easing: Easing.out(Easing.cubic) })
        : withTiming(0, { duration: list.swipe.dim.out, easing: Easing.inOut(Easing.quad) }),
    );
  };
  const leaving = useSharedValue(0);
  const swipe: SwipeState = { offset, armed, dim, leaving, following };
  // The row's grey, on a clock rather than the slide (measured): it comes in as the row starts to move and goes as it's
  // closed, on a soft spring each way.
  const tint = useSharedValue(0);
  const tintGoal = useSharedValue(0);
  const tintTo = (to: number) => {
    'worklet';
    if (tintGoal.get() === to) return;
    tintGoal.set(to);
    tint.set(withSpring(to, list.swipe.tint));
  };
  const leadingOpen = openWidth(leadingWidths);
  // A side whose outermost action isn't destructive full-swipes as iOS's do for them (measured): it arms at half the
  // row's width, without a jump, the row following the finger slowly past it, and let go it runs and the row closes.
  const leadingSoft = leadingActions.length > 0 && !leadingActions[0].destructive;
  const trailingSoft = trailingActions.length > 0 && !trailingActions[0].destructive;
  const trailingOpen = openWidth(trailingWidths);
  const close = () => {
    tintTo(0);
    armed.set(withSpring(0, list.swipe.spring));
    offset.set(withSpring(0, following.get() ? list.edit.reveal.spring : list.swipe.close));
  };
  // One row open at a time in a list: another opening closes this one.
  const openRow = useContext(OpenRowContext);
  const [id] = useState(nextRowId);
  useAnimatedReaction(
    () => openRow?.get() ?? -1,
    (open) => {
      if (open === id || offset.get() === 0) return;
      tintTo(0);
      armed.set(withSpring(0, list.swipe.spring));
      offset.set(withSpring(0, following.get() ? list.edit.reveal.spring : list.swipe.close));
    },
  );
  // Into or out of edit mode, an open row closes, as iOS's does.
  useEffect(() => {
    if (offset.get() === 0) return;
    tintTo(0);
    armed.set(withSpring(0, list.swipe.spring));
    offset.set(withSpring(0, list.swipe.spring));
  }, [enabled, offset, armed]);
  // Out the rest of the way: fast from the start, as the row is already moving.
  const slideOut = { duration: list.swipe.commit, easing: Easing.out(Easing.cubic) };
  // Edit mode's delete control opens the row's Delete action, as a swipe would.
  const revealDelete = () => {
    following.set(true);
    leaving.set(0);
    openRow?.set(id);
    tintTo(1);
    offset.set(withSpring(-trailingOpen, list.edit.reveal.spring));
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
    enabled: enabled && (leadingActions.length > 0 || trailingActions.length > 0),
    activeOffsetX: [-10, 10],
    failOffsetY: [-10, 10],
    onActivate: () => {
      start.set(offset.get());
      leaving.set(0);
      following.set(false);
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
      const soft = next > 0 ? leadingSoft : trailingSoft;
      const arms = (rowWidth || 1) * (soft ? list.swipe.softSwipe : list.swipe.fullSwipe);
      if (past > 0 && !full) next = Math.sign(next) * (open + past * 0.3);
      else if (soft && Math.abs(next) > arms)
        next = Math.sign(next) * (arms + (Math.abs(next) - arms) * list.swipe.softBand);
      offset.set(next);
      tintTo(Math.abs(next) > list.swipe.tintFrom ? 1 : 0);
      dimTo(open > 0 && Math.abs(next) > open);
      // Far enough across, a full swipe arms: the row jumps on and a tick marks it, and disarms the same way back.
      const now = full && open > 0 && Math.abs(next) > arms - 0.01;
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
        if (now > 0 ? leadingSoft : trailingSoft) {
          // It runs as the row closes, its button shrinking away at once (measured).
          dimTo(false);
          leaving.set(withTiming(1, { duration: list.swipe.leave, easing: Easing.in(Easing.quad) }));
          scheduleOnRN(run, action);
          return;
        }
        offset.set(
          withTiming(Math.sign(now) * (rowWidth || 1), slideOut, (finished) => {
            if (finished) scheduleOnRN(action?.destructive ? collapse : run, action);
          }),
        );
        return;
      }
      dimTo(false);
      armed.set(withSpring(0, list.swipe.arm));
      // Open or shut by where it's headed, as iOS decides: a short drag let go moving still opens (measured).
      const ahead = now + velocity * list.swipe.project;
      const keep = open > 0 && Math.sign(ahead) === Math.sign(now) && Math.abs(ahead) > open / 2;
      tintTo(keep ? 1 : 0);
      // Settling open or shut, it carries on at the finger's speed.
      offset.set(withSpring(keep ? Math.sign(now) * open : 0, { ...list.swipe.spring, velocity }));
    },
  });
  const slide = useAnimatedStyle(() => {
    const raw = offset.get();
    const shown = shownOffset(raw, armed.get(), raw > 0 ? leadingSoft : trailingSoft);
    return { transform: [{ translateX: mirrored ? -shown : shown }] };
  });
  // Slid aside, the row draws with Apple's continuous corners, on its own colour with the grey over it. The corners
  // come in as soon as it moves and, closing, go with the grey, so the row is square again by the time it's white
  // (measured). Reads its shared values in the props themselves: an animated prop doesn't follow ones a nested worklet
  // reads.
  const { quick } = list.swipe.shape;
  const radius = list.cardRadius;
  const outline = (shown: number, goal: number, height: number) => {
    'worklet';
    const k = goal === 1 ? Math.min(1, shown / quick) : shown;
    return continuousRect(rowWidth || 1, Math.max(1, height), radius * k);
  };
  const baseFill = useAnimatedProps(() => ({
    d: outline(tint.get(), tintGoal.get(), rowHeight.get()),
    fillOpacity: Math.abs(offset.get()) > list.swipe.slot ? 1 : 0,
  }));
  const greyFill = useAnimatedProps(() => ({
    d: outline(tint.get(), tintGoal.get(), rowHeight.get()),
    fillOpacity: tint.get(),
  }));
  // Behind it, its slot in the card is the page's grey, at once, from its first few points of slide until it's home.
  const listStyle = useContext(ListStyleContext) ?? 'insetGrouped';
  const rowColor = listStyle === 'plain' ? colors.plain : colors.card;
  const slotFill = useAnimatedStyle(() => ({ opacity: Math.abs(offset.get()) > list.swipe.slot ? 1 : 0 }));
  const closedUp = useAnimatedStyle(() => ({
    maxHeight: gone.get() > 0 ? rowHeight.get() * (1 - gone.get()) : 100000,
  }));
  const leadingShown = useAnimatedStyle(() => ({ opacity: offset.get() > 0 ? 1 : 0 }));
  const trailingShown = useAnimatedStyle(() => ({ opacity: offset.get() < 0 ? 1 : 0 }));

  const row = children({ opened: () => Math.abs(offset.get()) > 1, close, revealDelete, perform });
  if (leadingActions.length === 0 && trailingActions.length === 0) return row;
  return (
    <Animated.View
      style={[styles.swipeable, closedUp]}
      onLayout={(event) => {
        setRowWidth(event.nativeEvent.layout.width);
        if (gone.get() === 0) {
          rowHeight.set(event.nativeEvent.layout.height);
          setRowTall(event.nativeEvent.layout.height);
        }
      }}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.page }, slotFill]}
      />
      <Animated.View style={[styles.actions, styles.actionsLeading, leadingShown]} pointerEvents="box-none">
        {leadingActions.map((action, index) => (
          <ActionButton
            key={`${action.label}-${index}`}
            action={action}
            side="leading"
            index={index}
            look={lookOf(action, tall)}
            at={startOf(leadingWidths, index)}
            width={leadingWidths[index]}
            height={lookOf(action, tall) === 'under' ? list.swipe.height : insideHeight}
            open={leadingOpen}
            swipe={swipe}
            soft={leadingSoft}
            onRun={perform}
            onMeasure={onLeadingMeasure}
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
              look={lookOf(action, tall)}
              at={startOf(trailingWidths, index)}
              width={trailingWidths[index]}
              height={lookOf(action, tall) === 'under' ? list.swipe.height : insideHeight}
              open={trailingOpen}
              swipe={swipe}
              soft={trailingSoft}
              onRun={perform}
              onMeasure={onTrailingMeasure}
            />
          ))
          .reverse()}
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View style={slide}>
          {/* Off its slot, the row keeps its own colour under the grey, which comes in over it. */}
          <Animated.View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%">
              <AnimatedPath animatedProps={baseFill} fill={rowColor} />
              <AnimatedPath animatedProps={greyFill} fill={colors.pressed} />
            </Svg>
          </Animated.View>
          {row}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
};

/** What a row's reorder drag lets the rest of it do. */
interface ReorderControls {
  handleDrag: ReturnType<typeof usePanGesture>;
  moveTo: (from: number, to: number) => void;
}

/**
 * Reordering, by the handle in edit mode. The row draws itself at its place in its group's order, less where React has
 * laid it out: it slides as other rows are dragged past it, and as `onMove` lays it out again nothing jumps. Only a row
 * its `List.ForEach` can move is drawn with it.
 */
const Reorderable = ({
  reorder: { group, key: myKey, keys: laidOut },
  editing,
  onHeight,
  still,
  children,
}: {
  reorder: NonNullable<RowEdit['reorder']>;
  editing: boolean;
  onHeight?: (height: number) => void;
  // The row drawn still, without its live parts: for its faded copy, and for the copy that's lifted.
  still: ReactElement | null;
  children: (controls: ReorderControls) => ReactElement;
}) => {
  const colors = useListColors();
  const placed = useSharedValue(0);
  const liftedFrom = useSharedValue(0);
  // Lifted, the row is drawn in the screen's overlay, over the bars, as iOS 27 draws it: a still copy of it there
  // follows the finger from where the row was (`liftedAt`, in the overlay), and the row itself goes unseen meanwhile.
  const self = useAnimatedRef<Animated.View>();
  const overlay = useContext(ScreenOverlayContext);
  const overlayRef = overlay?.ref;
  const liftedAt = useSharedValue({ x: 0, y: 0, width: 0 });
  const overlaid = useSharedValue(false);
  // How far the list has scrolled under the dragged row since it lifted, which keeps the row under the finger.
  const auto = useContext(ListAutoScrollContext);
  const scrolledFrom = useSharedValue(0);
  // The dragged row's place among the others, as iOS's: past each one whose far edge its middle has crossed. Worked
  // out as the finger moves and as the list scrolls under it.
  useAnimatedReaction(
    () => (group.active.get() === myKey ? group.drag.get() + (auto ? auto.scrollY.get() : 0) : null),
    (now) => {
      if (now === null) return;
      const heights = group.heights.get();
      const order = group.order.get();
      const scrolled = auto ? auto.scrollY.get() - scrolledFrom.get() : 0;
      const middle = liftedFrom.get() + group.drag.get() + scrolled + (heights[myKey] ?? 0) / 2;
      const others = order.filter((key) => key !== myKey);
      let y = 0;
      let at = 0;
      for (const key of others) {
        const height = heights[key] ?? 0;
        if (y + height < middle) at += 1;
        y += height;
      }
      // Up past the list's visible top, under the navigation bar, it would go back where it came from (measured).
      const finger = auto ? auto.finger.get() : -1;
      const box = auto && finger >= 0 ? measure(auto.scrollRef) : null;
      if (box && finger < box.pageY + auto!.barTop) at = Math.max(0, laidOut.indexOf(myKey));
      if (order.indexOf(myKey) !== at) group.order.set([...others.slice(0, at), myKey, ...others.slice(at)]);
    },
  );
  const lift = useSharedValue(0);
  // Whether the row is lifted under a finger now, and how far across the finger has taken it: lifted, it follows the
  // finger every way, off the screen's edges too, as iOS's does (measured).
  const holding = useSharedValue(false);
  const across = useSharedValue(0);
  useAnimatedReaction(
    () => slotAt(group.order.get(), group.heights.get(), myKey),
    (y, before) => {
      if (group.active.get() === myKey) return;
      placed.set(before !== null && group.moving.get() ? withSpring(y, list.edit.move) : y);
    },
  );
  const moved = useAnimatedStyle(() => {
    if (!group.moving.get() && !group.pending.get() && group.active.get() !== myKey)
      return { opacity: 1, transform: [{ translateY: 0 }] };
    // The list's scroll read here, not in a helper: a style only follows the shared values it reads itself.
    const scrolled = auto ? auto.scrollY.get() - scrolledFrom.get() : 0;
    const y = group.active.get() === myKey ? liftedFrom.get() + group.drag.get() + scrolled : placed.get();
    return {
      opacity: overlaid.get() ? 0 : 1 - (1 - list.edit.lift.opacity) * lift.get(),
      transform: [{ translateY: y - slotAt(laidOut, group.heights.get(), myKey) }],
    };
  });
  const liftedCard = useAnimatedStyle(() => ({ opacity: lift.get() }));
  // The copy follows the finger, and let go, the row's settling into its place, until it has settled.
  const copyAt = useAnimatedStyle(() => {
    const at = liftedAt.get();
    const scrolled = auto ? auto.scrollY.get() - scrolledFrom.get() : 0;
    const y = holding.get() ? liftedFrom.get() + group.drag.get() + scrolled : placed.get();
    return {
      opacity: overlaid.get() ? 1 - (1 - list.edit.lift.opacity) * lift.get() : 0,
      left: at.x,
      top: at.y,
      width: at.width,
      transform: [{ translateX: across.get() }, { translateY: y - liftedFrom.get() - scrolled }],
    };
  });
  const copy = still ? (
    <Animated.View style={[styles.copy, copyAt]}>
      <Animated.View style={[styles.liftedCard, { backgroundColor: colors.card }, liftedCard]} />
      {still}
    </Animated.View>
  ) : null;
  const present = (shown: boolean) => overlay?.show(shown ? copy : null);
  // Let go in a new place: SwiftUI's `onMove`, whose destination counts places before the row is taken out.
  const moveTo = (from: number, to: number) => group.onMove?.([from], to > from ? to + 1 : to);
  const scrollGesture = useContext(ListScrollGestureContext);
  function pickUp(fingerY: number) {
    'worklet';
    if (holding.get()) return;
    holding.set(true);
    liftedFrom.set(placed.get());
    scrolledFrom.set(auto?.scrollY.get() ?? 0);
    auto?.finger.set(fingerY);
    group.drag.set(0);
    across.set(0);
    group.active.set(myKey);
    group.moving.set(true);
    lift.set(withTiming(1, { duration: list.edit.lift.duration, easing: Easing.out(Easing.cubic) }));
    group.lifted.set(true);
    group.held.set(true);
    const row = measure(self);
    const layer = overlayRef ? measure(overlayRef) : null;
    if (row && layer) {
      // Where the row is drawn now: where it's laid out, and any way it's still moving from a drop.
      const drawnAt = placed.get() - slotAt(laidOut, group.heights.get(), myKey);
      liftedAt.set({ x: row.pageX - layer.pageX, y: row.pageY - layer.pageY + drawnAt, width: row.width });
      overlaid.set(true);
      scheduleOnRN(present, true);
    }
  }
  function drop(velocity: number, velocityAcross: number) {
    'worklet';
    if (!holding.get()) return;
    holding.set(false);
    const order = group.order.get();
    auto?.finger.set(-1);
    placed.set(liftedFrom.get() + group.drag.get() + (auto ? auto.scrollY.get() - scrolledFrom.get() : 0));
    group.active.set('');
    group.held.set(false);
    // Let go, the copy settles into the row's place, its card and shadow going and its content coming back as it does,
    // and the row takes over from it once it's there.
    across.set(withSpring(0, { ...list.edit.drop, velocity: velocityAcross }));
    placed.set(
      // Settling, it carries on at the finger's speed.
      withSpring(slotAt(order, group.heights.get(), myKey), { ...list.edit.drop, velocity }, (finished) => {
        if (finished) group.moving.set(false);
      }),
    );
    lift.set(
      withTiming(0, { duration: list.edit.settle, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (!finished) return;
        group.lifted.set(false);
        if (overlaid.get()) {
          overlaid.set(false);
          scheduleOnRN(present, false);
        }
      }),
    );
    const from = laidOut.indexOf(myKey);
    const to = order.indexOf(myKey);
    if (from === to) return;
    group.pending.set(true);
    scheduleOnRN(moveTo, from, to);
  }
  const handleDrag = usePanGesture({
    enabled: editing,
    minDistance: 0,
    block: scrollGesture ?? undefined,
    // Lifted as the handle is pressed, as iOS's is, before the finger moves; let go without moving, it settles back.
    onBegin: (event) => {
      pickUp(event.absoluteY);
    },
    onActivate: (event) => {
      pickUp(event.absoluteY);
    },
    onUpdate: (event) => {
      group.drag.set(event.translationY);
      across.set(event.translationX);
      auto?.finger.set(event.absoluteY);
    },
    onDeactivate: (event) => {
      drop(event.velocityY, event.velocityX);
    },
    onFinalize: () => {
      drop(0, 0);
    },
  });
  // Lifted, over the rows it passes.
  const above = useAnimatedStyle(() => ({ zIndex: lift.get() > 0 ? 1 : 0 }));
  // While it's dragged, a faded copy of the row holds the place it would land in, as iOS 27's does; let go, it's gone
  // at once, and the row settles into its place.
  const ghostAt = useAnimatedStyle(() => {
    const heights = group.heights.get();
    return {
      opacity: group.active.get() === myKey ? 1 : 0,
      transform: [{ translateY: slotAt(group.order.get(), heights, myKey) - slotAt(laidOut, heights, myKey) }],
    };
  });
  return (
    <Animated.View
      ref={self}
      style={above}
      onLayout={(event) => {
        const height = event.nativeEvent.layout.height;
        onHeight?.(height);
        // Each row adds its own, on the UI thread, so rows laid out together don't overwrite each other.
        group.heights.modify((heights) => {
          'worklet';
          return heights[myKey] === height ? heights : { ...heights, [myKey]: height };
        });
      }}>
      {still ? (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.ghost }, ghostAt]}>
          <View style={styles.ghost}>{still}</View>
        </Animated.View>
      ) : null}
      <Animated.View style={moved}>
        <Animated.View pointerEvents="none" style={[styles.liftedCard, { backgroundColor: colors.card }, liftedCard]} />
        {children({ handleDrag, moveTo })}
      </Animated.View>
    </Animated.View>
  );
};

/**
 * `@expo/ui`'s `ListItem`, drawn as iOS 27 draws a list row: the headline with a second line under it, a leading view,
 * trailing content, Lucent's value and chevron or checkmark, a separator to the next row from the text's start, its
 * content dimmed under a finger, and swipe actions that slide the row aside onto capsule buttons. What a row can't do
 * (swipe, move in edit mode, be reordered) it isn't drawn with, so a long list's plain rows mount quickly.
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
  button = false,
  onAccessoryPress,
  testID,
}: ListItemProps) => {
  const colors = useListColors();
  const { color } = useLucentTheme();
  const style = useContext(ListStyleContext) ?? 'insetGrouped';
  const last = useContext(RowLastContext);
  const margin = useListMargin();
  const slots = slotsOf(children);
  const leading = slots.leading ?? leadingProp;
  const trailing = slots.trailing ?? trailingProp;
  const supporting = slots.supporting ?? supportingText;
  const [leadingWidth, setLeadingWidth] = useState(0);
  // Rows grow with the text size, as iOS's do.
  const scale = PixelRatio.getFontScale();
  // At accessibility text sizes iOS stacks a row's value under its title rather than beside it, where it would leave
  // the title too little room to fit a word.
  const stacked = scale >= list.stackedFrom;

  // Edit mode: a row its `List.ForEach` can delete makes room for the delete control, one it can move shows the handle.
  const edit = useContext(ListEditContext);
  const rowEdit = useContext(RowEditContext);
  const editing = edit?.editing ?? false;
  // A list with `selection` selects in edit mode: a circle takes the delete control's place, and a tap toggles the row.
  const selection = useContext(ListSelectionContext);
  const selectable = Boolean(selection && rowEdit.key !== undefined);
  const selecting = editing && selectable;
  const selected = selectable && selection!.selected.includes(rowEdit.key!);
  const nextSelected = selectable && rowEdit.nextKey !== undefined && selection!.selected.includes(rowEdit.nextKey);
  const editStart = rowEdit.onDelete || selectable ? list.edit.shift : 0;
  const editEnd = rowEdit.movable ? list.edit.handleRoom : 0;
  const reorder = rowEdit.reorder;

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
  const swipes = Boolean(deleteAction || swipeActions?.leading?.length || swipeActions?.trailing?.length);
  const openRow = useContext(OpenRowContext);

  // An action row's headline is the accent colour, as a SwiftUI button's in a list; disabled, a light grey (measured:
  // #BFBFBF, the secondary label at the row's disabled opacity).
  const textColor = destructive
    ? colors.destructive
    : button
      ? disabled
        ? colors.secondary
        : color.tint
      : colors.text;
  const separatorStart = margin + (leading != null ? leadingWidth + list.leadingGap : 0);
  const content = (
    pressed: boolean,
    motion: EditMotionStyles | null,
    swipe: SwipeControls | null,
    drag: ReorderControls | null,
    // The faded copy a dragged row leaves in its place: drawn the same, but without its separator or a live handle.
    ghost = false,
  ) => {
    const handle = (
      <Animated.View
        pointerEvents={editing && !ghost ? 'auto' : 'none'}
        accessible={false}
        style={[styles.editSlot, styles.handleSlot, motion?.handleIn]}>
        <ReorderHandle color={colors.handle} />
      </Animated.View>
    );
    return (
      <View
        style={[
          styles.row,
          { minHeight: list.rowMinHeight * scale },
          selecting && selected ? { backgroundColor: colors.selected } : null,
        ]}>
        <Animated.View
          style={[
            styles.inner,
            { paddingHorizontal: margin },
            disabled && styles.disabled,
            pressed && !disabled && (onPress || selecting) && styles.pressed,
            motion?.inner,
          ]}>
          {leading != null ? (
            <Animated.View
              style={styles.leading}
              onLayout={(event: LayoutChangeEvent) => setLeadingWidth(event.nativeEvent.layout.width)}>
              {leading}
            </Animated.View>
          ) : null}
          <Animated.View style={styles.texts}>
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
            {detail != null && stacked ? (
              <Text style={[styles.title, { color: colors.secondary }]}>{detail}</Text>
            ) : null}
          </Animated.View>
          {trailing != null ? (
            <Animated.View style={styles.trailing}>
              {textual(trailing) ? <Text style={[styles.title, { color: colors.text }]}>{trailing}</Text> : trailing}
            </Animated.View>
          ) : null}
          {detail != null && !stacked ? (
            <Animated.Text numberOfLines={1} style={[styles.title, styles.detail, { color: colors.secondary }]}>
              {detail}
            </Animated.Text>
          ) : null}
          {accessory === 'disclosure' ? (
            <Animated.View style={styles.chevron}>
              <Chevron color={colors.chevron} />
            </Animated.View>
          ) : accessory === 'checkmark' ? (
            <Animated.View style={styles.checkmark}>
              <Checkmark color={color.tint} />
            </Animated.View>
          ) : accessory === 'info' ? (
            // UIKit's detail button: a tap on it answers apart from the row's.
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="More info"
              hitSlop={list.info.hitSlop}
              onPress={onAccessoryPress}
              style={styles.info}>
              <MaterialSymbol name="info" size={list.info.size} tintColor={color.tint} />
            </Pressable>
          ) : null}
        </Animated.View>
        {motion && selectable ? (
          <Animated.View pointerEvents="none" style={[styles.editSlot, styles.selectSlot, motion.controlIn]}>
            <SelectCircle ring={colors.selectRing} fill={color.tint} selected={selected} />
          </Animated.View>
        ) : motion && rowEdit.onDelete ? (
          <Animated.View
            pointerEvents={editing ? 'box-none' : 'none'}
            style={[styles.editSlot, styles.controlSlot, motion.controlIn]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete"
              hitSlop={list.edit.controlAt - list.edit.control / 2}
              onPress={swipe?.revealDelete}>
              <DeleteControl color={colors.destructive} />
            </Pressable>
          </Animated.View>
        ) : null}
        {motion && drag ? <GestureDetector gesture={drag.handleDrag}>{handle}</GestureDetector> : null}
        {motion && ghost && rowEdit.movable ? handle : null}
        {/* A plain list's last row has one too, as iOS 27's does; an inset grouped card's doesn't. */}
        {ghost || (last && style !== 'plain') || (selecting && (selected || nextSelected)) ? null : (
          <Animated.View
            style={[
              styles.separator,
              {
                // iOS 27 ends them short of the row's end, inset grouped and plain alike.
                end: margin,
                start: separatorStart,
                backgroundColor: style === 'plain' ? colors.plainSeparator : colors.separator,
              },
              motion?.separatorAt,
            ]}
          />
        )}
      </View>
    );
  };

  // The faded copy's parts, at their edit-mode places.
  const ghostMotion = {
    inner: { paddingStart: margin + editStart, paddingEnd: margin + editEnd },
    controlIn: { opacity: 1 },
    handleIn: { opacity: 1 },
    separatorAt: {},
  } as unknown as EditMotionStyles;
  const row = (motion: EditMotionStyles | null, swipe: SwipeControls | null, drag: ReorderControls | null) => (
    <Pressable
      testID={testID}
      // A row that swipes takes a tap even with nothing to do itself: the one that closes its actions.
      disabled={disabled || (!onPress && !selecting && !swipes)}
      unstable_pressDelay={list.pressDelay}
      onPress={() => {
        // A tap while a row's actions are open closes them, as iOS's does, rather than pressing the row.
        if (openRow && openRow.get() !== -1) return openRow.set(-1);
        if (swipe?.opened()) return swipe.close();
        if (selecting) return selection!.toggle(rowEdit.key!);
        onPress?.();
      }}
      accessibilityRole={onPress || selecting ? 'button' : undefined}
      accessibilityState={{ disabled, selected: selecting ? selected : accessory === 'checkmark' }}
      accessibilityActions={[
        ...[...leadingActions, ...trailingActions].map((action) => ({ name: action.label, label: action.label })),
        ...(editing && reorder ? [moveUp, moveDown] : []),
      ]}
      onAccessibilityAction={(event) => {
        // A screen reader moves a row a place at a time, as VoiceOver's reorder actions do.
        if (reorder && drag && event.nativeEvent.actionName === moveUp.name)
          return drag.moveTo(reorder.index, reorder.index - 1);
        if (reorder && drag && event.nativeEvent.actionName === moveDown.name)
          return drag.moveTo(reorder.index, reorder.index + 1);
        const named = (action: SwipeAction) => action.label === event.nativeEvent.actionName;
        const leadingAction = leadingActions.find(named);
        swipe?.perform(leadingAction ?? trailingActions.find(named), leadingAction ? 'leading' : 'trailing');
      }}>
      {({ pressed }) => content(pressed, motion, swipe, drag)}
    </Pressable>
  );
  const moving = (drag: ReorderControls | null, swipe: SwipeControls | null) =>
    editStart !== 0 || editEnd !== 0 ? (
      <EditMotion editStart={editStart} editEnd={editEnd} separatorStart={separatorStart}>
        {(motion) => row(motion, swipe, drag)}
      </EditMotion>
    ) : (
      row(null, swipe, drag)
    );
  const body = (drag: ReorderControls | null) =>
    swipes ? (
      <Swipeable
        leadingActions={leadingActions}
        trailingActions={trailingActions}
        full={swipeActions?.allowsFullSwipe ?? true}
        enabled={!disabled && !editing}>
        {(swipe) => moving(drag, swipe)}
      </Swipeable>
    ) : (
      moving(drag, null)
    );
  if (!reorder) return body(null);
  return (
    <Reorderable
      reorder={reorder}
      editing={editing}
      onHeight={rowEdit.onHeight}
      still={editing ? content(false, ghostMotion, null, null, true) : null}>
      {(drag) => body(drag)}
    </Reorderable>
  );
};

const moveUp = { name: 'moveUp', label: 'Move up' };
const moveDown = { name: 'moveDown', label: 'Move down' };

ListItem.Leading = Leading;
ListItem.Trailing = Trailing;
ListItem.Supporting = Supporting;

const styles = StyleSheet.create({
  row: { justifyContent: 'center' },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: list.rowPaddingVertical,
  },
  disabled: { opacity: 0.5 },
  pressed: { opacity: list.pressedOpacity },
  ghost: { opacity: list.edit.ghost.opacity },
  copy: { position: 'absolute' },
  leading: { marginEnd: list.leadingGap },
  texts: { flex: 1, gap: list.supportingGap },
  title: { fontSize: list.title.fontSize, lineHeight: list.title.lineHeight },
  supporting: { fontSize: list.supporting.fontSize, lineHeight: list.supporting.lineHeight },
  trailing: { marginStart: list.leadingGap },
  detail: { marginStart: list.leadingGap, flexShrink: 1, textAlign: 'right' },
  chevron: { marginStart: list.detailGap, marginEnd: list.chevron.end },
  checkmark: { marginStart: list.detailGap },
  info: { marginStart: list.info.gap },
  separator: { position: 'absolute', bottom: 0, height: list.separatorWidth },
  editSlot: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  controlSlot: { start: list.edit.controlAt - list.edit.control / 2 },
  selectSlot: { start: list.edit.controlAt - list.edit.select.circle / 2 },
  selectFill: {
    position: 'absolute',
    top: -list.edit.select.ring,
    start: -list.edit.select.ring,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // The handle takes touches a little around it.
  handleSlot: { end: list.edit.handle.end - 12, paddingHorizontal: 12 },
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { fontSize: list.swipe.labelSize },
  actionLabelInside: { color: '#FFFFFF' },
  beside: { flexDirection: 'row', alignItems: 'center', gap: list.swipe.inside.gap },
  measure: { position: 'absolute', opacity: 0 },
  swipeable: { overflow: 'hidden' },
  liftedCard: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    start: -list.edit.lift.widen,
    end: -list.edit.lift.widen,
    borderRadius: list.edit.lift.radius,
    boxShadow: list.edit.lift.shadow,
  },
});
