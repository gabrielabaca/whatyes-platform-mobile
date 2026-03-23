/**
 * Excluir 'expo' del autolinking en Android/iOS.
 * Este proyecto es bare React Native; expo puede estar en node_modules como
 * dependencia transitiva pero no queremos compilar su código nativo.
 *
 * project.android.packageName debe coincidir con el namespace de app/build.gradle
 * para que el código generado (ReactNativeApplicationEntryPoint) use el BuildConfig correcto.
 */
module.exports = {
  assets: ['./assets/fonts'],
  project: {
    android: {
      packageName: 'com.pulpolive',
    },
  },
  dependencies: {
    expo: {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
