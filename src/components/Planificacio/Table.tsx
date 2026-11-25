import { Box, chakra, Flex, IconButton, Text, Tooltip } from '@chakra-ui/react'
import { Fragment, memo, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { formatShort } from '~utils/dates'
import { PLAN_CELL_STYLES } from './Cells'
import { ColumnControl, columnWidth } from './ColumnControl'
import { GROUP_LABELS, SUBGROUP_LABELS, TYPE_DESCRIPTIONS } from './columns'
import { temaRowId } from './structure'
import {
  Apartat,
  ApartatLevelInfo,
  Column,
  ColumnGroup,
  ColumnSubgroup,
  PlanDerived,
  RowCells,
  Tema,
  TemaLevelInfo,
} from './types'

// Fixed left columns: Tema, Nom, Nº, Apartat
const FIXED = [
  { key: 'tema', width: 38, left: 0 },
  { key: 'nom', width: 44, left: 38 },
  { key: 'num', width: 40, left: 82 },
  { key: 'apartat', width: 250, left: 122 },
]

const vertical = {
  writingMode: 'vertical-rl' as const,
  transform: 'rotate(180deg)',
}

const Th = chakra('th', {
  baseStyle: {
    p: 0,
    fontWeight: 700,
    borderRight: '1px solid',
    borderBottom: '1px solid',
    borderColor: 'border',
    position: 'sticky',
  },
})

const Td = chakra('td', {
  baseStyle: {
    px: 1,
    py: 1,
    borderRight: '1px solid',
    borderBottom: '1px solid',
    borderColor: 'border',
    verticalAlign: 'middle',
  },
})

// Cell tint of every subgroup
const SUBGROUP_CELL_STYLES = Object.fromEntries(
  (['info', 'imprescindibles', 'tasques2', 'tasques3', 'repassos'] as ColumnSubgroup[]).map((sg) => [
    `td.sg-${sg}`,
    { bg: `sg.${sg}.cell` },
  ])
)

export type SaveHandler = (rowId: string, colId: string, value: string, manual?: boolean) => void

type PlanTableProps = {
  columns: Column[]
  // temes with only the visible apartats
  temes: Tema[]
  cells: Record<string, RowCells>
  derived: PlanDerived
  estudis: Record<string, string>
  onSave: SaveHandler
  onRegister: (tema: Tema, apartat: Apartat) => void
}

/**
 * Spreadsheet with sticky 3-row header and 4 sticky left columns
 */
export const PlanTable = ({ columns, temes, cells, derived, estudis, onSave, onRegister }: PlanTableProps) => {
  const { t } = useTranslation()
  const row1 = useRef<HTMLTableRowElement>(null)
  const row2 = useRef<HTMLTableRowElement>(null)
  const [tops, setTops] = useState([0, 30, 58])

  // Recalculate the sticky top of header rows 2 and 3 from the real heights
  useLayoutEffect(() => {
    const update = () => {
      const h1 = row1.current?.getBoundingClientRect().height ?? 30
      const h2 = row2.current?.getBoundingClientRect().height ?? 28
      setTops((prev) => (prev[1] === h1 && prev[2] === h1 + h2 ? prev : [0, h1, h1 + h2]))
    }
    update()
    const ro = new ResizeObserver(update)
    if (row1.current) ro.observe(row1.current)
    if (row2.current) ro.observe(row2.current)
    return () => ro.disconnect()
  }, [])

  const groups = spans(columns, (c) => c.grup)
  const subgroups = spans(columns, (c) => `${c.grup}|${c.subgrup}`)
  const fixedLabels = [
    t('plan.col_tema', { defaultValue: 'Tema' }),
    t('plan.col_nom', { defaultValue: 'Nom' }),
    t('plan.col_num', { defaultValue: 'Nº' }),
    t('plan.col_apartat', { defaultValue: 'Apartat / Contingut' }),
  ]

  return (
    <Box
      overflow='auto'
      maxH='calc(100dvh - 132px)'
      bg='surface'
      borderRadius='card'
      borderWidth='1px'
      borderColor='border'
      boxShadow='card'
      sx={{ overscrollBehavior: 'contain' }}
    >
      <chakra.table
        id='main-plan-table'
        sx={{
          borderCollapse: 'separate',
          borderSpacing: 0,
          fontSize: 'xs',
          'tbody tr:hover > td.data': {
            backgroundImage: 'linear-gradient(var(--chakra-colors-rowHover), var(--chakra-colors-rowHover))',
          },
          'td.pc-td': {
            px: 1,
            py: 1,
            borderRight: '1px solid',
            borderBottom: '1px solid',
            borderColor: 'border',
            verticalAlign: 'middle',
          },
          'td.pc-td.tema': { verticalAlign: 'top' },
          ...SUBGROUP_CELL_STYLES,
          ...PLAN_CELL_STYLES,
        }}
      >
        <thead>
          <tr ref={row1}>
            {FIXED.map((f, i) => (
              <Th
                key={f.key}
                rowSpan={3}
                top={0}
                left={`${f.left}px`}
                zIndex={5}
                minW={`${f.width}px`}
                w={`${f.width}px`}
                maxW={`${f.width}px`}
                bg='groupHead'
                color='white'
                borderRight={i === 3 ? '3px solid' : undefined}
                borderRightColor={i === 3 ? 'primary.700' : undefined}
                fontSize='2xs'
                textTransform='uppercase'
              >
                {i < 2 ? (
                  <Box sx={vertical} mx='auto' py={2}>
                    {fixedLabels[i]}
                  </Box>
                ) : (
                  <Box px={2}>{fixedLabels[i]}</Box>
                )}
              </Th>
            ))}
            {groups.map(({ key, span }) => (
              <Th
                key={key}
                colSpan={span}
                top={0}
                zIndex={3}
                h='30px'
                bg={key === 'info' ? 'groupInfo' : 'groupHead'}
                color='white'
                fontSize='2xs'
                letterSpacing='0.06em'
              >
                {GROUP_LABELS[key as ColumnGroup]}
              </Th>
            ))}
          </tr>
          <tr ref={row2}>
            {subgroups.map(({ key, span }) => {
              const sg = key.split('|')[1] as ColumnSubgroup
              return (
                <Th
                  key={key}
                  colSpan={span}
                  top={`${tops[1]}px`}
                  zIndex={3}
                  h='28px'
                  bg={`sg.${sg}.head`}
                  color='slate.900'
                  _dark={{ color: 'white' }}
                  fontSize='2xs'
                  letterSpacing='0.04em'
                >
                  {SUBGROUP_LABELS[sg]}
                </Th>
              )
            })}
          </tr>
          <tr>
            {columns.map((column) => (
              <ColumnHeader key={column.col_id} column={column} top={tops[2]} />
            ))}
          </tr>
        </thead>
        <tbody>
          {temes.map((tema) => (
            <Fragment key={tema.id}>
              {tema.apartats.map((apartat, i) => {
                const temaRow = temaRowId(tema)
                return (
                  <PlanRow
                    key={apartat.row_id}
                    tema={tema}
                    apartat={apartat}
                    isFirst={i === 0}
                    rowSpan={tema.apartats.length}
                    temaRow={temaRow}
                    columns={columns}
                    rowCells={cells[apartat.row_id]}
                    temaCells={i === 0 ? cells[temaRow] : undefined}
                    levelInfo={derived.apartatLevels[apartat.row_id]}
                    temaLevel={i === 0 ? derived.temaLevels[tema.id] : undefined}
                    studyDate={estudis[apartat.row_id]}
                    onSave={onSave}
                    onRegister={onRegister}
                  />
                )
              })}
            </Fragment>
          ))}
        </tbody>
      </chakra.table>
    </Box>
  )
}

/** Consecutive runs of columns with the same key */
const spans = (columns: Column[], keyOf: (c: Column) => string) => {
  const out: { key: string; span: number }[] = []
  for (const c of columns) {
    const key = keyOf(c)
    if (out.length && out[out.length - 1].key === key) out[out.length - 1].span++
    else out.push({ key, span: 1 })
  }
  return out
}

const ColumnHeader = memo(({ column, top }: { column: Column; top: number }) => {
  const typeLabel = column.tipus === 'check' ? '✔' : column.tipus === 'score' ? 'Nota' : null
  const w = columnWidth(column)
  return (
    <Tooltip
      hasArrow
      openDelay={150}
      closeOnScroll
      label={
        <Box>
          <Text fontSize='2xs' opacity={0.7} textTransform='uppercase'>
            {GROUP_LABELS[column.grup]}
            {SUBGROUP_LABELS[column.subgrup] ? ` · ${SUBGROUP_LABELS[column.subgrup]}` : ''}
          </Text>
          <Text fontWeight={700}>{column.titol}</Text>
          <Text opacity={0.8}>{TYPE_DESCRIPTIONS[column.tipus]}</Text>
        </Box>
      }
    >
      <Th
        top={`${top}px`}
        zIndex={3}
        h='170px'
        minW={`${w}px`}
        w={`${w}px`}
        bg={`sg.${column.subgrup}.col`}
        verticalAlign='bottom'
      >
        <Flex direction='column' align='center' justify='space-between' h='full' py={2} gap={1}>
          <Box
            sx={vertical}
            fontSize='11px'
            fontWeight={600}
            lineHeight={1.15}
            maxH='130px'
            overflow='hidden'
            textAlign='left'
          >
            {column.titol}
          </Box>
          {typeLabel && (
            <Text fontSize='9px' fontWeight={800} color={column.tipus === 'score' ? 'score.fg' : 'na.fg'}>
              {typeLabel}
            </Text>
          )}
        </Flex>
      </Th>
    </Tooltip>
  )
})
ColumnHeader.displayName = 'ColumnHeader'

type PlanRowProps = {
  tema: Tema
  apartat: Apartat
  isFirst: boolean
  rowSpan: number
  temaRow: string
  columns: Column[]
  rowCells?: RowCells
  temaCells?: RowCells
  levelInfo: ApartatLevelInfo
  temaLevel?: TemaLevelInfo
  studyDate?: string
  onSave: SaveHandler
  onRegister: (tema: Tema, apartat: Apartat) => void
}

const sameLevel = (a?: ApartatLevelInfo, b?: ApartatLevelInfo) =>
  a === b ||
  (!!a &&
    !!b &&
    a.level === b.level &&
    a.auto === b.auto &&
    a.isManual === b.isManual &&
    a.average === b.average &&
    a.count === b.count)

const PlanRow = memo(
  ({
    tema,
    apartat,
    isFirst,
    rowSpan,
    temaRow,
    columns,
    rowCells,
    temaCells,
    levelInfo,
    temaLevel,
    studyDate,
    onSave,
    onRegister,
  }: PlanRowProps) => {
    const { t } = useTranslation()
    const rowId = apartat.row_id
    return (
      <tr>
        {isFirst && (
          <>
            <Td
              rowSpan={rowSpan}
              position='sticky'
              left={`${FIXED[0].left}px`}
              zIndex={2}
              bg='temaCode'
              color='white'
              p={0}
            >
              <Box sx={vertical} mx='auto' fontWeight={800} fontSize='11px' whiteSpace='nowrap' py={2}>
                {tema.codi}
              </Box>
            </Td>
            <Td
              rowSpan={rowSpan}
              position='sticky'
              left={`${FIXED[1].left}px`}
              zIndex={2}
              bg='temaName'
              color='temaNameText'
              p={0}
            >
              <Tooltip label={tema.nom} hasArrow placement='right'>
                <Box
                  sx={vertical}
                  mx='auto'
                  fontWeight={600}
                  fontSize='11px'
                  lineHeight={1.1}
                  maxH={`${Math.max(rowSpan * 37 - 8, 60)}px`}
                  overflow='hidden'
                  py={2}
                >
                  {tema.nom}
                </Box>
              </Tooltip>
            </Td>
          </>
        )}
        <Td
          position='sticky'
          left={`${FIXED[2].left}px`}
          zIndex={2}
          bg='surface'
          fontWeight={700}
          color='textMuted'
          textAlign='center'
          className='data'
        >
          {apartat.num}
        </Td>
        <Td
          position='sticky'
          left={`${FIXED[3].left}px`}
          zIndex={2}
          bg='surface'
          borderRight='3px solid'
          borderRightColor='primary.400'
          className='data'
          maxW={`${FIXED[3].width}px`}
        >
          <Flex align='center' gap={1}>
            <Text flex={1} noOfLines={2} fontSize='xs' fontWeight={500} title={apartat.titol}>
              {apartat.titol}
            </Text>
            <IconButton
              aria-label={t('plan.register_study', { defaultValue: 'Registrar estudi' })}
              title={
                studyDate
                  ? t('plan.studied_on', {
                      defaultValue: 'Estudiat el {{ date }}. Clica per tornar a registrar.',
                      date: formatShort(studyDate),
                    })
                  : t('plan.register_study', { defaultValue: 'Registrar estudi' })
              }
              icon={studyDate ? <icons.study /> : <icons.register />}
              size='xs'
              variant='ghost'
              colorScheme={studyDate ? 'primary' : 'gray'}
              color={studyDate ? 'accent' : 'textMuted'}
              onClick={() => onRegister(tema, apartat)}
              minW={6}
              h={6}
            />
          </Flex>
        </Td>
        {columns.map((column) => {
          if (column.ambit === 'tema' && !isFirst) return null
          const value = (column.ambit === 'tema' ? temaCells : rowCells)?.[column.col_id]?.v ?? ''
          const targetRow = column.ambit === 'tema' ? temaRow : rowId
          return (
            <td
              key={column.col_id}
              rowSpan={column.ambit === 'tema' ? rowSpan : undefined}
              className={`pc-td data sg-${column.subgrup}${column.ambit === 'tema' ? ' tema' : ''}`}
            >
              <ColumnControl
                column={column}
                value={value}
                levelInfo={levelInfo}
                temaLevel={temaLevel}
                label={`${column.titol} · ${column.ambit === 'tema' ? tema.codi : `${apartat.num} ${apartat.titol}`}`}
                onSave={(v, manual) => onSave(targetRow, column.col_id, v, manual)}
              />
            </td>
          )
        })}
      </tr>
    )
  },
  (a, b) =>
    a.tema === b.tema &&
    a.apartat === b.apartat &&
    a.isFirst === b.isFirst &&
    a.rowSpan === b.rowSpan &&
    a.columns === b.columns &&
    a.rowCells === b.rowCells &&
    a.temaCells === b.temaCells &&
    a.studyDate === b.studyDate &&
    a.onSave === b.onSave &&
    a.onRegister === b.onRegister &&
    sameLevel(a.levelInfo, b.levelInfo) &&
    a.temaLevel?.level === b.temaLevel?.level &&
    a.temaLevel?.average === b.temaLevel?.average
)
PlanRow.displayName = 'PlanRow'
