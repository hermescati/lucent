import { FieldGroup, List, ListItem, type SwipeActions } from 'expo-lucent';
import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
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

const campaigns = [
  'Spring sale',
  'Germany offer',
  'Retargeting',
  'Brand search',
  'Newsletter',
  'Black Friday',
  'Summer push',
  'App installs',
  'Lookalikes',
  'Holiday bundle',
  'France offer',
  'Video views',
  'Lead forms',
  'Winback',
  'Cyber Monday',
  'Spain offer',
];

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

// Mail's Select: the rows take selection circles, and a tap ticks a row rather than opening it.
const Select = ({ mode }: ScreenProps) => {
  const [selecting, setSelecting] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);
  return (
    <>
      <Stack.Screen options={{ title: selection.length > 0 ? `${selection.length} selected` : mode.name }} />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          onPress={() => {
            setSelecting((now) => !now);
            setSelection([]);
          }}>
          {selecting ? 'Done' : 'Select'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <List editMode={selecting} selection={selection} onSelectionChange={setSelection}>
        <List.ForEach data={campaigns} keyExtractor={(item) => item}>
          {({ item }) => (
            <ListItem supportingText="Active" accessory="disclosure" onPress={() => {}}>
              {item}
            </ListItem>
          )}
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

// The kit's three actions a side, and two with a long label, so each swipe style can be measured against iOS: one-line
// and two-line rows, and actions without icons.
const swipeSides = (icons: boolean, few = false): SwipeActions => {
  const icon = (sf: SFSymbol, md: AndroidSymbol) => (icons ? { sf, md } : undefined);
  return few
    ? {
        leading: [
          { label: 'Read', icon: icon('envelope.open.fill', 'drafts'), tintColor: '#007AFF', onPress: () => {} },
        ],
        trailing: [
          { label: 'Delete', icon: icon('trash.fill', 'delete'), destructive: true, onPress: () => {} },
          {
            label: 'Mute notifications',
            icon: icon('bell.slash.fill', 'notifications_off'),
            tintColor: '#5856D6',
            onPress: () => {},
          },
        ],
      }
    : {
        leading: [
          { label: 'Pin', icon: icon('pin.fill', 'push_pin'), tintColor: '#8E8E93', onPress: () => {} },
          { label: 'Read', icon: icon('envelope.open.fill', 'drafts'), tintColor: '#007AFF', onPress: () => {} },
          { label: 'Done', icon: icon('checkmark', 'check'), tintColor: '#34C759', onPress: () => {} },
        ],
        trailing: [
          { label: 'Delete', icon: icon('trash.fill', 'delete'), destructive: true, onPress: () => {} },
          { label: 'Flag', icon: icon('flag.fill', 'flag'), tintColor: '#FF9500', onPress: () => {} },
          { label: 'More', icon: icon('ellipsis', 'more_horiz'), tintColor: '#8E8E93', onPress: () => {} },
        ],
      };
};

const Swipes = ({ mode }: ScreenProps) => (
  <>
    <Stack.Screen options={{ title: mode.name }} />
    <List>
      <FieldGroup.Section title="One line">
        <ListItem swipeActions={swipeSides(true)}>Spring sale</ListItem>
        <ListItem detail="Active" swipeActions={swipeSides(true, true)}>
          Germany offer
        </ListItem>
      </FieldGroup.Section>
      <FieldGroup.Section title="Two lines">
        <ListItem supportingText="Active" swipeActions={swipeSides(true)}>
          Retargeting
        </ListItem>
        <ListItem supportingText="Paused since Monday" swipeActions={swipeSides(true, true)}>
          Brand search
        </ListItem>
      </FieldGroup.Section>
      <FieldGroup.Section title="Without icons">
        <ListItem swipeActions={swipeSides(false)}>Newsletter</ListItem>
        <ListItem supportingText="Active" swipeActions={swipeSides(false, true)}>
          Black Friday
        </ListItem>
      </FieldGroup.Section>
    </List>
  </>
);

// Contacts, by first letter: each section has its letter in the list's index.
const people = [
  'Aaron Blake',
  'Abby Chen',
  'Adam Ford',
  'Alice Hart',
  'Ben Cole',
  'Bella Diaz',
  'Brian Moss',
  'Carla Reyes',
  'Chris Lane',
  'Clara Voss',
  'Dan Park',
  'Diana Ross',
  'Eli Grant',
  'Emma Stone',
  'Ethan Wu',
  'Felix Ward',
  'Fiona Bell',
  'Grace Lee',
  'Gus Mills',
  'Hana Ito',
  'Henry Shaw',
  'Ian Burke',
  'Isla Quinn',
  'Jack Price',
  'Jade Kim',
  'Kai Novak',
  'Kara Fox',
  'Leo Marsh',
  'Lily Young',
  'Mason Reed',
  'Mia Torres',
  'Nina Patel',
  'Noah Brooks',
  'Olivia Hunt',
  'Oscar Lowe',
  'Paul Stone',
  'Quinn Ellis',
  'Ruby West',
  'Ryan Hale',
  'Sara Lin',
  'Sam Ortiz',
  'Theo Grant',
  'Tina Shah',
  'Uma Rao',
  'Victor Hugo',
  'Wendy Ng',
  'Will Dunn',
  'Xena Park',
  'Yara Haddad',
  'Zane Cruz',
  'Zoe Adler',
];
const byLetter = people.reduce<Record<string, string[]>>((groups, name) => {
  (groups[name[0]] ??= []).push(name);
  return groups;
}, {});

const Contacts = ({ mode }: ScreenProps) => (
  <>
    <Stack.Screen options={{ title: mode.name }} />
    <List listStyle="plain">
      {Object.entries(byLetter).map(([letter, names]) => (
        <FieldGroup.Section key={letter} title={letter} indexLabel={letter}>
          {names.map((name) => (
            <ListItem key={name} onPress={() => {}}>
              {name}
            </ListItem>
          ))}
        </FieldGroup.Section>
      ))}
    </List>
  </>
);

// The kit's header and row options: a header with an action, a prominent one, the info accessory and action rows.
const Headers = ({ mode }: ScreenProps) => {
  const [note, setNote] = useState('Tap a row, its ⓘ or a header action');
  return (
    <>
      <Stack.Screen options={{ title: mode.name }} />
      <List>
        <FieldGroup.Section title="Account" headerAction={{ label: 'Edit', onPress: () => setNote('Edit') }}>
          <ListItem detail="ClickFlare" accessory="info" onAccessoryPress={() => setNote('Organization info')}>
            Organization
          </ListItem>
          <ListItem accessory="disclosure" onPress={() => setNote('Billing')}>
            Billing
          </ListItem>
          <FieldGroup.SectionFooter>{note}</FieldGroup.SectionFooter>
        </FieldGroup.Section>
        <FieldGroup.Section
          title="Campaigns"
          headerProminence="increased"
          headerAction={{ label: 'See All', onPress: () => setNote('See All') }}>
          <ListItem detail="Active">Spring sale</ListItem>
          <ListItem detail="Paused">Germany offer</ListItem>
        </FieldGroup.Section>
        <FieldGroup.Section>
          <ListItem button onPress={() => setNote('Add campaign')}>
            Add campaign
          </ListItem>
          <ListItem button destructive onPress={() => setNote('Delete all')}>
            Delete all
          </ListItem>
          <ListItem button disabled onPress={() => {}}>
            Export
          </ListItem>
        </FieldGroup.Section>
      </List>
    </>
  );
};

const screens: Record<string, (props: ScreenProps) => ReactNode> = {
  settings: Settings,
  picker: Picker,
  inbox: Inbox,
  swipes: Swipes,
  contacts: Contacts,
  headers: Headers,
  edit: Edit,
  select: Select,
  long: Long,
};
