import {
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  IconButtonProps,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  SimpleGrid,
  Tooltip,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { icons } from '~theme/icons'
import { MAPA_COLORS, MapaColor } from '../types'

const ToolButton = ({ label, ...props }: { label: string } & Omit<IconButtonProps, 'aria-label'>) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <IconButton
      aria-label={label}
      variant='ghost'
      colorScheme='gray'
      size='md'
      fontSize='xl'
      borderRadius='full'
      {...props}
    />
  </Tooltip>
)

const Divider = () => <Box w='1px' h={6} bg='border' mx={1} flexShrink={0} />

export const useColorNames = () => {
  const { t } = useTranslation()
  return {
    primari: t('mapes.color.primari', { defaultValue: 'Color principal' }),
    blau: t('mapes.color.blau', { defaultValue: 'Blau' }),
    verd: t('mapes.color.verd', { defaultValue: 'Verd' }),
    groc: t('mapes.color.groc', { defaultValue: 'Groc' }),
    vermell: t('mapes.color.vermell', { defaultValue: 'Vermell' }),
    lila: t('mapes.color.lila', { defaultValue: 'Lila' }),
  } satisfies Record<MapaColor, string>
}

type ToolbarProps = {
  hasSelection: boolean
  color: MapaColor | null
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onAddChild: () => void
  onAddSibling: () => void
  onEdit: () => void
  onDelete: () => void
  onColor: (c: MapaColor) => void
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

/**
 * Floating tools of the editor, in the thumb zone. Zoom controls live on the right on wide screens.
 */
export const Toolbar = (p: ToolbarProps) => {
  const { t } = useTranslation()
  const names = useColorNames()

  return (
    <>
      <GlassSurface
        position='absolute'
        left='50%'
        bottom='calc(16px + env(safe-area-inset-bottom))'
        transform='translateX(-50%)'
        zIndex={10}
        borderRadius='full'
        borderWidth='1px'
        borderColor='border'
        boxShadow='floating'
        px={1.5}
        py={1}
        maxW='calc(100vw - 32px)'
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Flex align='center' gap={0.5}>
          <ToolButton
            label={
              p.hasSelection
                ? t('mapes.tool.add_child', { defaultValue: 'Afegeix una idea filla (Tab)' })
                : t('mapes.tool.add_root', { defaultValue: 'Afegeix una idea' })
            }
            icon={<Icon as={p.hasSelection ? icons.addChild : icons.add} />}
            onClick={p.onAddChild}
            colorScheme='primary'
            variant='solid'
          />
          <ToolButton
            label={t('mapes.tool.add_sibling', { defaultValue: 'Afegeix una idea germana (Enter)' })}
            icon={<Icon as={icons.addSibling} />}
            onClick={p.onAddSibling}
            isDisabled={!p.hasSelection}
          />
          <ToolButton
            label={t('mapes.tool.edit', { defaultValue: 'Edita el text (F2)' })}
            icon={<Icon as={icons.edit} />}
            onClick={p.onEdit}
            isDisabled={!p.hasSelection}
          />
          <Popover placement='top' isLazy>
            {({ onClose }) => (
              <>
                <PopoverTrigger>
                  <Box display='inline-flex'>
                    <ToolButton
                      label={t('mapes.tool.color', { defaultValue: 'Color de la branca' })}
                      icon={
                        <Box
                          w={5}
                          h={5}
                          borderRadius='full'
                          bg={p.color ? `mapa.${p.color}` : 'border'}
                          borderWidth='2px'
                          borderColor='surface'
                          boxShadow='card'
                        />
                      }
                      isDisabled={!p.hasSelection}
                    />
                  </Box>
                </PopoverTrigger>
                <Portal>
                  <PopoverContent w='auto' borderRadius='md' boxShadow='floating' borderColor='border'>
                    <PopoverArrow />
                    <PopoverBody p={3}>
                      <SimpleGrid columns={6} spacing={2}>
                        {MAPA_COLORS.map((c) => (
                          <Button
                            key={c}
                            aria-label={names[c]}
                            title={names[c]}
                            onClick={() => {
                              p.onColor(c)
                              onClose()
                            }}
                            minW={8}
                            w={8}
                            h={8}
                            p={0}
                            borderRadius='full'
                            bg={`mapa.${c}`}
                            _hover={{ bg: `mapa.${c}`, opacity: 0.85 }}
                            _active={{ bg: `mapa.${c}` }}
                            boxShadow={
                              p.color === c
                                ? `0 0 0 2px var(--chakra-colors-surface), 0 0 0 4px var(--chakra-colors-mapa-${c})`
                                : 'none'
                            }
                          >
                            {p.color === c && <Icon as={icons.check} color='white' boxSize={4} />}
                          </Button>
                        ))}
                      </SimpleGrid>
                    </PopoverBody>
                  </PopoverContent>
                </Portal>
              </>
            )}
          </Popover>
          <ToolButton
            label={t('mapes.tool.delete', { defaultValue: 'Elimina la idea i la seva branca (Supr)' })}
            icon={<Icon as={icons.delete} />}
            onClick={p.onDelete}
            isDisabled={!p.hasSelection}
          />
          <Divider />
          <ToolButton
            label={t('mapes.tool.undo', { defaultValue: 'Desfés (Ctrl+Z)' })}
            icon={<Icon as={icons.undo} />}
            onClick={p.onUndo}
            isDisabled={!p.canUndo}
          />
          <ToolButton
            label={t('mapes.tool.redo', { defaultValue: 'Refés (Ctrl+Maj+Z)' })}
            icon={<Icon as={icons.redo} />}
            onClick={p.onRedo}
            isDisabled={!p.canRedo}
          />
          <Box display={{ base: 'flex', md: 'none' }}>
            <ToolButton
              label={t('mapes.tool.fit', { defaultValue: 'Mostra tot el mapa' })}
              icon={<Icon as={icons.fit} />}
              onClick={p.onFit}
            />
          </Box>
        </Flex>
      </GlassSurface>

      <GlassSurface
        display={{ base: 'none', md: 'block' }}
        position='absolute'
        right={4}
        bottom={4}
        zIndex={10}
        borderRadius='full'
        borderWidth='1px'
        borderColor='border'
        boxShadow='raised'
        px={1}
        py={1}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Flex align='center'>
          <ToolButton
            label={t('mapes.tool.zoom_out', { defaultValue: 'Allunya (−)' })}
            icon={<Icon as={icons.zoomOut} />}
            onClick={p.onZoomOut}
            size='sm'
          />
          <Tooltip label={t('mapes.tool.fit_key', { defaultValue: 'Mostra tot el mapa (0)' })} hasArrow openDelay={400}>
            <Button variant='ghost' colorScheme='gray' size='sm' borderRadius='full' minW={14} onClick={p.onFit}>
              {Math.round(p.zoom * 100)}%
            </Button>
          </Tooltip>
          <ToolButton
            label={t('mapes.tool.zoom_in', { defaultValue: 'Apropa (+)' })}
            icon={<Icon as={icons.zoomIn} />}
            onClick={p.onZoomIn}
            size='sm'
          />
        </Flex>
      </GlassSurface>
    </>
  )
}
