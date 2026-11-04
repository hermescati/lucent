import { Stack } from 'expo-lucent/navigation';
import { useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Filler, ModeDetails } from '@/components/navigation-bar';
import { findToolbarMode, type ToolbarMode } from '@/components/toolbar';
import { Choice, Page, Paragraph, Section, usePalette } from '@/components/ui';

export default function ToolbarModeScreen() {
  const { mode: slug } = useLocalSearchParams<{ mode: string }>();
  const mode = findToolbarMode(slug);
  if (!mode) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Paragraph>There is no toolbar story called “{slug}”.</Paragraph>
      </Page>
    );
  }
  const Screen = screens[mode.slug];
  return Screen ? <Screen mode={mode} /> : null;
}

type ScreenProps = { mode: ToolbarMode };

/** The controls, then the details, then rows to scroll under the toolbar. */
const Body = ({ mode, title, children }: ScreenProps & { title: string; children?: ReactNode }) => (
  <Page>
    <Stack.Screen options={{ title, headerLargeTitle: false }} />
    {children}
    <ModeDetails mode={mode} />
    <Filler />
  </Page>
);

const Icons = ({ mode }: ScreenProps) => {
  const palette = usePalette();
  const [note, setNote] = useState('');
  return (
    <Body mode={mode} title="Inbox">
      <Stack.Toolbar>
        <Stack.Toolbar.Menu icon="line.3.horizontal.decrease" md="filter_list" accessibilityLabel="Filter">
          <Stack.Toolbar.MenuAction icon="tray" md="inbox" subtitle="12 messages" onPress={() => {}}>
            All mail
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="envelope.badge" md="mark_email_unread" onPress={() => {}}>
            Unread
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="flag" md="flag" disabled onPress={() => {}}>
            Flagged
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={() => {}} />
        <Stack.Toolbar.Button icon="trash" md="delete" accessibilityLabel="Delete" onPress={() => {}} />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          md="edit_square"
          accessibilityLabel="Compose"
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="Keyboard">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Type to bring up the keyboard"
          placeholderTextColor={palette.secondary}
          style={[styles.input, { color: palette.text }]}
        />
      </Section>
    </Body>
  );
};

const TextButtons = ({ mode }: ScreenProps) => (
  <Body mode={mode} title="Inbox">
    <Stack.Toolbar>
      <Stack.Toolbar.Button onPress={() => {}}>Mark All</Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button onPress={() => {}}>Move</Stack.Toolbar.Button>
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button onPress={() => {}}>Trash</Stack.Toolbar.Button>
    </Stack.Toolbar>
  </Body>
);

const Prominent = ({ mode }: ScreenProps) => (
  <Body mode={mode} title="Today">
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="calendar" md="calendar_today" accessibilityLabel="Calendars" onPress={() => {}} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="plus" md="add" variant="prominent" accessibilityLabel="New" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const States = ({ mode }: ScreenProps) => {
  const [selected, setSelected] = useState(false);
  return (
    <Body mode={mode} title="Select Items">
      <Stack.Toolbar>
        <Stack.Toolbar.Button
          icon="square.and.arrow.up"
          md="share"
          accessibilityLabel="Share"
          disabled={!selected}
          onPress={() => {}}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="heart"
          md="favorite"
          accessibilityLabel="Favourite"
          hidden={!selected}
          onPress={() => {}}
        />
        <Stack.Toolbar.Button
          icon="trash"
          md="delete"
          accessibilityLabel="Delete"
          disabled={!selected}
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="Selection">
        <Choice
          labels={['Nothing', 'A photo']}
          selectedIndex={selected ? 1 : 0}
          onSelect={(index) => setSelected(index === 1)}
        />
      </Section>
    </Body>
  );
};

const Status = ({ mode }: ScreenProps) => {
  const palette = usePalette();
  return (
    <Body mode={mode} title="Inbox">
      <Stack.Toolbar>
        <Stack.Toolbar.Button
          icon="line.3.horizontal.decrease"
          md="filter_list"
          accessibilityLabel="Filter"
          onPress={() => {}}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.View hidesSharedBackground>
          <View style={styles.statusBox}>
            <Text style={[styles.status, { color: palette.text }]}>Updated Just Now</Text>
          </View>
        </Stack.Toolbar.View>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          md="edit_square"
          accessibilityLabel="Compose"
          onPress={() => {}}
        />
      </Stack.Toolbar>
    </Body>
  );
};

const Spacing = ({ mode }: ScreenProps) => (
  <Body mode={mode} title="Photo">
    <Stack.Toolbar>
      <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={() => {}} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="heart" md="favorite" accessibilityLabel="Favourite" onPress={() => {}} />
      <Stack.Toolbar.Spacer width={16} />
      <Stack.Toolbar.Button icon="info.circle" md="info" accessibilityLabel="Info" onPress={() => {}} />
      <Stack.Toolbar.Button icon="slider.horizontal.3" md="tune" accessibilityLabel="Adjust" onPress={() => {}} />
      <Stack.Toolbar.Spacer />
      <Stack.Toolbar.Button icon="trash" md="delete" accessibilityLabel="Delete" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const Search = ({ mode }: ScreenProps) => (
  <Body mode={mode} title="Notes">
    <Stack.SearchBar placeholder="Search" />
    <Stack.Toolbar>
      <Stack.Toolbar.Button
        icon="line.3.horizontal.decrease"
        md="filter_list"
        accessibilityLabel="Filter"
        onPress={() => {}}
      />
      <Stack.Toolbar.SearchBarSlot />
      <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" accessibilityLabel="Compose" onPress={() => {}} />
    </Stack.Toolbar>
  </Body>
);

const screens: Record<string, (props: ScreenProps) => ReactNode> = {
  icons: Icons,
  text: TextButtons,
  prominent: Prominent,
  states: States,
  status: Status,
  spacing: Spacing,
  search: Search,
};

const styles = StyleSheet.create({
  input: { fontSize: 17, paddingHorizontal: 16, paddingVertical: 11 },
  status: { fontSize: 13 },
  statusBox: { width: 160, height: 44, alignItems: 'center', justifyContent: 'center' },
});
