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
  Stack,
  Text,
  Tooltip,
} from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { icons } from '~theme/icons'
import { MAPA } from '~utils/constants'
import { FORMA_TIPUS, FormaTipus, MapaColor, Tool } from '../types'
import { Brush } from './Canvas'
import { ColorSwatches, Section } from './StylePanel'

export const ToolButton = ({
  label,
  isActive,
  ...props
}: { label: string; isActive?: boolean } & Omit<IconButtonProps, 'aria-label'>) => (
  <Tooltip label={label} hasArrow openDelay={400}>
    <IconButton
      aria-label={label}
      aria-pressed={isActive}
      variant={isActive ? 'solid' : 'ghost'}
      colorScheme={isActive ? 'primary' : 'gray'}
      size='md'
      fontSize='xl'
      borderRadius='full'
      {...props}
    />
  </Tooltip>
)

const Divider = () => <Box w='1px' h={6} bg='border' mx={1} flexShrink={0} />

export const PopoverPanel = ({
  trigger,
  children,
  w = 'auto',
  isOpen,
  onOpen,
  onClose,
}: {
  trigger: ReactNode
  children: ReactNode
  w?: string
  // Optional control from outside (e.g. a keyboard shortcut)
  isOpen?: boolean
  onOpen?: () => void
  onClose?: () => void
}) => (
  <Popover placement='top' isLazy isOpen={isOpen} onOpen={onOpen} onClose={onClose}>
    <PopoverTrigger>
      <Box display='inline-flex'>{trigger}</Box>
    </PopoverTrigger>
    <Portal>
      <PopoverContent
        w={w}
        maxW='calc(100vw - 24px)'
        maxH='calc(100dvh - 160px)'
        overflowY='auto'
        borderRadius='md'
        boxShadow='floating'
        borderColor='border'
      >
        <PopoverArrow />
        <PopoverBody p={4}>{children}</PopoverBody>
      </PopoverContent>
    </Portal>
  </Popover>
)

// ---- Tool rail (left) ----

type ToolRailProps = {
  tool: Tool
  onTool: (t: Tool) => void
  onImage: () => void
}

/**
 * Tools on the left edge: select, pen, highlighter, eraser, shapes and picture
 */
export const ToolRail = ({ tool, onTool, onImage }: ToolRailProps) => {
  const { t } = useTranslation()
  const tools: { id: Tool; icon: typeof icons.select; label: string }[] = [
    { id: 'seleccio', icon: icons.select, label: t('mapes.tool.select', { defaultValue: 'Selecciona i mou (Esc)' }) },
    { id: 'ploma', icon: icons.pen, label: t('mapes.tool.pen', { defaultValue: 'Ploma' }) },
    {
      id: 'subratllador',
      icon: icons.highlighter,
      label: t('mapes.tool.highlighter', { defaultValue: 'Subratllador' }),
    },
    { id: 'goma', icon: icons.eraser, label: t('mapes.tool.eraser', { defaultValue: 'Goma' }) },
    { id: 'forma', icon: icons.shapes, label: t('mapes.tool.shapes', { defaultValue: 'Formes' }) },
  ]
  return (
    <GlassSurface
      position='absolute'
      left={{ base: 2, md: 4 }}
      top='50%'
      transform='translateY(-50%)'
      zIndex={10}
      borderRadius='full'
      borderWidth='1px'
      borderColor='border'
      boxShadow='raised'
      p={1}
      role='toolbar'
      aria-orientation='vertical'
      aria-label={t('mapes.tools', { defaultValue: 'Eines' })}
    >
      <Stack spacing={0.5}>
        {tools.map((tl) => (
          <ToolButton
            key={tl.id}
            label={tl.label}
            icon={<Icon as={tl.icon} />}
            isActive={tool === tl.id}
            onClick={() => onTool(tl.id)}
          />
        ))}
        <Box h='1px' bg='border' my={1} mx={2} />
        <ToolButton
          label={t('mapes.tool.image', { defaultValue: 'Afegeix una imatge (també pots enganxar-la)' })}
          icon={<Icon as={icons.image} />}
          onClick={onImage}
        />
      </Stack>
    </GlassSurface>
  )
}

// ---- Context bar (bottom) ----

const BrushDot = ({ brush, tool }: { brush: Brush; tool: Tool }) => {
  const max = MAPA.GRUIX[tool === 'subratllador' ? 'subratllador' : tool === 'forma' ? 'forma' : 'ploma']
  const i = Math.max(0, (max as readonly number[]).indexOf(brush.gruix))
  const size = [8, 12, 16][i] ?? 12
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius='full'
      bg={`mapa.${brush.color}`}
      opacity={tool === 'subratllador' ? 0.6 : 1}
      boxShadow='0 0 0 2px var(--chakra-colors-surface)'
    />
  )
}

export const BrushPanel = ({
  color,
  gruix,
  widths,
  onColor,
  onGruix,
  palette = 'mapa',
}: {
  palette?: 'mapa' | 'pdf'
  color: MapaColor | null
  gruix: number | null
  widths: readonly number[]
  onColor: (c: MapaColor) => void
  onGruix: (g: number) => void
}) => {
  const { t } = useTranslation()
  const names = [
    t('mapes.width.thin', { defaultValue: 'Fi' }),
    t('mapes.width.medium', { defaultValue: 'Mitjà' }),
    t('mapes.width.thick', { defaultValue: 'Gruixut' }),
  ]
  return (
    <Stack spacing={4}>
      <Section title={t('mapes.brush.color', { defaultValue: 'Color' })}>
        <ColorSwatches value={color} onChange={onColor} palette={palette} />
      </Section>
      <Section title={t('mapes.brush.width', { defaultValue: 'Gruix' })}>
        <SimpleGrid columns={3} spacing={2}>
          {widths.map((g, i) => (
            <Button
              key={g}
              aria-pressed={gruix === g}
              onClick={() => onGruix(g)}
              variant='outline'
              colorScheme='gray'
              borderRadius='sm'
              borderColor={gruix === g ? 'accent' : 'border'}
              borderWidth={gruix === g ? '2px' : '1px'}
              h={10}
              gap={2}
            >
              <Box w={`${[6, 10, 14][i]}px`} h={`${[6, 10, 14][i]}px`} borderRadius='full' bg='textPrimary' />
              <Text fontSize='xs'>{names[i]}</Text>
            </Button>
          ))}
        </SimpleGrid>
      </Section>
    </Stack>
  )
}

type ContextBarProps = {
  tool: Tool
  brush: Brush
  onBrush: (patch: Partial<Brush>) => void
  // Selection tool
  hasSelection: boolean
  itemSelected: 'trace' | 'forma' | 'imatge' | null
  itemColor: MapaColor | null
  itemGruix: number | null
  itemWidths: readonly number[]
  onItemStyle: (patch: { color?: MapaColor; gruix?: number }) => void
  stylePanel: ReactNode
  styleOpen: boolean
  onStyleOpen: () => void
  onStyleClose: () => void
  canUndo: boolean
  canRedo: boolean
  zoom: number
  onAddChild: () => void
  onAddSibling: () => void
  onEdit: () => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
}

/**
 * Bottom bar, in the thumb zone. Its buttons follow the active tool and the selection.
 * Zoom controls live on the right on wide screens.
 */
export const ContextBar = (p: ContextBarProps) => {
  const { t } = useTranslation()
  const formaNames: Record<FormaTipus, { label: string; icon: typeof icons.rect }> = {
    rect: { label: t('mapes.shape.rect', { defaultValue: 'Rectangle' }), icon: icons.rect },
    elipse: { label: t('mapes.shape.ellipse', { defaultValue: 'El·lipse' }), icon: icons.ellipse },
    linia: { label: t('mapes.shape.line', { defaultValue: 'Línia' }), icon: icons.line },
    fletxa: { label: t('mapes.shape.arrow', { defaultValue: 'Fletxa' }), icon: icons.arrow },
  }
  const drawing = p.tool === 'ploma' || p.tool === 'subratllador' || p.tool === 'forma'
  const widths = MAPA.GRUIX[p.tool === 'subratllador' ? 'subratllador' : p.tool === 'forma' ? 'forma' : 'ploma']

  let main: ReactNode
  if (drawing) {
    main = (
      <>
        {p.tool === 'forma' &&
          FORMA_TIPUS.map((f) => (
            <ToolButton
              key={f}
              label={formaNames[f].label}
              icon={<Icon as={formaNames[f].icon} />}
              isActive={p.brush.forma === f}
              onClick={() => p.onBrush({ forma: f })}
            />
          ))}
        <PopoverPanel
          w='300px'
          trigger={
            <ToolButton
              label={t('mapes.tool.brush', { defaultValue: 'Color i gruix' })}
              icon={<BrushDot brush={p.brush} tool={p.tool} />}
            />
          }
        >
          <BrushPanel
            color={p.brush.color}
            gruix={p.brush.gruix}
            widths={widths}
            onColor={(color) => p.onBrush({ color })}
            onGruix={(gruix) => p.onBrush({ gruix })}
          />
        </PopoverPanel>
      </>
    )
  } else if (p.tool === 'goma') {
    main = (
      <Text fontSize='sm' color='textMuted' px={3} whiteSpace='nowrap'>
        {t('mapes.eraser_hint', { defaultValue: 'Passa per sobre d’un traç per esborrar-lo' })}
      </Text>
    )
  } else if (p.itemSelected) {
    main = (
      <>
        {p.itemSelected !== 'imatge' && (
          <PopoverPanel
            w='300px'
            trigger={
              <ToolButton
                label={t('mapes.tool.brush', { defaultValue: 'Color i gruix' })}
                icon={<Box w={5} h={5} borderRadius='full' bg={`mapa.${p.itemColor ?? 'tinta'}`} />}
              />
            }
          >
            <BrushPanel
              color={p.itemColor}
              gruix={p.itemGruix}
              widths={p.itemWidths}
              onColor={(color) => p.onItemStyle({ color })}
              onGruix={(gruix) => p.onItemStyle({ gruix })}
            />
          </PopoverPanel>
        )}
        <ToolButton
          label={t('mapes.tool.delete_item', { defaultValue: 'Elimina (Supr)' })}
          icon={<Icon as={icons.delete} />}
          onClick={p.onDelete}
        />
      </>
    )
  } else {
    main = (
      <>
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
        {p.hasSelection ? (
          <PopoverPanel
            w='340px'
            isOpen={p.styleOpen}
            onOpen={p.onStyleOpen}
            onClose={p.onStyleClose}
            trigger={
              <ToolButton
                label={t('mapes.tool.style_key', { defaultValue: 'Estil de la idea i la línia (Ctrl+E)' })}
                icon={<Icon as={icons.style} />}
              />
            }
          >
            {p.stylePanel}
          </PopoverPanel>
        ) : (
          <ToolButton
            label={t('mapes.tool.style', { defaultValue: 'Estil de la idea i la línia' })}
            icon={<Icon as={icons.style} />}
            isDisabled
          />
        )}
        <ToolButton
          label={t('mapes.tool.delete', { defaultValue: 'Elimina la idea i la seva branca (Supr)' })}
          icon={<Icon as={icons.delete} />}
          onClick={p.onDelete}
          isDisabled={!p.hasSelection}
        />
      </>
    )
  }

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
        maxW='calc(100vw - 24px)'
        role='toolbar'
        aria-label={t('mapes.actions_bar', { defaultValue: 'Accions' })}
      >
        <Flex align='center' gap={0.5}>
          {main}
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
          <Box display={{ base: drawing && p.tool === 'forma' ? 'none' : 'flex', md: 'none' }}>
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
