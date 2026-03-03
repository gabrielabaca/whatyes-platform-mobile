/**
 * Shim para el paquete "ws" en React Native.
 * El SDK de Kinesis hace: new (WebSocket || require('ws'))(url).
 * En RN usamos el WebSocket nativo para evitar depender de net/tls.
 */
module.exports = global.WebSocket;
