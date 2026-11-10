import { ListItem as UniversalListItem } from '@expo/ui';
import { Button, HStack, Image, RNHostView, Spacer, SwipeActions, Text, VStack } from '@expo/ui/swift-ui';
import {
  accessibilityAddTraits,
  buttonStyle,
  contentShape,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  onTapGesture,
  shapes,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { Children, isValidElement, useContext, type ReactElement, type ReactNode } from 'react';
import { PlatformColor } from 'react-native';

import { ListSelectingContext } from './selectable';
import type { ListItemProps, SwipeAction } from './types';

// A `<ListItem.Trailing>` among the children: taken out, so the row's own trailing content (detail, accessory) can go
// after it.
const trailingSlot = (children: ReactNode) => {
  let slot: ReactNode = undefined;
  const rest = Children.toArray(children).filter((child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === UniversalListItem.Trailing) {
      slot = child.props.children;
      return false;
    }
    return true;
  });
  return { slot, rest };
};

const actionButton = (action: SwipeAction, index: number) => (
  <Button
    key={`${action.label}-${index}`}
    label={action.label}
    systemImage={action.icon?.sf}
    role={action.destructive ? 'destructive' : undefined}
    onPress={action.onPress}
    modifiers={action.tintColor ? [tint(action.tintColor as string)] : []}
  />
);

/**
 * `@expo/ui`'s `ListItem`, with Lucent's `detail`, `accessory`, `destructive` and `swipeActions` drawn as iOS draws them:
 * the value in secondary text and the chevron or checkmark after any trailing content, the headline in red, and
 * SwiftUI's own swipe actions.
 */
export const ListItem = ({
  children,
  trailing,
  detail,
  accessory,
  destructive = false,
  supportingText,
  swipeActions,
  disabled = false,
  button = false,
  onAccessoryPress,
  modifiers,
  ...props
}: ListItemProps) => {
  const { slot, rest } = trailingSlot(children);
  // SwiftUI draws text only in a `Text`: a bare string in its stack would crash it. A React Native view has no size of
  // its own there and would stretch across the row, so it's hosted at its laid-out size, as `@expo/ui`'s row does.
  const given = slot ?? trailing;
  const own =
    typeof given === 'string' || typeof given === 'number' ? (
      <Text>{given}</Text>
    ) : isValidElement(given) ? (
      <RNHostView matchContents>{given}</RNHostView>
    ) : (
      given
    );
  const end =
    own != null || detail != null || accessory ? (
      <HStack spacing={6}>
        {own}
        {detail != null ? <Text modifiers={[foregroundStyle(PlatformColor('secondaryLabel'))]}>{detail}</Text> : null}
        {accessory === 'disclosure' ? (
          <Image
            systemName="chevron.right"
            modifiers={[
              font({ textStyle: 'footnote', weight: 'semibold' }),
              foregroundStyle(PlatformColor('tertiaryLabel')),
            ]}
          />
        ) : accessory === 'checkmark' ? (
          <Image
            systemName="checkmark"
            modifiers={[font({ textStyle: 'body', weight: 'semibold' }), foregroundStyle(PlatformColor('tintColor'))]}
          />
        ) : accessory === 'info' ? (
          // UIKit's detail button: a tap on it answers apart from the row's.
          <Button onPress={onAccessoryPress} modifiers={[buttonStyle('borderless')]}>
            <Image systemName="info.circle" modifiers={[foregroundStyle(PlatformColor('tintColor'))]} />
          </Button>
        ) : null}
      </HStack>
    ) : undefined;
  const headline = destructive
    ? Children.map(rest, (child) =>
        typeof child === 'string' || typeof child === 'number' ? (
          <Text modifiers={[foregroundStyle(PlatformColor('systemRed'))]}>{child}</Text>
        ) : (
          child
        ),
      )
    : rest;
  // A second line given as a string, in iOS's secondary grey at subheadline size: `@expo/ui` names the grey in a way its
  // native side doesn't read, and draws it black.
  const supporting =
    typeof supportingText === 'string' ? (
      <Text modifiers={[font({ textStyle: 'subheadline' }), foregroundStyle(PlatformColor('secondaryLabel'))]}>
        {supportingText}
      </Text>
    ) : (
      supportingText
    );
  const ownModifiers = [
    // The ticked choice reads as selected, as a checkmarked cell does with VoiceOver.
    ...(accessory === 'checkmark' ? [accessibilityAddTraits(['isSelected'])] : []),
    ...(modifiers ?? []),
  ];
  // An action row is a SwiftUI button as it draws in a list, its headline in the accent colour.
  const rowModifiers = [
    ...(disabled ? [disabledModifier(true)] : []),
    ...(button ? [buttonStyle('automatic')] : []),
    ...ownModifiers,
  ];
  // In a list that selects, the row is no button, laid out as `@expo/ui`'s row lays it out, and drawn the same selecting
  // or not, so SwiftUI moves it into edit mode rather than fading it into another row. A tap presses it; selecting,
  // it's off, so the list takes the tap and ticks it, animated as its own selection is.
  const selecting = useContext(ListSelectingContext);
  if (selecting !== null) {
    const leadingSlot = Children.toArray(headline).find(
      (child) => isValidElement(child) && child.type === UniversalListItem.Leading,
    ) as ReactElement<{ children?: ReactNode }> | undefined;
    const title = Children.toArray(headline).filter(
      (child) => !(isValidElement(child) && child.type === UniversalListItem.Leading),
    );
    const lead = leadingSlot?.props.children ?? props.leading;
    return (
      <HStack
        spacing={12}
        modifiers={[
          contentShape(shapes.rectangle()),
          onTapGesture(() => props.onPress?.()),
          disabledModifier(disabled || selecting),
          ...ownModifiers,
        ]}>
        {isValidElement(lead) ? <RNHostView matchContents>{lead}</RNHostView> : null}
        <VStack alignment="leading" spacing={2}>
          {title.map((child, index) =>
            typeof child === 'string' || typeof child === 'number' ? <Text key={index}>{child}</Text> : child,
          )}
          {supporting}
        </VStack>
        <Spacer />
        {end}
      </HStack>
    );
  }
  const row = (
    <UniversalListItem {...props} supportingText={supporting} trailing={end} modifiers={rowModifiers}>
      {headline}
    </UniversalListItem>
  );
  if (!swipeActions?.leading?.length && !swipeActions?.trailing?.length) return row;
  const full = swipeActions.allowsFullSwipe ?? true;
  return (
    <SwipeActions>
      {row}
      {swipeActions.leading?.length ? (
        <SwipeActions.Actions edge="leading" allowsFullSwipe={full}>
          {swipeActions.leading.map(actionButton)}
        </SwipeActions.Actions>
      ) : null}
      {swipeActions.trailing?.length ? (
        <SwipeActions.Actions edge="trailing" allowsFullSwipe={full}>
          {swipeActions.trailing.map(actionButton)}
        </SwipeActions.Actions>
      ) : null}
    </SwipeActions>
  );
};

ListItem.Leading = UniversalListItem.Leading;
ListItem.Trailing = UniversalListItem.Trailing;
ListItem.Supporting = UniversalListItem.Supporting;
