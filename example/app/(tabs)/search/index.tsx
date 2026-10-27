import { Stack } from 'expo-router';
import { SearchBar } from 'expo-lucent';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import type { SearchBarCommands } from 'react-native-screens';

export default function SearchScreen() {
  const dark = useColorScheme() === 'dark';
  const [query, setQuery] = useState('');
  const search = useRef<SearchBarCommands>(null);
  const text = { color: dark ? '#FFFFFF' : '#000000' };

  const actions = [
    {
      label: 'Fill',
      onPress: () => {
        search.current?.setText('Zelda');
        setQuery('Zelda');
      },
    },
    {
      label: 'Clear',
      onPress: () => {
        search.current?.clearText();
        setQuery('');
      },
    },
    { label: 'Done', onPress: () => search.current?.blur() },
    { label: 'Cancel', onPress: () => search.current?.cancelSearch() },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: dark ? '#000000' : '#FFFFFF' }]}>
      <Stack.Screen options={{ title: 'Search', headerShown: process.env.EXPO_OS === 'ios' }} />
      <SearchBar
        ref={search}
        placeholder="Games, library, platforms"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
      />
      <Text style={[styles.text, text]}>{query ? `Searching for “${query}”` : 'Search everything'}</Text>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={[styles.action, { backgroundColor: dark ? '#1C1C1E' : '#F2F2F7' }]}>
            <Text style={[styles.actionText, text]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 160,
    gap: 16,
  },
  text: {
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
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
