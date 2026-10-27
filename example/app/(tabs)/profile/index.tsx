import { Stack } from 'expo-router';

import { Gallery } from '../../../components/Gallery';

export default function ProfileScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Gallery title="Profile" seed="profile" />
    </>
  );
}
