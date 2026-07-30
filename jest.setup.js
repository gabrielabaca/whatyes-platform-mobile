/**
 * Mocks de módulos nativos para Jest. Sin esto, cualquier test que monte `App`
 * revienta al cargar el módulo nativo real.
 */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
