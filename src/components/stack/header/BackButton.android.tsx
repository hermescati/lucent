import { useRef, useState, type ComponentRef } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { BarCapsule } from './BarCapsule.android';
import { Chevron } from './Chevron';
import { useOpenMenu } from '../menu/Menu.android';
import type { MenuTree } from '../menu/items';
import { backButton, barItem } from '../tokens';

interface Props {
  label?: string;
  // iOS's `backButtonDisplayMode`: the previous title, or the chevron alone. iOS 27 draws `generic` as the chevron alone
  // too, as `minimal` (simulator), rather than "Back".
  displayMode?: 'default' | 'generic' | 'minimal';
  // How wide the button may be, beside the bar's title and other items; the label goes to fit, as UIKit's does.
  room?: number;
  color: string;
  onPress: () => void;
  // The screens further back, for the menu a long press opens, as `headerBackButtonMenuEnabled` asks.
  // TODO: the long press opens Lucent's menu, which isn't iOS's pull-down menu yet; revisit once that component is
  // finished.
  history?: MenuTree;
}

// The capsule's width around a label this wide.
const capsuleFor = (labelWidth: number) =>
  backButton.leading + backButton.chevronWidth + backButton.gap + labelWidth + backButton.trailing;

/**
 * iOS 26's back button: a glass capsule with the chevron and the previous screen's title, or a circle with the chevron.
 * As UIKit does, it never cuts the title short: a title that doesn't fit gives way to "Back", and that to the chevron.
 */
export const BackButton = ({ label, displayMode = 'default', color, onPress, history, room }: Props) => {
  const [widths, setWidths] = useState({ label: 0, back: 0 });
  const measure = (key: keyof typeof widths) => (event: LayoutChangeEvent) => {
    const value = event.nativeEvent.layout.width;
    setWidths((current) => (current[key] === value ? current : { ...current, [key]: value }));
  };
  const fits = (width: number) => room === undefined || capsuleFor(width) <= room;
  const text =
    displayMode !== 'default' || !label
      ? undefined
      : fits(widths.label)
        ? label
        : fits(widths.back)
          ? 'Back'
          : undefined;
  const openMenu = useOpenMenu();
  const ref = useRef<ComponentRef<typeof Pressable>>(null);
  const onLongPress =
    history && openMenu
      ? () => ref.current?.measureInWindow((x, y, width, height) => openMenu(history, { x, y, width, height }))
      : undefined;
  return (
    <BarCapsule>
      <Pressable
        ref={ref}
        onPress={onPress}
        onLongPress={onLongPress}
        accessibilityRole="button"
        accessibilityLabel={label ? `Back to ${label}` : 'Back'}
        style={[styles.body, text ? styles.withLabel : styles.alone]}>
        <Chevron color={color} />
        {text ? (
          <Text numberOfLines={1} style={[styles.label, { color }]}>
            {text}
          </Text>
        ) : null}
      </Pressable>
      {displayMode === 'default' && label ? (
        <View
          pointerEvents="none"
          style={styles.measure}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants">
          <Text style={styles.label} onLayout={measure('label')}>
            {label}
          </Text>
          <Text style={styles.label} onLayout={measure('back')}>
            Back
          </Text>
        </View>
      ) : null}
    </BarCapsule>
  );
};

const styles = StyleSheet.create({
  body: { height: barItem.height, flexDirection: 'row', alignItems: 'center' },
  withLabel: { paddingLeft: backButton.leading, paddingRight: backButton.trailing, gap: backButton.gap },
  // iOS sits the chevron 1.5pt left of the circle's centre, so it looks centred.
  alone: { width: barItem.icon, justifyContent: 'center', paddingRight: backButton.aloneShift * 2 },
  // The labels at their own widths, unseen, to decide which fits.
  measure: { position: 'absolute', opacity: 0, alignItems: 'flex-start', width: 1000 },
  label: {
    fontSize: barItem.fontSize,
    lineHeight: barItem.lineHeight,
    includeFontPadding: false,
  },
});
