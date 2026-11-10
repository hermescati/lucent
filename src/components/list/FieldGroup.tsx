import { FieldGroup as UniversalFieldGroup, Host } from '@expo/ui';
import { Button, HStack, Section as SwiftSection, Spacer, Text } from '@expo/ui/swift-ui';
import { headerProminence as prominence, sectionIndexLabel } from '@expo/ui/swift-ui/modifiers';
import { Children, cloneElement, isValidElement, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { FieldGroupProps, FieldSectionProps } from './types';

const { Section: UniversalSection, SectionHeader, SectionFooter } = UniversalFieldGroup;

/** SwiftUI's `Form`, hosted for the screen: it fills its room and scrolls itself, under the bars. */
export const FieldGroup = ({ style, ...props }: FieldGroupProps) => (
  <Host style={styles.fill}>
    <UniversalFieldGroup {...props} style={style} />
  </Host>
);

// A header or footer given as a string goes into a SwiftUI `Text`: SwiftUI draws text only in one, and a bare string in
// the section's slot would crash it.
const wrapped = (children: ReactNode): ReactNode =>
  Children.map(children, (child) => {
    if (!isValidElement<{ children?: ReactNode }>(child)) return child;
    if (child.type !== SectionHeader && child.type !== SectionFooter) return child;
    const inner = child.props.children;
    return typeof inner === 'string' || typeof inner === 'number'
      ? cloneElement(child, { children: <Text>{inner}</Text> })
      : child;
  });

// A section's header and footer slots, apart from its rows.
const slotsOf = (children: ReactNode) => {
  let header: ReactNode = undefined;
  let footer: ReactNode = undefined;
  const rows: ReactNode[] = [];
  Children.forEach(wrapped(children), (child) => {
    if (isValidElement<{ children?: ReactNode }>(child) && child.type === SectionHeader) header = child.props.children;
    else if (isValidElement<{ children?: ReactNode }>(child) && child.type === SectionFooter)
      footer = child.props.children;
    else rows.push(child);
  });
  return { header, footer, rows };
};

/**
 * `@expo/ui`'s section, with Lucent's: its index label as SwiftUI's `sectionIndexLabel` (iOS 26 draws the list's index
 * from them), its header's prominence as SwiftUI's `headerProminence`, and an action at the header's end.
 */
const Section = ({
  children,
  indexLabel,
  headerProminence,
  headerAction,
  modifiers,
  title,
  ...props
}: FieldSectionProps) => {
  const own = [
    ...(indexLabel !== undefined ? [sectionIndexLabel(indexLabel)] : []),
    ...(headerProminence ? [prominence(headerProminence)] : []),
    ...(modifiers ?? []),
  ];
  if (!headerAction)
    return (
      <UniversalSection {...props} title={title} modifiers={own.length > 0 ? own : undefined}>
        {wrapped(children)}
      </UniversalSection>
    );
  const slots = slotsOf(children);
  const heading = slots.header ?? (title !== undefined ? <Text>{title}</Text> : undefined);
  const header = headerAction ? (
    <HStack>
      {heading}
      <Spacer />
      <Button label={headerAction.label} onPress={headerAction.onPress} />
    </HStack>
  ) : (
    heading
  );
  return (
    <SwiftSection header={header} footer={slots.footer} modifiers={own}>
      {slots.rows}
    </SwiftSection>
  );
};

FieldGroup.Section = Section;
FieldGroup.SectionHeader = SectionHeader;
FieldGroup.SectionFooter = SectionFooter;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
