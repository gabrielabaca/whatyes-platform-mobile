/**
 * i18n — PulpoLive
 * Idiomas: `es`, `en`. Preferencia persistida en AsyncStorage (`languagePreference.ts`).
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en';
import { getStoredLanguage } from './languagePreference';

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

void (async () => {
  const lng = await getStoredLanguage();
  if (i18n.language !== lng) {
    await i18n.changeLanguage(lng);
  }
})();

export default i18n;
