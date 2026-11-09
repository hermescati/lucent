import { FieldGroup, List, ListItem } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';

import { findListMode, RowIcon, UnreadDot, type ListMode } from '@/components/lists';
import { Page, Paragraph } from '@/components/ui';

export default function ListModeScreen() {
  const { mode: slug } = useLocalSearchParams<{ mode: string }>();
  const mode = findListMode(slug);
  if (!mode) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Paragraph>There is no list called “{slug}”.</Paragraph>
      </Page>
    );
  }
  const Screen = screens[mode.slug];
  return <Screen mode={mode} />;
}

type ScreenProps = { mode: ListMode };

// iOS Settings' own: values and chevrons, a section with its own header and a footer, a disabled row and a sign out.
const Settings = ({ mode }: ScreenProps) => {
  const [timestamp, setTimestamp] = useState('Visit');
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <FieldGroup>
        <FieldGroup.Section title="Account">
          <ListItem
            leading={<RowIcon ios="building.2.fill" android="apartment" color="#007AFF" />}
            detail="ClickFlare"
            accessory="disclosure"
            onPress={() => {}}>
            Organization
          </ListItem>
          <ListItem
            leading={<RowIcon ios="square.stack.3d.up.fill" android="stacks" color="#5856D6" />}
            detail="3 selected"
            accessory="disclosure"
            onPress={() => {}}>
            Workspaces
          </ListItem>
          <ListItem
            leading={<RowIcon ios="tablecells.fill" android="table" color="#34C759" />}
            detail="Default"
            accessory="disclosure"
            onPress={() => {}}>
            Column preset
          </ListItem>
        </FieldGroup.Section>
        <FieldGroup.Section>
          <FieldGroup.SectionHeader>Reporting</FieldGroup.SectionHeader>
          <ListItem detail="Europe/Berlin" accessory="disclosure" onPress={() => {}}>
            Timezone
          </ListItem>
          <ListItem detail="EUR" accessory="disclosure" onPress={() => {}}>
            Currency
          </ListItem>
          <ListItem
            detail={timestamp}
            onPress={() => setTimestamp((now) => (now === 'Visit' ? 'Postback' : 'Visit'))}
            supportingText="Which event a conversion counts from">
            Reporting timestamp
          </ListItem>
          <ListItem detail="Pro plan" accessory="disclosure" disabled>
            Billing
          </ListItem>
          <FieldGroup.SectionFooter>Applies to every report and the dashboard.</FieldGroup.SectionFooter>
        </FieldGroup.Section>
        <FieldGroup.Section>
          <ListItem destructive onPress={() => {}}>
            Sign Out
          </ListItem>
          <FieldGroup.SectionFooter>Signed in as hermes@example.com</FieldGroup.SectionFooter>
        </FieldGroup.Section>
      </FieldGroup>
    </>
  );
};

const currencies = [
  { code: 'EUR', name: 'Euro' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'SEK', name: 'Swedish Krona' },
];

// A sheet's picker: a plain list, the chosen row ticked.
const Picker = ({ mode }: ScreenProps) => {
  const [chosen, setChosen] = useState('EUR');
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <List listStyle="plain">
        {currencies.map((currency) => (
          <ListItem
            key={currency.code}
            supportingText={currency.name}
            accessory={chosen === currency.code ? 'checkmark' : undefined}
            onPress={() => setChosen(currency.code)}>
            {currency.code}
          </ListItem>
        ))}
      </List>
    </>
  );
};

interface Message {
  id: string;
  title: string;
  body: string;
  read: boolean;
}

const startMessages: Message[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i),
  title: ['Campaign paused', 'Budget reached', 'New conversion', 'Weekly report'][i % 4],
  body: ['Spend hit its daily cap', 'ROI dropped below 20%', 'From the Germany offer', 'Your summary is ready'][i % 4],
  read: i % 3 === 0,
}));

// An inbox: rows that swipe to mark read or archive, and a pull to refresh that brings a new one in.
const Inbox = ({ mode }: ScreenProps) => {
  const [messages, setMessages] = useState(startMessages);
  const refresh = useCallback(async () => {
    await new Promise((done) => setTimeout(done, 1200));
    setMessages((now) => [{ id: `new-${Date.now()}`, title: 'New conversion', body: 'Just now', read: false }, ...now]);
  }, []);
  const toggleRead = (id: string) =>
    setMessages((now) => now.map((message) => (message.id === id ? { ...message, read: !message.read } : message)));
  const archive = (id: string) => setMessages((now) => now.filter((message) => message.id !== id));
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <List onRefresh={refresh}>
        {messages.map((message) => (
          <ListItem
            key={message.id}
            supportingText={message.body}
            trailing={message.read ? undefined : <UnreadDot />}
            onPress={() => toggleRead(message.id)}
            swipeActions={{
              leading: [
                {
                  label: message.read ? 'Unread' : 'Read',
                  icon: { sf: message.read ? 'envelope.badge.fill' : 'envelope.open.fill', md: 'mark_email_read' },
                  tintColor: '#007AFF',
                  onPress: () => toggleRead(message.id),
                },
              ],
              trailing: [
                {
                  label: 'Archive',
                  icon: { sf: 'archivebox.fill', md: 'archive' },
                  destructive: true,
                  onPress: () => archive(message.id),
                },
                {
                  label: 'Flag',
                  icon: { sf: 'flag.fill', md: 'flag' },
                  tintColor: '#FF9500',
                  onPress: () => {},
                },
              ],
            }}>
            {message.title}
          </ListItem>
        ))}
      </List>
    </>
  );
};

const campaigns = ['Spring sale', 'Germany offer', 'Retargeting', 'Brand search', 'Newsletter', 'Black Friday'];

// SwiftUI's `move(fromOffsets:toOffset:)`: the destination counts places before the moved rows are taken out.
const moved = <T,>(items: T[], from: number[], to: number) => {
  const taking = items.filter((_, index) => from.includes(index));
  const before = items.slice(0, to).filter((_, index) => !from.includes(index));
  const after = items.slice(to).filter((_, index) => !from.includes(index + to));
  return [...before, ...taking, ...after];
};

// Mail's or Reminders' edit mode: Edit in the bar puts the rows in edit mode, each with a delete control and a reorder
// handle; out of it, a row swipes to delete.
const Edit = ({ mode }: ScreenProps) => {
  const [editing, setEditing] = useState(false);
  const [items, setItems] = useState(campaigns);
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={() => setEditing((now) => !now)}>
          {editing ? 'Done' : 'Edit'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <List editMode={editing}>
        <List.ForEach
          data={items}
          keyExtractor={(item) => item}
          onDelete={(indices) => setItems((now) => now.filter((_, index) => !indices.includes(index)))}
          onMove={(from, to) => setItems((now) => moved(now, from, to))}>
          {({ item }) => <ListItem supportingText="Active">{item}</ListItem>}
        </List.ForEach>
      </List>
    </>
  );
};

const zones = Array.from({ length: 400 }, (_, i) => ({ id: String(i), name: `Zone ${i + 1}`, offset: (i % 27) - 12 }));

// A long list, as a timezone picker is: rows rendered as they scroll in.
const Long = ({ mode }: ScreenProps) => {
  const [chosen, setChosen] = useState('0');
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <List listStyle="plain">
        <List.ForEach data={zones} keyExtractor={(zone) => zone.id}>
          {({ item }) => (
            <ListItem
              supportingText={`UTC${item.offset >= 0 ? '+' : ''}${item.offset}`}
              accessory={chosen === item.id ? 'checkmark' : undefined}
              onPress={() => setChosen(item.id)}>
              {item.name}
            </ListItem>
          )}
        </List.ForEach>
      </List>
    </>
  );
};

const screens: Record<string, (props: ScreenProps) => ReactNode> = {
  settings: Settings,
  picker: Picker,
  inbox: Inbox,
  edit: Edit,
  long: Long,
};
