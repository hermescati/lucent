import { NativeTabs as ExpoNativeTabs } from 'expo-router/native-tabs';
import { Children, cloneElement, createElement, isValidElement, type FC, type ReactNode } from 'react';

import { SearchHostProvider } from './search';
import { resolveTabIcon } from './svgIcon';
import type { LucentNativeTabsProps, LucentNativeTabsTriggerIconProps, LucentNativeTabTriggerProps } from './types';

const Trigger = ExpoNativeTabs.Trigger as unknown as Omit<typeof ExpoNativeTabs.Trigger, 'Icon'> &
  ((props: LucentNativeTabTriggerProps) => null) & { Icon: FC<LucentNativeTabsTriggerIconProps> };

const withSvgIcons = (content: ReactNode) =>
  Children.map(content, (part) =>
    isValidElement<LucentNativeTabsTriggerIconProps>(part) && part.type === ExpoNativeTabs.Trigger.Icon && 'svg' in part.props
      ? createElement(ExpoNativeTabs.Trigger.Icon, { key: part.key, ...resolveTabIcon(part.props) })
      : part,
  );

const withSearch = (child: React.ReactNode) => {
  if (!isValidElement<LucentNativeTabTriggerProps>(child) || child.type !== ExpoNativeTabs.Trigger) {
    return child;
  }
  const { automaticallyActivatesSearch = true, children, ...rest } = child.props;
  const props = { ...rest, children: withSvgIcons(children) };
  if (props.role !== 'search') {
    return cloneElement(child, props);
  }
  const nativeProps = props.unstable_nativeProps ?? {};
  return cloneElement(child, {
    ...props,
    unstable_nativeProps: {
      ...nativeProps,
      ios: { ...nativeProps.ios, role: 'search', automaticallyActivatesSearch },
    },
  } as LucentNativeTabTriggerProps);
};

const NativeTabsRoot = ({ children, ...props }: LucentNativeTabsProps) => (
  <SearchHostProvider>
    <ExpoNativeTabs {...props}>{Children.map(children, withSearch)}</ExpoNativeTabs>
  </SearchHostProvider>
);

export const NativeTabs = Object.assign(NativeTabsRoot, {
  Trigger,
  BottomAccessory: ExpoNativeTabs.BottomAccessory,
});
