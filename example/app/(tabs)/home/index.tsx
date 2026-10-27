import { Stack } from 'expo-router';

import { Gallery } from '../../../components/Gallery';

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Gallery title="Home" seed="home" />
    </>
  );
}
