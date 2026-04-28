const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch workspace packages so Metro can resolve @muzgram/* imports
config.watchFolders = [workspaceRoot];

// With pnpm node-linker=hoisted, all packages land in workspaceRoot/node_modules.
// Tell Metro to look there first so every module resolves to the single hoisted copy.
config.resolver.nodeModulesPaths = [
  path.resolve(workspaceRoot, 'node_modules'),
  path.resolve(projectRoot, 'node_modules'),
];

// Singleton paths — all imports of these packages resolve to the same file
// regardless of which workspace sub-package issues the require, preventing
// "Invalid hook call / duplicate React" errors in the monorepo.
// Note: react-native is intentionally excluded because forcing it to a single
// file path breaks ES-module interop for subpath imports (getDevServer, etc.).
const singletons = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-dom': path.resolve(workspaceRoot, 'node_modules/react-dom'),
};

// Fix: @expo/metro-runtime/src/messageSocket.native.ts uses require() (CJS) to import
// react-native ES modules (getDevServer, WebSocket), getting the namespace object
// instead of the default export, causing "not a function / constructor not callable".
// We redirect to a fixed version that adds proper __esModule interop.
// The path check uses 'effects.native' (no slash) so it works on Windows too.
const messageSocketFixedPath = path.resolve(projectRoot, 'src/patches/messageSocketFixed.js');

const defaultResolver = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect messageSocket to our interop-fixed version
  if (
    (moduleName === './messageSocket' || moduleName.endsWith('/messageSocket')) &&
    context.originModulePath.includes('effects.native')
  ) {
    return { filePath: messageSocketFixedPath, type: 'sourceFile' };
  }

  // Force react and react-dom to the single hoisted copy
  if (singletons[moduleName]) {
    return { filePath: require.resolve(singletons[moduleName]), type: 'sourceFile' };
  }

  return (defaultResolver ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './src/styles/global.css' });
