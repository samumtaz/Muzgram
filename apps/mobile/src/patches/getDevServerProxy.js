'use strict';
// @expo/metro-runtime's messageSocket.native.ts uses require() (CJS) to import
// react-native's getDevServer which uses export default (ES module).
// This proxy unwraps the .default so the caller gets the function directly.
const m = require('react-native/Libraries/Core/Devtools/getDevServer');
module.exports = m != null && m.__esModule ? m.default : m;
