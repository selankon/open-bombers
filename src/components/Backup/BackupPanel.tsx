import { Box, Button, Flex, Input, Stack, Text, Textarea, useClipboard, useToast } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { icons } from '~theme/icons'
import { BACKUP_FILE_NAME } from '~utils/constants'
import { canShareFiles, downloadBlob, shareFile } from '~utils/download'
import { backupToCode, parseBackupText } from './codec'
import { useExportBackup, useImportBackup, useResetData } from './queries'
import { BackupFile } from './types'

const SubTitle = ({ children }: { children: string }) => (
  <Text fontSize='sm' fontWeight={700} mb={1}>
    {children}
  </Text>
)

/**
 * Export / import all local data (JSON file or transfer code) and delete everything
 */
export const BackupPanel = () => {
  const { t } = useTranslation()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const { mutateAsync: exportBackup, isPending: isExporting } = useExportBackup()
  const { mutateAsync: importBackup, isPending: isImporting } = useImportBackup()
  const { mutateAsync: resetData, isPending: isResetting } = useResetData()
  const [code, setCode] = useState('')
  const [pasted, setPasted] = useState('')
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const { onCopy, hasCopied, setValue } = useClipboard('')

  const errorToast = (description?: string) =>
    toast({
      title: t('common.error', { defaultValue: 'Error' }),
      description,
      status: 'error',
      duration: 5000,
      isClosable: true,
    })

  const backupFile = async () => {
    const data = await exportBackup()
    return new File([JSON.stringify(data, null, 2)], BACKUP_FILE_NAME, { type: 'application/json' })
  }

  const handleDownload = async () => {
    try {
      const file = await backupFile()
      downloadBlob(file, file.name)
      toast({
        title: t('backup.exported', { defaultValue: 'Còpia de seguretat descarregada' }),
        status: 'success',
        duration: 3000,
      })
    } catch {
      errorToast()
    }
  }

  const handleShare = async () => {
    try {
      await shareFile(await backupFile(), 'Open Bombers')
    } catch {
      errorToast(t('ics.share_error_desc', { defaultValue: 'Prova de descarregar el fitxer.' }))
    }
  }

  const handleCode = async () => {
    try {
      const generated = await backupToCode(await exportBackup())
      setCode(generated)
      setValue(generated)
    } catch {
      errorToast()
    }
  }

  const askImport = async (text: string) => {
    try {
      const parsed = await parseBackupText(text)
      if (typeof parsed?.version !== 'number') throw new Error('invalid')
      setPendingImport(parsed)
    } catch {
      errorToast(t('backup.invalid', { defaultValue: 'El fitxer o el codi no és una còpia de seguretat vàlida.' }))
    }
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    await askImport(await file.text())
    if (fileInput.current) fileInput.current.value = ''
  }

  const confirmImport = async () => {
    try {
      await importBackup(pendingImport)
      toast({ title: t('backup.imported', { defaultValue: 'Dades importades' }), status: 'success', duration: 3000 })
      setPasted('')
    } catch {
      errorToast(
        t('backup.import_error', {
          defaultValue: "No s'han pogut importar les dades. Les dades actuals no s'han modificat.",
        })
      )
    }
    setPendingImport(null)
  }

  const confirmReset = async () => {
    try {
      await resetData()
      toast({ title: t('backup.reset_done', { defaultValue: 'Dades esborrades' }), status: 'success', duration: 3000 })
    } catch {
      errorToast()
    }
    setIsResetOpen(false)
  }

  return (
    <Stack spacing={6}>
      <Box>
        <SubTitle>{t('backup.export_title', { defaultValue: 'Exportar' })}</SubTitle>
        <Text fontSize='sm' color='textMuted' mb={3}>
          {t('backup.export_desc_all', {
            defaultValue:
              'Totes les teves dades es guarden només en aquest dispositiu: la planificació, el calendari de repassos, els mapes mentals i les anotacions dels PDF. Fes-ne còpies per no perdre-les o per passar-les a un altre dispositiu.',
          })}
        </Text>
        <Flex gap={2} wrap='wrap'>
          <Button leftIcon={<icons.download />} onClick={handleDownload} isLoading={isExporting}>
            {t('backup.download', { defaultValue: 'Descarregar còpia (.json)' })}
          </Button>
          {canShareFiles() && (
            <Button variant='outline' colorScheme='gray' leftIcon={<icons.share />} onClick={handleShare}>
              {t('backup.share', { defaultValue: 'Compartir còpia' })}
            </Button>
          )}
          <Button variant='outline' colorScheme='gray' leftIcon={<icons.code />} onClick={handleCode}>
            {t('backup.generate_code', { defaultValue: 'Generar codi de transferència' })}
          </Button>
        </Flex>
        {code && (
          <Box mt={3}>
            <Textarea
              value={code}
              readOnly
              fontFamily='mono'
              fontSize='xs'
              rows={4}
              borderRadius='12px'
              onFocus={(e) => e.target.select()}
            />
            <Flex mt={2} gap={3} align='center'>
              <Button size='sm' leftIcon={<icons.copy />} onClick={onCopy}>
                {hasCopied
                  ? t('backup.copied', { defaultValue: 'Copiat!' })
                  : t('backup.copy', { defaultValue: 'Copiar el codi' })}
              </Button>
              <Text fontSize='xs' color='textMuted'>
                {t('backup.code_hint_no_annotations', {
                  defaultValue:
                    '{{ size }} caràcters. Enganxa’l a «Importar» a l’altre dispositiu (per correu, missatge…). No inclou les anotacions dels PDF, que poden ocupar molt: per passar-les, fes servir el fitxer .json.',
                  size: code.length.toLocaleString('ca'),
                })}
              </Text>
            </Flex>
          </Box>
        )}
      </Box>

      <Box>
        <SubTitle>{t('backup.import_title', { defaultValue: 'Importar' })}</SubTitle>
        <Text fontSize='sm' color='textMuted' mb={3}>
          {t('backup.import_desc', {
            defaultValue: 'Substitueix totes les dades d’aquest dispositiu per les d’una còpia (fitxer .json o codi).',
          })}
        </Text>
        <Input
          ref={fileInput}
          type='file'
          accept='application/json,.json'
          display='none'
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <Stack spacing={2}>
          <Button
            alignSelf='flex-start'
            variant='outline'
            colorScheme='gray'
            leftIcon={<icons.upload />}
            onClick={() => fileInput.current?.click()}
          >
            {t('backup.import_file', { defaultValue: 'Triar fitxer…' })}
          </Button>
          <Textarea
            placeholder={t('backup.paste_placeholder', {
              defaultValue: 'Enganxa aquí el codi de transferència (BMB2:…)',
            })}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            fontFamily='mono'
            fontSize='xs'
            rows={3}
            borderRadius='12px'
          />
          <Button
            alignSelf='flex-start'
            isDisabled={!pasted.trim()}
            onClick={() => askImport(pasted)}
            isLoading={isImporting}
          >
            {t('backup.import_code', { defaultValue: 'Importar codi' })}
          </Button>
        </Stack>
      </Box>

      <Box borderWidth='1px' borderColor='nb.border' borderRadius='14px' p={4}>
        <SubTitle>{t('backup.danger_title', { defaultValue: 'Esborrar dades' })}</SubTitle>
        <Text fontSize='sm' color='textMuted' mb={3}>
          {t('backup.danger_desc_all', {
            defaultValue:
              "Esborra la planificació, el calendari, els mapes mentals i les anotacions dels PDF d'aquest dispositiu. Fes abans una còpia.",
          })}
        </Text>
        <Button colorScheme='red' variant='outline' leftIcon={<icons.delete />} onClick={() => setIsResetOpen(true)}>
          {t('backup.reset', { defaultValue: 'Esborrar totes les dades' })}
        </Button>
      </Box>

      <ConfirmDialog
        isOpen={!!pendingImport}
        onClose={() => setPendingImport(null)}
        title={t('backup.confirm_import_title', { defaultValue: 'Substituir les dades?' })}
        body={
          <>
            {t('backup.confirm_import_body', {
              defaultValue:
                'Les dades actuals d’aquest dispositiu se substituiran per les de la còpia del {{ date }}. Aquesta acció no es pot desfer.',
              date: pendingImport?.exported_at ? new Date(pendingImport.exported_at).toLocaleString('ca') : '—',
            })}
            {pendingImport && !Array.isArray(pendingImport.anotacions) && (
              <Text as='span' display='block' mt={2}>
                {t('backup.import_keeps_annotations', {
                  defaultValue: 'Aquesta còpia no porta anotacions dels PDF: les d’aquest dispositiu es mantenen.',
                })}
              </Text>
            )}
          </>
        }
        confirmLabel={t('backup.confirm_import', { defaultValue: 'Importar' })}
        onConfirm={confirmImport}
        isLoading={isImporting}
        isDestructive
      />
      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title={t('backup.confirm_reset_title', { defaultValue: 'Esborrar totes les dades?' })}
        body={t('backup.confirm_reset_body_all', {
          defaultValue:
            'Es perdrà tot el progrés guardat en aquest dispositiu, també els mapes mentals i les anotacions dels PDF. Els PDF desats per llegir sense connexió es mantenen. Aquesta acció no es pot desfer.',
        })}
        confirmLabel={t('backup.reset', { defaultValue: 'Esborrar totes les dades' })}
        onConfirm={confirmReset}
        isLoading={isResetting}
        isDestructive
      />
    </Stack>
  )
}
