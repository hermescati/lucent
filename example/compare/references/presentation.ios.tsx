import { Alert, BottomSheet, Button, ConfirmationDialog, Host, Popover, Text, VStack } from '@expo/ui/swift-ui';
import { padding } from '@expo/ui/swift-ui/modifiers';

import type { Comparison } from '../types';
import { usePresentedForCapture } from '../useCompareDriver';

const none = () => {};

const Trigger = ({ label }: { label: string }) => <Button label={label} onPress={none} />;

// Each one is shown open, so the capture has the presented view, and closed before the next page.
const AlertPage = () => {
  const [presented, setPresented] = usePresentedForCapture();
  return (
    <Host matchContents>
      <Alert title="Delete this photo?" isPresented={presented} onIsPresentedChange={setPresented}>
        <Alert.Trigger>
          <Trigger label="Alert" />
        </Alert.Trigger>
        <Alert.Actions>
          <Button label="Cancel" role="cancel" onPress={none} />
          <Button label="Delete" role="destructive" onPress={none} />
        </Alert.Actions>
        <Alert.Message>
          <Text>This photo will be deleted from all your devices.</Text>
        </Alert.Message>
      </Alert>
    </Host>
  );
};

const DialogPage = () => {
  const [presented, setPresented] = usePresentedForCapture();
  return (
    <Host matchContents>
      <ConfirmationDialog
        title="Delete this photo?"
        titleVisibility="visible"
        isPresented={presented}
        onIsPresentedChange={setPresented}>
        <ConfirmationDialog.Trigger>
          <Trigger label="Confirmation dialog" />
        </ConfirmationDialog.Trigger>
        <ConfirmationDialog.Actions>
          <Button label="Delete Photo" role="destructive" onPress={none} />
          <Button label="Cancel" role="cancel" onPress={none} />
        </ConfirmationDialog.Actions>
        <ConfirmationDialog.Message>
          <Text>This photo will be deleted from all your devices.</Text>
        </ConfirmationDialog.Message>
      </ConfirmationDialog>
    </Host>
  );
};

const SheetPage = () => {
  const [presented, setPresented] = usePresentedForCapture();
  return (
    <Host matchContents>
      <BottomSheet
        isPresented={presented}
        onIsPresentedChange={setPresented}
        fitToContents
        anchor={<Trigger label="Sheet" />}>
        <VStack spacing={12} modifiers={[padding({ all: 24 })]}>
          <Text>A sheet sized to its content</Text>
          <Button label="Done" onPress={none} />
        </VStack>
      </BottomSheet>
    </Host>
  );
};

const PopoverPage = () => {
  const [presented, setPresented] = usePresentedForCapture();
  return (
    <Host matchContents>
      <Popover isPresented={presented} onIsPresentedChange={setPresented} arrowEdge="top">
        <Popover.Trigger>
          <Trigger label="Popover" />
        </Popover.Trigger>
        <Popover.Content>
          <Text modifiers={[padding({ all: 16 })]}>Popover content</Text>
        </Popover.Content>
      </Popover>
    </Host>
  );
};

export default {
  slug: 'presentation',
  pages: [AlertPage, DialogPage, SheetPage, PopoverPage],
  reference: true,
} satisfies Comparison;
