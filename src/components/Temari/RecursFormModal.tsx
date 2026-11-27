import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  FormLabel,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useToast,
} from '@chakra-ui/react'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { useCreateRecurs, useUpdateRecurs } from './queries'
import { formatMida, normalizeUrl } from './recursos'
import { Recurs, RecursCategoria } from './types'

type Font = 'fitxer' | 'enllac'

type RecursFormModalProps = {
  isOpen: boolean
  onClose: () => void
  categoria: RecursCategoria
  // Edit this one instead of creating a new one
  recurs?: Recurs | null
}

// "Resum temes 1-7.pdf" → "Resum temes 1-7"
const titleFromFile = (name: string) => name.replace(/\.[^./]+$/, '').trim()

/**
 * Adds (or edits) an extra tema (number, title and file) or a resource outside the syllabus (file or link)
 */
export const RecursFormModal = ({ isOpen, onClose, categoria, recurs }: RecursFormModalProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const isTema = categoria === 'tema'
  const isEdit = !!recurs
  const [numero, setNumero] = useState('')
  const [titol, setTitol] = useState('')
  const [font, setFont] = useState<Font>('fitxer')
  const [fitxer, setFitxer] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [triedSubmit, setTriedSubmit] = useState(false)
  const { mutateAsync: create, isPending: isCreating } = useCreateRecurs()
  const { mutateAsync: update, isPending: isUpdating } = useUpdateRecurs()

  // Reset the fields every time the modal opens
  useEffect(() => {
    if (!isOpen) return
    setNumero(recurs?.tema != null ? String(recurs.tema) : '')
    setTitol(recurs?.titol ?? '')
    setFont(recurs && !recurs.fitxer ? 'enllac' : 'fitxer')
    setFitxer(null)
    setUrl(recurs?.url ?? '')
    setTriedSubmit(false)
  }, [isOpen, recurs])

  const num = numero.trim() === '' ? null : Number(numero)
  const numOk = !isTema || (num !== null && Number.isInteger(num) && num >= 0)
  const link = normalizeUrl(url)
  // When editing, the current file stays unless a new one is chosen
  const hasFile = !!fitxer || (font === 'fitxer' && !!recurs?.fitxer)
  const sourceOk = font === 'fitxer' ? hasFile : !!link
  const isValid = numOk && !!titol.trim() && sourceOk

  const pick = (file: File | undefined) => {
    if (!file) return
    setFitxer(file)
    if (!titol.trim()) setTitol(titleFromFile(file.name))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTriedSubmit(true)
    if (!isValid) return
    const params = {
      categoria,
      tema: isTema ? num : null,
      titol: titol.trim(),
      fitxer: font === 'fitxer' ? fitxer : null,
      url: font === 'enllac' ? link : null,
    }
    try {
      if (recurs) await update({ id: recurs.id, ...params })
      else await create(params)
      onClose()
      toast({
        title: isEdit
          ? t('recursos.saved', { defaultValue: 'Canvis desats' })
          : isTema
            ? t('recursos.tema_added', { defaultValue: 'Tema afegit' })
            : t('recursos.added', { defaultValue: 'Recurs afegit' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      toast({
        title: t('recursos.save_error', { defaultValue: 'No s’ha pogut desar' }),
        description: t('recursos.save_error_desc', {
          defaultValue:
            'Ho sentim, alguna cosa ha fallat. Potser el dispositiu no té prou espai lliure: allibera’n una mica o prova amb un fitxer més petit.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  }

  const title = isTema
    ? isEdit
      ? t('recursos.edit_tema_title', { defaultValue: 'Edita el tema' })
      : t('recursos.new_tema_title', { defaultValue: 'Afegeix un tema' })
    : isEdit
      ? t('recursos.edit_title', { defaultValue: 'Edita el recurs' })
      : t('recursos.new_title', { defaultValue: 'Afegeix un recurs' })

  const currentFile = fitxer ? { nom: fitxer.name, mida: fitxer.size } : font === 'fitxer' ? recurs?.fitxer : null

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size={{ base: 'full', sm: 'md' }}>
      <ModalOverlay backdropFilter='blur(2px)' />
      <ModalContent as='form' onSubmit={submit} noValidate borderRadius={{ base: 0, sm: 'sheet' }} mx={{ sm: 4 }}>
        <ModalHeader>{title}</ModalHeader>
        <ModalCloseButton aria-label={t('common.close', { defaultValue: 'Tancar' })} />
        <ModalBody>
          <Stack spacing={4}>
            {isTema && (
              <FormControl isRequired isInvalid={triedSubmit && !numOk}>
                <FormLabel>{t('recursos.field_number', { defaultValue: 'Número del tema' })}</FormLabel>
                <Input
                  type='number'
                  inputMode='numeric'
                  min={0}
                  step={1}
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder={t('recursos.number_placeholder', { defaultValue: 'Per exemple: 1' })}
                  borderRadius='sm'
                  maxW={40}
                  autoFocus={!isEdit}
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                />
                <FormHelperText>
                  {t('recursos.number_help', {
                    defaultValue: 'Decideix on surt a la llista de temes, al costat dels manuals oficials.',
                  })}
                </FormHelperText>
                <FormErrorMessage>
                  {t('recursos.number_error', { defaultValue: 'Escriu un número sencer, per exemple 1.' })}
                </FormErrorMessage>
              </FormControl>
            )}

            <FormControl isRequired isInvalid={triedSubmit && !titol.trim()}>
              <FormLabel>{t('recursos.field_title', { defaultValue: 'Títol' })}</FormLabel>
              <Input
                value={titol}
                onChange={(e) => setTitol(e.target.value)}
                placeholder={
                  isTema
                    ? t('recursos.tema_title_placeholder', { defaultValue: 'Per exemple: Resum dels temes 1 al 7' })
                    : t('recursos.title_placeholder', { defaultValue: 'Per exemple: Vídeo de nusos bàsics' })
                }
                borderRadius='sm'
                autoFocus={!isTema && !isEdit}
              />
              <FormErrorMessage>
                {t('recursos.title_error', { defaultValue: 'Posa-li un títol per reconèixer-lo a la llista.' })}
              </FormErrorMessage>
            </FormControl>

            {!isTema && (
              <ButtonGroup isAttached size='sm' variant='outline' colorScheme='gray' w='full'>
                {(['fitxer', 'enllac'] as const).map((f) => (
                  <Button
                    key={f}
                    flex={1}
                    leftIcon={<Icon as={f === 'fitxer' ? icons.attach : icons.link} />}
                    aria-pressed={font === f}
                    onClick={() => setFont(f)}
                    {...(font === f && { variant: 'solid', colorScheme: 'primary' })}
                  >
                    {f === 'fitxer'
                      ? t('recursos.source_file', { defaultValue: 'Fitxer' })
                      : t('recursos.source_link', { defaultValue: 'Enllaç' })}
                  </Button>
                ))}
              </ButtonGroup>
            )}

            {font === 'fitxer' ? (
              <FormControl isRequired isInvalid={triedSubmit && !hasFile}>
                <FormLabel>{t('recursos.field_file', { defaultValue: 'Fitxer' })}</FormLabel>
                <input
                  ref={inputRef}
                  type='file'
                  hidden
                  onChange={(e) => {
                    pick(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
                <Flex
                  align='center'
                  gap={3}
                  p={3}
                  borderWidth='1px'
                  borderStyle={currentFile ? 'solid' : 'dashed'}
                  borderColor='border'
                  borderRadius='sm'
                  bg='surfaceMuted'
                >
                  <Icon as={currentFile ? icons.file : icons.upload} boxSize={5} color='textMuted' flexShrink={0} />
                  <Box flex={1} minW={0}>
                    <Text fontSize='sm' fontWeight={600} noOfLines={1}>
                      {currentFile?.nom ?? t('recursos.no_file', { defaultValue: 'Cap fitxer triat' })}
                    </Text>
                    {currentFile && (
                      <Text fontSize='xs' color='textMuted' sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatMida(currentFile.mida)}
                      </Text>
                    )}
                  </Box>
                  <Button variant='outline' colorScheme='gray' flexShrink={0} onClick={() => inputRef.current?.click()}>
                    {currentFile
                      ? t('recursos.change_file', { defaultValue: 'Canvia' })
                      : t('recursos.choose_file', { defaultValue: 'Tria un fitxer' })}
                  </Button>
                </Flex>
                <FormHelperText>
                  {t('recursos.file_help', {
                    defaultValue:
                      'Els PDF s’obren al lector i els pots anotar. Les imatges, els vídeos i els àudios es veuen dins de l’app. El fitxer es desa només en aquest dispositiu.',
                  })}
                </FormHelperText>
                <FormErrorMessage>
                  {t('recursos.file_error', { defaultValue: 'Tria el fitxer que vols afegir.' })}
                </FormErrorMessage>
              </FormControl>
            ) : (
              <FormControl isRequired isInvalid={triedSubmit && !link}>
                <FormLabel>{t('recursos.field_link', { defaultValue: 'Enllaç' })}</FormLabel>
                <Input
                  type='url'
                  inputMode='url'
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder='https://www.youtube.com/watch?v=…'
                  borderRadius='sm'
                />
                <FormHelperText>
                  {t('recursos.link_help', {
                    defaultValue:
                      'Un vídeo de YouTube, una pàgina web o un document al núvol. S’obre en una pestanya nova.',
                  })}
                </FormHelperText>
                <FormErrorMessage>
                  {t('recursos.link_error', {
                    defaultValue: 'Aquest enllaç no sembla una adreça web. Copia’l sencer del navegador.',
                  })}
                </FormErrorMessage>
              </FormControl>
            )}
          </Stack>
        </ModalBody>
        <ModalFooter gap={2} pb={{ base: 'calc(16px + env(safe-area-inset-bottom))', sm: 4 }}>
          <Button variant='ghost' colorScheme='gray' onClick={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel·lar' })}
          </Button>
          <Button type='submit' isLoading={isCreating || isUpdating}>
            {isEdit ? t('common.save', { defaultValue: 'Desar' }) : t('recursos.add', { defaultValue: 'Afegeix' })}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
