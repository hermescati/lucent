import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import {
  Children,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactElement,
  type ReactNode,
  type RefObject,
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
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { BarCapsule, BarGlassRow, maxBridged, resize, useBarGlassRow } from './BarCapsule.android';
import { AnimatedNativeGlassBlur, NativeGlassView } from '../../../core/glass/NativeGlass';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { useOpenMenu } from '../menu/Menu.android';
import { menuTree } from '../menu/items';
import { SearchDisplay } from '../search/SearchField.android';
import { badge as badgeMetrics, barItem, barItemMotion, bar, toolbar } from '../tokens';
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
type Item = ButtonItem | ViewItem | SearchItem | { kind: 'spacer'; key: string; width?: number };
type GroupItem = ButtonItem | ViewItem | SearchItem;

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
    // Judged by the iOS icon (`icon` or a Stack.Toolbar.Icon), not `md`: an SF Symbol button without `md` still shares
    // its neighbours' capsule on iOS, though Android can only show its label.
    textOnly: !props.icon && !iconPart,
    tintColor: typeof props.tintColor === 'string' ? props.tintColor : undefined,
    accessibilityLabel: props.accessibilityLabel ?? label,
    menu: menu ? (props as LucentToolbarMenuProps) : undefined,
    badge: badgePart ? { text: text(badgePart.children), style: badgePart.style } : undefined,
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
    if (child.type === ToolbarSpacer) return [{ kind: 'spacer', key, width: props.width as number | undefined }];
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
const toGroups = (items: Item[], bottom: boolean) => {
  const groups: (GroupItem[] | { spacer?: number; key: string })[] = [];
  let current: GroupItem[] = [];
  const close = () => {
    if (current.length) groups.push(current);
    current = [];
  };
  for (const item of items) {
    if (item.kind === 'spacer') {
      if (!bottom) continue;
      close();
      groups.push({ spacer: item.width, key: item.key });
    } else if ((item.kind === 'button' && (item.prominent || item.textOnly)) || item.separate) {
      close();
      groups.push([item]);
    } else {
      current.push(item);
    }
  }
  close();
  return groups;
};

type Metrics = typeof barItem | typeof toolbar;

interface Frame {
  x: number;
  y: number;
  width: number;
  badge: NonNullable<ButtonItem['badge']>;
}

// Glass clips what it holds, and iOS's badge stands out over the capsule's corner. So a badged button tells the row
// where it is, and the row draws the badge over all its glass.
const BadgeHost = createLucentContext<{
  row: RefObject<ComponentRef<typeof View> | null>;
  // Bumped when the row lays out again, so the buttons measure again.
  version: number;
  report: (key: string, frame: Frame | null) => void;
} | null>('BarBadgeHost', null);

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

const ItemButton = ({
  item,
  color,
  metrics,
  grouped,
  edge = 'center',
}: {
  item: ButtonItem;
  color: string;
  metrics: Metrics;
  grouped: boolean;
  // Which side of its slot it keeps to as the slot opens or closes: the capsule's outer edge, for the first or last item
  // on it, so it rides that edge in and out as on iOS 27.
  edge?: 'start' | 'end' | 'center';
}) => {
  const bottom = metrics === toolbar;
  const { color: theme } = useLucentTheme(item.tintColor);
  const ink = item.disabled ? theme.buttonDisabled : item.prominent ? onAccent : (item.tintColor ?? color);
  const icon = item.md || item.image;
  const openMenu = useOpenMenu();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const host = useContext(BadgeHost);
  const badge = bottom ? undefined : item.badge;
  const measure = useCallback(() => {
    const row = host?.row.current;
    if (!host || !row || !ref.current || !badge) return;
    ref.current.measureLayout(row, (x, y, width) => host.report(item.key, { x, y, width, badge }));
  }, [host, badge, item.key]);
  useEffect(() => {
    measure();
  }, [measure, host?.version]);
  useEffect(() => (host && badge ? () => host.report(item.key, null) : undefined), [host, badge, item.key]);
  const { menu } = item;
  const onPress = menu
    ? () => ref.current?.measureInWindow((x, y, width, height) => openMenu?.(menuTree(menu), { x, y, width, height }))
    : item.onPress;

  // An icon's slot, and how far it's in: a hidden icon has none. Shown, its slot eases open as the capsule swells (see
  // `CapsuleSwell`) and the glyph comes out of a blur; hidden, the glyph blurs away and the slot closes, as on iOS 27.
  const slot = icon ? (grouped ? metrics.groupIcon : metrics.icon) : undefined;
  const target = item.hidden ? 0 : slot;
  // The slot goes from one width to the other as `progress` runs 0 to 1, a little past and back.
  const fromWidth = useSharedValue(target ?? 0);
  const toWidth = useSharedValue(target ?? 0);
  const progress = useSharedValue(1);
  const shown = useSharedValue(item.hidden ? 0 : 1);
  const swell = useContext(SwellContext);
  // A row's shared glass follows the slot's layout while it resizes.
  const row = useBarGlassRow();
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const { show, hide } = barItemMotion;
    if (target !== undefined) {
      const now = fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get();
      fromWidth.set(now);
      toWidth.set(target);
      progress.set(0);
      // The glyph rides in its slot as it opens or closes, blurring in or out.
      progress.set(resize(!item.hidden));
      row?.follow((item.hidden ? hide : show).width + barItemMotion.settle + 50);
    }
    shown.set(
      item.hidden
        ? withTiming(0, { duration: hide.glyph })
        : withDelay(show.glyphDelay, withTiming(1, { duration: show.glyph })),
    );
  }, [target, item.hidden, fromWidth, toWidth, progress, shown, row]);
  const slotStyle = useAnimatedStyle(() =>
    target === undefined
      ? {}
      : { width: Math.max(fromWidth.get() + (toWidth.get() - fromWidth.get()) * progress.get(), 0) },
  );
  const glyphStyle = useAnimatedStyle(() => {
    // A glyph coming or going grows out of, or shrinks into, a small blur as it rides the capsule's edge; and every
    // glyph on the capsule swells with it.
    const shrink = barItemMotion.leaveScale + (1 - barItemMotion.leaveScale) * shown.get();
    // Faint early as it leaves and late as it comes, as iOS's soft grey blob is by the halfway point.
    return {
      opacity: shown.get() * shown.get(),
      transform: [{ scale: shrink * (1 + barItemMotion.glyphSwell * (swell?.get() ?? 0)) }],
    };
  });
  // Soft early: fully blurred a little way into leaving, so its edges don't linger, and sharp only at the end of coming.
  const glyphBlur = useAnimatedProps(() => ({
    radius: Math.min((1 - shown.get()) / barItemMotion.blurBy, 1) * barItemMotion.blur,
  }));

  const glyph = item.md ? (
    <SymbolView name={{ android: item.md }} size={barItem.symbolSize} tintColor={ink} />
  ) : item.image ? (
    <Image source={item.image} style={[styles.image, { tintColor: ink }]} />
  ) : (
    <Text numberOfLines={1} style={[styles.label, { color: ink }]}>
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
        onLayout={badge ? measure : undefined}
        onPress={onPress}
        disabled={item.disabled || item.hidden}
        accessibilityRole="button"
        accessibilityLabel={item.accessibilityLabel}
        accessibilityState={{ disabled: item.disabled }}
        style={({ pressed }) => [
          styles.item,
          { height: metrics.height },
          slot !== undefined ? { width: slot } : styles.textItem,
          pressed && styles.pressed,
        ]}>
        {icon ? (
          <AnimatedNativeGlassBlur animatedProps={glyphBlur} style={[styles.glyphBlur, glyphStyle]}>
            {glyph}
          </AnimatedNativeGlassBlur>
        ) : (
          glyph
        )}
      </Pressable>
    </Animated.View>
  );
};

const Badge = ({ text: label, style }: { text: string; style?: StyleProp<TextStyle> }) => {
  const { color } = useLucentTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  // In a glass view of its own, lifted as the capsules are and after them, so it draws over their glass: a plain view
  // would go under it. Its fill covers the glass, which brings no rim or shadow.
  return (
    <NativeGlassView
      lift
      pointerEvents="none"
      cornerRadius={badgeMetrics.size / 2}
      rimWidth={0}
      shadowRadius={0}
      style={styles.badge}>
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
    </NativeGlassView>
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
}

/**
 * The screen's search as a magnifier among the navigation bar's trailing items (`placement: 'integratedButton'` beside a
 * bottom toolbar): what it opens, or null. The header provides it around its trailing side.
 */
export const BarSearchButtonContext = createLucentContext<{ open: () => void; label: string } | null>(
  'BarSearchButton',
  null,
);

/** A `Stack.Toolbar`'s items for one side of the bar, grouped onto glass capsules as iOS 26 does. */
export const BarItems = ({ children, color, bottom = false, routeKey }: Props) => {
  const { color: theme } = useLucentTheme();
  const metrics = bottom ? toolbar : barItem;
  const searchButton = useContext(BarSearchButtonContext);
  // As iOS does, the magnifier joins the trailing items, on their capsule when it can share one.
  const items: Item[] = [
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
          } satisfies ButtonItem,
        ]
      : []),
  ];
  const groups = toGroups(items, bottom);
  // iOS draws badges in the navigation bar only, as expo-router notes; the bottom toolbar leaves them out.
  const badged = !bottom && items.some((item) => item.kind === 'button' && item.badge);
  const rowRef = useRef<ComponentRef<typeof View>>(null);
  const [version, setVersion] = useState(0);
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const report = useCallback((key: string, frame: Frame | null) => {
    setFrames((current) => {
      if (!frame) {
        if (!(key in current)) return current;
        const { [key]: _gone, ...others } = current;
        return others;
      }
      const old = current[key];
      if (old && old.x === frame.x && old.y === frame.y && old.width === frame.width && old.badge === frame.badge) {
        return current;
      }
      return { ...current, [key]: frame };
    });
  }, []);
  const host = useMemo(() => ({ row: rowRef, version, report }), [version, report]);
  // Plain capsules share one piece of glass, so a held one can bridge to its neighbour. A tinted or search capsule keeps
  // its own glass, and with one there the row's others do too: glass isn't drawn inside glass.
  const capsules = groups.filter(
    (group): group is GroupItem[] => Array.isArray(group) && !group.every((item) => item.kind === 'view'),
  );
  const bridged =
    capsules.length > 1 &&
    capsules.length <= maxBridged &&
    capsules.every(
      (group) =>
        !group.some((item) => item.kind === 'search') &&
        !(group.length === 1 && group[0].kind === 'button' && group[0].prominent),
    );
  const rowStyle = [styles.side, bottom && styles.bottom];
  const content = groups.map((group, index) => {
    if (!Array.isArray(group)) {
      // Only the bottom toolbar has spacers. A flexible one spreads the groups apart; a fixed one adds its width to
      // the usual gap between them, as iOS does, so it gives back one of the two gaps the row puts around it.
      const spacer =
        group.spacer === undefined ? styles.flexible : { width: group.spacer, marginHorizontal: -bar.groupGap / 2 };
      return <View key={group.key} style={spacer} />;
    }
    const showing = group.filter((item) => !(item.kind === 'button' && item.hidden));
    // A capsule whose items are all hidden goes; one with some keeps its hidden items at no width.
    if (showing.length === 0) return null;
    const icons = showing.filter((item) => item.kind === 'button' && (item.md || item.image)).length;
    const prominent = group.length === 1 && group[0].kind === 'button' && group[0].prominent;
    const views = group.every((item) => item.kind === 'view');
    const searching = group.some((item) => item.kind === 'search');
    const content = group.map((item, at) =>
      item.kind === 'button' ? (
        <ItemButton
          key={item.key}
          item={item}
          color={color}
          metrics={metrics}
          grouped={showing.length > 1}
          edge={group.length > 1 && at === 0 ? 'start' : group.length > 1 && at === group.length - 1 ? 'end' : 'center'}
        />
      ) : item.kind === 'search' ? (
        // The field takes what the group's buttons leave.
        <View key={item.key} style={styles.search}>
          {routeKey ? <SearchDisplay routeKey={routeKey} /> : null}
        </View>
      ) : (
        <View key={item.key}>{item.element}</View>
      ),
    );
    // A custom view brings its own look; only buttons sit on glass. iOS centres it in at least a button's width: a 40pt
    // avatar gets 2pt more on each side than a button would.
    if (views)
      return (
        <View key={index} style={[styles.view, { minWidth: metrics.height }]}>
          {content}
        </View>
      );
    const hiddenKey = group.map((item) => (item.kind === 'button' && item.hidden ? '1' : '0')).join('');
    return (
      <CapsuleSwell key={index} hiddenKey={hiddenKey} showing={showing.length}>
        {(swell) => (
          <BarCapsule
            // In the item's own colour, as iOS fills it, or the app's tint.
            tint={prominent ? (group[0].kind === 'button' && group[0].tintColor) || theme.tint : undefined}
            height={metrics.height}
            grow={searching}
            swell={swell}>
            <View
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
  });
  const row = bridged ? (
    <BarGlassRow style={rowStyle} height={metrics.height}>
      {content}
    </BarGlassRow>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
  if (!badged) return row;
  return (
    <BadgeHost value={host}>
      <View ref={rowRef} style={styles.badgeRow} onLayout={() => setVersion((value) => value + 1)}>
        {row}
        {Object.entries(frames).map(([key, frame]) => (
          <View
            key={key}
            pointerEvents="none"
            style={[styles.badgeAnchor, { left: frame.x, top: frame.y, width: frame.width }]}>
            <Badge {...frame.badge} />
          </View>
        ))}
      </View>
    </BadgeHost>
  );
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
  group: { flexDirection: 'row', alignItems: 'center' },
  search: { flex: 1, alignSelf: 'stretch' },
  item: { alignItems: 'center', justifyContent: 'center' },
  slot: { justifyContent: 'center' },
  glyphBlur: { padding: barItemMotion.blur * 2, margin: -barItemMotion.blur * 2 },
  textItem: { paddingHorizontal: barItem.textPadding },
  pressed: { opacity: 0.6 },
  image: { width: barItem.iconSize, height: barItem.iconSize, resizeMode: 'contain' },
  label: { fontSize: barItem.fontSize, lineHeight: barItem.lineHeight, includeFontPadding: false },
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
  badgeRow: { flexDirection: 'row' },
  badgeAnchor: { position: 'absolute', height: 0 },
});
