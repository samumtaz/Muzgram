'use strict';
// Fixed version of @expo/metro-runtime/src/messageSocket.native.ts
// The original uses require() (CJS) on ES modules (export default), which returns
// the namespace object instead of the default export. This version adds proper interop.

function interop(m) {
  return m != null && m.__esModule ? m.default : m;
}

function createWebSocketConnection(path) {
  if (path === undefined) path = '/message';
  var getDevServer = interop(require('react-native/Libraries/Core/Devtools/getDevServer'));
  var devServer = getDevServer();
  if (!devServer.bundleLoadedFromServer) {
    throw new Error('Cannot create devtools websocket connections in embedded environments.');
  }
  var devServerUrl = new URL(devServer.url);
  var serverScheme = devServerUrl.protocol === 'https:' ? 'wss' : 'ws';
  var WebSocket = interop(require('react-native/Libraries/WebSocket/WebSocket'));
  return new WebSocket(serverScheme + '://' + devServerUrl.host + path);
}

createWebSocketConnection().onmessage = function (message) {
  var data = JSON.parse(String(message.data));
  switch (data.method) {
    case 'sendDevCommand':
      switch (data.params.name) {
        case 'rsc-reload':
          if (data.params.platform && data.params.platform !== process.env.EXPO_OS) {
            return;
          }
          console.log(
            'HMR(Client): Reload received from server. Sending to listeners:',
            globalThis.__EXPO_RSC_RELOAD_LISTENERS__ && globalThis.__EXPO_RSC_RELOAD_LISTENERS__.length
          );
          if (globalThis.__EXPO_RSC_RELOAD_LISTENERS__) {
            globalThis.__EXPO_RSC_RELOAD_LISTENERS__.forEach(function (l) { l(); });
          }
          break;
      }
      break;
  }
};
