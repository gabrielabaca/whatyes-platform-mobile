/**
 * Shim de isomorphic-webcrypto para React Native.
 * Fuerza un WebCrypto con subtle disponible.
 */
require('react-native-get-random-values');
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
const { Crypto } = require('@peculiar/webcrypto');

function ensureCrypto() {
  if (!global.crypto || !global.crypto.subtle) {
    global.crypto = new Crypto();
  }
  if (!global.window) global.window = global;
  if (!global.self) global.self = global;
  if (!global.navigator) global.navigator = {};
  global.window.crypto = global.crypto;
  global.self.crypto = global.crypto;
  if (typeof globalThis !== 'undefined' && (!globalThis.crypto || !globalThis.crypto.subtle)) {
    globalThis.crypto = global.crypto;
  }
  return global.crypto;
}

module.exports = ensureCrypto();
