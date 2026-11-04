import { Stack } from 'expo-lucent/navigation';
import { useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Code, Page, Paragraph, Row, Section, usePalette } from '@/components/ui';

const rows = Array.from({ length: 12 }, (_, index) => `Message ${index + 1}`);

export default function ToolbarScreen() {
  const palette = usePalette();
  const [note, setNote] = useState('');
  const [sort, setSort] = useState<'date' | 'name'>('date');
  const [pinned, setPinned] = useState(false);

  return (
    <Page>
      <Stack.Screen options={{ title: 'Toolbar' }} />
      {/* Beside a bottom toolbar without a slot for it, iOS puts the search bar in the navigation bar. */}
      <Stack.SearchBar placeholder="Search messages" />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis" md="more_horiz" accessibilityLabel="More">
          <Stack.Toolbar.MenuAction icon="doc.on.doc" md="content_copy" onPress={() => {}}>
            Copy
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="pin" md="keep" isOn={pinned} onPress={() => setPinned(!pinned)}>
            Pin
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline title="Sort by">
            <Stack.Toolbar.MenuAction isOn={sort === 'date'} onPress={() => setSort('date')}>
              Date
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction isOn={sort === 'name'} onPress={() => setSort('name')}>
              Name
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu title="Move to" icon="folder" md="folder">
            <Stack.Toolbar.MenuAction onPress={() => {}}>Archive</Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction onPress={() => {}}>Drafts</Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.MenuAction icon="trash" md="delete" destructive onPress={() => {}}>
            Delete
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
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
      <Paragraph>
        A page's Stack.Toolbar with no placement is the bottom toolbar. It floats above the tab bar, and rises with the
        keyboard.
      </Paragraph>

      <Section title="Keyboard">
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Type to bring up the keyboard"
          placeholderTextColor={palette.secondary}
          style={[styles.input, { color: palette.text }]}
        />
      </Section>

      <Section title="Scroll under it">
        {rows.map((row, index) => (
          <Row key={row} label={row} last={index === rows.length - 1} />
        ))}
      </Section>

      <Code>
        {`<Stack.Toolbar>
  <Stack.Toolbar.Button icon="line.3.horizontal.decrease" md="filter_list" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" />
  <Stack.Toolbar.Button icon="trash" md="delete" />
  <Stack.Toolbar.Spacer />
  <Stack.Toolbar.Button icon="square.and.pencil" md="edit_square" />
</Stack.Toolbar>`}
      </Code>
    </Page>
  );
}

const styles = StyleSheet.create({
  input: { fontSize: 17, paddingHorizontal: 16, paddingVertical: 11 },
});
