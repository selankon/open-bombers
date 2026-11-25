import { Flex, useBreakpointValue, useDisclosure, useToast } from '@chakra-ui/react'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { SaveIndicator } from '~components/Layout/SaveIndicator'
import { useRegisterStudy } from '~components/Repassos/queries'
import { RegisterStudyInitial, RegisterStudyModal } from '~components/Repassos/RegisterStudyModal'
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
  const { structure, cells, derived, repassos, instances, avui } = useStudyData()
  const { mutate: saveCell } = useSaveCell()
  const { mutateAsync: registerStudy, isPending: isRegistering } = useRegisterStudy()
  const isTable = useBreakpointValue({ base: false, md: true }, { ssr: false })

  const [filters, setFilters] = useState<PlanFilters>(EMPTY_FILTERS)
  const register = useDisclosure()
  const [registerInitial, setRegisterInitial] = useState<RegisterStudyInitial>()
  const [dataClasse, setDataClasse] = useState<{ tema: Tema; date: string } | null>(null)

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
    (rowId: string, colId: string, value: string, manual?: boolean) => {
      saveCell({ rowId, colId, value, manual }, { onError: saveError })
      // Setting the class day of a tema offers to register all its apartats on that day
      if (colId === COL.DATA_CLASSE && value) {
        const tema = structure.temes.find((tm) => tm.apartats[0]?.row_id === rowId)
        if (tema) setDataClasse({ tema, date: value })
      }
    },
    [saveCell, saveError, structure]
  )

  const handleRegister = useCallback(
    (tema: Tema, apartat: Apartat) => {
      setRegisterInitial({ temaId: tema.id, rowIds: [apartat.row_id], date: repassos.estudis[apartat.row_id] })
      register.onOpen()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [repassos.estudis, register.onOpen]
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
    const csv = flat ? buildFlatCsv(structure, cells, derived) : buildOriginalCsv(structure, cells, derived)
    downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), flat ? CSV_FLAT_FILE_NAME : CSV_FILE_NAME)
  }

  const confirmDataClasse = async () => {
    if (!dataClasse) return
    try {
      await registerStudy({ rowIds: dataClasse.tema.apartats.map((a) => a.row_id), date: dataClasse.date })
      toast({
        title: t('repassos.study_registered', {
          defaultValue: 'Estudi registrat ({{ count }} apartats)',
          count: dataClasse.tema.apartats.length,
        }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      saveError()
    }
    setDataClasse(null)
  }

  const listProps = {
    columns: structure.columns,
    temes: visibleTemes,
    cells,
    derived,
    estudis: repassos.estudis,
    onSave: handleSave,
    onRegister: handleRegister,
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
        isOpen={!!dataClasse}
        onClose={() => setDataClasse(null)}
        title={t('plan.data_classe_title', { defaultValue: 'Registrar tots els apartats del tema en aquesta data?' })}
        body={
          dataClasse &&
          t('plan.data_classe_body', {
            defaultValue:
              'Es registrarà l’estudi dels {{ count }} apartats de {{ tema }} el {{ date }} i es generaran els seus repassos. Els apartats que ja tenien data reiniciaran el cicle.',
            count: dataClasse.tema.apartats.length,
            tema: dataClasse.tema.codi,
            date: formatShort(dataClasse.date),
          })
        }
        confirmLabel={t('plan.data_classe_confirm', { defaultValue: 'Registrar' })}
        onConfirm={confirmDataClasse}
        isLoading={isRegistering}
      />
    </MainContainer>
  )
}
