import { SegmentedControl } from 'expo-lucent';
import { TabScrollView } from 'expo-lucent/navigation';
import { Link, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';

export const usePalette = () => {
  const dark = useColorScheme() === 'dark';
  return {
    dark,
    background: dark ? '#000000' : '#F2F2F7',
    surface: dark ? '#1C1C1E' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    secondary: dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)',
    separator: dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.29)',
    code: dark ? '#0F0F10' : '#F7F7FA',
  };
};

// The same on both platforms: Lucent's Stack draws iOS 26's bar on Android, transparent over the content.
export const useStackOptions = () => {
  const palette = usePalette();
  return {
    headerLargeTitle: true,
    headerShadowVisible: false,
    // The chevron alone, as Apple's own apps show it. UIKit's default adds the previous screen's title.
    headerBackButtonDisplayMode: 'minimal' as const,
    contentStyle: { backgroundColor: palette.background },
  };
};

export const Page = ({ children }: { children: ReactNode }) => {
  const palette = usePalette();
  return (
    <TabScrollView style={{ backgroundColor: palette.background }} contentContainerStyle={styles.page}>
      {children}
    </TabScrollView>
  );
};

// One photo for every stage, dark with points of light, so the glass has something to bend.
// Photo by Matthew Skinner on Unsplash (https://unsplash.com/photos/t05kfHeygbE), Unsplash License.
const backdrop = require('@/assets/backdrop.jpg');

interface StageProps {
  photo?: boolean;
  height?: number;
  children: ReactNode;
}

/** The preview area. With `photo`, the component sits on a busy picture so the glass has something to bend. */
export const Stage = ({ photo, height = 220, children }: StageProps) => {
  const palette = usePalette();
  return (
    <View style={[styles.stage, { height, backgroundColor: palette.surface }]}>
      {photo ? <Image fadeDuration={0} source={backdrop} style={StyleSheet.absoluteFill} /> : null}
      <View style={styles.stageContent}>{children}</View>
    </View>
  );
};

export const Section = ({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) => {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      {title ? <Text style={[styles.sectionTitle, { color: palette.secondary }]}>{title.toUpperCase()}</Text> : null}
      <View style={[styles.card, { backgroundColor: palette.surface }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: palette.secondary }]}>{footer}</Text> : null}
    </View>
  );
};

interface RowProps {
  label: string;
  detail?: string;
  /** Puts the control under the label, full width (sliders, segmented controls). */
  stacked?: boolean;
  last?: boolean;
  children?: ReactNode;
}

export const Row = ({ label, detail, stacked = false, last = false, children }: RowProps) => {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.row,
        stacked && styles.rowStacked,
        !last && { borderBottomColor: palette.separator, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}>
      <View style={[styles.rowLabel, !stacked && styles.rowLabelInline]}>
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
        {detail ? <Text style={[styles.detail, { color: palette.secondary }]}>{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
};

interface ChoiceProps {
  labels: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

/** A segmented control, used for every multiple-choice setting. */
export const Choice = ({ labels, selectedIndex, onSelect }: ChoiceProps) => (
  <SegmentedControl
    style={styles.options}
    values={labels}
    selectedIndex={selectedIndex}
    onChange={(event) => onSelect(event.nativeEvent.selectedSegmentIndex)}
  />
);

interface OptionsProps<T extends string> {
  options: readonly { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

/** A choice over typed values. */
export const Options = <T extends string>({ options, value, onChange }: OptionsProps<T>) => (
  <Choice
    labels={options.map((option) => option.label)}
    selectedIndex={options.findIndex((option) => option.value === value)}
    onSelect={(index) => onChange(options[index].value)}
  />
);

interface SwatchesProps {
  colors: readonly { name: string; color: string | undefined }[];
  value: string | undefined;
  onChange: (color: string | undefined) => void;
}

/** A row of colour circles. A swatch without a colour means "none". */
export const Swatches = ({ colors, value, onChange }: SwatchesProps) => {
  const palette = usePalette();
  return (
    <View style={styles.swatches}>
      {colors.map((swatch) => (
        <Pressable
          key={swatch.name}
          accessibilityRole="button"
          accessibilityLabel={swatch.name}
          accessibilityState={{ selected: swatch.color === value }}
          onPress={() => onChange(swatch.color)}
          style={[
            styles.swatch,
            swatch.color
              ? { backgroundColor: swatch.color }
              : { backgroundColor: palette.background, borderColor: palette.separator },
            swatch.color === value && { borderColor: palette.text },
          ]}>
          {swatch.color ? null : <View style={[styles.none, { backgroundColor: palette.secondary }]} />}
        </Pressable>
      ))}
    </View>
  );
};

export const LinkRow = ({
  href,
  label,
  detail,
  last,
}: {
  href: Href;
  label: string;
  detail?: string;
  last?: boolean;
}) => {
  const palette = usePalette();
  return (
    <Link href={href} asChild>
      <Pressable android_ripple={{ color: palette.separator }}>
        <Row label={label} detail={detail} last={last}>
          <Text style={[styles.chevron, { color: palette.secondary }]}>›</Text>
        </Row>
      </Pressable>
    </Link>
  );
};

export const Code = ({ children }: { children: string }) => {
  const palette = usePalette();
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: palette.secondary }]}>CODE</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.card, { backgroundColor: palette.code }]}
        contentContainerStyle={styles.codeContent}>
        <Text selectable style={[styles.code, { color: palette.text }]}>
          {children}
        </Text>
      </ScrollView>
    </View>
  );
};

export const Paragraph = ({ children }: { children: ReactNode }) => {
  const palette = usePalette();
  return <Text style={[styles.paragraph, { color: palette.secondary }]}>{children}</Text>;
};

/** Renders a JSX prop for the code samples, leaving out props that are at their default. */
export const prop = (name: string, value: string | number | boolean | undefined, fallback?: unknown) => {
  if (value === undefined || value === fallback) return '';
  if (value === true) return ` ${name}`;
  if (typeof value === 'string') return ` ${name}="${value}"`;
  return ` ${name}={${value}}`;
};

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });

const styles = StyleSheet.create({
  page: {
    padding: 16,
    paddingBottom: 32,
    gap: 24,
  },
  stage: {
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  stageContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  section: {
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    marginHorizontal: 16,
  },
  footer: {
    fontSize: 13,
    marginHorizontal: 16,
    lineHeight: 18,
  },
  card: {
    borderRadius: 26,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowStacked: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rowLabel: {
    gap: 2,
  },
  rowLabelInline: {
    flex: 1,
  },
  label: {
    fontSize: 17,
  },
  detail: {
    fontSize: 13,
  },
  chevron: {
    fontSize: 24,
    lineHeight: 26,
  },
  options: {
    alignSelf: 'stretch',
  },
  swatches: {
    flexDirection: 'row',
    gap: 12,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  none: {
    width: 24,
    height: 2,
    transform: [{ rotate: '-45deg' }],
  },
  codeContent: {
    padding: 16,
  },
  code: {
    fontFamily: mono,
    fontSize: 13,
    lineHeight: 19,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 21,
    marginHorizontal: 4,
  },
});
