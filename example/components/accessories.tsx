import MaskedViewClass, { type MaskedViewProps } from '@react-native-masked-view/masked-view';
import { NativeTabs } from 'expo-lucent/navigation';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState, useSyncExternalStore, type ComponentType } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { usePalette } from '@/components/ui';

// The bottom accessory takes any content, as iOS's does (UITabAccessory's contentView): these show three kinds. Each
// reads its placement and draws a shorter copy once the bar minimizes.

// Its class typings predate this React's; it's the same component.
const MaskedView = MaskedViewClass as unknown as ComponentType<MaskedViewProps>;

// What's playing lives outside the accessory too: iOS draws its content twice, once per placement.
const tracks = [
  { title: 'Liquid Glass (Extended Refraction Mix)', artist: 'The Lucent Band', art: '#FF8433' },
  { title: 'Continuous Corners', artist: 'Squircle Society', art: '#0A84FF' },
  { title: 'Specular Highlights on a Rainy Afternoon', artist: 'Prism Sound', art: '#BF5AF2' },
];
const player = { track: 0, playing: true };
const playerListeners = new Set<() => void>();
const emitPlayer = () => playerListeners.forEach((listener) => listener());
const togglePlay = () => {
  player.playing = !player.playing;
  emitPlayer();
};
const nextTrack = () => {
  player.track = (player.track + 1) % tracks.length;
  player.playing = true;
  emitPlayer();
};
const subscribePlayer = (listener: () => void) => {
  playerListeners.add(listener);
  return () => playerListeners.delete(listener);
};
const playerSnapshot = () => `${player.track}:${player.playing}`;

// A title too long for its room scrolls by, as Music's does: it waits, glides one copy's width plus a gap to the left
// at an even pace, and starts again.
// Its edges fade out over `fade` points: the trailing one whenever it's too long, the leading one once it has moved
// off its start.
const marquee = { gap: 36, speed: 32, wait: 1600, fade: 14 };

// The fade's alpha, transparent to opaque left to right (or the other way). A view's own gradient, not an SVG: Android's
// mask is drawn from a snapshot of its views, which an SVG hasn't drawn into yet.
const FadeRamp = ({ flip }: { flip?: boolean }) => (
  <View
    style={[
      styles.ramp,
      {
        experimental_backgroundImage: `linear-gradient(to ${flip ? 'left' : 'right'}, rgba(0,0,0,0), rgba(0,0,0,1))`,
      },
    ]}
  />
);

const Marquee = ({ text, style, running }: { text: string; style: object; running: boolean }) => {
  const [room, setRoom] = useState(0);
  const [width, setWidth] = useState(0);
  const offset = useSharedValue(0);
  const overflows = width > room && room > 0;
  useEffect(() => {
    cancelAnimation(offset);
    offset.set(0);
    if (!overflows || !running) return;
    const distance = width + marquee.gap;
    offset.set(
      withRepeat(
        withSequence(
          withDelay(
            marquee.wait,
            withTiming(-distance, { duration: (distance / marquee.speed) * 1000, easing: Easing.linear }),
          ),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
  }, [overflows, running, width, offset, text]);
  const slideStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));
  // At its start the leading edge is crisp, in line with the artist under it; it fades in as the title moves off. Each
  // fade is its own mask that never changes, the title showing through one or the other: Android redraws a mask's
  // snapshot whenever anything in it moves, every frame of an animated one.
  const leadStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.max(0, -offset.get() / marquee.fade)),
  }));
  const restStyle = useAnimatedStyle(() => ({
    opacity: 1 - Math.min(1, Math.max(0, -offset.get() / marquee.fade)),
  }));
  const slide = (measure: boolean) => (
    <Animated.View style={[styles.slide, slideStyle]}>
      <Text
        style={style}
        importantForAccessibility={measure ? 'auto' : 'no'}
        onLayout={measure ? (event) => setWidth(event.nativeEvent.layout.width) : undefined}>
        {text}
      </Text>
      {overflows ? (
        <Text style={[style, { marginLeft: marquee.gap }]} importantForAccessibility="no">
          {text}
        </Text>
      ) : null}
    </Animated.View>
  );
  const mask = (lead: boolean) => (
    <View style={styles.mask}>
      {lead ? <FadeRamp /> : <View style={[styles.ramp, styles.opaque]} />}
      <View style={[styles.fill, styles.opaque]} />
      <FadeRamp flip />
    </View>
  );
  return (
    <View style={styles.marquee} onLayout={(event) => setRoom(event.nativeEvent.layout.width)}>
      {overflows ? (
        <>
          <Animated.View style={restStyle}>
            <MaskedView maskElement={mask(false)}>{slide(true)}</MaskedView>
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, leadStyle]}>
            <MaskedView maskElement={mask(true)}>{slide(false)}</MaskedView>
          </Animated.View>
        </>
      ) : (
        slide(true)
      )}
    </View>
  );
};

/**
 * A now-playing bar, as in Music: the artwork, the title scrolling by when it's too long and the artist under it, and
 * buttons to play or pause and to skip. Minimized, the artwork, the title and play or pause.
 */
export const NowPlaying = () => {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { text, secondary } = usePalette();
  useSyncExternalStore(subscribePlayer, playerSnapshot);
  const { title, artist, art } = tracks[player.track];
  const inline = placement === 'inline';
  return (
    <View style={styles.row}>
      <View style={[styles.art, { backgroundColor: art }]} />
      <View style={styles.status}>
        <Marquee key={title} text={title} running={player.playing} style={[styles.label, { color: text }]} />
        {inline ? null : (
          <Text style={[styles.artist, { color: secondary }]} numberOfLines={1}>
            {artist}
          </Text>
        )}
      </View>
      <Pressable hitSlop={8} accessibilityLabel={player.playing ? 'Pause' : 'Play'} onPress={togglePlay}>
        <SymbolView
          name={player.playing ? { ios: 'pause.fill', android: 'pause' } : { ios: 'play.fill', android: 'play_arrow' }}
          size={20}
          tintColor={text}
        />
      </Pressable>
      {inline ? null : (
        <Pressable hitSlop={8} accessibilityLabel="Next" onPress={nextTrack}>
          <SymbolView name={{ ios: 'forward.fill', android: 'fast_forward' }} size={22} tintColor={text} />
        </Pressable>
      )}
    </View>
  );
};

// The upload's state lives outside the accessory: iOS draws the accessory's content twice, once per placement, and
// both copies have to show the same upload.
const photos = 8;
const upload = { done: 0, paused: false };
let uploadTimer: ReturnType<typeof setInterval> | null = null;
const uploadListeners = new Set<() => void>();
const emitUpload = () => uploadListeners.forEach((listener) => listener());
const stopUpload = () => {
  if (uploadTimer) clearInterval(uploadTimer);
  uploadTimer = null;
};
const runUpload = () => {
  stopUpload();
  uploadTimer = setInterval(() => {
    upload.done = Math.min(upload.done + 1, photos);
    if (upload.done === photos) stopUpload();
    emitUpload();
  }, 900);
};
const restartUpload = () => {
  upload.done = 0;
  upload.paused = false;
  runUpload();
  emitUpload();
};
const togglePause = () => {
  upload.paused = !upload.paused;
  if (upload.paused) stopUpload();
  else runUpload();
  emitUpload();
};
const subscribeUpload = (listener: () => void) => {
  uploadListeners.add(listener);
  if (!uploadTimer && !upload.paused && upload.done < photos) runUpload();
  return () => {
    uploadListeners.delete(listener);
    if (uploadListeners.size === 0) stopUpload();
  };
};
const uploadSnapshot = () => `${upload.done}:${upload.paused}`;

/**
 * An upload, as in Photos: a status line with its progress, a button to pause or resume it, and once every photo is
 * up, a finished state with a button to start again.
 */
export const Upload = () => {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { text, secondary } = usePalette();
  useSyncExternalStore(subscribeUpload, uploadSnapshot);
  const { done, paused } = upload;
  const finished = done === photos;
  const fraction = useSharedValue(done / photos);
  useEffect(() => {
    fraction.set(withTiming(done / photos, { duration: 800 }));
  }, [done, fraction]);
  const progressStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fraction.get() }] }));
  const inline = placement === 'inline';
  const status = finished
    ? inline
      ? 'Uploaded'
      : `${photos} photos uploaded`
    : inline
      ? `${done} of ${photos}`
      : `${paused ? 'Paused' : 'Uploading'} ${done} of ${photos} photos`;
  return (
    <View style={styles.row}>
      <SymbolView
        name={
          finished
            ? { ios: 'checkmark.icloud', android: 'cloud_done' }
            : { ios: 'icloud.and.arrow.up', android: 'cloud_upload' }
        }
        size={20}
        tintColor={text}
      />
      <View style={styles.status}>
        <Text style={[styles.label, { color: text }]} numberOfLines={1}>
          {status}
        </Text>
        {finished ? null : (
          <View style={[styles.track, { backgroundColor: secondary }]}>
            <Animated.View style={[styles.progress, progressStyle]} />
          </View>
        )}
      </View>
      <Pressable
        hitSlop={8}
        accessibilityLabel={finished ? 'Upload again' : paused ? 'Resume' : 'Pause'}
        onPress={finished ? restartUpload : togglePause}>
        <SymbolView
          name={
            finished
              ? { ios: 'arrow.clockwise', android: 'refresh' }
              : paused
                ? { ios: 'play.fill', android: 'play_arrow' }
                : { ios: 'pause.fill', android: 'pause' }
          }
          size={20}
          tintColor={text}
        />
      </Pressable>
    </View>
  );
};

/** Actions for the screen, as in Notes: a primary one, and more beside it once there's room. */
export const Actions = () => {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  const { text } = usePalette();
  return (
    <View style={[styles.row, styles.actions]}>
      {placement === 'regular' ? (
        <Pressable hitSlop={8} accessibilityLabel="Filter">
          <SymbolView name={{ ios: 'line.3.horizontal.decrease', android: 'filter_list' }} size={20} tintColor={text} />
        </Pressable>
      ) : null}
      <Text style={[styles.title, styles.center, { color: text }]} numberOfLines={1}>
        {placement === 'inline' ? '12 notes' : '12 notes, updated just now'}
      </Text>
      <Pressable hitSlop={8} accessibilityLabel="New note">
        <SymbolView name={{ ios: 'square.and.pencil', android: 'edit_square' }} size={20} tintColor={text} />
      </Pressable>
    </View>
  );
};

export const accessories = { nowPlaying: NowPlaying, upload: Upload, actions: Actions } as const;
export type AccessoryKind = 'none' | keyof typeof accessories;

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  actions: { paddingHorizontal: 18 },
  art: { width: 32, height: 32, borderRadius: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  label: { fontSize: 15, fontWeight: '600' },
  artist: { fontSize: 12 },
  marquee: { overflow: 'hidden' },
  mask: { ...StyleSheet.absoluteFill, flexDirection: 'row' },
  fill: { flex: 1 },
  ramp: { width: marquee.fade, height: '100%' },
  opaque: { backgroundColor: 'black' },
  // Wide enough that the title lays out on one line at its own width, clipped by the marquee.
  slide: { flexDirection: 'row', width: 4000 },
  center: { textAlign: 'center' },
  status: { flex: 1, gap: 4, justifyContent: 'center' },
  track: { height: 3, borderRadius: 1.5, overflow: 'hidden' },
  progress: { width: '100%', height: '100%', backgroundColor: '#0A84FF', transformOrigin: 'left' },
});
