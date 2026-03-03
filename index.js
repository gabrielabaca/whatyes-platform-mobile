/**
 * @format
 */

// Globals de Node (Buffer, process) para SDKs que los esperan (p. ej. Kinesis WebRTC)
require('node-libs-react-native/globals');
if (!global.Buffer) {
  global.Buffer = require('buffer').Buffer;
}
global.atob = (input) => {
  const safe = input == null ? '' : String(input);
  return global.Buffer.from(safe, 'base64').toString('binary');
};
global.btoa = (input) => {
  const safe = input == null ? '' : String(input);
  return global.Buffer.from(safe, 'binary').toString('base64');
};
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  require('fast-text-encoding');
}
// WebCrypto para SDKs que usan crypto.subtle
require('react-native-get-random-values');
const { Crypto } = require('@peculiar/webcrypto');
// Si crypto existe pero no tiene subtle (polyfill de node), lo reemplazamos.
if (!global.crypto || !global.crypto.subtle) {
  global.crypto = new Crypto();
}
// Asegurar globals que algunas libs esperan (window/self/navigator + crypto)
if (!global.window) global.window = global;
if (!global.self) global.self = global;
if (!global.navigator) global.navigator = {};
global.window.crypto = global.crypto;
global.self.crypto = global.crypto;
if (typeof globalThis !== 'undefined' && (!globalThis.crypto || !globalThis.crypto.subtle)) {
  globalThis.crypto = global.crypto;
}

// Log errores globales con stack detallado
if (global.ErrorUtils?.setGlobalHandler) {
  const previousHandler = global.ErrorUtils.getGlobalHandler?.();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.error('[GlobalError]', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      isFatal,
    });
    if (previousHandler) {
      previousHandler(error, isFatal);
    }
  });
}

if (typeof globalThis !== 'undefined') {
  globalThis.onunhandledrejection = (event) => {
    console.error('[UnhandledRejection]', {
      reason: event?.reason,
      stack: event?.reason?.stack,
    });
  };
}

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
