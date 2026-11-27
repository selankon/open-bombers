import {
  Badge,
  Box,
  Button,
  Flex,
  Heading,
  Icon,
  IconButton,
  Skeleton,
  Stack,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAnotacionsList } from '~components/Anotacions/queries'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { Card, MainContainer, PageHeader } from '~components/Layout/LayoutComponents'
import { useOnline } from '~components/Layout/useOnline'
import { ProgressBar } from '~components/Planificacio/Metrics'
import { ALL_TEMARI_PDFS, TEMARI_CORRECCIONS, TEMARI_PDFS } from '~src/data/temari-pdfs'
import { icons } from '~theme/icons'
import { spring, STAGGER_MAX, STAGGER_STEP } from '~theme/motion'
import { formatRanges, pdfForTema, temaNumber } from './logic'
import { PdfAnotacionsMenu } from './PdfAnotacionsMenu'
import { useRecursos, useRemovePdfs, useSavePdfs, useSavedPdfs } from './queries'
import { RecursFormModal } from './RecursFormModal'
import { recursPdfId } from './recursos'
import { RecursRow } from './RecursRow'
import { RecursViewer } from './RecursViewer'
import { Recurs, RecursCategoria, TemariPdf } from './types'
import { usePdfActions } from './usePdfActions'

type Row = { key: string; num: number | null; nom: string; pdf?: TemariPdf }
type Batch = { kind: 'save' | 'download'; done: number; total: number }
// One line of the "per tema" list: an official manual or an extra tema added by the user
type TemaItem = { key: string; num: number; row?: Required<Row>; recurs?: Recurs }
type FormState = { categoria: RecursCategoria; recurs: Recurs | null }

const FadeIn = ({ index, children }: { index: number; children: ReactNode }) => {
  const reduce = useReducedMotion()
  return (
    <Box
      as={motion.div}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      // @ts-ignore framer-motion transition prop through Chakra
      transition={{ ...spring.smooth, delay: Math.min(index, STAGGER_MAX) * STAGGER_STEP }}
    >
      {children}
    </Box>
  )
}

type PdfRowProps = {
  num: number | null
  nom: string
  pdf: TemariPdf
  // Number of annotations of the PDF (0 when it has none)
  anotacions: number
}

/**
 * One document: open it, save it as a file, keep it offline. Annotated PDFs get a "…" menu instead
 * of the download button (download, export with the annotations, delete them).
 */
const PdfRow = ({ num, nom, pdf, anotacions }: PdfRowProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const isOnline = useOnline()
  const { open, download, isSaved, busyId } = usePdfActions()
  const { mutateAsync: save, isPending: isSaving } = useSavePdfs()
  const { mutateAsync: remove, isPending: isRemoving } = useRemovePdfs()
  const saved = isSaved(pdf)
  const unavailable = !saved && !isOnline

  const toggleOffline = async () => {
    try {
      if (saved) {
        await remove([pdf.id])
        toast({
          title: t('temari.removed_one', { defaultValue: 'Còpia esborrada' }),
          status: 'success',
          duration: 3000,
        })
        return
      }
      const { failed } = await save({ ids: [pdf.id] })
      if (failed.length) throw new Error('save failed')
      toast({
        title: t('temari.saved_one', { defaultValue: 'Desat per llegir sense connexió' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('temari.save_error', { defaultValue: 'No s’ha pogut desar el PDF' }),
        description: t('temari.save_error_desc', {
          defaultValue: 'Comprova la connexió i torna-ho a provar. Si continua fallant, potser el servidor no respon.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const offlineLabel = saved
    ? t('temari.remove_offline', { defaultValue: 'Esborra la còpia sense connexió' })
    : t('temari.save_offline', { defaultValue: 'Desa per llegir sense connexió' })

  return (
    <Card px={{ base: 3, md: 4 }} py={3}>
      <Flex align='center' gap={3}>
        <Flex
          w={10}
          h={10}
          flexShrink={0}
          borderRadius='sm'
          bg='temaCode'
          color='white'
          align='center'
          justify='center'
          fontWeight={800}
          fontSize='sm'
        >
          {num ?? <Icon as={icons.pdf} boxSize={5} />}
        </Flex>
        <Box flex={1} minW={0}>
          <Text fontWeight={700} fontSize='sm' noOfLines={2}>
            {nom}
          </Text>
          <Flex align='center' gap={2} mt={0.5} wrap='wrap'>
            {pdf.manual && (
              <Text fontSize='xs' color='textMuted'>
                {pdf.manual}
              </Text>
            )}
            {pdf.actualitzat && (
              <Badge colorScheme='primary' variant='subtle' fontSize='2xs' borderRadius='full' px={2}>
                {t('temari.updated', { defaultValue: 'Actualitzat' })}
              </Badge>
            )}
            {saved && (
              <Flex align='center' gap={1} fontSize='xs' color='accent'>
                <Icon as={icons.saved} />
                <Text>{t('temari.saved_badge', { defaultValue: 'Al dispositiu' })}</Text>
              </Flex>
            )}
            {anotacions > 0 && (
              <Flex align='center' gap={1} fontSize='xs' color='accent'>
                <Icon as={icons.annotated} />
                <Text sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {t('temari.annotated_badge', {
                    defaultValue: '{{count}} anotacions',
                    defaultValue_one: '{{count}} anotació',
                    count: anotacions,
                  })}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>
        <Flex gap={1} flexShrink={0}>
          <Tooltip label={offlineLabel} hasArrow>
            <IconButton
              aria-label={offlineLabel}
              icon={<Icon as={saved ? icons.saved : icons.saveOffline} boxSize={5} />}
              variant='ghost'
              colorScheme={saved ? 'primary' : 'gray'}
              onClick={toggleOffline}
              isLoading={isSaving || isRemoving}
              isDisabled={!saved && !isOnline}
            />
          </Tooltip>
          {anotacions > 0 ? (
            <PdfAnotacionsMenu
              pdf={pdf}
              nom={nom}
              onDownload={() => download(pdf)}
              isDownloading={busyId === pdf.id}
              unavailable={unavailable}
            />
          ) : (
            <Tooltip label={t('temari.download', { defaultValue: 'Descarrega el fitxer' })} hasArrow>
              <IconButton
                aria-label={t('temari.download', { defaultValue: 'Descarrega el fitxer' })}
                icon={<Icon as={icons.download} boxSize={5} />}
                variant='ghost'
                colorScheme='gray'
                onClick={() => download(pdf)}
                isLoading={busyId === pdf.id}
                isDisabled={unavailable}
              />
            </Tooltip>
          )}
          <Button
            leftIcon={<Icon as={icons.study} />}
            onClick={() => open(pdf)}
            isDisabled={unavailable}
            display={{ base: 'none', sm: 'inline-flex' }}
          >
            {t('temari.open', { defaultValue: 'Obre' })}
          </Button>
          <IconButton
            aria-label={t('temari.open_aria', { defaultValue: 'Obre el PDF' })}
            icon={<Icon as={icons.study} boxSize={5} />}
            onClick={() => open(pdf)}
            isDisabled={unavailable}
            display={{ base: 'inline-flex', sm: 'none' }}
          />
        </Flex>
      </Flex>
    </Card>
  )
}

/**
 * Official syllabus manuals: open, download and keep them on the device for offline study
 */
export const TemariView = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const isOnline = useOnline()
  const { structure } = useStudyData()
  const { data: saved = [] } = useSavedPdfs()
  const { data: anotats = [] } = useAnotacionsList()
  const { downloadAll } = usePdfActions()
  const { mutateAsync: save } = useSavePdfs()
  const { mutateAsync: remove, isPending: isRemoving } = useRemovePdfs()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [onlyAnnotated, setOnlyAnnotated] = useState(false)
  const { data: recursos = [], isPending: loadingRecursos, isError: recursosError, refetch } = useRecursos()
  const [form, setForm] = useState<FormState | null>(null)
  const [viewing, setViewing] = useState<Recurs | null>(null)

  // Number of annotations of every annotated PDF
  const anotacionsById = useMemo(() => new Map(anotats.map((a) => [a.id, a.total])), [anotats])
  const countOf = (pdf: TemariPdf) => anotacionsById.get(pdf.id) ?? 0
  // The filter only exists while some PDF is annotated
  const hasAnnotated = anotats.some((a) => a.total > 0)
  const filtering = onlyAnnotated && hasAnnotated

  // Temes of the planning (names can be edited by the user) + manuals whose tema isn't there
  const rows = useMemo<Row[]>(() => {
    const fromStructure: Row[] = structure.temes.map((tema) => ({
      key: tema.id,
      num: temaNumber(tema),
      nom: tema.nom,
      pdf: pdfForTema(tema),
    }))
    const shown = new Set(fromStructure.map((r) => r.pdf?.id).filter(Boolean))
    const orphans: Row[] = TEMARI_PDFS.filter((p) => !shown.has(p.id)).map((pdf) => ({
      key: pdf.id,
      num: pdf.tema,
      nom: t('temari.tema_fallback', { defaultValue: 'Tema {{n}}', n: pdf.tema }),
      pdf,
    }))
    return [...fromStructure, ...orphans].sort((a, b) => (a.num ?? 0) - (b.num ?? 0))
  }, [structure.temes, t])
  const withPdf = useMemo(() => rows.filter((r): r is Required<Row> => !!r.pdf), [rows])
  const countOfRecurs = (recurs: Recurs) => anotacionsById.get(recursPdfId(recurs.id)) ?? 0
  // Official manuals and extra temes together, by number (the official one first)
  const temaItems = useMemo<TemaItem[]>(
    () =>
      [
        ...withPdf.map((row): TemaItem => ({ key: row.key, num: row.num ?? 0, row })),
        ...recursos
          .filter((r) => r.categoria === 'tema')
          .map((recurs): TemaItem => ({ key: recurs.id, num: recurs.tema ?? 0, recurs })),
      ].sort((a, b) => a.num - b.num || Number(!!a.recurs) - Number(!!b.recurs)),
    [withPdf, recursos]
  )
  const visible = filtering
    ? temaItems.filter((it) => (it.row ? countOf(it.row.pdf) : countOfRecurs(it.recurs as Recurs)) > 0)
    : temaItems
  const extres = recursos.filter((r) => r.categoria === 'extra')
  // Temes without a manual (legal texts), listed by number in a single note
  const withoutPdf = rows
    .filter((r) => !r.pdf)
    .map((r) => r.num)
    .filter((n): n is number => n !== null)

  const total = ALL_TEMARI_PDFS.length
  const savedCount = ALL_TEMARI_PDFS.filter((p) => saved.includes(p.id)).length
  const allSaved = savedCount === total
  const isBusy = batch !== null

  const failedToast = (failed: number) =>
    toast({
      title: t('temari.batch_failed', { defaultValue: '{{count}} PDF no s’han pogut baixar', count: failed }),
      description: t('temari.batch_failed_desc', {
        defaultValue: 'Pot ser un problema puntual del servidor. Torna-ho a provar: només es baixaran els que falten.',
      }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  const handleSaveAll = async () => {
    const ids = ALL_TEMARI_PDFS.filter((p) => !saved.includes(p.id)).map((p) => p.id)
    setBatch({ kind: 'save', done: 0, total: ids.length })
    try {
      const { failed } = await save({ ids, onProgress: (done, n) => setBatch({ kind: 'save', done, total: n }) })
      if (failed.length) failedToast(failed.length)
      else
        toast({
          title: t('temari.saved_all', { defaultValue: 'Temari desat al dispositiu' }),
          status: 'success',
          duration: 3000,
        })
    } catch {
      failedToast(ids.length)
    } finally {
      setBatch(null)
    }
  }

  const handleDownloadAll = async () => {
    setBatch({ kind: 'download', done: 0, total })
    const failed = await downloadAll(ALL_TEMARI_PDFS, (done, n) => setBatch({ kind: 'download', done, total: n }))
    setBatch(null)
    if (failed.length) failedToast(failed.length)
    else
      toast({
        title: t('temari.downloaded_all', { defaultValue: 'Temari descarregat' }),
        status: 'success',
        duration: 3000,
      })
  }

  const handleRemoveAll = async () => {
    try {
      await remove(ALL_TEMARI_PDFS.map((p) => p.id))
      setIsRemoveOpen(false)
      toast({
        title: t('temari.removed_all', { defaultValue: 'Còpies esborrades' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('common.error', { defaultValue: 'Error' }),
        description: t('temari.remove_error', {
          defaultValue: 'No s’han pogut esborrar les còpies. Torna-ho a provar.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  // Downloads of files that aren't saved need a connection
  const canDownloadAll = isOnline || allSaved

  return (
    <MainContainer maxW='container.md'>
      <PageHeader
        title={t('temari.title', { defaultValue: 'Temari' })}
        subtitle={t('temari.subtitle', {
          defaultValue:
            'Manuals oficials de la convocatòria ACCÉS 81/26. Desa’ls al dispositiu per estudiar sense connexió.',
        })}
      />

      <Stack spacing={6}>
        <Card p={{ base: 4, md: 6 }}>
          <Flex align='baseline' justify='space-between' gap={3} mb={3}>
            <Heading size='sm'>{t('temari.offline_title', { defaultValue: 'Al dispositiu' })}</Heading>
            <Text fontSize='sm' color='textMuted'>
              {t('temari.saved_count', { defaultValue: '{{saved}} de {{total}} desats', saved: savedCount, total })}
            </Text>
          </Flex>
          <ProgressBar pct={batch ? (batch.done / Math.max(batch.total, 1)) * 100 : (savedCount / total) * 100} />
          <Text fontSize='sm' color='textMuted' mt={3} minH={5}>
            {batch
              ? batch.kind === 'save'
                ? t('temari.saving_progress', {
                    defaultValue: 'Desant {{done}} de {{total}}…',
                    done: batch.done,
                    total: batch.total,
                  })
                : t('temari.downloading_progress', {
                    defaultValue: 'Descarregant {{done}} de {{total}}…',
                    done: batch.done,
                    total: batch.total,
                  })
              : !isOnline && !allSaved
                ? t('temari.offline_hint', { defaultValue: 'Connecta’t a internet per desar la resta de manuals.' })
                : t('temari.size_hint', {
                    defaultValue:
                      'Tot el temari ocupa uns 37 MB. “Descarrega-ho tot” desa cada PDF com a fitxer: el navegador et pot demanar permís per baixar diversos fitxers.',
                  })}
          </Text>
          <Flex gap={2} mt={4} wrap='wrap'>
            {!allSaved && (
              <Button
                leftIcon={<Icon as={icons.saved} />}
                onClick={handleSaveAll}
                isLoading={batch?.kind === 'save'}
                isDisabled={isBusy || !isOnline}
                size='md'
              >
                {savedCount
                  ? t('temari.save_rest', { defaultValue: 'Desa els que falten' })
                  : t('temari.save_all', { defaultValue: 'Desa-ho tot sense connexió' })}
              </Button>
            )}
            <Button
              leftIcon={<Icon as={icons.download} />}
              onClick={handleDownloadAll}
              isLoading={batch?.kind === 'download'}
              isDisabled={isBusy || !canDownloadAll}
              variant='outline'
              colorScheme='gray'
              size='md'
            >
              {t('temari.download_all', { defaultValue: 'Descarrega-ho tot' })}
            </Button>
            {savedCount > 0 && (
              <Button
                leftIcon={<Icon as={icons.delete} />}
                onClick={() => setIsRemoveOpen(true)}
                isDisabled={isBusy}
                variant='ghost'
                colorScheme='red'
                size='md'
              >
                {t('temari.remove_all', { defaultValue: 'Esborra les còpies' })}
              </Button>
            )}
          </Flex>
        </Card>

        <Box>
          <Heading size='sm' mb={3}>
            {t('temari.general', { defaultValue: 'Per a tot el temari' })}
          </Heading>
          <PdfRow
            num={null}
            nom={t('temari.correccions', { defaultValue: 'Correccions de la guia orientativa de continguts' })}
            pdf={TEMARI_CORRECCIONS}
            anotacions={countOf(TEMARI_CORRECCIONS)}
          />
        </Box>

        <Box>
          <Flex align='center' justify='space-between' gap={3} mb={3} minH={8}>
            <Heading size='sm'>{t('temari.by_tema', { defaultValue: 'Per tema' })}</Heading>
            <Flex gap={2}>
              {hasAnnotated && (
                <Button
                  size='sm'
                  leftIcon={<Icon as={icons.annotated} />}
                  variant={filtering ? 'solid' : 'outline'}
                  colorScheme={filtering ? 'primary' : 'gray'}
                  borderRadius='full'
                  aria-pressed={filtering}
                  onClick={() => setOnlyAnnotated((v) => !v)}
                >
                  {t('temari.only_annotated', { defaultValue: 'Només anotats' })}
                </Button>
              )}
              <Button
                size='sm'
                leftIcon={<Icon as={icons.add} />}
                variant='outline'
                colorScheme='gray'
                borderRadius='full'
                onClick={() => setForm({ categoria: 'tema', recurs: null })}
              >
                {t('recursos.add_tema', { defaultValue: 'Afegeix un tema' })}
              </Button>
            </Flex>
          </Flex>
          {withoutPdf.length > 0 && !filtering && (
            <Flex align='flex-start' gap={2} fontSize='sm' color='textMuted' mb={3}>
              <Icon as={icons.info} mt={0.5} flexShrink={0} />
              <Text>
                {t('temari.no_pdf_note', {
                  defaultValue: 'Els temes {{list}} no tenen manual: s’estudien amb el text legal corresponent.',
                  list: formatRanges(withoutPdf),
                })}
              </Text>
            </Flex>
          )}
          {visible.length ? (
            <Stack spacing={2}>
              {visible.map(({ key, row, recurs }, i) => (
                <FadeIn key={key} index={i}>
                  {row ? (
                    <PdfRow num={row.num} nom={row.nom} pdf={row.pdf} anotacions={countOf(row.pdf)} />
                  ) : (
                    recurs && (
                      <RecursRow
                        recurs={recurs}
                        anotacions={countOfRecurs(recurs)}
                        onEdit={(r) => setForm({ categoria: 'tema', recurs: r })}
                        onView={setViewing}
                      />
                    )
                  )}
                </FadeIn>
              ))}
            </Stack>
          ) : (
            <Card>
              <ElementNotFound
                icon={icons.annotated}
                title={t('temari.empty_annotated_title', { defaultValue: 'Cap tema amb anotacions' })}
                desc={t('temari.empty_annotated_desc', {
                  defaultValue:
                    'Aquí veuràs els manuals dels temes on hagis dibuixat, subratllat o afegit notes. Obre’n un i fes-hi la primera anotació.',
                })}
                action={
                  <Button variant='outline' colorScheme='gray' onClick={() => setOnlyAnnotated(false)}>
                    {t('temari.show_all', { defaultValue: 'Mostra tots els temes' })}
                  </Button>
                }
              />
            </Card>
          )}
        </Box>

        <Box>
          <Flex align='center' justify='space-between' gap={3} mb={1} minH={8}>
            <Heading size='sm'>{t('recursos.title', { defaultValue: 'Recursos addicionals' })}</Heading>
            {extres.length > 0 && (
              <Button
                size='sm'
                leftIcon={<Icon as={icons.add} />}
                variant='outline'
                colorScheme='gray'
                borderRadius='full'
                onClick={() => setForm({ categoria: 'extra', recurs: null })}
              >
                {t('recursos.add_short', { defaultValue: 'Afegeix' })}
              </Button>
            )}
          </Flex>
          <Text fontSize='sm' color='textMuted' mb={3}>
            {t('recursos.subtitle', {
              defaultValue:
                'Material de fora del temari: fitxers, vídeos, imatges o enllaços. Els fitxers es desen només en aquest dispositiu i no van a la còpia de seguretat.',
            })}
          </Text>
          {recursosError ? (
            <Card>
              <ElementNotFound
                icon={icons.warning}
                title={t('recursos.load_error_title', { defaultValue: 'No hem pogut carregar els teus recursos' })}
                desc={t('recursos.load_error_desc', {
                  defaultValue: 'Ho sentim, alguna cosa ha fallat en llegir-los del dispositiu. Torna-ho a provar.',
                })}
                action={
                  <Button leftIcon={<Icon as={icons.reset} />} onClick={() => refetch()}>
                    {t('recursos.retry', { defaultValue: 'Torna-ho a provar' })}
                  </Button>
                }
              />
            </Card>
          ) : loadingRecursos ? (
            <Stack spacing={2}>
              {[0, 1].map((i) => (
                <Skeleton key={i} h={16} borderRadius='card' />
              ))}
            </Stack>
          ) : extres.length ? (
            <Stack spacing={2}>
              {extres.map((recurs, i) => (
                <FadeIn key={recurs.id} index={i}>
                  <RecursRow
                    recurs={recurs}
                    anotacions={countOfRecurs(recurs)}
                    onEdit={(r) => setForm({ categoria: 'extra', recurs: r })}
                    onView={setViewing}
                  />
                </FadeIn>
              ))}
            </Stack>
          ) : (
            <Card>
              <ElementNotFound
                icon={icons.attach}
                title={t('recursos.empty_title', { defaultValue: 'Encara no has afegit cap recurs' })}
                desc={t('recursos.empty_desc', {
                  defaultValue:
                    'Aquí tindràs a mà els teus apunts, esquemes, fotos, vídeos o enllaços a webs que t’ajudin a estudiar.',
                })}
                action={
                  <Button
                    leftIcon={<Icon as={icons.add} />}
                    onClick={() => setForm({ categoria: 'extra', recurs: null })}
                  >
                    {t('recursos.add_first', { defaultValue: 'Afegeix un recurs' })}
                  </Button>
                }
              />
            </Card>
          )}
        </Box>
      </Stack>

      <RecursFormModal
        isOpen={!!form}
        onClose={() => setForm(null)}
        categoria={form?.categoria ?? 'extra'}
        recurs={form?.recurs}
      />
      <RecursViewer recurs={viewing} onClose={() => setViewing(null)} />

      <ConfirmDialog
        isOpen={isRemoveOpen}
        onClose={() => setIsRemoveOpen(false)}
        onConfirm={handleRemoveAll}
        isLoading={isRemoving}
        isDestructive
        title={t('temari.remove_all_title', { defaultValue: 'Esborrar les còpies del temari?' })}
        body={t('temari.remove_all_body_annotations', {
          defaultValue:
            'S’esborraran els PDF desats en aquest dispositiu i alliberaràs espai. El teu progrés i les teves anotacions no es toquen, però per obrir un PDF anotat necessitaràs connexió fins que el tornis a desar. Pots tornar a desar-los quan vulguis amb connexió.',
        })}
        confirmLabel={t('temari.remove_all_confirm', { defaultValue: 'Esborra les còpies' })}
      />
    </MainContainer>
  )
}
