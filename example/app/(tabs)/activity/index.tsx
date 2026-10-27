import { Stack } from 'expo-router';

import { Gallery } from '../../../components/Gallery';

export default function ActivityScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Gallery title="Activity" seed="activity" />
    </>
  );
}
