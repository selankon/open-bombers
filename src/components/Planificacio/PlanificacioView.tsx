import { Flex, useBreakpointValue, useDisclosure, useToast } from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { SaveIndicator } from '~components/Layout/SaveIndicator'
import { useRegisterStudy, useRemoveStudy } from '~components/Repassos/queries'
import { RegisterStudyInitial, RegisterStudyModal } from '~components/Repassos/RegisterStudyModal'
import { useDoneToggle } from '~components/Repassos/useDoneToggle'
import { icons } from '~theme/icons'
import { CSV_FILE_NAME, CSV_FLAT_FILE_NAME } from '~utils/constants'
import { formatShort } from '~utils/dates'
import { downloadBlob } from '~utils/download'
import { COL } from './columns'
import { buildFlatCsv, buildOriginalCsv } from './csv'
import { PlanMetricsCards } from './Metrics'
import { PlanMobileList } from './MobileList'
import { useSaveCell } from './queries'
import { PlanTable } from './Table'
import { CsvMenu, EMPTY_FILTERS, PlanFilters, PlanToolbar } from './Toolbar'
import { Apartat, Tema } from './types'

export const PlanificacioView = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const { structure, cells, derived, repassos, instances, reviews, avui } = useStudyData()
  const { mutate: saveCell } = useSaveCell()
  const { mutateAsync: registerStudy, isPending: isRegistering } = useRegisterStudy()
  const { mutateAsync: removeStudy, isPending: isRemoving } = useRemoveStudy()
  const { toggleOne: toggleReview } = useDoneToggle()
  const isTable = useBreakpointValue({ base: false, md: true }, { ssr: false })

  const [filters, setFilters] = useState<PlanFilters>(EMPTY_FILTERS)
  const register = useDisclosure()
  const [registerInitial, setRegisterInitial] = useState<RegisterStudyInitial>()
  // Pending change of an existing class day ('' clears it), waiting for confirmation
  const [studyChange, setStudyChange] = useState<{ apartat: Apartat; date: string } | null>(null)
  // Latest study days, read by the stable handlers below (so table rows don't re-render)
  const estudisRef = useRef(repassos.estudis)
  estudisRef.current = repassos.estudis

  const saveError = useCallback(
    () =>
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('common.save_error_desc', {
          defaultValue: "No s'ha pogut desar al dispositiu. Torna-ho a provar.",
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      }),
    [toast, t]
  )

  const handleSave = useCallback(
    (rowId: string, colId: string, value: string, manual?: boolean) =>
      saveCell({ rowId, colId, value, manual }, { onError: saveError }),
    [saveCell, saveError]
  )

  const saveStudyDate = useCallback(
    async (apartat: Apartat, date: string) => {
      try {
        if (date) await registerStudy({ rowIds: [apartat.row_id], date })
        else await removeStudy([apartat.row_id])
        toast({
          title: date
            ? t('plan.class_date_saved', { defaultValue: 'Classe del {{ date }} desada', date: formatShort(date) })
            : t('plan.class_date_removed', { defaultValue: 'Data de classe treta' }),
          status: 'success',
          duration: 3000,
        })
      } catch {
        saveError()
      }
    },
    [registerStudy, removeStudy, toast, t, saveError]
  )

  // The first class day is saved straight away; changing or clearing it restarts the reviews, so it asks first
  const handleStudyDate = useCallback(
    (_tema: Tema, apartat: Apartat, date: string) => {
      const previous = estudisRef.current[apartat.row_id]
      if (previous === date || (!previous && !date)) return
      if (!previous) saveStudyDate(apartat, date)
      else setStudyChange({ apartat, date })
    },
    [saveStudyDate]
  )

  const confirmStudyChange = async () => {
    if (!studyChange) return
    await saveStudyDate(studyChange.apartat, studyChange.date)
    setStudyChange(null)
  }

  const handleRegister = useCallback(
    (tema: Tema, apartat: Apartat) => {
      setRegisterInitial({ temaId: tema.id, rowIds: [apartat.row_id], date: repassos.estudis[apartat.row_id] })
      register.onOpen()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repassos.estudis, register.onOpen]
  )

  // Opens the register dialog with every apartat of the tema (on their common class day, if any)
  const handleRegisterTema = useCallback(
    (tema: Tema) => {
      const dates = new Set(tema.apartats.map((a) => estudisRef.current[a.row_id]))
      const [date] = dates
      setRegisterInitial({
        temaId: tema.id,
        rowIds: tema.apartats.map((a) => a.row_id),
        date: dates.size === 1 ? date : undefined,
      })
      register.onOpen()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [register.onOpen]
  )

  // Rows with reviews overdue or due today (or a manual "next review" day already reached)
  const pendingRows = useMemo(() => {
    const rows = new Set<string>()
    for (const i of instances)
      if (i.status === 'endarrerit' || (i.status === 'pendent' && i.date === avui)) rows.add(i.rowId)
    for (const [rowId, row] of Object.entries(cells)) {
      const next = row[COL.REPAS_SEGUENT]?.v
      if (next && next <= avui && !repassos.estudis[rowId]) rows.add(rowId)
    }
    return rows
  }, [instances, cells, avui, repassos.estudis])

  // Temes with only the apartats matching the filters (kept referentially stable without filters)
  const visibleTemes = useMemo(() => {
    if (!filters.temaId && !filters.pendingOnly && !filters.nbOnly) return structure.temes
    return structure.temes
      .filter((tm) => !filters.temaId || tm.id === filters.temaId)
      .map((tm) => {
        const apartats = tm.apartats.filter(
          (a) =>
            (!filters.pendingOnly || pendingRows.has(a.row_id)) &&
            (!filters.nbOnly || derived.apartatLevels[a.row_id]?.level === 'NB')
        )
        return apartats.length === tm.apartats.length ? tm : { ...tm, apartats }
      })
      .filter((tm) => tm.apartats.length)
  }, [structure.temes, filters, pendingRows, derived.apartatLevels])

  const totalCount = useMemo(() => structure.temes.reduce((acc, tm) => acc + tm.apartats.length, 0), [structure.temes])
  const visibleCount = visibleTemes.reduce((acc, tm) => acc + tm.apartats.length, 0)

  const exportCsv = (flat: boolean) => {
    const csv = flat
      ? buildFlatCsv(structure, cells, derived, repassos.estudis)
      : buildOriginalCsv(structure, cells, derived, repassos.estudis)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), flat ? CSV_FLAT_FILE_NAME : CSV_FILE_NAME)
  }

  const listProps = {
    columns: structure.columns,
    temes: visibleTemes,
    cells,
    derived,
    estudis: repassos.estudis,
    reviews,
    onSave: handleSave,
    onStudyDate: handleStudyDate,
    onToggleReview: toggleReview,
    onRegister: handleRegister,
    onRegisterTema: handleRegisterTema,
  }

  return (
    <MainContainer maxW='full' px={{ base: 3, md: 6 }}>
      <PageHeader
        title={t('plan.title', { defaultValue: 'Planificació de Temari' })}
        subtitle={t('plan.subtitle', {
          defaultValue:
            'Planifica el teu estudi, fes seguiment de les tasques abans i després de classe i controla la teva evolució.',
        })}
        right={
          <Flex gap={2} wrap='wrap' align='center'>
            <SaveIndicator />
            <CsvMenu onOriginal={() => exportCsv(false)} onFlat={() => exportCsv(true)} />
          </Flex>
        }
      />
      <PlanMetricsCards metrics={derived.metrics} />
      <PlanToolbar
        temes={structure.temes}
        filters={filters}
        onChange={setFilters}
        visibleCount={visibleCount}
        totalCount={totalCount}
      />

      {!visibleTemes.length ? (
        <ElementNotFound
          icon={icons.filter}
          title={t('plan.no_rows', { defaultValue: 'Cap apartat coincideix amb els filtres' })}
          desc={t('plan.no_rows_desc', { defaultValue: 'Prova de treure algun filtre per veure més apartats.' })}
        />
      ) : isTable ? (
        <PlanTable {...listProps} />
      ) : (
        <PlanMobileList {...listProps} />
      )}

      <RegisterStudyModal isOpen={register.isOpen} onClose={register.onClose} initial={registerInitial} />
      <ConfirmDialog
        isOpen={!!studyChange}
        onClose={() => setStudyChange(null)}
        isDestructive={!studyChange?.date}
        title={
          studyChange?.date
            ? t('plan.class_date_change_title', { defaultValue: 'Canviar la data de classe?' })
            : t('plan.class_date_remove_title', { defaultValue: 'Treure la data de classe?' })
        }
        body={
          studyChange &&
          (studyChange.date
            ? t('plan.class_date_change_body', {
                defaultValue:
                  'Els repassos pendents de «{{ apartat }}» es tornaran a calcular a partir del {{ date }} i es perdran els que hagis mogut a mà. Els repassos ja fets es queden com estan.',
                apartat: `${studyChange.apartat.num} ${studyChange.apartat.titol}`,
                date: formatShort(studyChange.date),
              })
            : t('plan.class_date_remove_body', {
                defaultValue:
                  'Els repassos de «{{ apartat }}» desapareixeran del calendari. Les tasques que ja has marcat a la taula no es perden.',
                apartat: `${studyChange.apartat.num} ${studyChange.apartat.titol}`,
              }))
        }
        confirmLabel={
          studyChange?.date
            ? t('plan.class_date_change_confirm', { defaultValue: 'Canviar la data' })
            : t('plan.class_date_remove_confirm', { defaultValue: 'Treure la data' })
        }
        onConfirm={confirmStudyChange}
        isLoading={isRegistering || isRemoving}
      />
    </MainContainer>
  )
}
