import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Button,
  Flex,
  IconButton,
  SimpleGrid,
  Stack,
  Text,
  useAccordionItemState,
} from '@chakra-ui/react'
import { memo, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '~components/Layout/LayoutComponents'
import { TemaMapaButton } from '~components/Mapes/TemaMapaButton'
import { RowReviews } from '~components/Repassos/logic'
import { TemaPdfButton } from '~components/Temari/TemaPdfButton'
import { icons } from '~theme/icons'
import { formatShort } from '~utils/dates'
import { PLAN_CELL_STYLES } from './Cells'
import { ColumnControl } from './ColumnControl'
import { COL, FET, GROUP_LABELS, REVIEW_COLUMNS } from './columns'
import { LevelBadge } from './LevelBadge'
import { temaRowId } from './structure'
import { SaveHandler, StudyDateHandler, ToggleReviewHandler } from './Table'
import { Apartat, ApartatLevelInfo, Column, ColumnGroup, PlanDerived, RowCells, Tema } from './types'

type MobileListProps = {
  columns: Column[]
  temes: Tema[]
  cells: Record<string, RowCells>
  derived: PlanDerived
  estudis: Record<string, string>
  reviews: Record<string, RowReviews>
  onSave: SaveHandler
  onStudyDate: StudyDateHandler
  onToggleReview: ToggleReviewHandler
  onRegister: (tema: Tema, apartat: Apartat) => void
  onRegisterTema: (tema: Tema) => void
}

/** Done checks of an apartat: stored ticks, with the review columns taken from the calendar */
const isDoneCheck = (column: Column, rowCells: RowCells | undefined, reviews: RowReviews | undefined) => {
  const tipus = REVIEW_COLUMNS[column.col_id]
  return tipus ? !!reviews?.[tipus]?.isDone : rowCells?.[column.col_id]?.v === FET
}

/**
 * Mobile alternative to the 25-column table: one card per apartat, grouped by tema
 */
export const PlanMobileList = ({
  columns,
  temes,
  cells,
  derived,
  estudis,
  reviews,
  onSave,
  onStudyDate,
  onToggleReview,
  onRegister,
  onRegisterTema,
}: MobileListProps) => {
  const { t } = useTranslation()
  const temaColumns = columns.filter((c) => c.ambit === 'tema')
  const apartatColumns = columns.filter((c) => c.ambit === 'apartat')

  return (
    <Accordion allowMultiple sx={PLAN_CELL_STYLES}>
      {temes.map((tema) => {
        const temaRow = temaRowId(tema)
        const doneInTema = tema.apartats.reduce(
          (acc, a) =>
            acc +
            apartatColumns.filter((c) => c.tipus === 'check' && isDoneCheck(c, cells[a.row_id], reviews[a.row_id]))
              .length,
          0
        )
        const totalInTema = tema.apartats.length * apartatColumns.filter((c) => c.tipus === 'check').length
        return (
          <AccordionItem key={tema.id} border='none' mb={2}>
            <Card overflow='hidden'>
              <AccordionButton px={3} py={3} gap={3} _hover={{ bg: 'transparent' }}>
                <Flex
                  w={10}
                  h={10}
                  flexShrink={0}
                  borderRadius='10px'
                  bg='temaCode'
                  color='white'
                  align='center'
                  justify='center'
                  fontWeight={800}
                  fontSize='sm'
                >
                  {tema.codi.match(/\d+/)?.[0]}
                </Flex>
                <Box flex={1} textAlign='left' minW={0}>
                  <Text fontWeight={700} fontSize='sm' noOfLines={1}>
                    {tema.nom}
                  </Text>
                  <Text fontSize='xs' color='textMuted'>
                    {doneInTema} / {totalInTema} ✔
                  </Text>
                </Box>
                <LevelBadge level={derived.temaLevels[tema.id]?.level} />
                <AccordionIcon color='textMuted' />
              </AccordionButton>
              <AccordionPanel px={3} pb={3} pt={0}>
                <LazyPanel>
                  <TemaPdfButton tema={tema} variant='button' w='full' mb={2} />
                  <TemaMapaButton tema={tema} variant='button' w='full' mb={2} />
                  <Button
                    w='full'
                    mb={3}
                    variant='outline'
                    leftIcon={<icons.register />}
                    onClick={() => onRegisterTema(tema)}
                  >
                    {t('plan.register_tema', { defaultValue: 'Posar data de classe a tot el tema' })}
                  </Button>
                  <MobileFields
                    columns={temaColumns}
                    rowCells={cells[temaRow]}
                    render={(column, value) => (
                      <ColumnControl
                        column={column}
                        value={value}
                        temaLevel={derived.temaLevels[tema.id]}
                        label={`${column.titol} · ${tema.codi}`}
                        onSave={(v) => onSave(temaRow, column.col_id, v)}
                      />
                    )}
                  />
                  <Stack spacing={2} mt={3}>
                    {tema.apartats.map((apartat) => (
                      <MobileApartat
                        key={apartat.row_id}
                        tema={tema}
                        apartat={apartat}
                        columns={apartatColumns}
                        rowCells={cells[apartat.row_id]}
                        levelInfo={derived.apartatLevels[apartat.row_id]}
                        studyDate={estudis[apartat.row_id]}
                        reviews={reviews[apartat.row_id]}
                        onSave={onSave}
                        onStudyDate={onStudyDate}
                        onToggleReview={onToggleReview}
                        onRegister={onRegister}
                      />
                    ))}
                  </Stack>
                </LazyPanel>
              </AccordionPanel>
            </Card>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}

// Renders the panel content only while the tema is expanded
const LazyPanel = ({ children }: { children: ReactNode }) => {
  const { isOpen } = useAccordionItemState()
  return isOpen ? <>{children}</> : null
}

const MobileFields = ({
  columns,
  rowCells,
  render,
}: {
  columns: Column[]
  rowCells?: RowCells
  render: (column: Column, value: string) => JSX.Element
}) => {
  const groups = columns.reduce<Record<string, Column[]>>((acc, c) => {
    ;(acc[c.grup] ||= []).push(c)
    return acc
  }, {})
  return (
    <Stack spacing={3}>
      {Object.entries(groups).map(([grup, cols]) => (
        <Box key={grup}>
          <Text fontSize='2xs' fontWeight={800} color='accent' letterSpacing='0.06em' mb={1.5}>
            {GROUP_LABELS[grup as ColumnGroup]}
          </Text>
          <SimpleGrid columns={2} spacingX={2} spacingY={1.5}>
            {cols.map((column) => (
              <Flex
                key={column.col_id}
                align='center'
                gap={2}
                gridColumn={column.tipus === 'date' ? 'span 2' : undefined}
                bg={`sg.${column.subgrup}.cell`}
                borderRadius='8px'
                px={2}
                py={1}
              >
                <Text flex={1} fontSize='11px' lineHeight={1.2} color='lightText' noOfLines={2}>
                  {column.titol}
                </Text>
                <Box
                  w={column.tipus === 'date' ? '140px' : column.tipus === 'select_nivell' ? '84px' : '58px'}
                  flexShrink={0}
                >
                  {render(column, rowCells?.[column.col_id]?.v ?? '')}
                </Box>
              </Flex>
            ))}
          </SimpleGrid>
        </Box>
      ))}
    </Stack>
  )
}

const MobileApartat = memo(
  ({
    tema,
    apartat,
    columns,
    rowCells,
    levelInfo,
    studyDate,
    reviews,
    onSave,
    onStudyDate,
    onToggleReview,
    onRegister,
  }: {
    tema: Tema
    apartat: Apartat
    columns: Column[]
    rowCells?: RowCells
    levelInfo: ApartatLevelInfo
    studyDate?: string
    reviews?: RowReviews
    onSave: SaveHandler
    onStudyDate: StudyDateHandler
    onToggleReview: ToggleReviewHandler
    onRegister: (tema: Tema, apartat: Apartat) => void
  }) => {
    const { t } = useTranslation()
    return (
      <Box borderWidth='1px' borderColor='border' borderRadius='12px' p={3}>
        <Flex align='flex-start' gap={2} mb={2}>
          <Text fontWeight={800} color='textMuted' fontSize='sm' minW={7}>
            {apartat.num}
          </Text>
          <Box flex={1}>
            <Text fontWeight={600} fontSize='sm'>
              {apartat.titol}
            </Text>
            {studyDate && (
              <Text fontSize='xs' color='accent'>
                {t('plan.studied_short', { defaultValue: 'Estudiat: {{ date }}', date: formatShort(studyDate) })}
              </Text>
            )}
          </Box>
          <IconButton
            aria-label={t('plan.register_study', { defaultValue: 'Registrar estudi' })}
            icon={<icons.register />}
            size='sm'
            variant='ghost'
            onClick={() => onRegister(tema, apartat)}
          />
          <TemaMapaButton
            tema={tema}
            apartat={apartat}
            variant='icon'
            size='sm'
            bg='transparent'
            color='textMuted'
            _hover={{ bg: 'surfaceMuted', color: 'accent' }}
          />
        </Flex>
        <MobileFields
          columns={columns}
          rowCells={rowCells}
          render={(column, value) =>
            column.col_id === COL.DATA_CLASSE ? (
              <ColumnControl
                column={column}
                value={studyDate ?? ''}
                label={`${column.titol} · ${apartat.num} ${apartat.titol}`}
                onSave={(v) => onStudyDate(tema, apartat, v)}
              />
            ) : (
              <ColumnControl
                column={column}
                value={value}
                levelInfo={levelInfo}
                label={`${column.titol} · ${apartat.num} ${apartat.titol}`}
                onSave={(v, manual) => onSave(apartat.row_id, column.col_id, v, manual)}
                reviews={reviews}
                onToggleReview={onToggleReview}
              />
            )
          }
        />
      </Box>
    )
  }
)
MobileApartat.displayName = 'MobileApartat'
