import { TFunction } from 'i18next'
import { SessionKind } from './types'

export const kindLabel = (t: TFunction, kind: SessionKind) =>
  ({
    d1: t('repassos.kind_d1', { defaultValue: 'Diari' }),
    setmanal: t('repassos.kind_setmanal', { defaultValue: 'Setmanal' }),
    mensual: t('repassos.kind_mensual', { defaultValue: 'Mensual' }),
    llarg: t('repassos.kind_llarg', { defaultValue: 'Llarg termini' }),
    puntual: t('repassos.kind_puntual', { defaultValue: 'Puntual' }),
    test: t('repassos.kind_test', { defaultValue: 'Test' }),
    estudi: t('repassos.kind_estudi', { defaultValue: 'Estudi' }),
  })[kind]

// Semantic color tokens of a session kind
export const kindColors = (kind: SessionKind) => ({ fg: `kind.${kind}`, bg: `kind.${kind}.bg` })

// Title of a session: "Repàs setmanal", "Recordatori a llarg termini", "Test del paquet"…
export const sessionTitle = (t: TFunction, kind: SessionKind) => {
  if (kind === 'estudi') return kindLabel(t, 'estudi')
  if (kind === 'test') return t('repassos.test_title', { defaultValue: 'Test del paquet' })
  if (kind === 'llarg') return t('repassos.llarg_title', { defaultValue: 'Recordatori a llarg termini' })
  return t('repassos.session_title', { defaultValue: 'Repàs {{ kind }}', kind: kindLabel(t, kind).toLowerCase() })
}

// How many items a session has (apartats, or temes for a test)
export const sessionCount = (s: { kind: SessionKind; rowIds: string[]; instances: unknown[]; tests: unknown[] }) =>
  s.kind === 'estudi' ? s.rowIds.length : s.kind === 'test' ? s.tests.length : s.instances.length
