import { Button, ButtonProps, Icon, IconButton, IconButtonProps, Tooltip } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Tema } from '~components/Planificacio/types'
import { icons } from '~theme/icons'
import { pdfForTema } from './logic'
import { usePdfActions } from './usePdfActions'

type TemaPdfButtonProps = { tema: Pick<Tema, 'codi'> } & (
  | ({ variant: 'icon' } & Omit<IconButtonProps, 'aria-label' | 'variant'>)
  | ({ variant: 'button' } & Omit<ButtonProps, 'variant'>)
)

/**
 * Opens the official manual of a tema. Renders nothing for temes without a PDF.
 */
export const TemaPdfButton = ({ tema, variant, ...props }: TemaPdfButtonProps) => {
  const { t } = useTranslation()
  const { open, isSaved, busyId } = usePdfActions()
  const pdf = pdfForTema(tema)
  if (!pdf) return null

  const label = t('temari.open_manual', { defaultValue: 'Obre el manual ({{manual}})', manual: pdf.manual })
  const common = { onClick: () => open(pdf), isLoading: busyId === pdf.id }

  if (variant === 'button') {
    return (
      <Button
        variant='outline'
        colorScheme='gray'
        leftIcon={<Icon as={isSaved(pdf) ? icons.saved : icons.pdf} />}
        {...common}
        {...(props as ButtonProps)}
      >
        {label}
      </Button>
    )
  }
  return (
    <Tooltip label={label} hasArrow placement='right'>
      <IconButton aria-label={label} icon={<Icon as={icons.pdf} />} {...common} {...(props as IconButtonProps)} />
    </Tooltip>
  )
}
