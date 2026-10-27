import type {
  NativeTabsTriggerBadgeProps,
  NativeTabsTriggerIconProps,
  NativeTabsTriggerLabelProps,
} from 'expo-router/native-tabs';
import { Children, isValidElement, type ComponentType, type ReactNode } from 'react';

import { resolveTabIcon } from './svgIcon';
import type { LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from './types';

export interface TabSpec {
  name: string;
  label: string;
  icon?: NativeTabsTriggerIconProps;
  badge?: string;
  badgeColor?: string;
  hidden: boolean;
  search: boolean;
  disabled: boolean;
  disablePopToTop: boolean;
  disableScrollToTop: boolean;
  automaticallyActivatesSearch: boolean;
}

interface TriggerParts {
  Trigger: ComponentType<LucentNativeTabTriggerProps>;
  Label: ComponentType<NativeTabsTriggerLabelProps>;
  Icon: ComponentType<LucentNativeTabsTriggerIconProps>;
  Badge: ComponentType<NativeTabsTriggerBadgeProps>;
}

const titleCase = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export const parseTriggers = (children: ReactNode, parts: TriggerParts): TabSpec[] =>
  Children.toArray(children).flatMap((child) => {
    if (!isValidElement<LucentNativeTabTriggerProps>(child) || child.type !== parts.Trigger) {
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
      search: role === 'search',
      disabled: disabled ?? false,
      disablePopToTop: disablePopToTop ?? false,
      disableScrollToTop: disableScrollToTop ?? false,
      automaticallyActivatesSearch: automaticallyActivatesSearch ?? true,
    };
    Children.forEach(content, (part) => {
      if (!isValidElement(part)) {
        return;
      }
      if (part.type === parts.Label) {
        const { children: text } = part.props as NativeTabsTriggerLabelProps;
        if (typeof text === 'string') {
          spec.label = text;
        }
      } else if (part.type === parts.Icon) {
        spec.icon = resolveTabIcon(part.props as LucentNativeTabsTriggerIconProps);
      } else if (part.type === parts.Badge) {
        const {
          children: text,
          hidden: badgeHidden,
          selectedBackgroundColor,
        } = part.props as NativeTabsTriggerBadgeProps;
        spec.badge = badgeHidden ? undefined : (text ?? '');
        spec.badgeColor = typeof selectedBackgroundColor === 'string' ? selectedBackgroundColor : undefined;
      }
    });
    return [spec];
  });

export const hrefFor = (name: string) => (name === 'index' ? './' : `./${name}`);
