import languages from './src/i18n/languages.mjs'

export default {
  contextSeparator: '_',
  createOldCatalogs: false,
  defaultNamespace: 'translation',
  defaultValue: '',
  indentation: 2,
  keepRemoved: false,
  keySeparator: '.',
  lexers: {
    mjs: ['JavascriptLexer'],
    js: ['JavascriptLexer'],
    ts: ['JavascriptLexer'],
    jsx: ['JsxLexer'],
    tsx: ['JsxLexer'],
    default: ['JavascriptLexer'],
  },
  lineEnding: 'auto',
  locales: languages,
  namespaceSeparator: ':',
  output: 'src/i18n/locales/$LOCALE.json',
  pluralSeparator: '_',
  input: ['src/**/*.{ts,tsx}'],
  sort: true,
  failOnWarnings: false,
  failOnUpdate: false,
}
