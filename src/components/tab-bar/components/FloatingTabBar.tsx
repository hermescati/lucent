import { useEffect, useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
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

import { BottomAccessoryBar } from './BottomAccessoryBar';
import { CloseGlyph } from './CloseGlyph';
import { SearchMode } from './SearchMode';
import { TabIcon } from './TabIcon';
import { TabItem } from './TabItem';
import { AnimatedNativeGlassBlur, AnimatedNativeGlassView, NativeGlassBackdrop } from '../../../core/glass/NativeGlass';
import { glass } from '../../../theme/tokens';
import {
  clamp01,
  fullHeight,
  inlinePad,
  lerp,
  lensFullHeight,
  revealGroup,
  rowInset,
  screenGroup,
  tabBarGroup,
  tick,
} from '../helpers/bar';
import { mirror, mirrored } from '../helpers/mirror';
import { moreName, useMore } from '../helpers/more';
import { tabEnterAfter } from '../helpers/presence';
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
    // More isn't a route: it shows its list over the last tab chosen, which any other tab closes; or, if More last
    // went on to one of its tabs, that tab again, as iOS's More keeps its place.
    const opening = tabs[index].name === moreName;
    const top = opening ? more?.top : null;
    const go = () => {
      more?.setOpen(opening && !top);
      if (!opening || top) {
        switchTab(top ?? tabs[index].name, {});
      }
    };
    // At once as the finger lifts, as iOS 27 shows the page: deferring it a frame or two left the page late and moved
    // the switch's commit, which holds the lens a frame, into the middle of its glide.
    if (wait > 0) {
      setTimeout(go, wait);
    } else {
      go();
    }
  };

  const reselect = (index: number) => {
    const tab = tabs[index];
    if (tab?.name === moreName) {
      // Again, it slides back to its list from a tab under it, as iOS's does.
      if (more && !more.open) {
        more.pop();
      }
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

  // A prominent tab in the circle opens like any tab; the bar's pill leaves its tabs.
  const openApart = (name: string) => {
    if (getTrigger(name)?.isFocused) {
      return;
    }
    tick();
    switchTab(name, {});
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
  const barGlass = useBarGlass({ ...state, ...search, ...lens });
  // Search's circle stays while it melts back into the bar, and its icon travels with the glass (useBarGlass).
  const [meltingTab, setMeltingTab] = useState(props.searchTab);
  if (props.searchTab && props.searchTab !== meltingTab) {
    setMeltingTab(props.searchTab);
  }
  const apartNow = state.hasSearch;
  useAnimatedReaction(
    () => state.searchApart.get() < 0.002,
    (gone, wasGone) => {
      if (gone && !wasGone && !apartNow) scheduleOnRN(setMeltingTab, undefined);
    },
  );
  const circleTab = props.searchTab ?? meltingTab;
  const searchSplitStyle = useAnimatedStyle(() => {
    const apart = state.searchApart.get();
    // Splitting off, the magnifier shows at once; melting back, it's gone by halfway, as the tab's own grows in.
    const from = apartNow ? motion.searchSplit.iconFrom : motion.searchSplit.iconMeltFrom;
    return {
      opacity: clamp01((apart - from) / (1 - from)),
      transform: [
        { translateX: (state.frameWidth.get() - fullHeight / 2 - state.circleCenter) * (1 - apart) },
        { scale: lerp(motion.searchSplit.from, 1, clamp01(apart)) },
      ],
    };
  });
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
    slotPlan,
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
    apartFocused,
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
    plan,
    setLabelSize,
  } = { ...state, ...search, ...press, ...lens, ...barGlass };

  // Each tab at its place, as iOS 27 spaces them.
  const slotStyles = plan.lefts.map((left, index) => ({
    flex: 0,
    width: plan.widths[index],
    marginLeft: index === 0 ? left : left - plan.lefts[index - 1] - plan.widths[index - 1],
  }));

  // Tabs grow in as they're added, not as the bar first appears.
  const ready = useSharedValue(false);
  useEffect(() => {
    ready.set(true);
  }, [ready]);
  const tabEnter = useMemo(() => tabEnterAfter(ready), [ready]);

  const circlePress = !circleTab
    ? undefined
    : !circleTab.searchRole
      ? () => openApart(circleTab.name)
      : searchFocused
        ? searchIdle
          ? () => command('focus')
          : closeSearch
        : openSearch;

  const content = (
    <>
      <BottomAccessoryBar
        span={barSpan}
        left={barLeft}
        bottom={bottom}
        circle={state.hasSearch}
        hidden={searchFocused}
        collapse={state.collapse}
        lift={state.barLift}
        tintColor={tintColor}>
        {props.accessory}
      </BottomAccessoryBar>
      <Animated.View
        style={[styles.bar, { bottom, left: barLeft, width: barSpan }, barLiftStyle]}
        pointerEvents="box-none">
        {/* The tabs' labels at their own widths, unconstrained by their slots, which are sized from them. */}
        <View style={styles.measure} pointerEvents="none" importantForAccessibility="no-hide-descendants">
          {tabs.map((tab) => (
            <Text
              key={tab.name}
              style={styles.measureLabel}
              numberOfLines={1}
              allowFontScaling={false}
              onTextLayout={(event) => setLabelSize(tab.name, event.nativeEvent.lines[0]?.width ?? 0)}>
              {tab.label}
            </Text>
          ))}
        </View>
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
                <Svg style={StyleSheet.absoluteFill}>
                  <AnimatedPath animatedProps={lensFillProps} />
                </Svg>
                <Animated.View style={[styles.lensLayer, lensFillStyle]} />
              </Animated.View>
            </Animated.View>
          </GestureDetector>
          <View style={styles.grow} pointerEvents="none" />
          {circleTab ? (
            <Animated.View
              style={[styles.search, searchSpreadStyle]}
              pointerEvents={searchTab ? 'auto' : 'none'}
              // TalkBack reads its stand-in instead (circleStandIn), after the tabs and search's field.
              importantForAccessibility="no-hide-descendants">
              <Animated.View style={[StyleSheet.absoluteFill, searchSplitStyle]}>
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={circlePress}
                  onPressIn={() => searchPress.onPressIn()}
                  onPressOut={searchPress.onPressOut}
                  accessible={false}>
                  <Animated.View style={[StyleSheet.absoluteFill, searchContentStyle]}>
                    <Animated.View style={[styles.pressFill, { backgroundColor: color.pressFill }, searchFillStyle]} />
                    <Animated.View style={[styles.searchIcon, searchInkStyle]}>
                      <Animated.View style={[styles.searchIcon, searchGlyphStyle]}>
                        <TabIcon
                          icon={circleTab.icon}
                          selected={apartFocused && !circleTab.searchRole}
                          size={layout.searchIconSize}
                          color={apartFocused && !circleTab.searchRole ? (tintColor ?? color.text) : color.text}
                        />
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
            </Animated.View>
          ) : null}
        </NativeGlassBackdrop>
        <Animated.View
          pointerEvents="none"
          // Hidden from TalkBack while search's field is open, as iOS hides them from VoiceOver.
          importantForAccessibility={searchFocused ? 'no-hide-descendants' : 'auto'}
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
                      slotStyle={slotStyles[index]}
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
                  slotStyle={slotStyles[index]}
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
                        slotStyle={slotStyles[index]}
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
        {searchTab?.searchRole ? (
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
              slots: slotPlan,
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
        {circleTab ? (
          // The circle for TalkBack, which reads in the order views are drawn: the circle draws with the bar's glass,
          // before the tabs, where VoiceOver reads iOS's after them and after search's field. Touches pass through to
          // the circle; TalkBack's double tap presses it.
          <Animated.View style={[styles.circleStandIn, searchSpreadStyle]} pointerEvents="none">
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={circlePress}
              accessibilityRole="tab"
              accessibilityLabel={searchFocused && !searchIdle ? 'Close search' : circleTab.label}
              accessibilityState={{ selected: searchFocused }}
            />
          </Animated.View>
        ) : null}
      </Animated.View>
    </>
  );
  // Mirrored in a right-to-left language, as iOS mirrors its bar (helpers/mirror).
  return mirrored ? (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, mirror]}>
      {content}
    </View>
  ) : (
    content
  );
};

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    // Laid out left to right in every language: its places are measured from its left edge, which a right-to-left
    // layout would swap.
    direction: 'ltr',
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
  circleStandIn: {
    position: 'absolute',
    top: 0,
    right: 0,
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
  // The tabs at the places their slot styles give them (helpers/slots), from the bar's left edge.
  row: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    paddingVertical: rowInset,
  },
  measure: {
    position: 'absolute',
    left: -10000,
    top: 0,
    opacity: 0,
  },
  measureLabel: {
    position: 'absolute',
    fontSize: layout.tabLabelSize,
    fontWeight: '500',
  },
});
