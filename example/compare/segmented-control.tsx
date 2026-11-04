import { SegmentedControl } from 'expo-lucent';

import { Photo } from './Photo';
import type { Comparison } from './types';

const none = () => {};

// Two to five segments, the thumb at each end and in the middle, tinted and disabled; then over the photo.
const Segments = () => (
  <>
    <SegmentedControl values={['Day', 'Week']} selectedIndex={0} onChange={none} />
    <SegmentedControl values={['Day', 'Week', 'Month']} selectedIndex={1} onChange={none} />
    <SegmentedControl values={['Day', 'Week', 'Month', 'Year']} selectedIndex={3} onChange={none} />
    <SegmentedControl values={['S', 'M', 'L', 'XL', 'XXL']} selectedIndex={2} onChange={none} />
    <SegmentedControl values={['Day', 'Week', 'Month']} selectedIndex={0} tintColor="#FF9F0A" onChange={none} />
    <SegmentedControl values={['Day', 'Week', 'Month']} selectedIndex={1} enabled={false} onChange={none} />
    <Photo>
      <SegmentedControl values={['Day', 'Week', 'Month']} selectedIndex={1} onChange={none} />
    </Photo>
  </>
);

export default { slug: 'segmented-control', pages: [Segments] } satisfies Comparison;
