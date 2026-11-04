import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import {
  Children,
  isValidElement,
  useContext,
  useRef,
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

import { BarCapsule, BarGlassRow, maxBridged } from './BarCapsule.android';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { useOpenMenu } from '../menu/Menu.android';
import { menuTree } from '../menu/items';
import { SearchDisplay } from '../search/SearchField.android';
import { badge as badgeMetrics, barItem, bar, toolbar } from '../tokens';
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
    if (props.hidden) return [];
    if (child.type === ToolbarButton) return [buttonItem(props as LucentToolbarButtonProps, key, false)];
    if (child.type === ToolbarMenu) return [buttonItem(props as LucentToolbarMenuProps, key, true)];
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

const ItemButton = ({
  item,
  color,
  metrics,
  grouped,
}: {
  item: ButtonItem;
  color: string;
  metrics: Metrics;
  grouped: boolean;
}) => {
  const bottom = metrics === toolbar;
  const { color: theme } = useLucentTheme(item.tintColor);
  const ink = item.disabled ? theme.buttonDisabled : item.prominent ? onAccent : (item.tintColor ?? color);
  const icon = item.md || item.image;
  const openMenu = useOpenMenu();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const { menu } = item;
  const onPress = menu
    ? () => ref.current?.measureInWindow((x, y, width, height) => openMenu?.(menuTree(menu), { x, y, width, height }))
    : item.onPress;
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={item.disabled}
      accessibilityRole="button"
      accessibilityLabel={item.accessibilityLabel}
      accessibilityState={{ disabled: item.disabled }}
      style={({ pressed }) => [
        styles.item,
        { height: metrics.height },
        icon ? { width: grouped ? metrics.groupIcon : metrics.icon } : styles.textItem,
        pressed && styles.pressed,
      ]}>
      {item.md ? (
        <SymbolView name={{ android: item.md }} size={barItem.symbolSize} tintColor={ink} />
      ) : item.image ? (
        <Image source={item.image} style={[styles.image, { tintColor: ink }]} />
      ) : (
        <Text numberOfLines={1} style={[styles.label, { color: ink }]}>
          {item.label}
        </Text>
      )}
      {/* iOS draws badges in the navigation bar only, as expo-router notes; the bottom toolbar leaves them out. */}
      {item.badge && !bottom ? <Badge {...item.badge} /> : null}
    </Pressable>
  );
};

const Badge = ({ text: label, style }: { text: string; style?: StyleProp<TextStyle> }) => {
  const { color } = useLucentTheme();
  const flat = StyleSheet.flatten(style) ?? {};
  return (
    <View
      pointerEvents="none"
      style={[styles.badge, { backgroundColor: flat.backgroundColor ?? color.buttonDestructive }]}>
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
    const icons = group.filter((item) => item.kind === 'button' && (item.md || item.image)).length;
    const prominent = group.length === 1 && group[0].kind === 'button' && group[0].prominent;
    const views = group.every((item) => item.kind === 'view');
    const searching = group.some((item) => item.kind === 'search');
    const content = group.map((item) =>
      item.kind === 'button' ? (
        <ItemButton key={item.key} item={item} color={color} metrics={metrics} grouped={group.length > 1} />
      ) : item.kind === 'search' ? (
        // The field takes what the group's buttons leave.
        <View key={item.key} style={styles.search}>
          {routeKey ? <SearchDisplay routeKey={routeKey} /> : null}
        </View>
      ) : (
        <View key={item.key}>{item.element}</View>
      ),
    );
    // A custom view brings its own look; only buttons sit on glass.
    if (views) return <View key={index}>{content}</View>;
    return (
      <BarCapsule
        key={index}
        // In the item's own colour, as iOS fills it, or the app's tint.
        tint={prominent ? (group[0].kind === 'button' && group[0].tintColor) || theme.tint : undefined}
        height={metrics.height}
        grow={searching}>
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
    );
  });
  return bridged ? (
    <BarGlassRow style={rowStyle} height={metrics.height}>
      {content}
    </BarGlassRow>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
};

const styles = StyleSheet.create({
  side: { flexDirection: 'row', alignItems: 'center', gap: bar.groupGap },
  bottom: { flex: 1 },
  flexible: { flex: 1 },
  group: { flexDirection: 'row', alignItems: 'center' },
  search: { flex: 1, alignSelf: 'stretch' },
  item: { alignItems: 'center', justifyContent: 'center' },
  textItem: { paddingHorizontal: barItem.textPadding },
  pressed: { opacity: 0.6 },
  image: { width: barItem.iconSize, height: barItem.iconSize, resizeMode: 'contain' },
  label: { fontSize: barItem.fontSize, lineHeight: barItem.lineHeight, includeFontPadding: false },
  badge: {
    position: 'absolute',
    top: badgeMetrics.top,
    right: badgeMetrics.right,
    minWidth: badgeMetrics.size,
    height: badgeMetrics.size,
    borderRadius: badgeMetrics.size / 2,
    paddingHorizontal: badgeMetrics.padding,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { lineHeight: badgeMetrics.size, includeFontPadding: false },
});
