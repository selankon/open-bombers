import { Button, Flex, Icon, Menu, MenuButton, MenuItem, MenuList, Select, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { Tema } from './types'

export interface PlanFilters {
  temaId: string
  pendingOnly: boolean
  nbOnly: boolean
}

export const EMPTY_FILTERS: PlanFilters = { temaId: '', pendingOnly: false, nbOnly: false }

const ToggleChip = ({ isActive, onClick, children }: { isActive: boolean; onClick: () => void; children: string }) => (
  <Button
    size='sm'
    variant={isActive ? 'solid' : 'outline'}
    colorScheme={isActive ? 'primary' : 'gray'}
    borderColor='border'
    onClick={onClick}
    aria-pressed={isActive}
    fontWeight={600}
  >
    {children}
  </Button>
)

type PlanToolbarProps = {
  temes: Tema[]
  filters: PlanFilters
  onChange: (filters: PlanFilters) => void
  visibleCount: number
  totalCount: number
}

/**
 * Filters of the planificació table
 */
export const PlanToolbar = ({ temes, filters, onChange, visibleCount, totalCount }: PlanToolbarProps) => {
  const { t } = useTranslation()
  const isFiltered = filters.temaId || filters.pendingOnly || filters.nbOnly
  return (
    <Flex gap={2} mb={3} wrap='wrap' align='center'>
      <Icon as={icons.filter} color='textMuted' display={{ base: 'none', sm: 'block' }} />
      <Select
        size='sm'
        maxW={{ base: 'full', sm: '260px' }}
        borderRadius='full'
        bg='surface'
        value={filters.temaId}
        onChange={(e) => onChange({ ...filters, temaId: e.target.value })}
        aria-label={t('plan.filter_tema', { defaultValue: 'Filtrar per tema' })}
      >
        <option value=''>{t('plan.all_temes', { defaultValue: 'Tots els temes' })}</option>
        {temes.map((tm) => (
          <option key={tm.id} value={tm.id}>
            {tm.codi} {tm.nom}
          </option>
        ))}
      </Select>
      <ToggleChip
        isActive={filters.pendingOnly}
        onClick={() => onChange({ ...filters, pendingOnly: !filters.pendingOnly })}
      >
        {t('plan.filter_pending', { defaultValue: 'Pendent de repassar' })}
      </ToggleChip>
      <ToggleChip isActive={filters.nbOnly} onClick={() => onChange({ ...filters, nbOnly: !filters.nbOnly })}>
        {t('plan.filter_nb', { defaultValue: 'Nivell NB' })}
      </ToggleChip>
      {isFiltered && (
        <>
          <Text fontSize='xs' color='textMuted'>
            {t('plan.filtered_count', {
              defaultValue: '{{ visible }} de {{ total }} apartats',
              visible: visibleCount,
              total: totalCount,
            })}
          </Text>
          <Button
            size='sm'
            variant='ghost'
            colorScheme='gray'
            onClick={() => onChange({ temaId: '', pendingOnly: false, nbOnly: false })}
          >
            {t('plan.clear_filters', { defaultValue: 'Treure filtres' })}
          </Button>
        </>
      )}
    </Flex>
  )
}

/**
 * CSV export menu
 */
export const CsvMenu = ({ onOriginal, onFlat }: { onOriginal: () => void; onFlat: () => void }) => {
  const { t } = useTranslation()
  return (
    <Menu placement='bottom-end'>
      <MenuButton as={Button} leftIcon={<icons.csv />} variant='outline' colorScheme='gray' bg='surface'>
        {t('plan.download_csv', { defaultValue: 'Descarregar Dades (CSV)' })}
      </MenuButton>
      <MenuList fontSize='sm'>
        <MenuItem onClick={onOriginal}>{t('plan.csv_original', { defaultValue: 'CSV (format original)' })}</MenuItem>
        <MenuItem onClick={onFlat}>{t('plan.csv_flat', { defaultValue: 'CSV pla (una fila per apartat)' })}</MenuItem>
      </MenuList>
    </Menu>
  )
}
