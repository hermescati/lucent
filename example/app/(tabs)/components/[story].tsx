import { Stack, useLocalSearchParams } from 'expo-router';

import { StoryPage } from '../../../components/StoryPage';
import { Page, Paragraph } from '../../../components/ui';
import { findStory } from '../../../stories';

export default function StoryScreen() {
  const { story: slug } = useLocalSearchParams<{ story: string }>();
  const story = findStory(slug);
  if (!story) {
    return (
      <Page>
        <Stack.Screen options={{ title: 'Not found' }} />
        <Paragraph>There is no story called “{slug}”.</Paragraph>
      </Page>
    );
  }
  return <StoryPage story={story} />;
}
