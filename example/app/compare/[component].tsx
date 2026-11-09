import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { findComparison } from '@/compare';
import { Frame } from '@/compare/Frame';
import { useCompareShown } from '@/compare/useCompareDriver';

/** `/compare/<slug>?page=<n>`, opened by `npm run compare`. Pages count from 1. */
export default function CompareScreen() {
  const { component, page, key } = useLocalSearchParams<{ component: string; page?: string; key?: string }>();
  const comparison = findComparison(component);
  const Page = comparison?.pages[Number(page ?? 1) - 1];
  useCompareShown(key, Boolean(Page?.fill));
  return (
    <Frame fill={Page?.fill}>
      {Page ? (
        <Page />
      ) : (
        <Text>
          No comparison page “{component}” {page ?? 1}.
        </Text>
      )}
    </Frame>
  );
}
