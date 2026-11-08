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

const Selected = ({ mode }: ScreenProps) => {
  const [filtered, setFiltered] = useState(true);
  return (
    <Body mode={mode} title="Inbox">
      <Stack.Toolbar>
        <Stack.Toolbar.Button
          icon="line.3.horizontal.decrease"
          md="filter_list"
          accessibilityLabel="Filter"
          selected={filtered}
          onPress={() => setFiltered(!filtered)}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          md="edit_square"
          accessibilityLabel="Compose"
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="Filter">
        <Choice
          labels={['Off', 'On']}
          selectedIndex={filtered ? 1 : 0}
          onSelect={(index) => setFiltered(index === 1)}
        />
      </Section>
    </Body>
  );
};

const variants = ['plain', 'done', 'prominent'] as const;
const tints = { None: undefined, Purple: '#AF52DE', Green: '#34C759' } as const;
const backgrounds = { None: undefined, Blue: '#1C3F8C', Sand: '#E9DDC7' } as const;

const Styles = ({ mode }: ScreenProps) => {
  const [variant, setVariant] = useState(2);
  const [tint, setTint] = useState(0);
  const [itemTint, setItemTint] = useState(0);
  const [background, setBackground] = useState(0);
  const tintNames = Object.keys(tints) as (keyof typeof tints)[];
  const backgroundNames = Object.keys(backgrounds) as (keyof typeof backgrounds)[];
  return (
    <Body mode={mode} title="Today">
      <Stack.Toolbar tintColor={tints[tintNames[tint]]} backgroundColor={backgrounds[backgroundNames[background]]}>
        <Stack.Toolbar.Button style={{ fontWeight: '600' }} onPress={() => {}}>
          Edit
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="flag"
          md="flag"
          accessibilityLabel="Flag"
          tintColor={tints[tintNames[itemTint]]}
          onPress={() => {}}
        />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button
          icon="plus"
          md="add"
          accessibilityLabel="New"
          variant={variants[variant]}
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="The plus button's variant">
        <Choice labels={[...variants]} selectedIndex={variant} onSelect={setVariant} />
      </Section>
      <Section title="The toolbar's tintColor">
        <Choice labels={tintNames} selectedIndex={tint} onSelect={setTint} />
      </Section>
      <Section title="The flag's own tintColor">
        <Choice labels={tintNames} selectedIndex={itemTint} onSelect={setItemTint} />
      </Section>
      <Section title="backgroundColor (solid fallback only)">
        <Choice labels={backgroundNames} selectedIndex={background} onSelect={setBackground} />
      </Section>
    </Body>
  );
};

const Menus = ({ mode }: ScreenProps) => {
  const [grid, setGrid] = useState(true);
  const [sort, setSort] = useState('Date');
  return (
    <Body mode={mode} title="Notes">
      <Stack.Toolbar>
        <Stack.Toolbar.Menu icon="ellipsis" md="more_horiz" title="View" accessibilityLabel="More">
          <Stack.Toolbar.MenuAction icon="square.grid.2x2" md="grid_view" isOn={grid} onPress={() => setGrid(true)}>
            Gallery
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction icon="list.bullet" md="list" isOn={!grid} onPress={() => setGrid(false)}>
            List
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.Menu inline title="Sort By">
            {['Date', 'Title'].map((key) => (
              <Stack.Toolbar.MenuAction key={key} isOn={sort === key} onPress={() => setSort(key)}>
                {key}
              </Stack.Toolbar.MenuAction>
            ))}
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.Menu palette title="Colour">
            <Stack.Toolbar.MenuAction icon="circle.fill" md="circle" onPress={() => {}}>
              Red
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="square.fill" md="square" onPress={() => {}}>
              Blue
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="triangle.fill" md="change_history" onPress={() => {}}>
              Green
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
          <Stack.Toolbar.MenuAction icon="trash" md="delete" destructive onPress={() => {}}>
            Delete All
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
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

// The middle item: a button, which shares its neighbours' capsule, or a status view with no glass, which splits the
// capsule around it, as Photos' "3 Selected" does. `separateBackground` isn't offered: iOS 27's bottom toolbar ignores
// it.
const middles = ['Button', 'Status view'] as const;

const Grouping = ({ mode }: ScreenProps) => {
  const palette = usePalette();
  const [middle, setMiddle] = useState(0);
  const [shares, setShares] = useState(true);
  return (
    <Body mode={mode} title="Photo">
      <Stack.Toolbar>
        <Stack.Toolbar.Button icon="square.and.arrow.up" md="share" accessibilityLabel="Share" onPress={() => {}} />
        {middle === 0 ? (
          <Stack.Toolbar.Button icon="heart" md="favorite" accessibilityLabel="Favourite" onPress={() => {}} />
        ) : (
          <Stack.Toolbar.View hidesSharedBackground>
            <View style={styles.selectedBox}>
              <Text style={[styles.selected, { color: palette.text }]}>3 Selected</Text>
            </View>
          </Stack.Toolbar.View>
        )}
        <Stack.Toolbar.Button icon="info.circle" md="info" accessibilityLabel="Info" onPress={() => {}} />
        <Stack.Toolbar.Spacer width={16} sharesBackground={shares} />
        <Stack.Toolbar.Button icon="trash" md="delete" accessibilityLabel="Delete" onPress={() => {}} />
      </Stack.Toolbar>
      <Section title="The middle item">
        <Choice labels={[...middles]} selectedIndex={middle} onSelect={setMiddle} />
      </Section>
      <Section title="The fixed space's sharesBackground">
        <Choice
          labels={['false', 'true']}
          selectedIndex={shares ? 1 : 0}
          onSelect={(index) => setShares(index === 1)}
        />
      </Section>
    </Body>
  );
};

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

const slots = ['Default', 'separateBackground', 'hidesSharedBackground'] as const;

const Search = ({ mode }: ScreenProps) => {
  const [slot, setSlot] = useState(0);
  return (
    <Body mode={mode} title="Notes">
      <Stack.SearchBar placeholder="Search" />
      <Stack.Toolbar>
        <Stack.Toolbar.Button
          icon="line.3.horizontal.decrease"
          md="filter_list"
          accessibilityLabel="Filter"
          onPress={() => {}}
        />
        <Stack.Toolbar.SearchBarSlot separateBackground={slot === 1} hidesSharedBackground={slot === 2} />
        <Stack.Toolbar.Button
          icon="square.and.pencil"
          md="edit_square"
          accessibilityLabel="Compose"
          onPress={() => {}}
        />
      </Stack.Toolbar>
      <Section title="The search slot">
        <Choice labels={[...slots]} selectedIndex={slot} onSelect={setSlot} />
      </Section>
    </Body>
  );
};

const screens: Record<string, (props: ScreenProps) => ReactNode> = {
  icons: Icons,
  text: TextButtons,
  prominent: Prominent,
  selected: Selected,
  styles: Styles,
  menu: Menus,
  states: States,
  status: Status,
  grouping: Grouping,
  spacing: Spacing,
  search: Search,
};

const styles = StyleSheet.create({
  input: { fontSize: 17, paddingHorizontal: 16, paddingVertical: 11 },
  status: { fontSize: 13 },
  statusBox: { width: 160, height: 44, alignItems: 'center', justifyContent: 'center' },
  selected: { fontSize: 15, fontWeight: '600' },
  selectedBox: { width: 110, height: 44, alignItems: 'center', justifyContent: 'center' },
});
