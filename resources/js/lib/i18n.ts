import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';
import id from '../locales/id.json';

// Locale bawaan didapat dari elemen HTML (<html lang="...">) yg di-set oleh Laravel
const defaultLng = document.documentElement.getAttribute('lang')?.substring(0, 2) || 'id';

// Check localStorage for persisted language
const storedLanguage = localStorage.getItem('i18nextLng');
const initialLanguage = storedLanguage || defaultLng;

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
    lng: initialLanguage,
    fallbackLng: 'en',
    debug: false, // Set to true for debugging
    
    interpolation: {
      escapeValue: false, // React sudah meng-handle XSS
    },
    
    // React specific options
    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    },
    
    // Additional options for better performance
    load: 'languageOnly', // Only load the main language (e.g., 'en' instead of 'en-US')
    
    // Namespace options
    defaultNS: 'translation',
    ns: ['translation'],
    
    // Key separator
    keySeparator: '.',
    nsSeparator: ':',
  });

// Export a function to change language and persist it
export const changeLanguage = (language: string) => {
  void i18n.changeLanguage(language);
  localStorage.setItem('i18nextLng', language);
  document.documentElement.setAttribute('lang', language);
};

// Export current language getter
export const getCurrentLanguage = () => i18n.language.substring(0, 2);

// Export supported languages
export const supportedLanguages = ['en', 'id'] as const;

export default i18n; 