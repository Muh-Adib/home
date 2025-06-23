import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import id from '../locales/id.json';

// Locale bawaan didapat dari elemen HTML (<html lang="...">) yg di-set oleh Laravel
const defaultLng = document.documentElement.getAttribute('lang')?.substring(0, 2) || 'id';

// Resources translation
const resources = {
  en: { translation: en },
  id: { translation: id },
} as const;

// Inisialisasi i18next
void i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLng,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React sudah meng-handle XSS
    },
  });

export default i18n; 