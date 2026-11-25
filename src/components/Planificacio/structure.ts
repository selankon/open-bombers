import temari from '~src/data/planificacio-temari.json'
import { DEFAULT_COLUMNS } from './columns'
import { Structure, Tema } from './types'

/**
 * Initial structure: the default columns + the temari exported from the original app
 */
export const defaultStructure = (): Structure => ({
  columns: DEFAULT_COLUMNS.map((c) => ({ ...c })),
  temes: (temari as Tema[]).map((t) => ({ ...t, apartats: t.apartats.map((a) => ({ ...a })) })),
})

/**
 * Row id that stores the cells of tema-scope columns (the first apartat, as in the original)
 */
export const temaRowId = (tema: Tema) => tema.apartats[0]?.row_id

/**
 * Short label of a tema: "TEMA 10." → "T10"
 */
export const temaShortCode = (tema: Tema) => {
  const n = tema.codi.match(/\d+/)?.[0]
  return n ? `T${n}` : tema.codi
}

/**
 * Lookup helpers built once per structure
 */
export const indexStructure = (structure: Structure) => {
  const rowToTema: Record<string, Tema> = {}
  const rowIndex: Record<string, number> = {}
  let i = 0
  for (const tema of structure.temes) {
    for (const apartat of tema.apartats) {
      rowToTema[apartat.row_id] = tema
      rowIndex[apartat.row_id] = i++
    }
  }
  return { rowToTema, rowIndex }
}
