/**
 This file needs to be either mjs or js in order to properly import it
 from every place where it's required (like i18next-parser.config.mjs).

 Catalan is the main language (the original app is in Catalan). Default values in the code
 are written in Catalan. If you add or remove any languages, also update locales/index.ts
 */
export const LanguagesSlice = {
  ca: 'Català',
}

const languages = Object.keys(LanguagesSlice)

export default languages
