import { Box, Button, Flex, Icon, Stack, Text, Tooltip } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassSurface } from '~components/Layout/Glass/GlassSurface'
import { ColorSwatches } from '~components/Mapes/Editor/StylePanel'
import { BrushPanel, PopoverPanel, ToolButton } from '~components/Mapes/Editor/Toolbar'
import { FORMA_TIPUS, FormaTipus, MapaColor } from '~components/Mapes/types'
import { icons } from '~theme/icons'
import { PDF } from '~utils/constants'
import { BrushPdf, EinaPdf, MarcaTipus, SeleccioPdf, TextBrush } from '../types'

const Divider = () => <Box w='1px' h={6} bg='border' mx={1} flexShrink={0} />

const widthsOf = (tool: EinaPdf) =>
  PDF.GRUIX[tool === 'subratllador' ? 'subratllador' : tool === 'forma' ? 'forma' : 'ploma']

// Buttons a bit smaller on phones, so the tools fit in one row at 375 px
const compact = { minW: { base: 9, sm: 10 }, h: { base: 9, sm: 10 } }

const BrushDot = ({
  color,
  size,
  faded,
  tint,
}: {
  color: MapaColor
  size: number
  faded?: boolean
  // Marker tint (highlights) instead of the ink color
  tint?: boolean
}) => (
  <Box
    w={`${size}px`}
    h={`${size}px`}
    borderRadius='full'
    bg={tint ? `pdf.marca.${color}` : `pdf.${color}`}
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
          {...compact}
        />
      }
    >
      <BrushPanel color={color} gruix={gruix} widths={widths} onColor={onColor} onGruix={onGruix} palette='pdf' />
    </PopoverPanel>
  )
}

const ColorButton = ({
  color,
  tipus,
  onColor,
}: {
  color: MapaColor
  tipus: MarcaTipus
  onColor: (c: MapaColor) => void
}) => {
  const { t } = useTranslation()
  return (
    <PopoverPanel
      trigger={
        <ToolButton
          label={t('anotacions.tool.color', { defaultValue: 'Color' })}
          icon={<BrushDot color={color} size={14} tint={tipus === 'ressaltat'} />}
          {...compact}
        />
      }
    >
      <ColorSwatches value={color} onChange={onColor} palette='pdf' />
    </PopoverPanel>
  )
}

// Highlight or underline
const TipusButtons = ({ value, onChange }: { value: MarcaTipus; onChange: (t: MarcaTipus) => void }) => {
  const { t } = useTranslation()
  return (
    <>
      <ToolButton
        label={t('anotacions.text.highlight', { defaultValue: 'Ressalta' })}
        icon={<Icon as={icons.highlighter} />}
        isActive={value === 'ressaltat'}
        onClick={() => onChange('ressaltat')}
        {...compact}
      />
      <ToolButton
        label={t('anotacions.text.underline', { defaultValue: 'Subratlla' })}
        icon={<Icon as={icons.underline} />}
        isActive={value === 'subratllat'}
        onClick={() => onChange('subratllat')}
        {...compact}
      />
    </>
  )
}

type VisorToolbarProps = {
  tool: EinaPdf
  onTool: (t: EinaPdf) => void
  onImage: () => void
  brush: BrushPdf
  onBrush: (patch: Partial<BrushPdf>) => void
  textBrush: TextBrush
  onTextBrush: (patch: Partial<{ tipus: MarcaTipus; color: MapaColor }>) => void
  // Text tool: some text is selected, and the action that marks it
  hasTextSelection: boolean
  onMarkSelection: () => void
  // Type of the selected text mark (null when the selection is something else)
  marcaTipus: MarcaTipus | null
  selected: SeleccioPdf | null
  itemColor: MapaColor | null
  itemGruix: number | null
  itemWidths: readonly number[]
  onItemStyle: (patch: { color?: MapaColor; gruix?: number; tipus?: MarcaTipus }) => void
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
    {
      id: 'text',
      icon: icons.textMark,
      label: t('anotacions.tool.text', { defaultValue: 'Ressalta o subratlla text' }),
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
  if (p.tool === 'text') {
    const { tipus } = p.textBrush
    options = (
      <>
        <TipusButtons value={tipus} onChange={(v) => p.onTextBrush({ tipus: v })} />
        <ColorButton color={p.textBrush.colors[tipus]} tipus={tipus} onColor={(color) => p.onTextBrush({ color })} />
        <Tooltip
          label={t('anotacions.text.select_first', { defaultValue: 'Selecciona text de la pàgina' })}
          hasArrow
          openDelay={400}
          isDisabled={p.hasTextSelection}
        >
          <Button
            size='sm'
            borderRadius='full'
            flexShrink={0}
            ml={1}
            isDisabled={!p.hasTextSelection}
            // On pointer down: a tap elsewhere can clear the selection before the click arrives
            onPointerDown={(e) => {
              if (e.button !== 0) return
              e.preventDefault()
              p.onMarkSelection()
            }}
            onClick={(e) => e.detail === 0 && p.onMarkSelection()}
          >
            {tipus === 'ressaltat'
              ? t('anotacions.text.apply_highlight', { defaultValue: 'Ressalta' })
              : t('anotacions.text.apply_underline', { defaultValue: 'Subratlla' })}
          </Button>
        </Tooltip>
      </>
    )
  } else if (p.tool === 'ploma' || p.tool === 'subratllador' || p.tool === 'forma') {
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
              {...compact}
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
    options = hint(t('anotacions.eraser_hint_all', { defaultValue: 'Passa per sobre d’una anotació per esborrar-la' }))
  } else if (p.tool === 'nota') {
    options = hint(t('anotacions.note_hint', { defaultValue: 'Toca la pàgina on vols la nota' }))
  } else if (p.selected) {
    options = (
      <>
        {p.selected.kind === 'marca' && p.marcaTipus && p.itemColor && (
          <>
            <TipusButtons value={p.marcaTipus} onChange={(tipus) => p.onItemStyle({ tipus })} />
            <ColorButton color={p.itemColor} tipus={p.marcaTipus} onColor={(color) => p.onItemStyle({ color })} />
          </>
        )}
        {p.selected.kind !== 'imatge' && p.selected.kind !== 'marca' && p.itemColor && p.itemGruix !== null && (
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
          {...compact}
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
              {...compact}
            />
            <ToolButton
              label={t('anotacions.tool.redo', { defaultValue: 'Refés (Ctrl+Maj+Z)' })}
              icon={<Icon as={icons.redo} />}
              onClick={p.onRedo}
              isDisabled={!p.canRedo}
              {...compact}
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
                {...compact}
              />
            ))}
            <Divider />
            <ToolButton
              label={t('anotacions.tool.image', { defaultValue: 'Afegeix una imatge (també pots enganxar-la)' })}
              icon={<Icon as={icons.image} />}
              onClick={p.onImage}
              {...compact}
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
