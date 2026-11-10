import { FieldGroup as UniversalFieldGroup, Host } from '@expo/ui';
import { Text } from '@expo/ui/swift-ui';
import { sectionIndexLabel } from '@expo/ui/swift-ui/modifiers';
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

// Its index label as SwiftUI's `sectionIndexLabel`, which iOS 26 draws the list's index from.
const Section = ({ children, indexLabel, modifiers, ...props }: FieldSectionProps) => (
  <UniversalSection
    {...props}
    modifiers={indexLabel !== undefined ? [sectionIndexLabel(indexLabel), ...(modifiers ?? [])] : modifiers}>
    {wrapped(children)}
  </UniversalSection>
);

FieldGroup.Section = Section;
FieldGroup.SectionHeader = SectionHeader;
FieldGroup.SectionFooter = SectionFooter;

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
