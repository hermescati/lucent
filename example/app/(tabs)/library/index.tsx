import { Stack } from 'expo-router';

import { Gallery } from '../../../components/Gallery';

export default function LibraryScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Gallery title="Library" seed="library" />
    </>
  );
}
