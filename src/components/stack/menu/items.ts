import type { AndroidSymbol } from 'expo-symbols';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { ToolbarIcon, ToolbarLabel, ToolbarMenu, ToolbarMenuAction } from '../toolbar/parts.android';
import type { LucentToolbarIconProps, LucentToolbarMenuActionProps, LucentToolbarMenuProps } from '../types';

export interface MenuIcon {
  md?: AndroidSymbol;
  image?: ImageSourcePropType;
}

export interface MenuActionNode extends MenuIcon {
  kind: 'action';
  key: string;
  label: string;
  subtitle?: string;
  isOn?: boolean;
  destructive: boolean;
  disabled: boolean;
  keepPresented: boolean;
  accessibilityLabel?: string;
  onPress?: () => void;
}

export interface SubmenuNode extends MenuIcon {
  kind: 'menu';
  key: string;
  label: string;
  // Inline: its items show in the menu as a section of their own. Palette: in one row of icons.
  inline: boolean;
  palette: boolean;
  destructive: boolean;
  disabled: boolean;
  children: MenuNode[];
}

export type MenuNode = MenuActionNode | SubmenuNode;

/** A menu as the bar opens it: its title and its items. */
export interface MenuTree {
  title?: string;
  children: MenuNode[];
}

const text = (node: ReactNode) =>
  Children.toArray(node)
    .filter((part) => typeof part === 'string' || typeof part === 'number')
    .join('');

let warnedSf = false;

// The label and icon from the item's props, or from Stack.Toolbar.Label and Stack.Toolbar.Icon children.
const labelAndIcon = (props: {
  children?: ReactNode;
  icon?: unknown;
  md?: AndroidSymbol;
}): { label: string; md?: AndroidSymbol; image?: ImageSourcePropType } => {
  const parts = Children.toArray(props.children).filter(isValidElement) as ReactElement<Record<string, unknown>>[];
  const labelPart = parts.find((part) => part.type === ToolbarLabel);
  const iconPart = parts.find((part) => part.type === ToolbarIcon)?.props as LucentToolbarIconProps | undefined;
  const label = text(props.children) || (labelPart ? text(labelPart.props.children as ReactNode) : '');
  const md = props.md ?? (iconPart && 'md' in iconPart ? iconPart.md : undefined);
  const image = (
    typeof props.icon === 'object' && props.icon !== null
      ? props.icon
      : iconPart && 'src' in iconPart
        ? iconPart.src
        : undefined
  ) as ImageSourcePropType | undefined;
  if (__DEV__ && !warnedSf && !md && !image && (typeof props.icon === 'string' || (iconPart && 'sf' in iconPart))) {
    warnedSf = true;
    console.warn('Stack.Toolbar.MenuAction: SF Symbols only draw on iOS. Add `md` with a Material Symbol for Android.');
  }
  return { label, md, image };
};

const toNodes = (children: ReactNode): MenuNode[] =>
  Children.toArray(children).flatMap((child, index): MenuNode[] => {
    if (!isValidElement(child)) return [];
    const key = String(child.key ?? index);
    if (child.type === ToolbarMenuAction) {
      const props = child.props as LucentToolbarMenuActionProps;
      if (props.hidden) return [];
      const { label, md, image } = labelAndIcon(props);
      return [
        {
          kind: 'action',
          key,
          label,
          md,
          image,
          subtitle: props.subtitle,
          isOn: props.isOn,
          destructive: Boolean(props.destructive),
          disabled: Boolean(props.disabled),
          keepPresented: Boolean(props.unstable_keepPresented),
          accessibilityLabel: props.discoverabilityLabel,
          onPress: props.onPress,
        },
      ];
    }
    if (child.type === ToolbarMenu) {
      const props = child.props as LucentToolbarMenuProps;
      if (props.hidden) return [];
      const { label, md, image } = labelAndIcon(props);
      return [
        {
          kind: 'menu',
          key,
          label: props.title ?? label,
          md,
          image,
          inline: Boolean(props.inline),
          palette: Boolean(props.palette),
          destructive: Boolean(props.destructive),
          disabled: Boolean(props.disabled),
          children: toNodes(props.children),
        },
      ];
    }
    return [];
  });

export const menuTree = (props: LucentToolbarMenuProps): MenuTree => ({
  title: props.title,
  children: toNodes(props.children),
});

export interface Section {
  key: string;
  title?: string;
  palette: boolean;
  items: MenuNode[];
}

/**
 * The menu's sections, as iOS draws them: neighbouring items share one, and each inline or palette submenu is one of
 * its own, under its title.
 */
export const toSections = (nodes: MenuNode[]): Section[] => {
  const sections: Section[] = [];
  let current: MenuNode[] = [];
  const close = () => {
    if (current.length) sections.push({ key: `s${sections.length}`, palette: false, items: current });
    current = [];
  };
  for (const node of nodes) {
    if (node.kind === 'menu' && (node.inline || node.palette)) {
      close();
      sections.push({
        key: node.key,
        title: node.label || undefined,
        palette: node.palette,
        items: node.children,
      });
    } else {
      current.push(node);
    }
  }
  close();
  return sections;
};

/** Whether anything in the sections has a checkmark, so the menu keeps a column for them. */
export const hasChecks = (sections: Section[]) =>
  sections.some((section) => section.items.some((item) => item.kind === 'action' && item.isOn !== undefined));
