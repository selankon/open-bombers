import { Box, chakra, Tooltip } from '@chakra-ui/react'
import { KeyboardEvent, memo, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Instance } from '~components/Repassos/types'
import { SCORE } from '~utils/constants'
import { DayString, formatDayMonth, formatShort } from '~utils/dates'
import { FET } from './columns'
import { levelColors } from './LevelBadge'
import { normalizeScore } from './logic'
import { ApartatLevelInfo, Level, TemaLevelInfo } from './types'

/**
 * Styles of the high-volume cell controls, applied once on the container (thousands of cells
 * with their own style props would be slow)
 */
export const PLAN_CELL_STYLES = {
  '.pc-check': {
    w: 'full',
    minW: '34px',
    h: '28px',
    borderRadius: '7px',
    borderWidth: '1px',
    borderColor: 'border',
    bg: 'surface',
    color: 'transparent',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.02em',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    transition: 'transform 120ms, box-shadow 120ms, background 120ms',
    _hover: { transform: 'translateY(-1px)', boxShadow: 'card', color: 'textMuted' },
    _active: { transform: 'scale(0.94)' },
    _focusVisible: { outline: '2px solid', outlineColor: 'accent', outlineOffset: '1px' },
    '&[aria-pressed=true]': { borderColor: 'na.border', bg: 'na.bg', color: 'na.fg' },
  },
  '.pc-review': {
    color: 'textMuted',
    fontSize: '10px',
    fontVariantNumeric: 'tabular-nums',
    '&[data-status=endarrerit]': { borderColor: 'nb.border', bg: 'nb.bg', color: 'nb.fg' },
    _disabled: { cursor: 'not-allowed', opacity: 0.45, _hover: { transform: 'none', boxShadow: 'none' } },
  },
  '.pc-input': {
    w: 'full',
    h: '28px',
    px: 1,
    bg: 'surface',
    color: 'textPrimary',
    borderWidth: '1px',
    borderColor: 'border',
    borderRadius: '7px',
    _focus: { outline: 'none', borderColor: 'accent' },
  },
  '.pc-score': {
    minW: '40px',
    textAlign: 'center',
    fontSize: 'sm',
    fontWeight: 700,
    color: 'score.fg',
    MozAppearance: 'textfield',
    '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
    '&::placeholder': { color: 'textMuted', fontWeight: 400 },
    '&[data-filled=true]': { bg: 'score.fill' },
    _focus: { outline: 'none', borderColor: 'score.focus' },
  },
  '.pc-date': { minW: '118px', px: 1.5, fontSize: 'xs' },
}

type CellControlProps = {
  value: string
  onSave: (value: string) => void
  label: string
}

/**
 * Check button: empty ↔ "✔ FET"
 */
export const CheckCell = memo(({ value, onSave, label }: CellControlProps) => {
  const isChecked = value === FET
  return (
    <button
      type='button'
      className='pc-check'
      aria-pressed={isChecked}
      aria-label={label}
      title={label}
      onClick={() => onSave(isChecked ? '' : FET)}
    >
      {isChecked ? '✔ FET' : '·'}
    </button>
  )
})
CheckCell.displayName = 'CheckCell'

/**
 * Score input (0-10, one decimal). Saved on change (blur or Enter)
 */
export const ScoreCell = memo(({ value, onSave, label }: CellControlProps) => {
  const [local, setLocal] = useState(value)

  // Keep the input in sync when the stored value changes elsewhere
  useEffect(() => setLocal(value), [value])

  const commit = () => {
    const normalized = normalizeScore(local)
    setLocal(normalized)
    if (normalized !== value) onSave(normalized)
  }

  return (
    <input
      type='number'
      className='pc-input pc-score'
      data-filled={local !== ''}
      inputMode='decimal'
      step={0.1}
      min={SCORE.MIN}
      max={SCORE.MAX}
      placeholder='—'
      aria-label={label}
      title={label}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  )
})
ScoreCell.displayName = 'ScoreCell'

/**
 * Native date input, saved as YYYY-MM-DD
 */
export const DateCell = memo(({ value, onSave, label }: CellControlProps) => (
  <input
    type='date'
    className='pc-input pc-date'
    aria-label={label}
    title={label}
    value={value}
    onChange={(e) => e.target.value !== value && onSave(e.target.value)}
  />
))
DateCell.displayName = 'DateCell'

// A typed year is complete (the native input reports 0002, 0020… while typing it)
const isPlausibleDay = (v: string) => /^(19|20)\d\d-\d\d-\d\d$/.test(v)

/**
 * Class day of an apartat. The first day is saved as soon as it is complete; changing or
 * clearing an existing one restarts the reviews, so it is saved on blur / Enter (it asks first)
 */
export const StudyDateCell = memo(({ value, onSave, label }: CellControlProps) => {
  const [local, setLocal] = useState(value)

  // Keep the input in sync when the study day changes elsewhere (calendar, register modal)
  useEffect(() => setLocal(value), [value])

  const commit = (v: string) => {
    // Show the stored day until the change is confirmed (the prop update brings the new one)
    setLocal(value)
    if (v !== value && (!v || isPlausibleDay(v))) onSave(v)
  }

  return (
    <input
      type='date'
      className='pc-input pc-date'
      aria-label={label}
      title={label}
      value={local}
      onChange={(e) => {
        setLocal(e.target.value)
        if (!value && isPlausibleDay(e.target.value)) onSave(e.target.value)
      }}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
    />
  )
})
StudyDateCell.displayName = 'StudyDateCell'

type ReviewCellProps = {
  instance?: Instance
  label: string
  onToggle: (instance: Instance, done: boolean) => void
}

/**
 * Review of the calendar (d1, setmanal or the current mensual): its day while pending, "✔ FET"
 * when done. Disabled until the apartat has a class day.
 */
export const ReviewCell = memo(
  ({ instance, label, onToggle }: ReviewCellProps) => {
    const { t } = useTranslation()
    const date = instance?.date as DayString
    const title = !instance
      ? t('plan.review_no_study', { defaultValue: 'Posa la data de classe per programar aquest repàs' })
      : instance.isDone
        ? t('plan.review_done', {
            defaultValue: 'Repàs fet ({{ date }}). Clica per desmarcar-lo.',
            date: formatShort(date),
          })
        : instance.status === 'endarrerit'
          ? t('plan.review_overdue', {
              defaultValue: 'Repàs endarrerit: era per al {{ date }}. Clica per marcar-lo com a fet.',
              date: formatShort(date),
            })
          : t('plan.review_pending', {
              defaultValue: 'Repàs previst per al {{ date }}. Clica per marcar-lo com a fet.',
              date: formatShort(date),
            })
    return (
      <button
        type='button'
        className='pc-check pc-review'
        aria-pressed={!!instance?.isDone}
        aria-label={`${label} · ${title}`}
        title={title}
        data-status={instance?.status}
        disabled={!instance}
        onClick={() => instance && onToggle(instance, !instance.isDone)}
      >
        {!instance ? '·' : instance.isDone ? '✔ FET' : formatDayMonth(date)}
      </button>
    )
  },
  (a, b) =>
    a.label === b.label &&
    a.onToggle === b.onToggle &&
    a.instance?.id === b.instance?.id &&
    a.instance?.date === b.instance?.date &&
    a.instance?.isDone === b.instance?.isDone &&
    a.instance?.status === b.instance?.status
)
ReviewCell.displayName = 'ReviewCell'

const AUTO = 'auto'

/**
 * Level select: "auto" (computed from the scores) or a manual NA / NM / NB
 */
export const LevelSelect = memo(
  ({
    info,
    onSave,
    label,
  }: {
    info: ApartatLevelInfo
    onSave: (value: string, manual: boolean) => void
    label: string
  }) => {
    const { t } = useTranslation()
    const c = levelColors(info.level)
    const tooltip = info.isManual
      ? t('plan.level_manual_tooltip', {
          defaultValue: 'Nivell triat manualment. Tria «auto» per tornar al càlcul automàtic.',
        })
      : info.average !== null
        ? t('plan.level_auto_tooltip', {
            defaultValue: 'Mitjana de les darreres {{ count }} notes: {{ avg }} / 10',
            count: info.count,
            avg: info.average.toFixed(2),
          })
        : t('plan.level_empty_tooltip', {
            defaultValue: 'Sense notes: el nivell es calcula automàticament quan posis notes.',
          })

    return (
      <chakra.select
        aria-label={label}
        title={tooltip}
        value={info.isManual ? info.level : AUTO}
        onChange={(e) => (e.target.value === AUTO ? onSave('', false) : onSave(e.target.value, true))}
        w='full'
        minW='64px'
        h='28px'
        px={1}
        fontSize='xs'
        fontWeight={700}
        textAlign='center'
        bg={c.bg}
        color={info.level ? c.fg : 'textMuted'}
        borderWidth='1px'
        borderStyle={info.isManual || !info.level ? 'solid' : 'dashed'}
        borderColor={c.border}
        borderRadius='7px'
        cursor='pointer'
        _focus={{ outline: 'none', boxShadow: '0 0 0 2px var(--chakra-colors-primary-200)' }}
      >
        <option value={AUTO}>{info.auto ? `${info.auto} ·auto` : '–'}</option>
        {(['NA', 'NM', 'NB'] as Level[]).map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </chakra.select>
    )
  },
  (a, b) =>
    a.label === b.label &&
    a.onSave === b.onSave &&
    a.info.level === b.info.level &&
    a.info.auto === b.info.auto &&
    a.info.isManual === b.info.isManual &&
    a.info.average === b.info.average &&
    a.info.count === b.info.count
)
LevelSelect.displayName = 'LevelSelect'

const LEVEL_NAMES: Record<Level, string> = { NA: 'Alt', NM: 'Mitjà', NB: 'Baix' }

/**
 * Read only tema level (derived from the apartat levels)
 */
export const TemaLevelBox = memo(({ info }: { info: TemaLevelInfo | undefined }) => {
  const { t } = useTranslation()
  const level = info?.level ?? null
  const c = levelColors(level)
  const box = (
    <Box
      w='full'
      minW='44px'
      h='28px'
      display='flex'
      alignItems='center'
      justifyContent='center'
      fontSize='xs'
      fontWeight={800}
      borderRadius='7px'
      bg={c.bg}
      color={level ? c.fg : 'textMuted'}
      borderWidth={level ? '1px' : 0}
      borderColor={c.border}
    >
      {level ?? '—'}
    </Box>
  )
  if (!level) return box
  return (
    <Tooltip
      hasArrow
      label={t('plan.tema_level_tooltip', {
        defaultValue: 'Nivell {{ name }} del Tema (Mitjana: {{ avg }} / 3)',
        name: LEVEL_NAMES[level],
        avg: info.average.toFixed(1),
      })}
    >
      {box}
    </Tooltip>
  )
})
TemaLevelBox.displayName = 'TemaLevelBox'
