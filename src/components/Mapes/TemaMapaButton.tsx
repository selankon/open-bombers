import { Button, ButtonProps, Icon, IconButton, IconButtonProps, Tooltip } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Tema } from '~components/Planificacio/types'
import { mapaPath, ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { useMapes } from './queries'
import { useNewMapa } from './useNewMapa'

type TemaMapaButtonProps = { tema: Tema } & (
  | ({ variant: 'icon' } & Omit<IconButtonProps, 'aria-label' | 'variant'>)
  | ({ variant: 'button' } & Omit<ButtonProps, 'variant'>)
)

/**
 * Mind maps of a tema: creates the first one (with its apartats), opens it when there is
 * only one, or shows the list filtered by the tema
 */
export const TemaMapaButton = ({ tema, variant, ...props }: TemaMapaButtonProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: mapes } = useMapes()
  const { create, isPending } = useNewMapa()
  const own = (mapes ?? []).filter((m) => m.tema_id === tema.id)

  const onClick = () => {
    if (own.length === 1) return navigate(mapaPath(own[0].id))
    if (own.length > 1) return navigate(`${ROUTES.MAPES.LIST}?tema=${encodeURIComponent(tema.id)}`)
    create({ titol: tema.nom, tema_id: tema.id, row_id: null, amb_apartats: true })
  }

  const label = own.length
    ? t('mapes.open_tema', { defaultValue: 'Mapes mentals del tema ({{count}})', count: own.length })
    : t('mapes.create_tema', { defaultValue: 'Crea un mapa mental del tema' })
  const common = { onClick, isLoading: isPending }

  if (variant === 'button') {
    return (
      <Button
        variant='outline'
        colorScheme='gray'
        leftIcon={<Icon as={icons.mapes} />}
        {...common}
        {...(props as ButtonProps)}
      >
        {label}
      </Button>
    )
  }
  return (
    <Tooltip label={label} hasArrow placement='right'>
      <IconButton aria-label={label} icon={<Icon as={icons.mapes} />} {...common} {...(props as IconButtonProps)} />
    </Tooltip>
  )
}
