import type { NativeStackHeaderProps } from 'expo-router/native-stack';
import { useLayoutEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { Header, largeTitlePlacement, showsBack } from './Header.android';
import { useBarTop } from './barTop.android';
import { useLargeBlock } from './barType.android';
import { useHeaderSearchBlock } from './searchBlock.android';
import { setHeader, useHeader } from './store.android';
import { bar } from '../tokens';

/**
 * What native-stack renders as the header: an empty box the bar's height, which it measures for `useHeaderHeight` and,
 * for an opaque bar, places the content under. The bar is drawn by `HeaderOverlay`.
 */
export const HeaderSpacer = (props: NativeStackHeaderProps) => {
  const top = useBarTop();
  const key = props.route.key;
  useLayoutEffect(() => {
    setHeader(key, props);
  });
  useLayoutEffect(() => () => setHeader(key, undefined), [key]);
  const { block } = useHeaderSearchBlock(key);
  const below = largeTitlePlacement(props.options, showsBack(props.options, props.back !== undefined)) === 'below';
  const largeBlock = useLargeBlock();
  const height = top + bar.inline + (below ? largeBlock : 0) + block;
  return <View pointerEvents="none" style={{ height }} />;
};

/** The bar, over the screen's content and after it, so its glass draws above the content's. */
export const HeaderOverlay = ({ routeKey }: { routeKey: string }) => {
  const props = useHeader(routeKey);
  if (!props) return null;
  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Header {...props} />
    </View>
  );
};

const styles = StyleSheet.create({
  // Above native-stack's own header box (zIndex 1), which would otherwise take the bar's touches.
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, elevation: 2 },
});
