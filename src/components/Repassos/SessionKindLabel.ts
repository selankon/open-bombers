import { TFunction } from 'i18next'
import { SessionKind } from './types'

export const kindLabel = (t: TFunction, kind: SessionKind) =>
  ({
    d1: t('repassos.kind_d1', { defaultValue: 'Diari' }),
    setmanal: t('repassos.kind_setmanal', { defaultValue: 'Setmanal' }),
    mensual: t('repassos.kind_mensual', { defaultValue: 'Mensual' }),
    estudi: t('repassos.kind_estudi', { defaultValue: 'Estudi' }),
  })[kind]

// Semantic color tokens of a session kind
export const kindColors = (kind: SessionKind) => ({ fg: `kind.${kind}`, bg: `kind.${kind}.bg` })
