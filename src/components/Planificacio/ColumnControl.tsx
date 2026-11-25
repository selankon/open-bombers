import { CheckCell, DateCell, LevelSelect, ScoreCell, TemaLevelBox } from './Cells'
import { ApartatLevelInfo, Column, TemaLevelInfo } from './types'

type ColumnControlProps = {
  column: Column
  value: string
  levelInfo?: ApartatLevelInfo
  temaLevel?: TemaLevelInfo
  label: string
  onSave: (value: string, manual?: boolean) => void
}

/**
 * Renders the right control for a column type
 */
export const ColumnControl = ({ column, value, levelInfo, temaLevel, label, onSave }: ColumnControlProps) => {
  switch (column.tipus) {
    case 'check':
      return <CheckCell value={value} onSave={onSave} label={label} />
    case 'score':
    case 'number':
      return <ScoreCell value={value} onSave={onSave} label={label} />
    case 'date':
      return <DateCell value={value} onSave={onSave} label={label} />
    case 'select_nivell':
      return <LevelSelect info={levelInfo} onSave={onSave} label={label} />
    case 'auto_nivell_tema':
      return <TemaLevelBox info={temaLevel} />
    default:
      return <DateCell value={value} onSave={onSave} label={label} />
  }
}

// Width of a data column by type (px)
export const columnWidth = (column: Column) => {
  switch (column.tipus) {
    case 'date':
      return 128
    case 'select_nivell':
      return 96
    case 'auto_nivell_tema':
      return 56
    case 'score':
      return 52
    default:
      return 46
  }
}
