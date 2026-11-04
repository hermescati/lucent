import { Stepper } from 'expo-lucent';

import { Photo } from './Photo';
import type { Comparison } from './types';

const none = () => {};

// Mid-range, at each end where that side disables, disabled, as a labelled row, and over the photo.
const States = () => (
  <>
    <Stepper value={3} min={0} max={10} onValueChange={none} />
    <Stepper value={0} min={0} max={10} onValueChange={none} />
    <Stepper value={10} min={0} max={10} onValueChange={none} />
    <Stepper value={3} min={0} max={10} disabled onValueChange={none} />
    <Stepper label="Quantity: 3" value={3} min={0} max={10} onValueChange={none} />
    <Photo>
      <Stepper value={3} min={0} max={10} onValueChange={none} />
    </Photo>
  </>
);

export default { slug: 'stepper', pages: [States] } satisfies Comparison;
