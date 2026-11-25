import {
  Button,
  Checkbox,
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Stack,
} from '@chakra-ui/react'
import { FormEvent, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { temaShortCode } from '~components/Planificacio/structure'

export interface MapaFormValues {
  titol: string
  tema_id: string | null
  row_id: string | null
  // Create only: start with the tema and its apartats as nodes
  amb_apartats: boolean
}

type MapaFormModalProps = {
  isOpen: boolean
  onClose: () => void
  mode: 'create' | 'edit'
  initial?: Partial<MapaFormValues>
  onSubmit: (values: MapaFormValues) => void
  isLoading?: boolean
}

/**
 * Title and (optional) link to a tema / apartat of a map, to create it or change it
 */
export const MapaFormModal = ({ isOpen, onClose, mode, initial, onSubmit, isLoading }: MapaFormModalProps) => {
  const { t } = useTranslation()
  const { structure } = useStudyData()
  const [titol, setTitol] = useState('')
  const [temaId, setTemaId] = useState<string | null>(null)
  const [rowId, setRowId] = useState<string | null>(null)
  const [ambApartats, setAmbApartats] = useState(true)
  // The title follows the tema / apartat until the user writes their own
  const [autoTitle, setAutoTitle] = useState(true)

  // Reset the fields every time the modal opens
  useEffect(() => {
    if (!isOpen) return
    const tm = structure.temes.find((x) => x.id === initial?.tema_id)
    setTitol(initial?.titol ?? (mode === 'create' && tm ? tm.nom : ''))
    setTemaId(initial?.tema_id ?? null)
    setRowId(initial?.row_id ?? null)
    setAmbApartats(initial?.amb_apartats ?? true)
    setAutoTitle(mode === 'create' && !initial?.titol)
  }, [isOpen, initial, mode, structure])

  const tema = structure.temes.find((tm) => tm.id === temaId)
  const apartat = tema?.apartats.find((a) => a.row_id === rowId)

  const changeLink = (nextTema: string | null, nextRow: string | null) => {
    setTemaId(nextTema)
    setRowId(nextRow)
    if (!autoTitle) return
    const tm = structure.temes.find((x) => x.id === nextTema)
    const ap = tm?.apartats.find((a) => a.row_id === nextRow)
    setTitol(ap ? `${ap.num} ${ap.titol}` : tm ? tm.nom : '')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!titol.trim()) return
    onSubmit({ titol: titol.trim(), tema_id: temaId, row_id: tema ? rowId : null, amb_apartats: ambApartats })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: 'full', sm: 'md' }}>
      <ModalOverlay backdropFilter='blur(2px)' />
      <ModalContent as='form' onSubmit={submit} borderRadius={{ base: 0, sm: 'sheet' }} mx={{ sm: 4 }}>
        <ModalHeader>
          {mode === 'create'
            ? t('mapes.new_title', { defaultValue: 'Nou mapa mental' })
            : t('mapes.edit_title', { defaultValue: 'Dades del mapa' })}
        </ModalHeader>
        <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
        <ModalBody>
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>{t('mapes.field_tema', { defaultValue: 'Tema' })}</FormLabel>
              <Select value={temaId ?? ''} onChange={(e) => changeLink(e.target.value || null, null)} borderRadius='sm'>
                <option value=''>{t('mapes.free', { defaultValue: 'Cap: mapa lliure' })}</option>
                {structure.temes.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {temaShortCode(tm)} · {tm.nom}
                  </option>
                ))}
              </Select>
            </FormControl>
            {tema && (
              <FormControl>
                <FormLabel>{t('mapes.field_apartat', { defaultValue: 'Apartat' })}</FormLabel>
                <Select
                  value={rowId ?? ''}
                  onChange={(e) => changeLink(temaId, e.target.value || null)}
                  borderRadius='sm'
                >
                  <option value=''>{t('mapes.whole_tema', { defaultValue: 'Tot el tema' })}</option>
                  {tema.apartats.map((a) => (
                    <option key={a.row_id} value={a.row_id}>
                      {a.num} {a.titol}
                    </option>
                  ))}
                </Select>
              </FormControl>
            )}
            <FormControl isRequired>
              <FormLabel>{t('mapes.field_title', { defaultValue: 'Títol' })}</FormLabel>
              <Input
                value={titol}
                onChange={(e) => {
                  setTitol(e.target.value)
                  setAutoTitle(false)
                }}
                placeholder={t('mapes.title_placeholder', { defaultValue: 'Per exemple: Hidràulica bàsica' })}
                borderRadius='sm'
                autoFocus
              />
            </FormControl>
            {mode === 'create' && tema && !apartat && (
              <FormControl>
                <Checkbox isChecked={ambApartats} onChange={(e) => setAmbApartats(e.target.checked)}>
                  {t('mapes.with_apartats', { defaultValue: 'Comença amb els apartats del tema' })}
                </Checkbox>
                <FormHelperText>
                  {t('mapes.with_apartats_help', {
                    defaultValue: 'El tema queda al centre i cada apartat és una branca que pots desenvolupar.',
                  })}
                </FormHelperText>
              </FormControl>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pb={{ base: 'calc(16px + env(safe-area-inset-bottom))', sm: 4 }}>
          <Button variant='ghost' colorScheme='gray' onClick={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel·lar' })}
          </Button>
          <Button type='submit' isLoading={isLoading} isDisabled={!titol.trim()}>
            {mode === 'create'
              ? t('mapes.create', { defaultValue: 'Crear mapa' })
              : t('common.save', { defaultValue: 'Desar' })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
