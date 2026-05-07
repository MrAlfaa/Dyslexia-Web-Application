import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import English translations
import enCommon from './locales/en/common.json';
import enPa from './locales/en/pa.json';
import enWm from './locales/en/wm.json';
import enRp from './locales/en/rp.json';
import enSp from './locales/en/sp.json';

// Import Sinhala translations
import siCommon from './locales/si/common.json';
import siPa from './locales/si/pa.json';
import siWm from './locales/si/wm.json';
import siRp from './locales/si/rp.json';
import siSp from './locales/si/sp.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        pa: enPa,
        wm: enWm,
        rp: enRp,
        sp: enSp
      },
      si: {
        common: siCommon,
        pa: siPa,
        wm: siWm,
        rp: siRp,
        sp: siSp
      }
    },
    fallbackLng: 'en',
    defaultNS: 'common', // Set default namespace to common
    ns: ['common', 'pa', 'wm', 'rp', 'sp'],
    interpolation: {
      escapeValue: false 
    },
    detection: {
      order: ['localStorage', 'cookie', 'htmlTag', 'path', 'subdomain'],
      caches: ['localStorage', 'cookie']
    }
  });

export default i18n;
