import { Stack, SearchBar } from 'expo-lucent/navigation';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

import { Code, LinkRow, Page, Paragraph, Section, usePalette } from '@/components/ui';
import { entries } from '@/stories';

export default function SearchScreen() {
  const palette = usePalette();
  const [query, setQuery] = useState('');
  const search = useRef<SearchBarCommands>(null);
  const needle = query.trim().toLowerCase();
  const results = entries.filter(
    (entry) => entry.href !== '/search' && `${entry.name} ${entry.summary}`.toLowerCase().includes(needle),
  );

  const actions = [
    {
      label: 'setText',
      onPress: () => {
        search.current?.setText('Glass');
        setQuery('Glass');
      },
    },
    {
      label: 'clearText',
      onPress: () => {
        search.current?.clearText();
        setQuery('');
      },
    },
    { label: 'blur', onPress: () => search.current?.blur() },
    { label: 'cancelSearch', onPress: () => search.current?.cancelSearch() },
  ];

  return (
    <Page>
      <Stack.Screen options={{ title: 'Search' }} />
      <SearchBar
        ref={search}
        placeholder="Search components"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
      />
      <Section
        title="SearchBar ref"
        footer="These call the ref's methods. setText doesn't fire onChangeText, so the screen sets its own query too.">
        <View style={styles.actions}>
          {actions.map((action) => (
            <Pressable
              key={action.label}
              onPress={action.onPress}
              style={[styles.action, { backgroundColor: palette.background }]}>
              <Text style={[styles.actionText, { color: palette.text }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title={needle ? `Results for “${query.trim()}”` : 'All components'}>
        {results.length > 0 ? (
          results.map((entry, index) => (
            <LinkRow
              key={entry.name}
              href={entry.href}
              label={entry.name}
              detail={entry.summary}
              last={index === results.length - 1}
            />
          ))
        ) : (
          <Text style={[styles.empty, { color: palette.secondary }]}>No components match</Text>
        )}
      </Section>

      <Code>
        {`// Inside the screen of the tab with role="search"
<SearchBar
  placeholder="Search components"
  onChangeText={(event) => setQuery(event.nativeEvent.text)}
/>`}
      </Code>

      <Paragraph>
        On iOS this is expo-router&apos;s search bar, which iOS 26 moves into the tab bar. On Android the search tab
        morphs into the field and rides the keyboard.
      </Paragraph>
    </Page>
  );
}

const styles = StyleSheet.create({
  empty: {
    fontSize: 15,
    padding: 16,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 12,
  },
  action: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
