import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import {
  Children,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedProps,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BarCapsule, BarGlassRow, maxBridged, resize, useBarGlassRow } from './BarCapsule.android';
import { Split } from './Split.android';
import { useBarType } from './barType.android';
import { BarMeltContext, meltLook } from './melt.android';
import { AnimatedNativeGlassBlur } from '../../../core/glass/NativeGlass';
import { useTabsTint } from '../../../core/tabs/TabBarReach';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { systemTint } from '../../../theme/colors';
import { createLucentContext } from '../../../theme/context';
import { useOpenMenu } from '../menu/Menu.android';
import { menuTree } from '../menu/items';
import { SearchBubbleContext, SearchDisplay, setCapsuleRect } from '../search/SearchField.android';
import {
  badge as badgeMetrics,
  barItem,
  barItemMotion,
  barMotion,
  bar,
  islandSplit,
  reachTo,
  searchMotion,
  toolbar,
} from '../tokens';
import {
  ToolbarBadge,
  ToolbarButton,
  ToolbarIcon,
  ToolbarLabel,
  ToolbarMenu,
  ToolbarSearchBarSlot,
  ToolbarSpacer,
  ToolbarView,
} from '../toolbar/parts.android';
import type { LucentToolbarButtonProps, LucentToolbarIconProps, LucentToolbarMenuProps } from '../types';

const onAccent = '#FFFFFF';

interface ButtonItem {
  kind: 'button';
  key: string;
  label?: string;
  md?: AndroidSymbol;
  image?: ImageSourcePropType;
  onPress?: () => void;
  disabled?: boolean;
  prominent: boolean;
  separate: boolean;
  // `hidesSharedBackground`: no glass of its own, splitting the capsule it would have shared around it.
  bare?: boolean;
  // A label with no icon on iOS. iOS gives it a capsule of its own.
  textOnly: boolean;
  tintColor?: string;
  accessibilityLabel?: string;
  // A `Stack.Toolbar.Menu`: the button opens it.
  menu?: LucentToolbarMenuProps;
  // A `Stack.Toolbar.Badge` child's text and style.
  badge?: { text: string; style?: StyleProp<TextStyle> };
  // Kept in its group while hidden, so it can grow out of its neighbour when it shows, as on iOS.
  hidden?: boolean;
  selected?: boolean;
  // An icon with a capsule of its own also keeps a place, hidden, on its neighbour's: switched to share it, it shows
  // there as its own capsule melts back in, and switched back, it hides there as its own capsule splits off
  // (`SplitOff`), as the tab bar's search circle does.
  ghost?: boolean;
  // How much its glyph shows, its place kept: the magnifier, gone as search opens out of its capsule.
  fade?: SharedValue<number>;
  // A swell its capsule takes on while it changes, 0 at rest: the island a search field lands in, deflating.
  land?: SharedValue<number>;
}

interface ViewItem {
  kind: 'view';
  key: string;
  element: ReactNode;
  separate: boolean;
}

// Where the screen's search bar goes, in the bottom toolbar.
interface SearchItem {
  kind: 'search';
  key: string;
  separate: boolean;
}

// A spacer without a width is flexible: in the bottom toolbar it pushes the groups either side of it apart.
// `shares`: a fixed one that keeps its neighbours on one capsule, its width added between them (`sharesBackground`).
type Item = ButtonItem | ViewItem | SearchItem | { kind: 'spacer'; key: string; width?: number; shares?: boolean };
// A fixed spacer kept inside a capsule.
type GapItem = { kind: 'gap'; key: string; width: number };
type GroupItem = ButtonItem | ViewItem | SearchItem | GapItem;

const text = (node: ReactNode) =>
  Children.toArray(node)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

let warnedSf = false;

// A button's label and icon, from its props or from Stack.Toolbar.Label and Stack.Toolbar.Icon children.
const buttonItem = (
  props: LucentToolbarButtonProps | LucentToolbarMenuProps,
  key: string,
  menu: boolean,
): ButtonItem => {
  const parts = Children.toArray(props.children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
  const labelPart = parts.find((part) => part.type === ToolbarLabel);
  const iconPart = parts.find((part) => part.type === ToolbarIcon)?.props as LucentToolbarIconProps | undefined;
  const badgePart = parts.find((part) => part.type === ToolbarBadge)?.props as
    { children?: ReactNode; style?: StyleProp<TextStyle> } | undefined;
  // A menu without a label child shows its `title` on the button, as on iOS.
  const label =
    text(props.children) ||
    (labelPart ? text(labelPart.props.children as ReactNode) : '') ||
    (menu ? (props as LucentToolbarMenuProps).title : undefined) ||
    undefined;
  const md = props.md ?? (iconPart && 'md' in iconPart ? iconPart.md : undefined);
  const source = typeof props.icon === 'object' ? props.icon : iconPart && 'src' in iconPart ? iconPart.src : undefined;
  if (__DEV__ && !warnedSf && !md && !source && (typeof props.icon === 'string' || (iconPart && 'sf' in iconPart))) {
    warnedSf = true;
    console.warn('Stack.Toolbar.Button: SF Symbols only draw on iOS. Add `md` with a Material Symbol for Android.');
  }
  return {
    kind: 'button',
    key,
    label,
    md,
    image: source as ImageSourcePropType | undefined,
    onPress: menu ? undefined : (props as LucentToolbarButtonProps).onPress,
    disabled: props.disabled,
    prominent: props.variant === 'done' || props.variant === 'prominent',
    separate: Boolean(props.separateBackground || props.hidesSharedBackground),
    bare: Boolean(props.hidesSharedBackground),
    // Judged by the iOS icon (`icon` or a Stack.Toolbar.Icon), not `md`: an SF Symbol button without `md` still shares
    // its neighbours' capsule on iOS, though Android can only show its label.
    textOnly: !props.icon && !iconPart,
    tintColor: typeof props.tintColor === 'string' ? props.tintColor : undefined,
    accessibilityLabel: props.accessibilityLabel ?? label,
    menu: menu ? (props as LucentToolbarMenuProps) : undefined,
    badge: badgePart ? { text: text(badgePart.children), style: badgePart.style } : undefined,
    selected: menu ? undefined : Boolean((props as LucentToolbarButtonProps).selected),
  };
};

const toItems = (children: ReactNode): Item[] =>
  Children.toArray(children).flatMap((child, index): Item[] => {
    if (!isValidElement(child)) return [];
    const props = child.props as Record<string, unknown>;
    const key = String(child.key ?? index);
    const hidden = Boolean(props.hidden);
    if (child.type === ToolbarButton) return [{ ...buttonItem(props as LucentToolbarButtonProps, key, false), hidden }];
    if (child.type === ToolbarMenu) return [{ ...buttonItem(props as LucentToolbarMenuProps, key, true), hidden }];
    if (hidden) return [];
    if (child.type === ToolbarSpacer) {
      return [
        { kind: 'spacer', key, width: props.width as number | undefined, shares: Boolean(props.sharesBackground) },
      ];
    }
    if (child.type === ToolbarSearchBarSlot) {
      return [{ kind: 'search', key, separate: Boolean(props.hidesSharedBackground || props.separateBackground) }];
    }
    if (child.type === ToolbarView) {
      return [
        { kind: 'view', key, element: props.children as ReactNode, separate: Boolean(props.hidesSharedBackground) },
      ];
    }
    return [];
  });

// iOS 26 puts neighbouring icon items on one shared glass capsule. A text button, a prominent item or a separate
// background gets a capsule of its own. Spacers split capsules only in the bottom toolbar: in the navigation bar, iOS
// ignores them, fixed or flexible.
// `own`: an icon's capsule of its own, on this side of the capsule it splits off; `base`, that icon's key. `bare`: an
// item with no glass (`hidesSharedBackground`).
// In the bottom toolbar, iOS 27 ignores a button's `separateBackground` (simulator: it stays on its neighbours'
// capsule), while `hidesSharedBackground` leaves it bare, its neighbours' capsule split around it.
type Group = GroupItem[] & { own?: 'start' | 'end'; base?: string; bare?: boolean };
const toGroups = (items: Item[], bottom: boolean) => {
  const groups: (Group | { spacer?: number; key: string })[] = [];
  let current: GroupItem[] = [];
  // A fixed space that doesn't share its neighbours' background, waiting for what comes after it.
  let pending: { key: string; width: number } | null = null;
  const real = (group: GroupItem[]) => group.some((item) => !(item.kind === 'button' && item.ghost));
  const close = () => {
    // A shared fixed space with nothing after it on the capsule goes.
    while (current.length > 0 && current[current.length - 1].kind === 'gap') current.pop();
    // Ghosts alone wait for the next capsule.
    if (current.some((item) => !(item.kind === 'button' && item.ghost))) {
      groups.push(current);
      current = [];
    }
  };
  const flush = () => {
    if (!pending) return;
    close();
    current = [];
    groups.push({ spacer: pending.width, key: pending.key });
    pending = null;
  };
  items.forEach((item, at) => {
    if (item.kind === 'spacer') {
      if (!bottom) return;
      flush();
      // A fixed space that shares its neighbours' background keeps them on one capsule, its width between them, as
      // iOS 26 does (simulator: 16pt more between the two icons).
      if (item.shares && item.width !== undefined && real(current)) {
        current.push({ kind: 'gap', key: item.key, width: item.width });
        return;
      }
      // One that doesn't splits the capsule there. If an icon alone comes after it, that icon splits off the capsule
      // before it as a capsule of its own, and melts back in once the space shares, as the navigation bar's buttons
      // do (`SplitOff`).
      if (item.width !== undefined && real(current)) {
        pending = { key: item.key, width: item.width };
        return;
      }
      close();
      current = [];
      groups.push({ spacer: item.width, key: item.key });
      return;
    }
    if (pending) {
      const next = items[at + 1];
      const alone = !next || next.kind === 'spacer';
      if (
        alone &&
        item.kind === 'button' &&
        !item.prominent &&
        !item.textOnly &&
        !item.bare &&
        !item.hidden &&
        (item.md || item.image)
      ) {
        const space = pending;
        pending = null;
        // On the capsule before, at no width: the space's gap and the icon, ready to open as it melts back in.
        current.push({ kind: 'gap', key: space.key, width: 0 });
        current.push({ ...item, hidden: true, ghost: true, badge: undefined });
        close();
        current = [];
        groups.push({ spacer: space.width, key: space.key });
        // After the capsule it splits off, as a separate icon whose ghost goes on the capsule before it is.
        const own: Group = [{ ...item, key: `${item.key}~own` }];
        own.own = 'start';
        own.base = item.key;
        groups.push(own);
        return;
      }
      flush();
    }
    if (bottom && ((item.kind === 'button' && item.bare) || (item.kind === 'view' && item.separate))) {
      // An item with no glass splits the capsule it lands in. The icons before it split off as a capsule of their own,
      // their ghosts starting the capsule after it, so going bare or back runs the navigation bar's split (`SplitOff`)
      // rather than swapping capsules at once.
      while (current.length > 0 && current[current.length - 1].kind === 'gap') current.pop();
      const next = items[at + 1];
      const splits =
        real(current) &&
        current.every(
          (other) =>
            other.kind === 'gap' || (other.kind === 'button' && !other.ghost && !other.prominent && !other.textOnly),
        ) &&
        next?.kind === 'button' &&
        !next.bare &&
        !next.prominent &&
        !next.textOnly;
      const bare: Group = [item];
      bare.bare = true;
      if (splits) {
        const before = current;
        const own: Group = before.map((other) => ({ ...other, key: `${other.key}~own` }));
        own.own = 'end';
        own.base = before[0].key;
        groups.push(own, bare);
        current = before.map((other) =>
          other.kind === 'button' ? { ...other, hidden: true, ghost: true, badge: undefined } : { ...other, width: 0 },
        );
        return;
      }
      close();
      current = [];
      groups.push(bare);
    } else if (item.kind === 'button' && !item.prominent && !item.textOnly && item.separate && !bottom) {
      // Its ghost goes on the capsule before it if there is one, else the one after.
      const after = !current.some((other) => !(other.kind === 'button' && other.ghost));
      current.push({ ...item, hidden: true, ghost: true, badge: undefined });
      close();
      const own: Group = [{ ...item, key: `${item.key}~own` }];
      own.own = after ? 'end' : 'start';
      own.base = item.key;
      groups.push(own);
    } else if (
      (item.kind === 'button' && (item.prominent || item.textOnly)) ||
      (item.separate && !(bottom && item.kind === 'button'))
    ) {
      close();
      current = [];
      groups.push([item]);
    } else {
      current.push(item);
    }
  });
  flush();
  close();
  return groups;
};

/**
 * Whether a bottom toolbar has a button with no glass (`hidesSharedBackground`), which iOS keeps legible with its scroll
 * edge. A bare custom view doesn't bring the edge (iOS 27 simulator): it brings its own look.
 */
export const hasBareItem = (children: ReactNode) =>
  toItems(children).some((item) => item.kind === 'button' && item.bare && !item.hidden);

// A capsule's key that stays while an icon splits off it or melts back in, at either end: its first item's, ghost or
// not. One that splits off the front leaves its ghost there, under its own key; one off the end leaves the first.
const groupKey = (group: GroupItem[]) => group[0].key;

/**
 * An icon's own capsule, or the back button kept beside the leading items, splitting off its neighbour's capsule or
 * melting back into it (`Split`). One there from the start, with its screen, just shows.
 */
const SplitOff = ({
  born,
  leaving,
  ...props
}: { born: number; leaving: boolean } & Omit<ComponentProps<typeof Split>, 'shown' | 'appear'>) => {
  // Mounted well after its row: it split off, rather than showing with the screen.
  const [fresh] = useState(() => Date.now() - born > barMotion.splitAfter);
  return <Split shown={!leaving} appear={fresh} {...props} />;
};

type Metrics = typeof barItem | typeof toolbar;

// A capsule's swell as an item on it shows or hides, 0 at rest: its glyphs swell with it.
const SwellContext = createLucentContext<SharedValue<number> | null>('BarSwell', null);

/**
 * A capsule that swells as one of its items shows or hides, as iOS 27's does: it and its glyphs grow and settle while
 * the item's slot opens or closes.
 */
const CapsuleSwell = ({
  hiddenKey,
  showing,
  children,
}: {
  hiddenKey: string;
  showing: number;
  children: (swell: SharedValue<number>) => ReactNode;
}) => {
  const swell = useSharedValue(0);
  const before = useRef({ hiddenKey, showing });
  // Before the frame paints, so it starts with the new layout rather than a frame or two after it.
  useLayoutEffect(() => {
    if (before.current.hiddenKey === hiddenKey) return;
    const growing = showing > before.current.showing;
    const { swellUp, swellDown } = growing ? barItemMotion.show : barItemMotion.hide;
    before.current = { hiddenKey, showing };
    swell.set(
      withSequence(
        withTiming(1, { duration: swellUp, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: swellDown, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [hiddenKey, showing, swell]);
  return <SwellContext value={swell}>{children(swell)}</SwellContext>;
};

/**
 * An item with no glass. Swapped in after the row first showed, its slot opens from nothing on the split's spring as the
 * icons around it split apart, and it fades in as they do (toolbar.bareIn), rather than taking its width at once and
 * shoving the capsules aside. Taken away, it fades where it stood while the capsules close up.
 */
const BareSlot = ({ opens, minWidth, children }: { opens: boolean; minWidth: number; children: ReactNode }) => {
  const [natural, setNatural] = useState(0);
  const [opening] = useState(opens);
  const open = useSharedValue(opening ? 0 : 1);
  // Coming in from all but nothing, not nothing: Android leaves a view at no opacity out of what TalkBack can reach,
  // and that's the opacity React keeps for it while the fade runs on the UI thread.
  const shown = useSharedValue(opening ? searchMotion.bar.parked : 1);
  useLayoutEffect(() => {
    if (!opening || natural === 0) return;
    open.set(withSpring(1, islandSplit.spring));
    shown.set(withDelay(toolbar.bareIn.delay, withTiming(1, { duration: toolbar.bareIn.duration })));
  }, [opening, natural, open, shown]);
  const slotStyle = useAnimatedStyle(() => (opening ? { width: Math.max(natural * open.get(), 0) } : { minWidth }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: shown.get() }));
  return (
    <Animated.View exiting={FadeOut.duration(toolbar.bareIn.duration)} style={[styles.view, slotStyle]}>
      <Animated.View
        // At its own size while its slot opens around it, kept in the slot's middle and spilling past its sides until
        // it's open: laid out, not floated over it, which would leave it out of what TalkBack reaches.
        style={[opening && styles.bareContent, { minWidth }, contentStyle]}
        onLayout={opening && natural === 0 ? (event) => setNatural(event.nativeEvent.layout.width) : undefined}>
        {children}
      </Animated.View>
    </Animated.View>
  );
};

/** A fixed space kept on a capsule, opening and closing on the split's spring as the item after it melts in or off. */
const Gap = ({ width }: { width: number }) => {
  const size = useSharedValue(width);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    size.set(withSpring(width, islandSplit.spring));
  }, [width, size]);
  const style = useAnimatedStyle(() => ({ width: Math.max(size.get(), 0) }));
  return <Animated.View style={style} />;
};

/**
 * The toolbar's slot as a magnifier's circle: its capsule takes the swell of a field drawing back into it, and settles
 * with it (searchMotion.bottom.land), as the navigation bar's capsule takes its field back.
 */
const SearchLand = () => {
  const bubble = useContext(SearchBubbleContext);
  const swell = useContext(SwellContext);
  useAnimatedReaction(
    () => bubble?.land.get() ?? 0,
    (now, was) => {
      if (was === null || now === was) return;
      swell?.set(now);
    },
  );
  return null;
};

const ItemButton = ({
  item,
  color,
  metrics,
  grouped,
  edge = 'center',
  joins = false,
}: {
  item: ButtonItem;
  color: string;
  metrics: Metrics;
  grouped: boolean;
  // Mounted into a capsule already showing, as a button swapped in for a view: it opens into it, as a hidden item
  // showing does, rather than popping in at full width.
  joins?: boolean;
  // Which side of its slot it keeps to as the slot opens or closes: the capsule's outer edge, for the first or last item
  // on it, so it rides that edge in and out as on iOS 27.
  edge?: 'start' | 'end' | 'center';
}) => {
  const bottom = metrics === toolbar;
  const { color: theme, scheme, solid } = useLucentTheme(item.tintColor);
  const selected = item.selected && !item.prominent;
  // Inside tabs, the bottom toolbar takes the tab bar's tint, as iOS's does (barTint).
  const tabsTint = useTabsTint();
  const ink = item.disabled
    ? theme.buttonDisabled
    : item.prominent
      ? onAccent
      : selected
        ? solid
          ? theme.barFallback
          : barItem.selected.ink[scheme]
        : (item.tintColor ?? color);
  const icon = item.md || item.image;
  const openMenu = useOpenMenu();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  // iOS draws badges in the navigation bar only, as expo-router notes; the bottom toolbar leaves them out.
  const badge = bottom ? undefined : item.badge;
  const { menu } = item;
  const onPress = menu
    ? () => ref.current?.measureInWindow((x, y, width, height) => openMenu?.(menuTree(menu), { x, y, width, height }))
    : item.onPress;

  // An icon's slot, and how far it's in: a hidden icon has none. Shown, its slot eases open as the capsule swells (see
  // `CapsuleSwell`) and the glyph comes out of a blur; hidden, the glyph blurs away and the slot closes, as on iOS 27.
  // Grown with the text, icons sharing a capsule spread by as much as their glyphs grow, a lone one's circle staying
  // its size (iOS 27 simulator: 56pt apart at Large, 62 at XXL).
  const type = useBarType();
  const glyphGrowth = barItem.iconSize * (type.glyph - 1);
  const slot = icon ? (grouped ? metrics.groupIcon + glyphGrowth : metrics.icon) : undefined;
  // An icon's fill is centred on its glyph, but kept as far from the capsule's end as from its top and bottom, as iOS
  // 27's is: the capsule ends inside the outer icons' slots, by less than the fill's centring leaves.
  const fillWidth = grouped ? barItem.selected.groupWidth : barItem.selected.height;
  const fillInset = (metrics.height - barItem.selected.height) / 2;
  const capsuleEnd = grouped ? -metrics.groupPadding : 0;
  const fillCentred = ((slot ?? 0) - fillWidth) / 2;
  const fillStart =
    edge === 'start'
      ? Math.max(fillCentred, capsuleEnd + fillInset)
      : edge === 'end'
        ? Math.min(fillCentred, (slot ?? 0) - capsuleEnd - fillInset - fillWidth)
        : fillCentred;
  const target = item.hidden ? 0 : slot;
  // The slot goes from one width to the other as `progress` runs 0 to 1, a little past and back.
  const [opens] = useState(() => joins && !item.hidden && !item.ghost);
  const fromWidth = useSharedValue(opens ? 0 : (target ?? 0));
  const toWidth = useSharedValue(opens ? 0 : (target ?? 0));
  const progress = useSharedValue(1);
  const shown = useSharedValue(item.hidden || opens ? 0 : 1);
  const swell = useContext(SwellContext);
  const melt = useContext(BarMeltContext);
  // A row's shared glass follows the slot's layout while it resizes.
  const row = useBarGlassRow();
  const first = useRef(true);
  const wasGhost = useRef(item.ghost);
  // Going to or from its own capsule, it comes and goes as a tab does in the tab bar: no blur.
  const splitting = useSharedValue(0);
  useLayoutEffect(() => {
    const split = Boolean(item.ghost || wasGhost.current);
    wasGhost.current = item.ghost;
    if (first.current) {
      first.current = false;
      if (!opens) return;
    }
    const { show, hide } = barItemMotion;
    splitting.set(split ? 1 : 0);
    if (target !== undefined) {
      const now = fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get();
      fromWidth.set(now);
      toWidth.set(target);
      progress.set(0);
      // The glyph rides in its slot as it opens or closes, blurring in or out; splitting off or melting back, the slot
      // runs on the split's spring, as the tab bar's width does as its search circle splits off.
      progress.set(split ? withSpring(1, islandSplit.spring) : resize(!item.hidden));
      row?.follow(
        split ? islandSplit.spring.duration + 50 : (item.hidden ? hide : show).width + barItemMotion.settle + 50,
      );
    }
    const easing = split ? Easing.linear : Easing.inOut(Easing.quad);
    shown.set(
      item.hidden
        ? withTiming(0, { duration: hide.glyph, easing })
        : withDelay(show.glyphDelay, withTiming(1, { duration: show.glyph, easing })),
    );
  }, [target, item.hidden, item.ghost, fromWidth, toWidth, progress, shown, splitting, row]);
  // One that steps out of sight in place (`fade`), as the magnifier does while search it opened is up: gone at once,
  // and back as an item showing on its capsule is, its slot kept: the capsule swells and the glyph grows out of a blur,
  // as iOS 27's magnifier comes back once the field has drawn back into its capsule.
  useAnimatedReaction(
    () => (item.fade ? item.fade.get() > 0.5 : null),
    (now, was) => {
      if (now === null || was === null || now === was) return;
      if (!now) {
        shown.set(0);
        return;
      }
      const { back } = barItemMotion;
      shown.set(withTiming(1, { duration: back.glyph, easing: Easing.out(Easing.quad) }));
      swell?.set(
        withSequence(
          withTiming(back.swell, { duration: back.swellUp, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: back.swellDown, easing: Easing.inOut(Easing.quad) }),
        ),
      );
    },
  );
  // Its capsule takes on the swell of a field landing in it, and deflates with it.
  useAnimatedReaction(
    () => item.land?.get() ?? -1,
    (now, was) => {
      if (now < 0 || was === null || now === was) return;
      swell?.set(now);
    },
  );
  const slotStyle = useAnimatedStyle(() =>
    target === undefined
      ? {}
      : { width: Math.max(fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get(), 0) },
  );
  const glyphStyle = useAnimatedStyle(() => {
    // A glyph coming or going grows out of, or shrinks into, a small blur as it rides the capsule's edge; and every
    // glyph on the capsule swells with it.
    const shrink = barItemMotion.leaveScale + (1 - barItemMotion.leaveScale) * shown.get();
    // Popping in with its screen, it comes after its glass (`meltLook`).
    const popping = meltLook(melt?.get() ?? 0).glyphOpacity;
    // Faint early as it leaves and late as it comes, as iOS's soft grey blob is by the halfway point.
    return {
      // Stepped out of sight (`fade`), it goes on the same frame, not the frame after its reaction runs.
      opacity: shown.get() * shown.get() * popping * (item.fade && item.fade.get() <= 0.5 ? 0 : 1),
      transform: [{ scale: shrink * (1 + barItemMotion.glyphSwell * (swell?.get() ?? 0)) }],
    };
  });
  // Soft early: fully blurred a little way into leaving, so its edges don't linger, and sharp only at the end of coming.
  const glyphBlur = useAnimatedProps(() => ({
    radius: Math.max(
      Math.min((1 - shown.get()) / barItemMotion.blurBy, 1) * barItemMotion.blur * (1 - splitting.get()),
      meltLook(melt?.get() ?? 0).glyphBlur,
    ),
  }));

  const glyph = item.md ? (
    <SymbolView name={{ android: item.md }} size={barItem.symbolSize * type.glyph} tintColor={ink} />
  ) : item.image ? (
    <Image
      source={item.image}
      style={[
        styles.image,
        { width: barItem.iconSize * type.glyph, height: barItem.iconSize * type.glyph, tintColor: ink },
      ]}
    />
  ) : (
    <Text
      numberOfLines={1}
      allowFontScaling={false}
      // The toolbar's labels grow with the text; the navigation bar's stay their size, as on iOS 27 (simulator: "Edit"
      // 27pt wide at Large and at XXL, where its title and symbols grow).
      style={[styles.label, bottom && [type.item, styles.labelBottom], { color: ink }]}>
      {item.label}
    </Text>
  );
  return (
    <Animated.View
      pointerEvents={item.hidden ? 'none' : 'box-none'}
      importantForAccessibility={item.hidden ? 'no-hide-descendants' : 'auto'}
      style={[styles.slot, edgeStyles[edge], { height: metrics.height }, slotStyle]}>
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={item.disabled || item.hidden}
        accessibilityRole="button"
        accessibilityLabel={item.accessibilityLabel}
        // A button that opens a menu says so, as VoiceOver's menu buttons do.
        accessibilityHint={menu ? 'Shows a menu' : undefined}
        accessibilityState={{ disabled: item.disabled, selected: item.selected }}
        hitSlop={{ top: reachTo(metrics.height), bottom: reachTo(metrics.height) }}
        style={({ pressed }) => [
          styles.item,
          { height: metrics.height },
          slot !== undefined ? { width: slot } : styles.textItem,
          pressed && styles.pressed,
        ]}>
        {selected ? (
          <View
            pointerEvents="none"
            style={[
              styles.selected,
              {
                top: (metrics.height - barItem.selected.height) / 2,
                backgroundColor: item.tintColor ?? (bottom ? tabsTint : undefined) ?? barItem.selected.fill[scheme],
              },
              icon
                ? { width: fillWidth, start: fillStart }
                : {
                    left: (metrics.height - barItem.selected.height) / 2,
                    right: (metrics.height - barItem.selected.height) / 2,
                  },
            ]}
          />
        ) : null}
        {icon ? (
          <AnimatedNativeGlassBlur animatedProps={glyphBlur} style={[styles.glyphBlur, glyphStyle]}>
            {glyph}
          </AnimatedNativeGlassBlur>
        ) : (
          glyph
        )}
      </Pressable>
      {/* On its button, drawn over the capsule's glass, which draws what it holds over itself: it grows and leans with
          the capsule as it's pressed, as iOS's does, and doesn't dim with the button. */}
      {badge && !item.hidden ? (
        <View pointerEvents="none" style={styles.badgeAnchor}>
          <Badge {...badge} />
        </View>
      ) : null}
    </Animated.View>
  );
};

const Badge = ({ text: label, style }: { text: string; style?: StyleProp<TextStyle> }) => {
  const { color } = useLucentTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View style={styles.badge}>
      <View style={[styles.badgeFill, { backgroundColor: flat.backgroundColor ?? color.buttonDestructive }]}>
        <Text
          numberOfLines={1}
          style={[
            styles.badgeText,
            {
              color: flat.color ?? onAccent,
              fontSize: flat.fontSize ?? badgeMetrics.fontSize,
              fontWeight: flat.fontWeight,
              fontFamily: flat.fontFamily,
            },
          ]}>
          {label}
        </Text>
      </View>
    </View>
  );
};

interface Props {
  children: ReactNode;
  // The colour for plain items: the header's tint, or `Stack.Toolbar`'s `tintColor`.
  color: string;
  // The bottom toolbar: bigger items, spread across the screen by its flexible spacers.
  bottom?: boolean;
  // The screen, for a `Stack.Toolbar.SearchBarSlot`'s field.
  routeKey?: string;
  // Taken away by search mode: out of TalkBack's reach while it's gone.
  away?: boolean;
}

/**
 * The screen's search as a magnifier among the navigation bar's trailing items (`placement: 'integratedButton'` beside a
 * bottom toolbar): what it opens, or null. The header provides it around its trailing side.
 */
export const BarSearchButtonContext = createLucentContext<{
  open: () => void;
  label: string;
  // How much its glyph shows: gone the frame the field starts growing out of its capsule, as on iOS 27.
  shows?: SharedValue<number>;
  // How swollen its capsule is as a field it opened lands back in it, 0 at rest.
  land?: SharedValue<number>;
} | null>('BarSearchButton', null);

/**
 * The back button, kept beside the leading items (`headerBackVisible`), which goes on their glass so it splits off their
 * capsule as `headerBackVisible` brings it, and melts back in as it takes it away. The header provides it around its
 * leading side when those are `Stack.Toolbar`'s.
 */
export const BarBackButtonContext = createLucentContext<{ element: ReactNode; shown: boolean } | null>(
  'BarBackButton',
  null,
);

/** A `Stack.Toolbar`'s items for one side of the bar, grouped onto glass capsules as iOS 26 does. */
export const BarItems = ({ children, color, bottom = false, routeKey, away = false }: Props) => {
  const { scheme, solid } = useLucentTheme();
  const tabsTint = useTabsTint();
  const metrics = bottom ? toolbar : barItem;
  const searchButton = useContext(BarSearchButtonContext);
  // As iOS does, the magnifier joins the trailing items, on their capsule when it can share one.
  const listed: Item[] = [
    ...toItems(children),
    ...(searchButton && !bottom
      ? [
          {
            kind: 'button',
            key: 'lucent-search',
            md: 'search',
            onPress: searchButton.open,
            prominent: false,
            separate: false,
            textOnly: false,
            accessibilityLabel: searchButton.label,
            fade: searchButton.shows,
            land: searchButton.land,
          } satisfies ButtonItem,
        ]
      : []),
  ];
  // A button taken off the toolbar (swapped for a view, say) stays on its capsule as a ghost while its slot closes on the
  // split's spring, where it would leave at once and jump everything beside it.
  const listedKey = listed.map((item) => item.key).join('|');
  const [listedBefore, setListedBefore] = useState({ key: listedKey, items: listed });
  const [departing, setDeparting] = useState<{ item: ButtonItem; before: string | null }[]>([]);
  if (listedBefore.key !== listedKey) {
    const now = new Set(listed.map((item) => item.key));
    const went = bottom
      ? listedBefore.items.flatMap((item, at) => {
          if (
            item.kind !== 'button' ||
            now.has(item.key) ||
            item.hidden ||
            item.bare ||
            item.prominent ||
            item.textOnly ||
            !(item.md || item.image)
          )
            return [];
          const next = listedBefore.items.slice(at + 1).find((other) => now.has(other.key));
          return [{ item, before: next?.key ?? null }];
        })
      : [];
    setDeparting((current) => [...current.filter((gone) => !now.has(gone.item.key)), ...went]);
    setListedBefore({ key: listedKey, items: listed });
  }
  useEffect(() => {
    if (departing.length === 0) return undefined;
    const done = setTimeout(() => setDeparting([]), islandSplit.spring.duration + 50);
    return () => clearTimeout(done);
  }, [departing]);
  const items = departing.reduce<Item[]>((all, { item, before }) => {
    const ghost: ButtonItem = { ...item, hidden: true, ghost: true, badge: undefined };
    const at = before === null ? -1 : all.findIndex((other) => other.key === before);
    return at < 0 ? [...all, ghost] : [...all.slice(0, at), ghost, ...all.slice(at)];
  }, listed);
  const groups = toGroups(items, bottom);
  // The toolbar's slot as a magnifier's circle and the field that grows out of it are one piece of glass: the circle's
  // glass goes the frame the field's comes up over it, and is back the frame the field's lands in it.
  const bubble = useContext(SearchBubbleContext);
  // Solid, the field fades in over it and out again (bottom.solidFade), so it stays until the field's whole: an opaque
  // field half in over nothing would show what's behind it.
  const circlePresence = useDerivedValue<number>(() =>
    bubble && bubble.up.get() > (solid ? searchMotion.bottom.solidUp : 0.5) ? 0 : 1,
  );
  // The search field's capsule, whose whole span the field grows out of, its other items on it fading as it does.
  const searchCapsule = useRef<ComponentRef<typeof View>>(null);
  const measureCapsule = () =>
    searchCapsule.current?.measureInWindow((x, _y, width) => {
      if (routeKey) setCapsuleRect(routeKey, x - metrics.groupPadding, width + 2 * metrics.groupPadding);
    });
  // Plain capsules share one piece of glass, so a held one can bridge to its neighbour. A tinted or search capsule keeps
  // its own glass, and with one there the row's others do too: glass isn't drawn inside glass.
  const capsules = groups.filter(
    (group): group is GroupItem[] =>
      Array.isArray(group) && !(group as Group).bare && !group.every((item) => item.kind === 'view'),
  );
  const backButton = useContext(BarBackButtonContext);
  const [backMounted, setBackMounted] = useState(Boolean(backButton?.shown));
  if (backButton?.shown && !backMounted) setBackMounted(true);
  const backGone = useCallback(() => setBackMounted(false), []);
  // One capsule too, so an icon splitting off it or joining it doesn't swap the row's glass and start every capsule
  // over. A back button on the row is one more.
  const bridged =
    capsules.length >= 1 &&
    capsules.length + (backButton && backMounted ? 1 : 0) <= maxBridged &&
    capsules.every(
      (group) =>
        !group.some((item) => item.kind === 'search') &&
        !(group.length === 1 && group[0].kind === 'button' && group[0].prominent),
    );
  // With no flexible spacer to spread them, the bottom toolbar's capsules sit together in its middle, as iOS's do.
  const flexible = groups.some((group) => !Array.isArray(group) && group.spacer === undefined);
  const rowStyle = [styles.side, bottom && styles.bottom, bottom && !flexible && styles.centered];
  // A capsule of its own that comes after the row first shows has split off; one there from the start just shows.
  const [born] = useState(() => Date.now());
  // A capsule of its own whose icon has gone back to its neighbour's stays while it melts in.
  const owns = groups.filter((group): group is Group => Array.isArray(group) && Boolean((group as Group).own));
  const ownKey = owns.map((group) => group.base).join('|');
  const [seen, setSeen] = useState({ key: ownKey, owns });
  const [leaving, setLeaving] = useState<Group[]>([]);
  if (seen.key !== ownKey) {
    const merged = (group: Group) =>
      !owns.some((own) => own.base === group.base) &&
      groups.some((other) => Array.isArray(other) && other.some((item) => item.key === group.base));
    setLeaving((current) => [
      ...current.filter(merged),
      ...seen.owns.filter((group) => merged(group) && !current.some((other) => other.base === group.base)),
    ]);
    setSeen({ key: ownKey, owns });
  }
  const gone = useCallback(
    (base?: string) => setLeaving((current) => current.filter((group) => group.base !== base)),
    [],
  );
  // The capsules on screen as of the last render, which a new item joins rather than arrives with; none while the row
  // first shows, whose items all come with it.
  const capsuleKeys = groups
    .filter((group): group is Group => Array.isArray(group) && !(group as Group).bare)
    .map((group) => groupKey(group))
    .join('|');
  const [capsulesSeen, setCapsulesSeen] = useState<{ now: string; before: string | null }>({
    now: capsuleKeys,
    before: null,
  });
  if (capsulesSeen.now !== capsuleKeys) setCapsulesSeen({ now: capsuleKeys, before: capsulesSeen.now });
  const known = capsulesSeen.now !== capsuleKeys ? capsulesSeen.now : capsulesSeen.before;
  const knownCapsules = new Set(known?.split('|') ?? []);
  const render = (group: (typeof groups)[number], melting = false) => {
    if (!Array.isArray(group)) {
      // Only the bottom toolbar has spacers. A flexible one spreads the groups apart; a fixed one adds its width to
      // the usual gap between them, as iOS does, so it gives back one of the two gaps the row puts around it.
      const spacer =
        group.spacer === undefined ? styles.flexible : { width: group.spacer, marginHorizontal: -bar.groupGap / 2 };
      return <View key={group.key} style={spacer} />;
    }
    // A fixed space kept on it isn't an item: an icon with only a closed gap and a ghost beside it is alone, round.
    const showing = group.filter((item) => item.kind !== 'gap' && !(item.kind === 'button' && item.hidden));
    // A capsule whose items are all hidden goes; one with some keeps its hidden items at no width.
    if (showing.length === 0) return null;
    const icons = showing.filter((item) => item.kind === 'button' && (item.md || item.image)).length;
    const prominent = group.length === 1 && group[0].kind === 'button' && group[0].prominent;
    const views = group.every((item) => item.kind === 'view');
    // The toolbar's slot as a field fills what the buttons leave; given a background of its own, or none, it's a
    // magnifier in a circle of its own, as iOS 27 draws it (`slotIsButton`).
    const searching = group.some((item) => item.kind === 'search' && !(bottom && item.separate));
    const searchGroup = group.some((item) => item.kind === 'search');
    const key = groupKey(group);
    // On a capsule that was already showing, a new item opens into it.
    const joins = !group.own && knownCapsules.has(key);
    const content = group.map((item, at) =>
      item.kind === 'button' ? (
        <ItemButton
          // Anew when it turns from an icon to a label or back: the icon's slot width would hold on the label.
          key={item.md || item.image ? item.key : `${item.key}~label`}
          item={item}
          color={color}
          metrics={metrics}
          grouped={showing.length > 1}
          joins={joins}
          edge={group.length > 1 && at === 0 ? 'start' : group.length > 1 && at === group.length - 1 ? 'end' : 'center'}
        />
      ) : item.kind === 'search' ? (
        // The field takes what the group's buttons leave.
        <View key={item.key} style={bottom && item.separate ? undefined : styles.search}>
          {routeKey ? <SearchDisplay routeKey={routeKey} compact={bottom && item.separate} /> : null}
          {bottom && item.separate ? <SearchLand /> : null}
        </View>
      ) : item.kind === 'gap' ? (
        <Gap key={item.key} width={item.width} />
      ) : (
        <View key={item.key}>{item.element}</View>
      ),
    );
    // A custom view brings its own look; only buttons sit on glass. iOS centres it in at least a button's width: a 40pt
    // avatar gets 2pt more on each side than a button would.
    if (views || (group as Group).bare)
      return (
        <BareSlot key={groupKey(group)} opens={known !== null} minWidth={metrics.height}>
          {content}
        </BareSlot>
      );
    const hiddenKey = group.map((item) => (item.kind === 'button' && item.hidden ? '1' : '0')).join('');
    const capsule = (
      <CapsuleSwell key={key} hiddenKey={hiddenKey} showing={showing.length}>
        {(swell) => (
          <BarCapsule
            // In the item's own colour, as iOS fills it, or the bar's: the navigation bar takes the window's tint, the
            // system's blue, while the bottom toolbar inside tabs takes the tab bar's (iOS 27 simulator, with an
            // orange tint on the tab bar: blue at the top, orange at the bottom).
            tint={
              prominent
                ? (group[0].kind === 'button' && group[0].tintColor) || (bottom && tabsTint) || systemTint[scheme]
                : undefined
            }
            height={metrics.height}
            grow={searching}
            swell={swell}
            // The field that grows out of it takes its glass over whole, the frame it comes up: one piece of glass.
            presence={bottom && searchGroup ? circlePresence : undefined}>
            <View
              ref={searching ? searchCapsule : undefined}
              onLayout={searching && routeKey ? measureCapsule : undefined}
              style={[
                styles.group,
                searching && styles.search,
                { height: metrics.height },
                // Negative on iOS's measurements, so a margin: the capsule ends inside the outer icons' slots.
                icons > 1 && { marginHorizontal: metrics.groupPadding },
              ]}>
              {content}
            </View>
          </BarCapsule>
        )}
      </CapsuleSwell>
    );
    return group.own ? (
      <SplitOff
        key={key}
        born={born}
        toward={group.own}
        leaving={melting}
        size={metrics.height}
        onGone={() => gone(group.base)}>
        {capsule}
      </SplitOff>
    ) : (
      capsule
    );
  };
  const back =
    backButton && backMounted ? (
      <SplitOff
        key="lucent-back"
        born={born}
        toward="end"
        leaving={!backButton.shown}
        size={metrics.height}
        onGone={backGone}>
        {backButton.element}
      </SplitOff>
    ) : null;
  // Each melting capsule beside the one it's melting into, on the side it was on.
  const grouped = groups.flatMap((group) => {
    const into = leaving.filter((own) => Array.isArray(group) && group.some((item) => item.key === own.base));
    return [
      ...into.filter((own) => own.own === 'end').map((own) => render(own, true)),
      render(group),
      ...into.filter((own) => own.own === 'start').map((own) => render(own, true)),
    ];
  });
  const content = [back, ...grouped];
  const row = bridged ? (
    <BarGlassRow style={rowStyle} height={metrics.height} hidden={away}>
      {content}
    </BarGlassRow>
  ) : (
    <View style={rowStyle} importantForAccessibility={away ? 'no-hide-descendants' : 'auto'}>
      {content}
    </View>
  );
  return row;
};

const edgeStyles = StyleSheet.create({
  start: { alignItems: 'flex-start' },
  end: { alignItems: 'flex-end' },
  center: { alignItems: 'center' },
});

const styles = StyleSheet.create({
  side: { flexDirection: 'row', alignItems: 'center', gap: bar.groupGap },
  bottom: { flex: 1 },
  flexible: { flex: 1 },
  centered: { justifyContent: 'center' },
  group: { flexDirection: 'row', alignItems: 'center' },
  search: { flex: 1, alignSelf: 'stretch' },
  item: { alignItems: 'center', justifyContent: 'center' },
  slot: { justifyContent: 'center' },
  glyphBlur: { padding: barItemMotion.blur * 2, margin: -barItemMotion.blur * 2 },
  textItem: { paddingHorizontal: barItem.textPadding },
  pressed: { opacity: 0.6 },
  selected: {
    position: 'absolute',
    height: barItem.selected.height,
    borderRadius: barItem.selected.height / 2,
  },
  image: { resizeMode: 'contain' },
  label: {
    fontSize: barItem.fontSize,
    lineHeight: barItem.lineHeight,
    fontWeight: barItem.labelWeight,
    includeFontPadding: false,
  },
  labelBottom: { fontWeight: toolbar.labelWeight },
  badge: {
    position: 'absolute',
    top: badgeMetrics.top,
    right: badgeMetrics.right,
    height: badgeMetrics.size,
  },
  badgeFill: {
    minWidth: badgeMetrics.size,
    height: badgeMetrics.size,
    borderRadius: badgeMetrics.size / 2,
    paddingHorizontal: badgeMetrics.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { lineHeight: badgeMetrics.size, includeFontPadding: false },
  view: { alignItems: 'center', justifyContent: 'center' },
  bareContent: { flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  badgeAnchor: { position: 'absolute', top: 0, left: 0, right: 0, height: 0 },
});
