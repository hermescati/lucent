import { Gauge, Host, ProgressView, Text, VStack } from '@expo/ui/swift-ui';
import { gaugeStyle, progressViewStyle } from '@expo/ui/swift-ui/modifiers';

import type { Comparison } from '../types';

// The spinner, with and without a label, and determinate bars.
const Progress = () => (
  <Host matchContents>
    <VStack spacing={20}>
      <ProgressView />
      <ProgressView>
        <Text>Loading</Text>
      </ProgressView>
      {[0, 0.3, 0.7, 1].map((value) => (
        <ProgressView key={value} value={value} modifiers={[progressViewStyle('linear')]} />
      ))}
    </VStack>
  </Host>
);

// Gauges in each style, at the same value.
const Gauges = () => (
  <Host matchContents>
    <VStack spacing={20}>
      {(['linear', 'linearCapacity', 'circular', 'circularCapacity'] as const).map((style) => (
        <Gauge
          key={style}
          value={0.6}
          currentValueLabel={<Text>60</Text>}
          minimumValueLabel={<Text>0</Text>}
          maximumValueLabel={<Text>100</Text>}
          modifiers={[gaugeStyle(style)]}>
          <Text>Battery</Text>
        </Gauge>
      ))}
    </VStack>
  </Host>
);

export default { slug: 'progress', pages: [Progress, Gauges], reference: true } satisfies Comparison;
