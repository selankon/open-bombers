import { Box, Button, Flex, Icon, Stack, Text, Tooltip } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { BrushPanel, PopoverPanel, ToolButton } from '~components/Mapes/Editor/Toolbar'
import { FORMA_TIPUS, FormaTipus, MapaColor } from '~components/Mapes/types'
import { icons } from '~theme/icons'
import { PDF } from '~utils/constants'
import { BrushPdf, EinaPdf, SeleccioPdf } from '../types'

const Divider = () => <Box w='1px' h={6} bg='border' mx={1} flexShrink={0} />

const widthsOf = (tool: EinaPdf) =>
  PDF.GRUIX[tool === 'subratllador' ? 'subratllador' : tool === 'forma' ? 'forma' : 'ploma']

const BrushDot = ({ color, size, faded }: { color: MapaColor; size: number; faded?: boolean }) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    borderRadius='full'
    bg={`pdf.${color}`}
    opacity={faded ? 0.6 : 1}
    boxShadow='0 0 0 2px var(--chakra-colors-surface)'
  />
)

const BrushButton = ({
  color,
  gruix,
  widths,
  faded,
  onColor,
  onGruix,
}: {
  color: MapaColor
  gruix: number
  widths: readonly number[]
  faded?: boolean
  onColor: (c: MapaColor) => void
  onGruix: (g: number) => void
}) => {
  const { t } = useTranslation()
  const i = Math.max(0, widths.indexOf(gruix))
  return (
    <PopoverPanel
      w='300px'
      trigger={
        <ToolButton
          label={t('anotacions.tool.brush', { defaultValue: 'Color i gruix' })}
          icon={<BrushDot color={color} size={[8, 12, 16][i] ?? 12} faded={faded} />}
        />
      }
    >
      <BrushPanel color={color} gruix={gruix} widths={widths} onColor={onColor} onGruix={onGruix} palette='pdf' />
    </PopoverPanel>
  )
}

type VisorToolbarProps = {
  tool: EinaPdf
  onTool: (t: EinaPdf) => void
  onImage: () => void
  brush: BrushPdf
  onBrush: (patch: Partial<BrushPdf>) => void
  selected: SeleccioPdf | null
  itemColor: MapaColor | null
  itemGruix: number | null
  itemWidths: readonly number[]
  onItemStyle: (patch: { color?: MapaColor; gruix?: number }) => void
  onDelete: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
}

/**
 * Tools of the reader, in the thumb zone: options of the active tool (or of the selected annotation)
 * with undo / redo on top, the tools below. Zoom buttons sit on the right on wide screens.
 */
export const VisorToolbar = (p: VisorToolbarProps) => {
  const { t } = useTranslation()
  const tools: { id: EinaPdf; icon: typeof icons.select; label: string }[] = [
    {
      id: 'seleccio',
      icon: icons.select,
      label: t('anotacions.tool.select', { defaultValue: 'Llegeix, selecciona i mou (Esc)' }),
    },
    { id: 'ploma', icon: icons.pen, label: t('anotacions.tool.pen', { defaultValue: 'Ploma' }) },
    {
      id: 'subratllador',
      icon: icons.highlighter,
      label: t('anotacions.tool.highlighter', { defaultValue: 'Subratllador' }),
    },
    { id: 'forma', icon: icons.shapes, label: t('anotacions.tool.shapes', { defaultValue: 'Formes i fletxes' }) },
    { id: 'nota', icon: icons.note, label: t('anotacions.tool.note', { defaultValue: 'Nota' }) },
    { id: 'goma', icon: icons.eraser, label: t('anotacions.tool.eraser', { defaultValue: 'Goma' }) },
  ]
  const formaNames: Record<FormaTipus, { label: string; icon: typeof icons.rect }> = {
    rect: { label: t('mapes.shape.rect', { defaultValue: 'Rectangle' }), icon: icons.rect },
    elipse: { label: t('mapes.shape.ellipse', { defaultValue: 'El·lipse' }), icon: icons.ellipse },
    linia: { label: t('mapes.shape.line', { defaultValue: 'Línia' }), icon: icons.line },
    fletxa: { label: t('mapes.shape.arrow', { defaultValue: 'Fletxa' }), icon: icons.arrow },
  }

  const hint = (text: string) => (
    <Text fontSize='sm' color='textMuted' px={3} noOfLines={1}>
      {text}
    </Text>
  )

  let options: ReactNode
  if (p.tool === 'ploma' || p.tool === 'subratllador' || p.tool === 'forma') {
    options = (
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
        <BrushButton
          color={p.brush.color}
          gruix={p.brush.gruix}
          widths={widthsOf(p.tool)}
          faded={p.tool === 'subratllador'}
          onColor={(color) => p.onBrush({ color })}
          onGruix={(gruix) => p.onBrush({ gruix })}
        />
      </>
    )
  } else if (p.tool === 'goma') {
    options = hint(t('anotacions.eraser_hint', { defaultValue: 'Passa per sobre d’un traç per esborrar-lo' }))
  } else if (p.tool === 'nota') {
    options = hint(t('anotacions.note_hint', { defaultValue: 'Toca la pàgina on vols la nota' }))
  } else if (p.selected) {
    options = (
      <>
        {p.selected.kind !== 'imatge' && p.itemColor && p.itemGruix !== null && (
          <BrushButton
            color={p.itemColor}
            gruix={p.itemGruix}
            widths={p.itemWidths}
            onColor={(color) => p.onItemStyle({ color })}
            onGruix={(gruix) => p.onItemStyle({ gruix })}
          />
        )}
        <ToolButton
          label={t('anotacions.tool.delete', { defaultValue: 'Elimina (Supr)' })}
          icon={<Icon as={icons.delete} />}
          onClick={p.onDelete}
        />
      </>
    )
  } else {
    options = hint(t('anotacions.select_hint', { defaultValue: 'Tria una eina per anotar' }))
  }

  return (
    <>
      <Stack
        position='absolute'
        left='50%'
        bottom='calc(12px + env(safe-area-inset-bottom))'
        transform='translateX(-50%)'
        zIndex={10}
        spacing={2}
        align='center'
        maxW='calc(100vw - 24px)'
      >
        <GlassSurface
          borderRadius='full'
          borderWidth='1px'
          borderColor='border'
          boxShadow='raised'
          px={1.5}
          py={1}
          maxW='100%'
          role='toolbar'
          aria-label={t('anotacions.options', { defaultValue: 'Opcions de l’eina' })}
        >
          <Flex align='center' gap={0.5} minW={0}>
            {options}
            <Divider />
            <ToolButton
              label={t('anotacions.tool.undo', { defaultValue: 'Desfés (Ctrl+Z)' })}
              icon={<Icon as={icons.undo} />}
              onClick={p.onUndo}
              isDisabled={!p.canUndo}
            />
            <ToolButton
              label={t('anotacions.tool.redo', { defaultValue: 'Refés (Ctrl+Maj+Z)' })}
              icon={<Icon as={icons.redo} />}
              onClick={p.onRedo}
              isDisabled={!p.canRedo}
            />
          </Flex>
        </GlassSurface>

        <GlassSurface
          borderRadius='full'
          borderWidth='1px'
          borderColor='border'
          boxShadow='floating'
          px={1.5}
          py={1}
          role='toolbar'
          aria-label={t('anotacions.tools', { defaultValue: 'Eines' })}
        >
          <Flex align='center' gap={0.5}>
            {tools.map((tl) => (
              <ToolButton
                key={tl.id}
                label={tl.label}
                icon={<Icon as={tl.icon} />}
                isActive={p.tool === tl.id}
                onClick={() => p.onTool(tl.id)}
              />
            ))}
            <Divider />
            <ToolButton
              label={t('anotacions.tool.image', { defaultValue: 'Afegeix una imatge (també pots enganxar-la)' })}
              icon={<Icon as={icons.image} />}
              onClick={p.onImage}
            />
          </Flex>
        </GlassSurface>
      </Stack>

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
            label={t('anotacions.tool.zoom_out', { defaultValue: 'Allunya (−)' })}
            icon={<Icon as={icons.zoomOut} />}
            onClick={p.onZoomOut}
            size='sm'
          />
          <Tooltip
            label={t('anotacions.tool.fit_width', { defaultValue: 'Ajusta a l’amplada (0)' })}
            hasArrow
            openDelay={400}
          >
            <Button
              variant='ghost'
              colorScheme='gray'
              size='sm'
              borderRadius='full'
              minW={14}
              onClick={p.onFitWidth}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {Math.round(p.zoom * 100)}%
            </Button>
          </Tooltip>
          <ToolButton
            label={t('anotacions.tool.zoom_in', { defaultValue: 'Apropa (+)' })}
            icon={<Icon as={icons.zoomIn} />}
            onClick={p.onZoomIn}
            size='sm'
          />
        </Flex>
      </GlassSurface>
    </>
  )
}
