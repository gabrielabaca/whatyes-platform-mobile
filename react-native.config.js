/**
 * Excluir 'expo' del autolinking en Android/iOS.
 * Este proyecto es bare React Native; expo puede estar en node_modules como
 * dependencia transitiva pero no queremos compilar su código nativo.
 */
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
