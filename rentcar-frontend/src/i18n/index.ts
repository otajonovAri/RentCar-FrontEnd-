/**
 * i18n — react-i18next sozlamasi
 *
 * languageStore bilan sinxronlashadi:
 *  - Boshlang'ich til: localStorage 'app-language' dan olinadi
 *  - Til o'zgarganda: changeLanguage() chaqiriladi (useLanguageSync hook orqali)
 */
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import uz from './locales/uz.json'
import ru from './locales/ru.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

import { getStoredLanguage } from '@/store/languageStore'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      uz: { translation: uz },
      ru: { translation: ru },
      en: { translation: en },
      ja: { translation: ja },
    },
    lng:              getStoredLanguage(),   // boshlang'ich til
    fallbackLng:      'uz',
    interpolation:    { escapeValue: false }, // React XSS'dan himoya qiladi
    defaultNS:        'translation',
  })

export default i18n
