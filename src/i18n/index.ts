import i18next from 'i18next'
import BrowserLanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { LanguagesSlice } from '~i18n/languages.mjs'
import { translations } from '~i18n/locales'
import { STORAGE_KEYS } from '~utils/constants'

const i18n = i18next.createInstance()
i18n
  .use(BrowserLanguageDetector)
  .use(initReactI18next)
  .init(
    {
      fallbackLng: 'ca',
      supportedLngs: Object.keys(LanguagesSlice),
      debug: false,
      defaultNS: 'translation',
      interpolation: { escapeValue: false },
      returnEmptyString: false, // empty strings in JSON fall back to defaultValue
      detection: {
        order: ['localStorage', 'navigator'],
        lookupLocalStorage: STORAGE_KEYS.LANGUAGE,
      },
    },
    (err) => {
      if (err) {
        console.error('i18next init error:', err)
        return
      }
      // ensure that the current language is the resolved one
      if (i18n.resolvedLanguage !== i18n.language) {
        i18n.changeLanguage(i18n.resolvedLanguage)
      }
    }
  )

for (const lang of Object.keys(LanguagesSlice)) {
  if (typeof translations[lang] !== 'undefined') {
    i18n.addResourceBundle(lang, 'translation', translations[lang])
  }
}

export default i18n
