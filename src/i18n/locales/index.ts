import { Locale } from 'date-fns'
import { ca as dca } from 'date-fns/locale/ca'
import ca from './ca.json'

export const translations: { [key: string]: any } = { ca }

export const dateLocales: { [key: string]: Locale } = { ca: dca }
