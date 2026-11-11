import { ListScroll } from './List.android';
import { ListStyleContext, Section, SectionFooter, SectionHeader, sectionsOf, useListColors } from './section.android';
import type { FieldGroupProps } from './types';

/**
 * `@expo/ui`'s `FieldGroup`, drawn as SwiftUI's `Form` on iOS 27: inset grouped sections, each on a rounded card over
 * the grouped grey, with their headers and footers.
 */
export const FieldGroup = ({ children, hidden, testID, style }: FieldGroupProps) => {
  const colors = useListColors();
  if (hidden) return null;
  return (
    <ListStyleContext value="insetGrouped">
      <ListScroll background={colors.page} style={style as never} testID={testID}>
        {sectionsOf(children)}
      </ListScroll>
    </ListStyleContext>
  );
};

FieldGroup.Section = Section;
FieldGroup.SectionHeader = SectionHeader;
FieldGroup.SectionFooter = SectionFooter;
