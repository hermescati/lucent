import { Button, Host, Menu, VStack } from '@expo/ui/swift-ui';
import { buttonStyle } from '@expo/ui/swift-ui/modifiers';

import type { Comparison } from '../types';

const none = () => {};

const Items = () => (
  <>
    <Button label="Copy" systemImage="doc.on.doc" onPress={none} />
    <Button label="Share" systemImage="square.and.arrow.up" onPress={none} />
    <Button label="Delete" systemImage="trash" role="destructive" onPress={none} />
  </>
);

// A menu's button, closed, in each style it takes; opened menus need a tap, so they aren't captured.
const Buttons = () => (
  <Host matchContents>
    <VStack spacing={16} alignment="leading">
      <Menu label="Options" systemImage="ellipsis.circle">
        <Items />
      </Menu>
      {(['bordered', 'borderedProminent', 'glass', 'glassProminent'] as const).map((style) => (
        <Menu key={style} label="Options" systemImage="ellipsis.circle" modifiers={[buttonStyle(style)]}>
          <Items />
        </Menu>
      ))}
    </VStack>
  </Host>
);

export default { slug: 'menu', pages: [Buttons], reference: true } satisfies Comparison;
