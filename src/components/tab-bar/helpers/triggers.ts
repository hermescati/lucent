import type { NativeTabsTriggerBadgeProps, NativeTabsTriggerLabelProps } from 'expo-router/native-tabs';
import { Children, isValidElement, type ReactNode } from 'react';

import type { LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from '../types';

export interface TabSpec {
  name: string;
  label: string;
  icon?: LucentNativeTabsTriggerIconProps;
  badge?: string;
  badgeColor?: string;
  hidden: boolean;
  search: boolean;
  disabled: boolean;
  disablePopToTop: boolean;
  disableScrollToTop: boolean;
  automaticallyActivatesSearch: boolean;
}

type TriggerPart = 'trigger' | 'label' | 'icon' | 'badge' | 'vectorIcon';

// The marker components render nothing; NativeTabs reads their props. They are matched by a tag, not by
// identity, because Fast Refresh recreates them while the layout's elements still point at the old ones.
export const triggerPart = <P>(part: TriggerPart) => Object.assign((_: P) => null, { lucentPart: part });

const partOf = (type: unknown): TriggerPart | undefined =>
  typeof type === 'function' ? (type as { lucentPart?: TriggerPart }).lucentPart : undefined;

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export const parseTriggers = (children: ReactNode): TabSpec[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement<LucentNativeTabTriggerProps>(child) || partOf(child.type) !== 'trigger') {
      return [];
    }
    const {
      name,
      hidden,
      disabled,
      disablePopToTop,
      disableScrollToTop,
      role,
      automaticallyActivatesSearch,
      children: content,
    } = child.props;
    if (!name) {
      return [];
    }
    const spec: TabSpec = {
      name,
      label: titleCase(name),
      hidden: hidden ?? false,
      // iOS 27 sets search apart in its own circle only while it activates its field; otherwise it is one of the tabs.
      search: role === 'search' && (automaticallyActivatesSearch ?? true),
      disabled: disabled ?? false,
      disablePopToTop: disablePopToTop ?? false,
      disableScrollToTop: disableScrollToTop ?? false,
      automaticallyActivatesSearch: automaticallyActivatesSearch ?? true,
    };
    Children.forEach(content, (part) => {
      if (!isValidElement(part)) {
        return;
      }
      const kind = partOf(part.type);
      if (kind === 'label') {
        const { children: text } = part.props as NativeTabsTriggerLabelProps;
        if (typeof text === 'string') {
          spec.label = text;
        }
      } else if (kind === 'icon') {
        spec.icon = part.props as LucentNativeTabsTriggerIconProps;
      } else if (kind === 'badge') {
        const {
          children: text,
          hidden: badgeHidden,
          selectedBackgroundColor,
        } = part.props as NativeTabsTriggerBadgeProps;
        spec.badge = badgeHidden ? undefined : (text ?? '');
        spec.badgeColor = typeof selectedBackgroundColor === 'string' ? selectedBackgroundColor : undefined;
      }
    });
    // iOS draws a magnifier for a search tab without an icon, so match it.
    if (spec.search && !spec.icon) {
      spec.icon = { md: 'search' };
    }
    return [spec];
  });

export const hrefFor = (name: string) => (name === 'index' ? './' : `./${name}`);
