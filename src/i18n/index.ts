/**
 * i18n — PulpoLive
 * Por ahora solo español (`es`); para añadir idiomas: crear JSON en `locales/` y registrar en `resources`.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';

void i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
  },
  lng: 'es',
  fallbackLng: 'es',
  supportedLngs: ['es'],
  defaultNS: 'translation',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

export default i18n;
