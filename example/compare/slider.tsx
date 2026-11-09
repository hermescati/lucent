import { Slider } from 'expo-lucent';

import { Photo } from './Photo';
import type { Comparison } from './types';

const none = () => {};

// The ends, the middle and a third, a stepped range and disabled; then over the photo.
const Values = () => (
  <>
    {[0, 0.3, 0.5, 1].map((value) => (
      <Slider key={value} value={value} onValueChange={none} />
    ))}
    <Slider value={50} min={0} max={100} step={10} onValueChange={none} />
    <Slider value={0.5} disabled onValueChange={none} />
    <Photo>
      <Slider value={0.3} onValueChange={none} />
      <Slider value={0.5} disabled onValueChange={none} />
    </Photo>
  </>
);

export default { slug: 'slider', pages: [Values] } satisfies Comparison;
