import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { deviceLanguage } from '../lib/language';
import en from './en.json';
import nl from './nl.json';

void i18n.use(initReactI18next).init({
  resources: { nl: { translation: nl }, en: { translation: en } },
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
