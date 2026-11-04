import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { CloseGlyph } from './CloseGlyph';
import { SearchMode } from './SearchMode';
import { TabIcon } from './TabIcon';
import { TabItem } from './TabItem';
import { moreName, useMore } from '../helpers/more';
import { tabEnterAfter } from '../helpers/presence';
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView, NativeGlassBackdrop } from '../../../core/glass/NativeGlass';
import { continuousCapsule } from '../../../core/glass/continuous';
import { glass } from '../../../theme/tokens';
import {
  fullHeight,
  inlinePad,
  lensFullHeight,
  revealGroup,
  rowInset,
  screenGroup,
  tabBarGroup,
  tick,
} from '../helpers/bar';
import { reselectTab } from '../helpers/reselect';
import { useBarGlass } from '../hooks/useBarGlass';
import { useBarPress } from '../hooks/useBarPress';
import { useBarState, type FloatingTabBarProps } from '../hooks/useBarState';
import { useLensPhysics } from '../hooks/useLensPhysics';
import { useLensStyles } from '../hooks/useLensStyles';
import { useSearchMorph } from '../hooks/useSearchMorph';
import { layout, motion } from '../tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

export const FloatingTabBar = (props: FloatingTabBarProps) => {
  const { badgeColor, badgeTextColor } = props;
  const state = useBarState(props);
  const search = useSearchMorph(state);
  const {
    backIndex,
    backLight,
    barWidth,
    command,
    edgesReady,
    emit,
    lensPosition,
    morphSearch,
    searchIdle: idleFade,
    searchPop,
    searchPress,
    searchTab,
    setQuery,
    settledIndex,
    getTrigger,
    switchTab,
    tabs,
  } = { ...state, ...search };

  const more = useMore();
  const selectTab = (index: number, wait = 0) => {
    if (tabs[index]?.disabled) {
      return;
    }
    // More isn't a route: it shows its list over the last tab chosen, which any other tab closes.
    const opening = tabs[index].name === moreName;
    setTimeout(
      () =>
        requestAnimationFrame(() => {
          more?.setOpen(opening);
          if (!opening) {
            switchTab(tabs[index].name, {});
          }
        }),
      wait,
    );
  };

  const reselect = (index: number) => {
    const tab = tabs[index];
    if (tab?.name === moreName) {
      // Again, it comes back to its list from a tab under it, as iOS's does.
      more?.setOpen(true);
      return;
    }
    if (tab && !tab.disabled) {
      // The tab's own stack, not the whole tree: router.canDismiss() counts history anywhere, and popping a stack
      // already at its first screen is an action no navigator handles.
      const stack = getTrigger(tab.name)?.route?.state;
      reselectTab(tab, (stack?.index ?? 0) > 0);
    }
  };

  const openSearch = () => {
    if (!searchTab) {
      return;
    }
    tick();
    lensPosition.set(0);
    edgesReady.set(false);
    morphSearch(true);
    requestAnimationFrame(() => switchTab(searchTab.name, {}));
  };

  const leaveSearch = () => {
    tick();
    lensPosition.set(backIndex);
    settledIndex.set(backIndex);
    edgesReady.set(false);
    morphSearch(false);
    requestAnimationFrame(() => switchTab(tabs[backIndex].name, {}));
  };

  const closeSearch = () => {
    searchPress.press.set(1);
    searchPress.press.set(withSpring(0, motion.springs.closeFlash));
    setQuery('');
    emit('onCancelButtonPress');
    Keyboard.dismiss();
    backLight.set(0);
    leaveSearch();
  };

  // The ref's `cancelSearch`, as iOS plays it: search goes inactive on its tab, the field emptying and letting go of the
  // keyboard as the close button folds back into its end. Tapping the field brings it back out.
  const [searchIdle, setSearchIdle] = useState(false);
  if (searchIdle && !state.searchFocused) {
    setSearchIdle(false);
    idleFade.set(0);
  }
  // The search tab's navigation bar steps aside while search is on, as iOS's does.
  const searchActive = state.searchFocused && !searchIdle;
  const { setSearchActive } = state;
  useEffect(() => setSearchActive(searchActive), [searchActive, setSearchActive]);
  const idleSearch = () => {
    setQuery('');
    emit('onCancelButtonPress');
    Keyboard.dismiss();
    setSearchIdle(true);
    idleFade.set(withTiming(1, { duration: motion.searchIdle.glyphFade }));
    searchPop.set(withSpring(0, motion.springs.searchAbsorb));
  };
  const idleGlyphStyle = useAnimatedStyle(() => ({
    opacity: 1 - idleFade.get(),
  }));
  const wakeSearch = () => {
    if (!searchIdle) return;
    setSearchIdle(false);
    idleFade.set(withTiming(0, { duration: motion.searchIdle.glyphFade }));
    searchPop.set(withSpring(1, motion.springs.searchPop));
  };

  const backSearch = () => {
    backLight.set(1);
    leaveSearch();
  };

  const press = useBarPress({ ...state, ...search, selectTab, reselect });
  useLensPhysics({ ...state, ...press });
  const lens = useLensStyles(state);
  const lensWidthStyle = useAnimatedStyle(() => ({ width: state.lensBase.get() }));
  // The pill's outline at its unscaled size, which changes only with the bar's layout.
  const [fillWidth, setFillWidth] = useState<number>(layout.bubbleRestWidth);
  useAnimatedReaction(
    () => Math.round(state.lensBase.get() * 10) / 10,
    (width, previous) => {
      if (width !== previous && width > 0) scheduleOnRN(setFillWidth, width);
    },
  );
  const fillPath = useMemo(() => continuousCapsule(fillWidth, lensFullHeight), [fillWidth]);
  const barGlass = useBarGlass({ ...state, ...search, ...lens });
  const {
    backDrag,
    backPress,
    barGlassProps,
    barLeft,
    barLiftStyle,
    barSpan,
    bottom,
    closeGlyphStyle,
    collapseSpread,
    collapseX,
    collapsed,
    color,
    coveredIcons,
    focusedIndex,
    fullItemWidth,
    glassStyle,
    hasBadges,
    iconCover,
    inkTone,
    keyboardReach,
    keyboardSpread,
    lensFillProps,
    lensFillStyle,
    lensGlassStyle,
    lensIconProps,
    lensIconStyle,
    lensPresence,
    lensSideProps,
    lensStyle,
    lift,
    middleIndex,
    modeTarget,
    onBackdropLuma,
    pan,
    pillLiftStyle,
    pillModeStyle,
    pressScaleStyle,
    rowBlurProps,
    rowClipStyle,
    rowFit,
    rowFitStyle,
    rowUnclipStyle,
    scheme,
    searchCenter,
    searchContentStyle,
    searchDip,
    searchFillStyle,
    searchFocused,
    searchGlyphStyle,
    searchInkStyle,
    searchMode,
    searchRaise,
    searchSpreadStyle,
    shine,
    tileSink,
    tintColor,
    frameWidthStyle,
    overlayWidthStyle,
    rowPadStyle,
    swell,
  } = { ...state, ...search, ...press, ...lens, ...barGlass };

  // Tabs grow in as they're added, not as the bar first appears.
  const ready = useSharedValue(false);
  useEffect(() => {
    ready.set(true);
  }, [ready]);
  const tabEnter = useMemo(() => tabEnterAfter(ready), [ready]);

  return (
    <Animated.View
      style={[styles.bar, { bottom, left: barLeft, width: barSpan }, barLiftStyle]}
      pointerEvents="box-none">
      <NativeGlassBackdrop group={tabBarGroup} style={styles.backdrop}>
        <AnimatedNativeGlassView
          style={styles.barGlass}
          pointerEvents="none"
          animatedProps={barGlassProps}
          {...glassStyle}
          continuous={1}
          sampleBackdrop
          onBackdropLuma={onBackdropLuma}
        />
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.frame, frameWidthStyle, pillModeStyle]}
            pointerEvents={searchFocused ? 'none' : 'auto'}>
            <Animated.View
              pointerEvents="none"
              style={[styles.pillLift, { backgroundColor: color.pressLift }, pillLiftStyle]}
            />
            <Animated.View pointerEvents="none" style={[styles.lens, lensStyle, lensWidthStyle]}>
              <Svg style={StyleSheet.absoluteFill} viewBox={`0 0 ${fillWidth} ${lensFullHeight}`}>
                <AnimatedPath d={fillPath} animatedProps={lensFillProps} />
              </Svg>
              <Animated.View style={[styles.lensLayer, lensFillStyle]} />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
        <View style={styles.grow} pointerEvents="none" />
        {searchTab ? (
          <Animated.View style={[styles.search, searchSpreadStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={searchFocused ? (searchIdle ? () => command('focus') : closeSearch) : openSearch}
              onPressIn={() => searchPress.onPressIn()}
              onPressOut={searchPress.onPressOut}
              accessibilityRole="tab"
              accessibilityLabel={searchFocused && !searchIdle ? 'Close search' : searchTab.label}
              accessibilityState={{ selected: searchFocused }}>
              <Animated.View style={[StyleSheet.absoluteFill, searchContentStyle]}>
                <Animated.View style={[styles.pressFill, { backgroundColor: color.pressFill }, searchFillStyle]} />
                <Animated.View style={[styles.searchIcon, searchInkStyle]}>
                  <Animated.View style={[styles.searchIcon, searchGlyphStyle]}>
                    <TabIcon icon={searchTab.icon} selected={false} size={layout.searchIconSize} color={color.text} />
                  </Animated.View>
                  <Animated.View style={[styles.searchIcon, closeGlyphStyle]}>
                    <Animated.View style={idleGlyphStyle}>
                      <CloseGlyph size={layout.closeIconSize} color={color.text} />
                    </Animated.View>
                  </Animated.View>
                </Animated.View>
              </Animated.View>
            </Pressable>
          </Animated.View>
        ) : null}
      </NativeGlassBackdrop>
      <Animated.View
        pointerEvents="none"
        style={[styles.lensOverlay, overlayWidthStyle, pillModeStyle, pressScaleStyle]}>
        <Animated.View style={[styles.rowClip, rowClipStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, rowUnclipStyle]}>
            <Animated.View style={[StyleSheet.absoluteFill, rowFitStyle]}>
              <AnimatedNativeGlassBlur
                style={[styles.row, rowPadStyle]}
                animatedProps={rowBlurProps}
                accessibilityRole="tablist">
                {tabs.map((tab, index) => (
                  <TabItem
                    key={tab.name}
                    tab={tab}
                    index={index}
                    middleIndex={middleIndex}
                    tintColor={tintColor}
                    selected={index === focusedIndex}
                    lensPosition={lensPosition}
                    labelWidths={state.labelWidths}
                    lift={lift}
                    shine={shine}
                    presence={lensPresence}
                    cover={iconCover}
                    covered={coveredIcons}
                    collapsed={collapsed}
                    collapseX={collapseX}
                    collapseSpread={collapseSpread}
                    inkTone={inkTone}
                    swell={swell}
                    entering={tabEnter}
                    handoff={index === backIndex ? searchMode : undefined}
                    onActivate={selectTab}
                  />
                ))}
              </AnimatedNativeGlassBlur>
            </Animated.View>
          </Animated.View>
        </Animated.View>
        <NativeGlassBackdrop
          group={revealGroup}
          offscreen
          style={StyleSheet.absoluteFill}
          importantForAccessibility="no-hide-descendants">
          <View style={[styles.row, rowPadStyle]}>
            {tabs.map((tab, index) => (
              <TabItem
                key={tab.name}
                tab={tab}
                index={index}
                middleIndex={middleIndex}
                tintColor={tintColor}
                selected={index === focusedIndex}
                lensPosition={lensPosition}
                labelWidths={state.labelWidths}
                lift={lift}
                shine={shine}
                presence={lensPresence}
                cover={iconCover}
                covered={coveredIcons}
                collapsed={collapsed}
                collapseX={collapseX}
                collapseSpread={collapseSpread}
                inkTone={inkTone}
                swell={swell}
                entering={tabEnter}
                revealed
                onActivate={selectTab}
              />
            ))}
          </View>
        </NativeGlassBackdrop>
        <Animated.View style={[styles.lens, lensGlassStyle, lensWidthStyle]}>
          <AnimatedNativeGlassView
            style={styles.lensGlass}
            animatedProps={lensSideProps}
            rimOutBand={glass.lensRimOut.band}
            group={tabBarGroup}
            underlay={screenGroup}
            inset={glass.lensPad}
            refractionYScale={glass.lensRefractionYScale}
            cornerRadius={lensFullHeight / 2}
            continuous={1}
            blurRadius={glass.lensBlurRadius}
            bezel={glass.lensBezel}
            refraction={glass.lensRefraction}
            falloff={glass.lensFalloff}
            dispersion={glass.lensDispersion}
            magnify={glass.lensMagnify}
            pinchWidth={glass.lensPinchWidth}
            sharpWidth={glass.lensShadeWidth}
            lightAngle={glass.lightAngle}
            rimSide={glass.lensRimSide[scheme]}
            shadowRadius={glass.lensShadowRadius}
            shadowOffset={glass.lensShadowOffset}
          />
        </Animated.View>
        <Animated.View style={[styles.lens, lensIconStyle, lensWidthStyle]}>
          <AnimatedNativeGlassView
            style={styles.lensGlass}
            animatedProps={lensIconProps}
            rimOutBand={glass.lensRimOut.band}
            group={revealGroup}
            alphaPass
            inset={glass.lensPad}
            refractionYScale={glass.lensRefractionYScale}
            cornerRadius={lensFullHeight / 2}
            continuous={1}
            blurRadius={glass.lensBlurRadius}
            bezel={glass.lensBezel}
            refraction={glass.lensRefraction}
            falloff={glass.lensFalloff}
            dispersion={glass.lensDispersion}
            magnify={glass.lensMagnify}
          />
        </Animated.View>
        {hasBadges ? (
          <Animated.View
            style={[styles.rowClip, rowClipStyle]}
            pointerEvents="none"
            importantForAccessibility="no-hide-descendants">
            <Animated.View style={[StyleSheet.absoluteFill, rowUnclipStyle]}>
              <Animated.View style={[StyleSheet.absoluteFill, rowFitStyle]}>
                <View style={[styles.row, rowPadStyle]}>
                  {tabs.map((tab, index) => (
                    <TabItem
                      key={tab.name}
                      tab={tab}
                      index={index}
                      middleIndex={middleIndex}
                      tintColor={tintColor}
                      selected={index === focusedIndex}
                      lensPosition={lensPosition}
                      labelWidths={state.labelWidths}
                      lift={lift}
                      shine={shine}
                      presence={lensPresence}
                      cover={iconCover}
                      covered={coveredIcons}
                      collapsed={collapsed}
                      collapseX={collapseX}
                      collapseSpread={collapseSpread}
                      inkTone={inkTone}
                      swell={swell}
                      entering={tabEnter}
                      handoff={index === backIndex ? searchMode : undefined}
                      badgeOnly
                      badgeColor={badgeColor}
                      badgeTextColor={badgeTextColor}
                      onActivate={selectTab}
                    />
                  ))}
                </View>
              </Animated.View>
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>
      {searchTab ? (
        <SearchMode
          active={searchFocused}
          idle={idleFade}
          onCancel={idleSearch}
          onWake={wakeSearch}
          fieldPress={state.fieldPress}
          mode={searchMode}
          backTab={tabs[backIndex]}
          searchTab={searchTab}
          tintColor={tintColor}
          badgeColor={badgeColor}
          badgeTextColor={badgeTextColor}
          backPress={backPress}
          travel={{
            index: backIndex,
            slotWidth: fullItemWidth,
            width: barWidth,
            circle: searchCenter,
            press: searchPress.press,
            target: modeTarget,
            fit: rowFit,
          }}
          onBack={backSearch}
          backDrag={backDrag}
          keyboard={searchRaise}
          spread={keyboardSpread}
          reach={keyboardReach}
          sink={tileSink}
          dip={searchDip}
        />
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
  },
  backdrop: {
    flexDirection: 'row',
    gap: layout.tabBarGap,
  },
  rowClip: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
    borderRadius: fullHeight / 2,
  },
  lensOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: fullHeight,
  },
  barGlass: {
    position: 'absolute',
    top: -glass.pad,
    left: -glass.pad,
    right: -glass.pad,
    bottom: -glass.pad,
  },
  frame: {
    height: fullHeight,
  },
  // Pushes search's circle to the span's end past a bar narrower than it; it takes back its own gap, so a bar that
  // fills the span leaves the circle where it was.
  grow: {
    flex: 1,
    marginLeft: -layout.tabBarGap,
  },
  search: {
    width: fullHeight,
    height: fullHeight,
  },
  pressFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: fullHeight / 2,
  },
  pillLift: {
    ...StyleSheet.absoluteFill,
    borderRadius: fullHeight / 2,
  },
  searchIcon: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lens: {
    position: 'absolute',
    top: rowInset,
    left: inlinePad,
    width: layout.bubbleRestWidth,
    height: lensFullHeight,
  },
  lensGlass: {
    position: 'absolute',
    top: -glass.lensPad,
    left: -glass.lensPad,
    right: -glass.lensPad,
    bottom: -glass.lensPad,
  },
  lensLayer: {
    ...StyleSheet.absoluteFill,
    borderRadius: lensFullHeight / 2,
    overflow: 'hidden',
  },
  row: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    paddingVertical: rowInset,
    paddingHorizontal: inlinePad,
  },
});
