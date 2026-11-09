#!/usr/bin/env node
/**
 * Captures a component's comparison pages (example/compare) on the booted iOS simulator and the connected Android
 * emulator, in light and dark mode, and lays each pair out with a diff.
 *
 *   npm run compare -- button
 *   npm run compare -- button --scheme dark --page 2 --probe glass=40,500
 *
 * Needs Metro running in example/ (npx expo start), the example app installed on both devices, one booted simulator and
 * one adb device. Writes to .compare/<component>/: <scheme>-p<page>.png (iOS | Android | diff) and a report.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { PNG } = require('pngjs');

const APP = 'expo.modules.lucent.example';
const SCHEME = 'lucent-example';
const METRO = 'http://localhost:8081';
// The example app polls this port for the page to show (example/compare/useCompareDriver.ts).
const DRIVER_PORT = 8099;
// iPhones the example runs on draw at 3x; comparisons happen at this scale.
const IOS_SCALE = 3;
// Matches compareTop in example/compare/Frame.tsx, less a margin: everything above is status bar.
const CROP_TOP = 100;
// Leaves out the home indicator and Android's gesture bar.
const CROP_BOTTOM = 40;
// A channel difference above this counts as a changed pixel.
const DIFF_THRESHOLD = 24;
// After both apps say they're on the page: time for images, icons and glass to settle.
const SETTLE_MS = 1500;
const SHOWN_TIMEOUT_MS = 60000;
// Switching the scheme re-renders everything; give both apps a moment before navigating.
const SCHEME_MS = 2000;
const LAUNCH_MS = 20000;
const GAP = 12;

const root = path.join(__dirname, '..');

// Undoes anything the run changed on the devices; set once the emulator's screen has been matched.
let restore = () => {};

const fail = (message) => {
  restore();
  console.error(`compare: ${message}`);
  process.exit(1);
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, { encoding: options.binary ? 'buffer' : 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'pipe'] });

const tryRun = (command, args) => {
  try {
    return run(command, args);
  } catch {
    return null;
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseArgs = (argv) => {
  const options = { component: null, schemes: ['light', 'dark'], pages: null, probes: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--scheme') options.schemes = [argv[++i]];
    else if (arg === '--page') options.pages = [Number(argv[++i])];
    else if (arg === '--probe') {
      const match = /^([^=]+)=(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)$/.exec(argv[++i] ?? '');
      if (!match) fail('--probe takes name=x,y in points, for example --probe glass=40,500');
      options.probes.push({ name: match[1], x: Number(match[2]), y: Number(match[3]) });
    } else if (!arg.startsWith('-') && !options.component) options.component = arg;
    else fail(`unknown argument ${arg}`);
  }
  if (!options.component) fail('name a component, for example: npm run compare -- button');
  if (options.schemes.some((scheme) => scheme !== 'light' && scheme !== 'dark')) fail('--scheme is light or dark');
  return options;
};

// The comparison's page count, read from its file so the script needs no build step. A reference (an iOS component
// Lucent doesn't have yet) lives in references/ and is captured on iOS alone.
const findComparison = (component) => {
  const compare = path.join(root, 'example', 'compare');
  const file = [path.join(compare, `${component}.tsx`), path.join(compare, 'references', `${component}.ios.tsx`)].find(
    (candidate) => fs.existsSync(candidate),
  );
  if (!file) fail(`no comparison for "${component}": write example/compare/${component}.tsx`);
  const source = fs.readFileSync(file, 'utf8');
  const match = /pages:\s*\[([^\]]*)\]/.exec(source);
  return {
    pages: match ? match[1].split(',').filter((name) => name.trim()).length : 1,
    reference: /reference:\s*true/.test(source),
  };
};

const findDevices = (reference) => {
  const list = JSON.parse(run('xcrun', ['simctl', 'list', 'devices', 'booted', '-j']));
  const ios = Object.values(list.devices).flat()[0];
  if (!ios) fail('no booted iOS simulator: xcrun simctl boot "<device>"');
  const android = run('adb', ['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t'))
    .find((parts) => parts[1] === 'device')?.[0];
  if (!android) {
    if (reference) return { ios: ios.udid, iosName: ios.name, android: null, density: 1 };
    fail('no Android device: start an emulator, for example emulator -avd Pixel_9_Pro');
  }
  const density = Number(/(\d+)\s*$/.exec(run('adb', ['-s', android, 'shell', 'wm', 'density']).trim())[1]) / 160;
  return { ios: ios.udid, iosName: ios.name, android, density };
};

const adb = (devices, ...args) => run('adb', ['-s', devices.android, ...args]);

const ensureApps = async (devices) => {
  if (!tryRun('curl', ['-s', `${METRO}/status`])?.includes('running')) {
    fail('Metro is not running: cd example && npx expo start');
  }
  // Hides the dev menu's floating button for the session, which would otherwise sit in every capture.
  const launcher = `${SCHEME}://expo-development-client/?url=${encodeURIComponent(METRO)}&__expo_disable_fab=1`;
  let launched = false;
  if (devices.android) {
    adb(devices, 'reverse', 'tcp:8081', 'tcp:8081');
    adb(devices, 'reverse', `tcp:${DRIVER_PORT}`, `tcp:${DRIVER_PORT}`);
  }
  if (devices.android && !tryRun('adb', ['-s', devices.android, 'shell', 'pidof', APP])?.trim()) {
    adb(devices, 'shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `'${launcher}'`);
    launched = true;
  }
  const iosRunning = tryRun('xcrun', ['simctl', 'spawn', devices.ios, 'launchctl', 'list'])?.includes(APP);
  if (!iosRunning) {
    run('xcrun', ['simctl', 'openurl', devices.ios, launcher]);
    launched = true;
  }
  if (launched) {
    console.log('Waiting for the apps to load their bundles…');
    await sleep(LAUNCH_MS);
  }
};

// The emulator takes on the simulator's screen, in pixels and density, so both lay out the same points; restored after.
const matchScreen = (devices) => {
  if (!devices.android) return () => {};
  const iosShot = path.join(fs.mkdtempSync('/tmp/lucent-compare-'), 'size.png');
  run('xcrun', ['simctl', 'io', devices.ios, 'screenshot', iosShot]);
  const { width, height } = PNG.sync.read(fs.readFileSync(iosShot));
  adb(devices, 'shell', 'wm', 'size', `${width}x${height}`);
  adb(devices, 'shell', 'wm', 'density', String(IOS_SCALE * 160));
  devices.density = IOS_SCALE;
  return () => {
    adb(devices, 'shell', 'wm', 'size', 'reset');
    adb(devices, 'shell', 'wm', 'density', 'reset');
  };
};

const setScheme = (devices, scheme) => {
  run('xcrun', ['simctl', 'ui', devices.ios, 'appearance', scheme]);
  if (devices.android) adb(devices, 'shell', 'cmd', 'uimode', 'night', scheme === 'dark' ? 'yes' : 'no');
};

// Serves the page the apps should show and hears back when each one is on it. Each `show` makes a new key, which the
// apps take as a new navigation; it resolves once every platform asked for has reported that key.
const startDriver = () => {
  let current = { href: '/', key: '' };
  let reported = new Set();
  // Where each platform's safe area starts, in points, for pages that fill the screen.
  let tops = {};
  let onReport = () => {};
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/shown' && url.searchParams.get('key') === current.key) {
      const os = url.searchParams.get('os');
      reported.add(os);
      if (url.searchParams.has('top')) tops[os] = Number(url.searchParams.get('top'));
      onReport();
    }
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(current));
  });
  return new Promise((resolve, reject) => {
    server.once('error', (error) =>
      reject(error.code === 'EADDRINUSE' ? new Error(`port ${DRIVER_PORT} is busy; is another compare running?`) : error),
    );
    server.listen(DRIVER_PORT, () =>
      resolve({
        show: (component, page, platforms) =>
          new Promise((done, timeout) => {
            current = { href: `/compare/${component}?page=${page}`, key: `${component}-${page}-${Date.now()}` };
            reported = new Set();
            tops = {};
            const timer = setTimeout(() => {
              const missing = platforms.filter((os) => !reported.has(os)).join(' and ');
              timeout(new Error(`the ${missing} app never showed ${component} page ${page}; is it open and on Metro?`));
            }, SHOWN_TIMEOUT_MS);
            onReport = () => {
              if (platforms.every((os) => reported.has(os))) {
                clearTimeout(timer);
                done(tops);
              }
            };
          }),
        close: () => server.close(),
      }),
    );
  });
};

// A slow emulator can raise "isn't responding" over the app. Tapping Wait keeps the dialog out of the shot.
const clearAnr = async (devices) => {
  if (!devices.android) return;
  for (let attempt = 0; attempt < 5; attempt++) {
    const focus = tryRun('adb', ['-s', devices.android, 'shell', 'dumpsys', 'window']) ?? '';
    if (!/mCurrentFocus=.*Not Responding/.test(focus)) return;
    console.log('Android raised "isn\'t responding"; waiting it out…');
    adb(devices, 'shell', 'uiautomator', 'dump', '/sdcard/lucent-ui.xml');
    const bounds = /resource-id="android:id\/aerr_wait"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(
      adb(devices, 'shell', 'cat', '/sdcard/lucent-ui.xml'),
    );
    if (bounds) {
      const [x1, y1, x2, y2] = bounds.slice(1).map(Number);
      adb(devices, 'shell', 'input', 'tap', String((x1 + x2) >> 1), String((y1 + y2) >> 1));
    }
    await sleep(SETTLE_MS);
  }
  fail('Android keeps raising "isn\'t responding"; the emulator may be starved of CPU');
};

const capture = (devices) => {
  const iosFile = path.join(fs.mkdtempSync('/tmp/lucent-compare-'), 'ios.png');
  run('xcrun', ['simctl', 'io', devices.ios, 'screenshot', iosFile]);
  const ios = PNG.sync.read(fs.readFileSync(iosFile));
  const android = devices.android
    ? PNG.sync.read(run('adb', ['-s', devices.android, 'exec-out', 'screencap', '-p'], { binary: true }))
    : null;
  return { ios, android };
};

// Area-averaged resample, so Android's capture lines up point for point with the iOS one.
const resample = (image, factor) => {
  if (Math.abs(factor - 1) < 1e-3) return image;
  const width = Math.round(image.width * factor);
  const height = Math.round(image.height * factor);
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    const y0 = y / factor;
    const y1 = Math.min((y + 1) / factor, image.height);
    for (let x = 0; x < width; x++) {
      const x0 = x / factor;
      const x1 = Math.min((x + 1) / factor, image.width);
      const sum = [0, 0, 0, 0];
      let area = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) {
        const wy = Math.min(sy + 1, y1) - Math.max(sy, y0);
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          const w = wy * (Math.min(sx + 1, x1) - Math.max(sx, x0));
          const i = (sy * image.width + sx) * 4;
          for (let c = 0; c < 4; c++) sum[c] += image.data[i + c] * w;
          area += w;
        }
      }
      const o = (y * width + x) * 4;
      for (let c = 0; c < 4; c++) out.data[o + c] = Math.round(sum[c] / area);
    }
  }
  return out;
};

const crop = (image, top, width, height) => {
  const out = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    image.data.copy(out.data, y * width * 4, ((top + y) * image.width) * 4, ((top + y) * image.width + width) * 4);
  }
  return out;
};

// Black where the two match, brightening to red as they differ; matching areas keep a faint trace of the iOS image.
const diff = (a, b) => {
  const out = new PNG({ width: a.width, height: a.height });
  let changed = 0;
  let total = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const delta = Math.max(
      Math.abs(a.data[i] - b.data[i]),
      Math.abs(a.data[i + 1] - b.data[i + 1]),
      Math.abs(a.data[i + 2] - b.data[i + 2]),
    );
    total += delta;
    if (delta > DIFF_THRESHOLD) changed++;
    const trace = (a.data[i] + a.data[i + 1] + a.data[i + 2]) / 3 / 8;
    out.data[i] = Math.min(255, trace + delta * 2);
    out.data[i + 1] = trace;
    out.data[i + 2] = trace;
    out.data[i + 3] = 255;
  }
  const pixels = a.data.length / 4;
  return { image: out, changed: changed / pixels, mean: total / pixels / 255 };
};

const sideBySide = (images) => {
  const width = images.reduce((sum, image) => sum + image.width, 0) + GAP * (images.length - 1);
  const height = Math.max(...images.map((image) => image.height));
  const out = new PNG({ width, height });
  out.data.fill(128);
  let left = 0;
  for (const image of images) {
    PNG.bitblt(image, out, 0, 0, image.width, image.height, left, 0);
    left += image.width + GAP;
  }
  return out;
};

// The average colour of a 3×3 point patch, at (x, y) in points from the top of the screen; `top` is where the
// capture was cropped, in points.
const probe = (image, x, y, top) => {
  const sum = [0, 0, 0];
  let count = 0;
  for (let py = (y - top - 1) * IOS_SCALE; py < (y - top + 2) * IOS_SCALE; py++) {
    for (let px = (x - 1) * IOS_SCALE; px < (x + 2) * IOS_SCALE; px++) {
      if (px < 0 || py < 0 || px >= image.width || py >= image.height) continue;
      const i = (py * image.width + px) * 4;
      for (let c = 0; c < 3; c++) sum[c] += image.data[i + c];
      count++;
    }
  }
  if (!count) return null;
  return sum.map((value) => Math.round(value / count));
};

const hex = (rgb) => (rgb ? `#${rgb.map((value) => value.toString(16).padStart(2, '0')).join('')}` : 'out of frame');

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  const comparison = findComparison(options.component);
  const pages = options.pages ?? Array.from({ length: comparison.pages }, (_, i) => i + 1);
  const devices = findDevices(comparison.reference);
  const platforms = comparison.reference ? ['ios'] : ['ios', 'android'];
  console.log(
    comparison.reference
      ? `iOS: ${devices.iosName} · reference, so iOS only`
      : `iOS: ${devices.iosName} · Android: ${devices.android} at ${devices.density}x`,
  );
  const driver = await startDriver().catch((error) => fail(error.message));
  await ensureApps(devices);
  restore = matchScreen(devices);
  process.once('SIGINT', () => fail('interrupted'));

  const outDir = path.join(root, '.compare', options.component);
  fs.mkdirSync(outDir, { recursive: true });
  const report = [];

  for (const scheme of options.schemes) {
    setScheme(devices, scheme);
    await sleep(SCHEME_MS);
    for (const page of pages) {
      const tops = await driver.show(options.component, page, platforms);
      await sleep(SETTLE_MS);
      await clearAnr(devices);
      const shot = capture(devices);
      if (comparison.reference) {
        // The whole screen, status bar included: references often draw into it (navigation bars, sheets).
        const file = path.join(outDir, `${scheme}-p${page}.png`);
        fs.writeFileSync(file, PNG.sync.write(shot.ios));
        const line = `${scheme} · page ${page}: ${path.relative(root, file)}`;
        console.log(line);
        report.push(line);
        continue;
      }
      const ios = shot.ios;
      const android = resample(shot.android, IOS_SCALE / devices.density);
      // Framed pages start below any status bar; pages that fill the screen line up at each phone's safe area.
      const iosTop = Math.round((tops.ios ?? CROP_TOP) * IOS_SCALE);
      const androidTop = Math.round((tops.android ?? CROP_TOP) * IOS_SCALE);
      const width = Math.min(ios.width, android.width);
      // A framed page leaves out the home indicator and gesture bar; one that fills the screen keeps its bottom bars.
      const bottom = tops.ios === undefined ? CROP_BOTTOM * IOS_SCALE : 0;
      const height = Math.min(ios.height - iosTop, android.height - androidTop) - bottom;
      const a = crop(ios, iosTop, width, height);
      const b = crop(android, androidTop, width, height);
      const result = diff(a, b);
      const file = path.join(outDir, `${scheme}-p${page}.png`);
      fs.writeFileSync(file, PNG.sync.write(sideBySide([a, b, result.image])));

      const lines = [
        `${scheme} · page ${page}: ${(result.changed * 100).toFixed(1)}% of pixels differ, mean difference ${(result.mean * 100).toFixed(1)}%`,
        `  ${path.relative(root, file)}`,
      ];
      for (const point of options.probes) {
        const left = probe(a, point.x, point.y, iosTop / IOS_SCALE);
        const right = probe(b, point.x, point.y, androidTop / IOS_SCALE);
        const delta = left && right ? Math.max(...left.map((value, c) => Math.abs(value - right[c]))) : null;
        lines.push(`  ${point.name} (${point.x}, ${point.y}): iOS ${hex(left)} · Android ${hex(right)}${delta === null ? '' : ` · Δ${delta}`}`);
      }
      console.log(lines.join('\n'));
      report.push(...lines);
    }
  }
  fs.writeFileSync(path.join(outDir, 'report.txt'), `${report.join('\n')}\n`);
  driver.close();
  restore();
};

main().catch((error) => fail(error.message));
