import {
  Badge,
  Box,
  Flex,
  Icon,
  IconButton,
  Kbd,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useStudyData } from '~components/Layout/Contexts/StudyDataContext'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { SaveIndicator } from '~components/Layout/SaveIndicator'
import { ROUTES } from '~src/router/routes'
import { icons } from '~theme/icons'
import { linkLabel } from '../logic'
import { MapaActionsMenu } from '../MapaActionsMenu'
import { MapaMental } from '../types'

const Shortcut = ({ keys, label }: { keys: string[]; label: string }) => (
  <Flex justify='space-between' gap={6} fontSize='sm'>
    <Text color='lightText'>{label}</Text>
    <Flex gap={1} flexShrink={0}>
      {keys.map((k) => (
        <Kbd key={k}>{k}</Kbd>
      ))}
    </Flex>
  </Flex>
)

const ShortcutsHelp = () => {
  const { t } = useTranslation()
  return (
    <Popover placement='bottom-end' isLazy>
      <PopoverTrigger>
        <IconButton
          aria-label={t('mapes.shortcuts', { defaultValue: 'Dreceres de teclat' })}
          icon={<Icon as={icons.keyboard} />}
          variant='ghost'
          colorScheme='gray'
          borderRadius='full'
          fontSize='lg'
        />
      </PopoverTrigger>
      <Portal>
        <PopoverContent w='sm' borderRadius='md' boxShadow='floating' borderColor='border'>
          <PopoverArrow />
          <PopoverBody p={4}>
            <Stack spacing={2.5}>
              <Text fontWeight={700} fontSize='sm'>
                {t('mapes.shortcuts', { defaultValue: 'Dreceres de teclat' })}
              </Text>
              <Shortcut keys={['Tab']} label={t('mapes.key.child', { defaultValue: 'Idea filla' })} />
              <Shortcut keys={['Enter']} label={t('mapes.key.sibling', { defaultValue: 'Idea germana' })} />
              <Shortcut
                keys={['F2']}
                label={t('mapes.key.edit', { defaultValue: 'Edita el text (o comença a escriure)' })}
              />
              <Shortcut
                keys={['Maj', 'Enter']}
                label={t('mapes.key.newline', { defaultValue: 'Salt de línia en editar' })}
              />
              <Shortcut keys={['Supr']} label={t('mapes.key.delete', { defaultValue: 'Elimina la branca' })} />
              <Shortcut
                keys={['←', '↑', '↓', '→']}
                label={t('mapes.key.move', { defaultValue: 'Mou-te per les idees' })}
              />
              <Shortcut keys={['Ctrl', 'Z']} label={t('mapes.key.undo', { defaultValue: 'Desfés' })} />
              <Shortcut keys={['+', '−', '0']} label={t('mapes.key.zoom', { defaultValue: 'Zoom i veure-ho tot' })} />
              <Text fontSize='xs' color='textMuted' pt={1}>
                {t('mapes.key.mouse', {
                  defaultValue:
                    'Arrossega el fons per moure’t, fes doble clic per crear una idea i deixa anar una idea sobre una altra per penjar-la d’allà.',
                })}
              </Text>
            </Stack>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  )
}

/**
 * Floating bar on top of the canvas: back, title, temari link and the map menu
 */
type EditorHeaderProps = {
  mapa: MapaMental
  onBeforeLeave: () => Promise<void>
  onBeforeRemove: () => void
}

export const EditorHeader = ({ mapa, onBeforeLeave, onBeforeRemove }: EditorHeaderProps) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { structure } = useStudyData()
  const link = linkLabel(structure, mapa.tema_id, mapa.row_id)

  return (
    <Flex
      position='absolute'
      top={3}
      left={{ base: 3, md: 4 }}
      right={{ base: 3, md: 4 }}
      zIndex={10}
      justify='space-between'
      align='flex-start'
      gap={2}
      pointerEvents='none'
    >
      <GlassSurface
        pointerEvents='auto'
        display='flex'
        alignItems='center'
        gap={1}
        minW={0}
        pl={1}
        pr={1}
        py={1}
        borderRadius='full'
        borderWidth='1px'
        borderColor='border'
        boxShadow='raised'
      >
        <IconButton
          as={RouterLink}
          to={ROUTES.MAPES.LIST}
          aria-label={t('mapes.back', { defaultValue: 'Torna als mapes' })}
          icon={<Icon as={icons.back} />}
          variant='ghost'
          colorScheme='gray'
          borderRadius='full'
          fontSize='lg'
        />
        <Box minW={0} px={1}>
          <Text fontWeight={700} fontSize='sm' noOfLines={1}>
            {mapa.titol}
          </Text>
        </Box>
        {link && (
          <Badge flexShrink={0} borderRadius='full' px={2} bg='mapa.primari.bg' color='accent' textTransform='none'>
            {link}
          </Badge>
        )}
        <MapaActionsMenu
          mapa={mapa}
          onBeforeDuplicate={onBeforeLeave}
          onBeforeRemove={onBeforeRemove}
          onRemoved={() => navigate(ROUTES.MAPES.LIST, { replace: true })}
        />
      </GlassSurface>

      <Flex pointerEvents='auto' display={{ base: 'none', md: 'flex' }} align='center' gap={2}>
        <SaveIndicator />
        <GlassSurface borderRadius='full' borderWidth='1px' borderColor='border' boxShadow='raised' p={1}>
          <ShortcutsHelp />
        </GlassSurface>
      </Flex>
    </Flex>
  )
}
