// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Let Metro read the module's files in the parent folder. `experiments.autolinkingModuleResolution`
// in app.json then resolves the module, and react-native, expo and other packages that the module
// also installs in ../node_modules, to the copies that autolinking uses for this app.
config.watchFolders = [path.resolve(__dirname, '..')];

// Resolve the module's own imports (its peer dependencies) from this app, so the source in ../src
// never loads a second copy of a package from ../node_modules.
const moduleSource = path.resolve(__dirname, '..', 'src');
const appOrigin = path.resolve(__dirname, 'package.json');
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const fromModule = context.originModulePath.startsWith(moduleSource) && !moduleName.startsWith('.');
  return context.resolveRequest(
    fromModule ? { ...context, originModulePath: appOrigin } : context,
    moduleName,
    platform,
  );
};

module.exports = config;
