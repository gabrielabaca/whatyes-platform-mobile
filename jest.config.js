module.exports = {
  preset: 'react-native',
  /**
   * `App.tsx` importa `./global.css` (entrada de NativeWind). Jest no sabe transformar CSS
   * y fallaba al parsearlo, así que la suite entera no arrancaba: lo mapeamos a un stub.
   */
  moduleNameMapper: {
    '\\.css$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  /** NativeWind y css-interop se publican como TS/ESM sin transpilar. */
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|nativewind|react-native-css-interop)/)',
  ],
};
