import { useCallback, useContext, useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { BackHandler, I18nManager, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { hasChecks, toSections, type MenuActionNode, type MenuNode, type MenuTree, type SubmenuNode } from './items';
import { useBackClaim } from '../../../core/back/claims';
import { AnimatedNativeGlassView } from '../../../core/glass/NativeGlass';
import { useGlassMaterial } from '../../../core/glass/material';
import { MaterialSymbol } from '../../../core/icons/MaterialSymbol';
import { useLucentTheme } from '../../../theme/LucentProvider';
import { createLucentContext } from '../../../theme/context';
import { menu, menuColors, menuMotion, menuSolidColors } from '../tokens';

/** A rectangle in the window's coordinates, as `measureInWindow` gives it. */
export interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

type OpenMenu = (tree: MenuTree, anchor: Anchor) => void;

// Right to left: frames measured across the screen go from its right, and the submenu chevron points left.
const mirrored = I18nManager.isRTL;

const MenuContext = createLucentContext<OpenMenu | null>('StackMenu', null);

/** Opens a menu from a bar button, over the screen it's on. */
export const useOpenMenu = () => useContext(MenuContext);

type Colors = Record<keyof (typeof menuColors)['light'], string>;

// ——— Layout ———
// The menu lays its rows out itself, so it knows its height before it opens and where each row is for a submenu.

type Entry =
  | { kind: 'row'; key: string; top: number; height: number; item: MenuNode; icons: boolean }
  | { kind: 'palette'; key: string; top: number; items: MenuNode[] }
  | { kind: 'header'; key: string; top: number; title: string }
  | { kind: 'separator'; key: string; top: number }
  | { kind: 'submenuHeader'; key: string; top: number; item: SubmenuNode };

const rowHeight = (item: MenuNode) =>
  item.kind === 'action' && item.subtitle ? menu.row + menu.subtitleLineHeight - 4 : menu.row;

const hasIcon = (item: MenuNode) => Boolean(item.md || item.image);

const layout = (nodes: MenuNode[], title: string | undefined, submenu?: SubmenuNode) => {
  const sections = toSections(nodes);
  const entries: Entry[] = [];
  let y = menu.padding;
  const separator = (key: string) => {
    y += menu.padding;
    entries.push({ kind: 'separator', key, top: y });
    y += menu.padding + 1;
  };
  if (submenu) {
    entries.push({ kind: 'submenuHeader', key: 'submenu', top: y, item: submenu });
    y += menu.row;
    if (sections.length) separator('submenu-separator');
  } else if (title) {
    entries.push({ kind: 'header', key: 'title', top: y, title });
    y += menu.header.height;
  }
  sections.forEach((section, index) => {
    if (index > 0) separator(`${section.key}-separator`);
    if (section.title) {
      entries.push({ kind: 'header', key: `${section.key}-title`, top: y, title: section.title });
      y += menu.header.height;
    }
    if (section.palette) {
      entries.push({ kind: 'palette', key: section.key, top: y, items: section.items });
      y += menu.row;
      return;
    }
    const icons = section.items.some(hasIcon);
    for (const item of section.items) {
      const height = rowHeight(item);
      entries.push({ kind: 'row', key: `${section.key}-${item.key}`, top: y, height, item, icons });
      y += height;
    }
  });
  return { entries, height: y + menu.padding, checks: hasChecks(sections) };
};

// ——— Rows ———

interface RowContext {
  colors: Colors;
  checks: boolean;
  onAction: (item: MenuActionNode) => void;
  onSubmenu: (item: SubmenuNode, top: number) => void;
}

const ItemIcon = ({ item, color, left }: { item: MenuNode; color: string; left: number }) => {
  const style = [styles.icon, { left: left - menu.icon.size / 2 }];
  if (item.md) {
    return <MaterialSymbol name={item.md} size={menu.icon.size} tintColor={color} style={style} />;
  }
  if (item.image) return <Image source={item.image} style={[style, styles.image, { tintColor: color }]} />;
  return null;
};

const Row = ({ entry, context }: { entry: Extract<Entry, { kind: 'row' }>; context: RowContext }) => {
  const { item, icons } = entry;
  const { colors, checks } = context;
  const shift = checks ? 0 : menu.checkColumn;
  const color = item.destructive ? colors.destructive : colors.text;
  const submenu = item.kind === 'menu';
  return (
    <Pressable
      disabled={item.disabled}
      accessibilityRole={submenu ? 'button' : 'menuitem'}
      accessibilityLabel={item.kind === 'action' ? (item.accessibilityLabel ?? item.label) : item.label}
      accessibilityState={{ disabled: item.disabled, checked: item.kind === 'action' ? item.isOn : undefined }}
      onPress={() => (item.kind === 'action' ? context.onAction(item) : context.onSubmenu(item, entry.top))}
      style={[styles.row, { top: entry.top, height: entry.height }, item.disabled && styles.disabled]}>
      {({ pressed }) => (
        <>
          {pressed ? <View style={[styles.pressed, { backgroundColor: colors.pressed }]} /> : null}
          {checks && item.kind === 'action' && item.isOn ? (
            <MaterialSymbol
              name="check"
              size={menu.check.size}
              tintColor={color}
              style={[styles.check, { left: menu.check.centre - menu.check.size / 2 }]}
            />
          ) : null}
          {icons ? <ItemIcon item={item} color={color} left={menu.icon.centre - shift} /> : null}
          <View
            style={[
              styles.labels,
              {
                left: (icons ? menu.textAfterIcon : menu.text) - shift,
                right: submenu ? menu.chevron.right + menu.chevron.size : menu.trailing,
              },
            ]}>
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {item.label}
            </Text>
            {item.kind === 'action' && item.subtitle ? (
              <Text numberOfLines={1} style={[styles.subtitle, { color: colors.secondary }]}>
                {item.subtitle}
              </Text>
            ) : null}
          </View>
          {submenu ? (
            <MaterialSymbol
              name="chevron_right"
              size={menu.chevron.size}
              tintColor={colors.text}
              // Pointing toward the end, as iOS's does: left, right to left.
              style={[
                styles.chevron,
                { right: menu.chevron.right - menu.chevron.size / 2 + 3 },
                mirrored && styles.flipped,
              ]}
            />
          ) : null}
        </>
      )}
    </Pressable>
  );
};

const Palette = ({ entry, context }: { entry: Extract<Entry, { kind: 'palette' }>; context: RowContext }) => (
  <View style={[styles.palette, { top: entry.top }]}>
    {entry.items.map((item) => {
      const color = item.destructive ? context.colors.destructive : context.colors.text;
      return (
        <Pressable
          key={item.key}
          disabled={item.disabled}
          accessibilityRole="menuitem"
          accessibilityLabel={item.label}
          onPress={() => (item.kind === 'action' ? context.onAction(item) : undefined)}
          style={({ pressed }) => [styles.paletteItem, pressed && { backgroundColor: context.colors.pressed }]}>
          {item.md ? (
            <MaterialSymbol name={item.md} size={menu.icon.size} tintColor={color} />
          ) : item.image ? (
            <Image source={item.image} style={[styles.image, { tintColor: color }]} />
          ) : (
            <Text numberOfLines={1} style={[styles.label, { color }]}>
              {item.label}
            </Text>
          )}
        </Pressable>
      );
    })}
  </View>
);

const Entries = ({ entries, context, onHeader }: { entries: Entry[]; context: RowContext; onHeader?: () => void }) => (
  <>
    {entries.map((entry) => {
      switch (entry.kind) {
        case 'row':
          return <Row key={entry.key} entry={entry} context={context} />;
        case 'palette':
          return <Palette key={entry.key} entry={entry} context={context} />;
        case 'separator':
          return (
            <View
              key={entry.key}
              style={[styles.separator, { top: entry.top, backgroundColor: context.colors.separator }]}
            />
          );
        case 'header':
          return (
            <Text
              key={entry.key}
              numberOfLines={1}
              style={[
                styles.header,
                { top: entry.top + menu.header.top, color: context.colors.secondary },
                { left: menu.text - (context.checks ? 0 : menu.checkColumn) },
              ]}>
              {entry.title}
            </Text>
          );
        case 'submenuHeader': {
          const shift = context.checks ? 0 : menu.checkColumn;
          const icon = hasIcon(entry.item);
          return (
            <Pressable
              key={entry.key}
              accessibilityRole="button"
              accessibilityLabel={entry.item.label}
              accessibilityState={{ expanded: true }}
              onPress={onHeader}
              style={[styles.row, { top: entry.top, height: menu.row }]}>
              {icon ? <ItemIcon item={entry.item} color={context.colors.text} left={menu.icon.centre - shift} /> : null}
              <View
                style={[
                  styles.labels,
                  {
                    left: (icon ? menu.textAfterIcon : menu.text) - shift,
                    right: menu.chevron.right + menu.chevron.size,
                  },
                ]}>
                <Text numberOfLines={1} style={[styles.label, styles.bold, { color: context.colors.text }]}>
                  {entry.item.label}
                </Text>
              </View>
              <MaterialSymbol
                name="expand_more"
                size={menu.chevron.size}
                tintColor={context.colors.text}
                style={[styles.chevron, { right: menu.chevron.right - menu.chevron.size / 2 }]}
              />
            </Pressable>
          );
        }
      }
    })}
  </>
);

// ——— The glass panel ———

interface Frame {
  left: number;
  top: number;
  width: number;
  height: number;
}

const lerp = (from: number, to: number, amount: number) => {
  'worklet';
  return from + (to - from) * amount;
};

interface PanelProps {
  from: Frame;
  to: Frame;
  progress: SharedValue<number>;
  // The corner the panel grows from, so the items stay put while it opens.
  alignRight: boolean;
  alignBottom: boolean;
  contentHeight: number;
  dim?: SharedValue<number>;
  colors: Colors;
  children: ReactNode;
}

const Panel = ({ from, to, progress, alignRight, alignBottom, contentHeight, dim, colors, children }: PanelProps) => {
  const material = useGlassMaterial('regular');
  const fromRadius = Math.min(from.width, from.height) / 2;
  // Frames are measured from the screen's left; right to left, React Native lays `left` out from the right, and `right`
  // from the left.
  const side = mirrored ? 'right' : 'left';
  const frame = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      [side]: lerp(from.left, to.left, p),
      top: lerp(from.top, to.top, p),
      width: lerp(from.width, to.width, p),
      height: lerp(from.height, to.height, p),
      borderRadius: lerp(fromRadius, menu.radius, p),
    };
  });
  const glassProps = useAnimatedProps(() => ({ cornerRadius: lerp(fromRadius, menu.radius, progress.get()) }));
  const content = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.get(), [menuMotion.contentFrom, 1], [0, 1], 'clamp') *
      (dim ? lerp(1, menu.dimmed, dim.get()) : 1),
  }));
  const scrolls = contentHeight > to.height;
  return (
    <AnimatedNativeGlassView
      {...material}
      lift
      blurRadius={menu.blurRadius}
      // Frosted through: menus keep their own blur, without the bars' haze.
      haze={0}
      tint={colors.tint}
      rim={colors.rim}
      shadow={colors.shadow}
      shadowRadius={menu.shadowRadius}
      shadowOffset={menu.shadowOffset}
      shadowSpread={menu.shadowSpread}
      animatedProps={glassProps}
      style={[styles.panel, frame]}>
      <Animated.View
        style={[
          styles.content,
          { width: to.width, height: to.height },
          alignRight !== mirrored ? { right: 0 } : { left: 0 },
          alignBottom ? { bottom: 0 } : { top: 0 },
          content,
        ]}>
        <ScrollView scrollEnabled={scrolls} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={{ height: contentHeight }}>{children}</View>
        </ScrollView>
      </Animated.View>
    </AnimatedNativeGlassView>
  );
};

// ——— The open menu ———

interface Screen {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SubmenuState {
  item: SubmenuNode;
  top: number;
}

const OpenMenuView = ({
  tree,
  anchor,
  screen,
  closing,
  requestClose,
  onClosed,
}: {
  tree: MenuTree;
  anchor: Anchor;
  screen: Screen;
  closing: boolean;
  requestClose: () => void;
  // Once the close has played out.
  onClosed: () => void;
}) => {
  const { scheme, solid } = useLucentTheme();
  const colors = (solid ? menuSolidColors : menuColors)[scheme];
  const progress = useSharedValue(0);
  const subProgress = useSharedValue(0);
  const [submenu, setSubmenu] = useState<SubmenuState | null>(null);

  const { entries, height, checks } = layout(tree.children, tree.title);
  const from: Frame = {
    left: anchor.x - screen.x,
    top: anchor.y - screen.y,
    width: anchor.width,
    height: anchor.height,
  };
  // iOS opens the menu from the button's corner nearest the middle of the screen: from a top-right button, down and to
  // the left.
  const alignRight = from.left + from.width / 2 > screen.width / 2;
  const alignBottom = from.top + from.height / 2 > screen.height / 2;
  const width = Math.min(menu.width, screen.width - menu.screenMargin * 2);
  const room = alignBottom ? from.top + from.height - menu.screenMargin : screen.height - from.top - menu.screenMargin;
  const panelHeight = Math.min(height, room);
  const left = Math.min(
    Math.max(alignRight ? from.left + from.width - width : from.left, menu.screenMargin),
    screen.width - menu.screenMargin - width,
  );
  const to: Frame = {
    left,
    top: alignBottom ? from.top + from.height - panelHeight : from.top,
    width,
    height: panelHeight,
  };

  useEffect(() => {
    progress.set(withSpring(1, menuMotion.open));
  }, [progress]);

  useEffect(() => {
    if (!closing) return;
    progress.set(
      withTiming(0, { duration: menuMotion.close }, (finished) => {
        if (finished) scheduleOnRN(onClosed);
      }),
    );
  }, [closing, onClosed, progress]);

  const clearSubmenu = useCallback(() => setSubmenu(null), []);
  const closeSubmenu = useCallback(() => {
    subProgress.set(
      withTiming(0, { duration: menuMotion.close }, (finished) => {
        if (finished) scheduleOnRN(clearSubmenu);
      }),
    );
  }, [subProgress, clearSubmenu]);

  const context: RowContext = {
    colors,
    checks,
    onAction: (item) => {
      item.onPress?.();
      if (!item.keepPresented) requestClose();
    },
    onSubmenu: (item, top) => {
      setSubmenu({ item, top });
      subProgress.set(0);
      subProgress.set(withSpring(1, menuMotion.open));
    },
  };

  const sub = submenu ? layout(submenu.item.children, undefined, submenu.item) : null;
  const subFrom: Frame | null = submenu ? { left: to.left, top: to.top + submenu.top, width, height: menu.row } : null;
  const subTo: Frame | null =
    submenu && sub
      ? (() => {
          const h = Math.min(sub.height, screen.height - menu.screenMargin * 2);
          const top = Math.min(
            Math.max(to.top + submenu.top - menu.submenuLift, menu.screenMargin),
            screen.height - menu.screenMargin - h,
          );
          return { left: to.left, top, width, height: h };
        })()
      : null;

  return (
    <>
      <Panel
        from={from}
        to={to}
        progress={progress}
        alignRight={alignRight}
        alignBottom={alignBottom}
        contentHeight={height}
        dim={subProgress}
        colors={colors}>
        <Entries entries={entries} context={context} />
        {submenu ? <Pressable style={StyleSheet.absoluteFill} onPress={closeSubmenu} /> : null}
      </Panel>
      {submenu && sub && subFrom && subTo ? (
        <Panel
          key={submenu.item.key}
          from={subFrom}
          to={subTo}
          progress={subProgress}
          alignRight={false}
          alignBottom={false}
          contentHeight={sub.height}
          colors={colors}>
          <Entries entries={sub.entries} context={{ ...context, checks: sub.checks }} onHeader={closeSubmenu} />
        </Panel>
      ) : null}
    </>
  );
};

interface Presented {
  id: number;
  tree: MenuTree;
  anchor: Anchor;
}

/**
 * Where a screen's bar menus open: over everything on the screen, after its bars, so the menu's glass draws above
 * theirs. A tap outside, or Back, closes it.
 */
export const MenuHost = ({ children }: { children: ReactNode }) => {
  const [presented, setPresented] = useState<Presented | null>(null);
  const [closing, setClosing] = useState(false);
  const [screen, setScreen] = useState<Screen | null>(null);
  const overlay = useRef<ComponentRef<typeof View>>(null);
  const ids = useRef(0);

  const open = useCallback<OpenMenu>((tree, anchor) => {
    ids.current += 1;
    setClosing(false);
    setPresented({ id: ids.current, tree, anchor });
  }, []);
  const close = useCallback(() => setClosing(true), []);
  const closed = useCallback(() => {
    setPresented(null);
    setClosing(false);
  }, []);

  useBackClaim(presented != null);
  useEffect(() => {
    if (!presented) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [presented, close]);

  return (
    <MenuContext value={open}>
      {children}
      {presented ? (
        <View
          ref={overlay}
          style={styles.overlay}
          onLayout={() =>
            overlay.current?.measureInWindow((x, y, width, height) => setScreen({ x, y, width, height }))
          }>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close menu" />
          {screen ? (
            <OpenMenuView
              key={presented.id}
              tree={presented.tree}
              anchor={presented.anchor}
              screen={screen}
              closing={closing}
              requestClose={close}
              onClosed={closed}
            />
          ) : null}
        </View>
      ) : null}
    </MenuContext>
  );
};

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

const styles = StyleSheet.create({
  overlay: { ...fill, zIndex: 3, elevation: 3 },
  panel: { position: 'absolute', overflow: 'hidden' },
  content: { position: 'absolute' },
  row: { position: 'absolute', left: 0, right: 0, justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  pressed: { ...fill, marginHorizontal: menu.padding, borderRadius: menu.row / 2 },
  check: { position: 'absolute' },
  icon: { position: 'absolute' },
  image: { width: menu.icon.size, height: menu.icon.size, resizeMode: 'contain' },
  chevron: { position: 'absolute' },
  flipped: { transform: [{ scaleX: -1 }] },
  labels: { position: 'absolute', top: 0, bottom: 0, justifyContent: 'center' },
  label: { fontSize: menu.fontSize, lineHeight: menu.lineHeight, includeFontPadding: false },
  bold: { fontWeight: '600' },
  subtitle: { fontSize: menu.subtitleSize, lineHeight: menu.subtitleLineHeight - 2, includeFontPadding: false },
  separator: {
    position: 'absolute',
    left: menu.separatorInset,
    right: menu.separatorInset,
    height: StyleSheet.hairlineWidth * 2,
  },
  header: {
    position: 'absolute',
    right: menu.trailing,
    fontSize: menu.header.fontSize,
    lineHeight: menu.header.lineHeight,
    includeFontPadding: false,
  },
  palette: { position: 'absolute', left: menu.padding, right: menu.padding, height: menu.row, flexDirection: 'row' },
  paletteItem: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: menu.row / 2 },
});
