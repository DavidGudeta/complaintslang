import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from '../locales/en.json';
import amTranslations from '../locales/am.json';

const resources = {
  en: {
    translation: enTranslations
  },
  am: {
    translation: amTranslations
  }
};

// Get saved language or default to English
const getSavedLanguage = () => {
  const saved = localStorage.getItem('language');
  return saved || 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    ns: ['translation'],
    defaultNS: 'translation'
  });

export default i18n;
