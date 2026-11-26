import { RowReviews } from '~components/Repassos/logic'
import { Instance } from '~components/Repassos/types'
import { CheckCell, DateCell, LevelSelect, ReviewCell, ScoreCell, StudyDateCell, TemaLevelBox } from './Cells'
import { COL, REVIEW_COLUMNS } from './columns'
import { ApartatLevelInfo, Column, TemaLevelInfo } from './types'

type ColumnControlProps = {
  column: Column
  value: string
  levelInfo?: ApartatLevelInfo
  temaLevel?: TemaLevelInfo
  label: string
  onSave: (value: string, manual?: boolean) => void
  // Calendar reviews of the row (review columns show them instead of a stored cell)
  reviews?: RowReviews
  onToggleReview?: (instance: Instance, done: boolean) => void
}

/**
 * Renders the right control for a column type
 */
export const ColumnControl = ({
  column,
  value,
  levelInfo,
  temaLevel,
  label,
  onSave,
  reviews,
  onToggleReview,
}: ColumnControlProps) => {
  // The class day is the study day of the calendar
  if (column.col_id === COL.DATA_CLASSE) return <StudyDateCell value={value} onSave={onSave} label={label} />
  const tipus = REVIEW_COLUMNS[column.col_id]
  if (tipus && onToggleReview) return <ReviewCell instance={reviews?.[tipus]} label={label} onToggle={onToggleReview} />
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
