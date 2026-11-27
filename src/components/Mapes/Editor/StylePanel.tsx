import {
  Box,
  Button,
  chakra,
  Flex,
  Icon,
  SimpleGrid,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Stack,
  Switch,
  Text,
  IconButton,
  useToast,
} from '@chakra-ui/react'
import { ReactNode, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { MAPA } from '~utils/constants'
import { colorLook, customColor, isCustomColor, parseCustom } from '../colors'
import { BoxSize } from '../logic'
import { useMapaColors, useRemoveMapaColor, useSaveMapaColor } from '../queries'
import {
  BRANCA_ESTILS,
  BRANCA_GRUIXOS,
  BRANCA_TRACATS,
  BrancaEstil,
  BrancaStyle,
  BrancaTracat,
  MAPA_COLORS,
  MapaColor,
  MapaNode,
  NODE_EMPLENATS,
  NODE_FORMES,
  NODE_MIDES,
  NodeEmplenat,
  NodeForma,
  NodeColor,
  NodeMida,
} from '../types'

export const useColorNames = () => {
  const { t } = useTranslation()
  return {
    tinta: t('mapes.color.tinta', { defaultValue: 'Tinta' }),
    primari: t('mapes.color.primari', { defaultValue: 'Color principal' }),
    blau: t('mapes.color.blau', { defaultValue: 'Blau' }),
    verd: t('mapes.color.verd', { defaultValue: 'Verd' }),
    groc: t('mapes.color.groc', { defaultValue: 'Groc' }),
    vermell: t('mapes.color.vermell', { defaultValue: 'Vermell' }),
    lila: t('mapes.color.lila', { defaultValue: 'Lila' }),
  } satisfies Record<MapaColor, string>
}

export const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <Box>
    <Text fontSize='xs' fontWeight={700} color='textMuted' mb={2}>
      {title}
    </Text>
    {children}
  </Box>
)

/** Small square choice with a visual preview */
export const Choice = ({
  label,
  isActive,
  onClick,
  children,
}: {
  label: string
  isActive: boolean
  onClick: () => void
  children: ReactNode
}) => (
  <Button
    aria-label={label}
    title={label}
    aria-pressed={isActive}
    onClick={onClick}
    variant='outline'
    colorScheme='gray'
    h={10}
    minW={0}
    px={0}
    borderRadius='sm'
    borderColor={isActive ? 'accent' : 'border'}
    borderWidth={isActive ? '2px' : '1px'}
    bg={isActive ? 'mapa.primari.bg' : 'surface'}
  >
    {children}
  </Button>
)

export const ColorSwatches = ({
  value,
  onChange,
  palette = 'mapa',
}: {
  value: MapaColor | null
  onChange: (c: MapaColor) => void
  // `pdf`: the colors as they look on paper
  palette?: 'mapa' | 'pdf'
}) => {
  const names = useColorNames()
  return (
    <Flex gap={2} wrap='wrap'>
      {MAPA_COLORS.map((c) => (
        <Button
          key={c}
          aria-label={names[c]}
          title={names[c]}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          minW={8}
          w={8}
          h={8}
          p={0}
          borderRadius='full'
          bg={`${palette}.${c}`}
          _hover={{ bg: `${palette}.${c}`, opacity: 0.85 }}
          _active={{ bg: `${palette}.${c}` }}
          boxShadow={
            value === c
              ? `0 0 0 2px var(--chakra-colors-surface), 0 0 0 4px var(--chakra-colors-${palette}-${c})`
              : 'none'
          }
        >
          {value === c && <Icon as={icons.check} color={palette === 'pdf' ? 'mapa.onSolid' : 'surface'} boxSize={4} />}
        </Button>
      ))}
    </Flex>
  )
}

// Checkerboard behind see-through colors
const CHECKER = {
  bgImage: 'repeating-conic-gradient(var(--chakra-colors-border) 0% 25%, var(--chakra-colors-surface) 0% 50%)',
  bgSize: '8px 8px',
}

const swatchRing = (active: boolean) =>
  active ? '0 0 0 2px var(--chakra-colors-surface), 0 0 0 4px var(--chakra-colors-accent)' : 'none'

/**
 * Any color from the system picker, with its opacity, plus a transparent shortcut.
 * Dragging in the picker or the slider previews the color live (one undo step).
 */
const CustomColorPicker = ({
  value,
  onChange,
  onPreview,
  onPreviewEnd,
}: {
  value: NodeColor
  onChange: (c: NodeColor) => void
  onPreview: (c: NodeColor) => void
  onPreviewEnd: () => void
}) => {
  const { t } = useTranslation()
  const custom = isCustomColor(value) ? value : null
  const rgba = custom ? parseCustom(custom) : null
  const rgb = custom ? custom.slice(0, 7) : MAPA.CUSTOM_COLOR
  const alpha = rgba?.a ?? 1
  const transparent = !!rgba && rgba.a === 0
  const label = t('mapes.style.custom_color', { defaultValue: 'Tria qualsevol color' })
  const transparentLabel = t('mapes.style.transparent', { defaultValue: 'Transparent' })
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const onStorageError = () =>
    toast({
      title: t('mapes.colors_error', { defaultValue: 'No s’han pogut desar els teus colors' }),
      description: t('mapes.colors_error_desc', {
        defaultValue:
          'Pot ser que l’emmagatzematge del navegador estigui ple. El color de la idea sí que s’ha aplicat.',
      }),
      status: 'error',
      duration: 5000,
      isClosable: true,
    })
  const { data: saved = [] } = useMapaColors()
  const { mutate: save } = useSaveMapaColor({ onError: onStorageError })
  const { mutate: remove } = useRemoveMapaColor({ onError: onStorageError })
  const isSaved = !!custom && saved.includes(custom)

  // A color chosen in the system picker joins "my colors" when the picker closes
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const onCommit = () => {
      onPreviewEnd()
      if (isCustomColor(valueRef.current)) save(valueRef.current)
    }
    el.addEventListener('change', onCommit)
    return () => el.removeEventListener('change', onCommit)
  }, [save, onPreviewEnd])

  return (
    <Stack spacing={3} mt={3}>
      <Flex gap={2} align='center'>
        <Box
          position='relative'
          w={8}
          h={8}
          borderRadius='full'
          overflow='hidden'
          title={label}
          boxShadow={swatchRing(!!custom && !transparent)}
          sx={CHECKER}
          _focusWithin={{ boxShadow: 'outline' }}
        >
          <Flex
            position='absolute'
            inset={0}
            align='center'
            justify='center'
            bg={custom && !transparent ? colorLook(custom).solid : 'surfaceMuted'}
            borderWidth={custom && !transparent ? 0 : '1px'}
            borderColor='border'
            borderRadius='full'
          >
            <Icon
              as={custom && !transparent ? icons.check : icons.customColor}
              color={custom && !transparent ? colorLook(custom).onSolid : 'textMuted'}
              boxSize={4}
            />
          </Flex>
          <chakra.input
            ref={inputRef}
            type='color'
            aria-label={label}
            value={rgb}
            onChange={(e) => onPreview(customColor(e.target.value, transparent ? 1 : alpha))}
            onBlur={onPreviewEnd}
            position='absolute'
            inset={0}
            w='full'
            h='full'
            opacity={0}
            cursor='pointer'
          />
        </Box>
        <Button
          aria-label={transparentLabel}
          title={transparentLabel}
          aria-pressed={transparent}
          onClick={() => onChange(customColor(rgb, 0))}
          minW={8}
          w={8}
          h={8}
          p={0}
          borderRadius='full'
          borderWidth='1px'
          borderColor='border'
          sx={CHECKER}
          _hover={{ opacity: 0.85 }}
          boxShadow={swatchRing(transparent)}
        >
          {transparent && <Icon as={icons.check} color='textPrimary' boxSize={4} />}
        </Button>
        <Text fontSize='xs' color='textMuted' flex={1}>
          {custom
            ? t('mapes.style.custom_on', { defaultValue: 'Color personalitzat' })
            : t('mapes.style.custom_hint', { defaultValue: 'Color personalitzat o transparent' })}
        </Text>
      </Flex>
      {custom && (
        <Flex align='center' gap={3}>
          <Text as='label' id='mapa-opacitat' fontSize='xs' color='textMuted' flexShrink={0}>
            {t('mapes.style.opacity', { defaultValue: 'Opacitat' })}
          </Text>
          <Slider
            aria-labelledby='mapa-opacitat'
            min={0}
            max={100}
            step={MAPA.OPACITY_STEP}
            value={Math.round(alpha * 100)}
            onChange={(v) => onPreview(customColor(rgb, v / 100))}
            onChangeEnd={onPreviewEnd}
            colorScheme='primary'
            focusThumbOnChange={false}
          >
            <SliderTrack>
              <SliderFilledTrack />
            </SliderTrack>
            <SliderThumb />
          </Slider>
          <Text fontSize='xs' color='textMuted' w={9} textAlign='right' sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(alpha * 100)}%
          </Text>
        </Flex>
      )}
      {(saved.length > 0 || custom) && (
        <Box>
          <Text fontSize='xs' color='textMuted' mb={2}>
            {t('mapes.style.my_colors', { defaultValue: 'Els meus colors (a tots els mapes)' })}
          </Text>
          <Flex gap={2} wrap='wrap' align='center'>
            {saved.map((c) => (
              <Button
                key={c}
                aria-label={t('mapes.style.saved_color', { defaultValue: 'Color desat {{color}}', color: c })}
                title={c}
                aria-pressed={custom === c}
                onClick={() => onChange(c)}
                minW={8}
                w={8}
                h={8}
                p={0}
                borderRadius='full'
                overflow='hidden'
                position='relative'
                sx={CHECKER}
                boxShadow={swatchRing(custom === c)}
                _hover={{ opacity: 0.85 }}
              >
                <Flex position='absolute' inset={0} align='center' justify='center' bg={colorLook(c).solid}>
                  {custom === c && <Icon as={icons.check} color={colorLook(c).onSolid} boxSize={4} />}
                </Flex>
              </Button>
            ))}
            {custom && !isSaved && (
              <IconButton
                aria-label={t('mapes.style.save_color', { defaultValue: 'Desa aquest color als meus colors' })}
                title={t('mapes.style.save_color', { defaultValue: 'Desa aquest color als meus colors' })}
                icon={<Icon as={icons.add} />}
                onClick={() => save(custom)}
                variant='outline'
                colorScheme='gray'
                borderStyle='dashed'
                borderRadius='full'
                size='sm'
              />
            )}
            {custom && isSaved && (
              <IconButton
                aria-label={t('mapes.style.remove_color', {
                  defaultValue: 'Treu aquest color dels meus colors (les idees el mantenen)',
                })}
                title={t('mapes.style.remove_color', {
                  defaultValue: 'Treu aquest color dels meus colors (les idees el mantenen)',
                })}
                icon={<Icon as={icons.delete} />}
                onClick={() => remove(custom)}
                variant='ghost'
                colorScheme='gray'
                borderRadius='full'
                size='sm'
              />
            )}
          </Flex>
        </Box>
      )}
    </Stack>
  )
}

const SizeSlider = ({
  label,
  min,
  max,
  value,
  onChange,
  onChangeEnd,
}: {
  label: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
  onChangeEnd: () => void
}) => (
  <Flex align='center' gap={3}>
    <Text fontSize='xs' color='textMuted' w={14} flexShrink={0}>
      {label}
    </Text>
    <Slider
      aria-label={label}
      min={min}
      max={max}
      step={MAPA.NODE_AMPLE_STEP}
      value={Math.round(value)}
      onChange={onChange}
      onChangeEnd={onChangeEnd}
      colorScheme='primary'
      focusThumbOnChange={false}
    >
      <SliderTrack>
        <SliderFilledTrack />
      </SliderTrack>
      <SliderThumb />
    </Slider>
  </Flex>
)

const FormaPreview = ({ forma }: { forma: NodeForma }) => (
  <Box
    w={forma === 'cercle' ? 5 : 7}
    h={forma === 'cercle' ? 5 : 4}
    borderWidth={forma === 'text' ? 0 : '2px'}
    borderColor='textPrimary'
    borderRadius={forma === 'rectangle' ? '3px' : 'full'}
    display='flex'
    alignItems='center'
    justifyContent='center'
  >
    {forma === 'text' && (
      <Text fontSize='sm' fontWeight={700} lineHeight={1}>
        Aa
      </Text>
    )}
  </Box>
)

const EmplenatPreview = ({ emplenat }: { emplenat: NodeEmplenat }) => (
  <Box
    w={7}
    h={4}
    borderRadius='3px'
    borderWidth='2px'
    borderColor='mapa.primari'
    bg={emplenat === 'ple' ? 'mapa.primari.solid' : emplenat === 'suau' ? 'mapa.primari.bg' : 'surface'}
  />
)

const LinePreview = ({ gruix, estil = 'continua' }: { gruix: number; estil?: BrancaEstil }) => (
  <svg width='28' height='12' aria-hidden>
    <line
      x1='3'
      y1='6'
      x2='25'
      y2='6'
      stroke='currentColor'
      strokeWidth={gruix}
      strokeLinecap='round'
      strokeDasharray={
        estil === 'discontinua' ? `${gruix * 2} ${gruix * 2}` : estil === 'puntejada' ? `0.1 ${gruix * 2.2}` : undefined
      }
    />
  </svg>
)

const TracatPreview = ({ tracat }: { tracat: BrancaTracat }) => (
  <svg width='28' height='18' aria-hidden>
    <path
      d={tracat === 'corba' ? 'M3 15 C14 15, 14 3, 25 3' : tracat === 'recta' ? 'M3 15 L25 3' : 'M3 15 H14 V3 H25'}
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </svg>
)

type StylePanelProps = {
  node: MapaNode
  color: NodeColor
  isRoot: boolean
  onColor: (c: NodeColor) => void
  onColorPreview: (c: NodeColor) => void
  onColorPreviewEnd: () => void
  // Current size of the box (hand-set or measured)
  width: number
  height: number
  onBoxReset: () => void
  onBoxPreview: (size: BoxSize) => void
  onNode: (patch: Partial<Pick<MapaNode, 'forma' | 'emplenat' | 'mida'>>) => void
  onBranca: (patch: Partial<BrancaStyle>) => void
  onEditLabel: () => void
}

/**
 * Look of the selected idea and of the line that reaches it
 */
export const StylePanel = ({
  node,
  color,
  isRoot,
  onColor,
  onColorPreview,
  onColorPreviewEnd,
  width,
  height,
  onBoxReset,
  onBoxPreview,
  onNode,
  onBranca,
  onEditLabel,
}: StylePanelProps) => {
  const { t } = useTranslation()
  const forma = node.forma ?? 'rectangle'
  const emplenat = node.emplenat ?? (isRoot ? 'suau' : 'buit')
  const mida = node.mida ?? 'm'
  const branca = node.branca ?? {}
  const auto = node.ample === undefined && node.alt === undefined
  const gruix = branca.gruix ?? (isRoot ? 3 : 2)

  const formaNames: Record<NodeForma, string> = {
    rectangle: t('mapes.style.rectangle', { defaultValue: 'Rectangle' }),
    pindola: t('mapes.style.pill', { defaultValue: 'Píndola' }),
    cercle: t('mapes.style.circle', { defaultValue: 'Cercle' }),
    text: t('mapes.style.text_only', { defaultValue: 'Només text' }),
  }
  const emplenatNames: Record<NodeEmplenat, string> = {
    buit: t('mapes.style.fill_none', { defaultValue: 'Sense fons' }),
    suau: t('mapes.style.fill_soft', { defaultValue: 'Fons suau' }),
    ple: t('mapes.style.fill_solid', { defaultValue: 'Fons ple' }),
  }
  const midaNames: Record<NodeMida, string> = {
    s: t('mapes.style.size_s', { defaultValue: 'Text petit' }),
    m: t('mapes.style.size_m', { defaultValue: 'Text mitjà' }),
    l: t('mapes.style.size_l', { defaultValue: 'Text gran' }),
  }
  const estilNames: Record<BrancaEstil, string> = {
    continua: t('mapes.style.line_solid', { defaultValue: 'Línia contínua' }),
    discontinua: t('mapes.style.line_dashed', { defaultValue: 'Línia discontínua' }),
    puntejada: t('mapes.style.line_dotted', { defaultValue: 'Línia de punts' }),
  }
  const tracatNames: Record<BrancaTracat, string> = {
    corba: t('mapes.style.curve', { defaultValue: 'Corba' }),
    recta: t('mapes.style.straight', { defaultValue: 'Recta' }),
    colze: t('mapes.style.elbow', { defaultValue: 'En angle' }),
  }

  return (
    <Stack spacing={4}>
      <Section title={t('mapes.style.color', { defaultValue: 'Color de la branca' })}>
        <ColorSwatches value={isCustomColor(color) ? null : color} onChange={onColor} />
        <CustomColorPicker
          value={color}
          onChange={onColor}
          onPreview={onColorPreview}
          onPreviewEnd={onColorPreviewEnd}
        />
      </Section>
      <Section title={t('mapes.style.shape', { defaultValue: 'Forma' })}>
        <SimpleGrid columns={4} spacing={2}>
          {NODE_FORMES.map((f) => (
            <Choice key={f} label={formaNames[f]} isActive={forma === f} onClick={() => onNode({ forma: f })}>
              <FormaPreview forma={f} />
            </Choice>
          ))}
        </SimpleGrid>
      </Section>
      <Flex gap={4}>
        <Section title={t('mapes.style.fill', { defaultValue: 'Fons' })}>
          <SimpleGrid columns={3} spacing={2} w='138px'>
            {NODE_EMPLENATS.map((e) => (
              <Choice
                key={e}
                label={emplenatNames[e]}
                isActive={emplenat === e}
                onClick={() => onNode({ emplenat: e })}
              >
                <EmplenatPreview emplenat={e} />
              </Choice>
            ))}
          </SimpleGrid>
        </Section>
        <Section title={t('mapes.style.size', { defaultValue: 'Text' })}>
          <SimpleGrid columns={3} spacing={2} w='138px'>
            {NODE_MIDES.map((m) => (
              <Choice key={m} label={midaNames[m]} isActive={mida === m} onClick={() => onNode({ mida: m })}>
                <Text fontSize={m === 's' ? 'xs' : m === 'm' ? 'sm' : 'lg'} fontWeight={700} lineHeight={1}>
                  A
                </Text>
              </Choice>
            ))}
          </SimpleGrid>
        </Section>
      </Flex>

      <Section title={t('mapes.style.box_size', { defaultValue: 'Mida de la caixa' })}>
        <Flex align='center' gap={4}>
          <Button
            aria-pressed={auto}
            onClick={onBoxReset}
            variant='outline'
            colorScheme='gray'
            borderRadius='sm'
            borderColor={auto ? 'accent' : 'border'}
            borderWidth={auto ? '2px' : '1px'}
            bg={auto ? 'mapa.primari.bg' : 'surface'}
            h={10}
            flexShrink={0}
          >
            {t('mapes.style.width_auto', { defaultValue: 'Automàtica' })}
          </Button>
          <Stack spacing={1} flex={1}>
            <SizeSlider
              label={t('mapes.style.box_width', { defaultValue: 'Amplada' })}
              min={MAPA.NODE_AMPLE_MIN}
              max={MAPA.NODE_AMPLE_MAX}
              value={width}
              onChange={(v) => onBoxPreview({ ample: v })}
              onChangeEnd={onColorPreviewEnd}
            />
            <SizeSlider
              label={t('mapes.style.box_height', { defaultValue: 'Alçada' })}
              min={MAPA.NODE_ALT_MIN}
              max={MAPA.NODE_ALT_MAX}
              value={height}
              onChange={(v) => onBoxPreview({ alt: v })}
              onChangeEnd={onColorPreviewEnd}
            />
          </Stack>
        </Flex>
      </Section>

      {!isRoot && (
        <>
          <Box h='1px' bg='border' />
          <Section title={t('mapes.style.line_width', { defaultValue: 'Gruix de la línia' })}>
            <SimpleGrid columns={5} spacing={2}>
              {BRANCA_GRUIXOS.map((g) => (
                <Choice
                  key={g}
                  label={t('mapes.style.width_n', { defaultValue: 'Gruix {{n}}', n: g })}
                  isActive={gruix === g}
                  onClick={() => onBranca({ gruix: g })}
                >
                  <LinePreview gruix={g} />
                </Choice>
              ))}
            </SimpleGrid>
          </Section>
          <Flex gap={4}>
            <Section title={t('mapes.style.line_style', { defaultValue: 'Estil' })}>
              <SimpleGrid columns={3} spacing={2} w='138px'>
                {BRANCA_ESTILS.map((e) => (
                  <Choice
                    key={e}
                    label={estilNames[e]}
                    isActive={(branca.estil ?? 'continua') === e}
                    onClick={() => onBranca({ estil: e })}
                  >
                    <LinePreview gruix={2} estil={e} />
                  </Choice>
                ))}
              </SimpleGrid>
            </Section>
            <Section title={t('mapes.style.line_path', { defaultValue: 'Traçat' })}>
              <SimpleGrid columns={3} spacing={2} w='138px'>
                {BRANCA_TRACATS.map((tr) => (
                  <Choice
                    key={tr}
                    label={tracatNames[tr]}
                    isActive={(branca.tracat ?? 'corba') === tr}
                    onClick={() => onBranca({ tracat: tr })}
                  >
                    <TracatPreview tracat={tr} />
                  </Choice>
                ))}
              </SimpleGrid>
            </Section>
          </Flex>
          <Flex align='center' justify='space-between' gap={3}>
            <Text as='label' htmlFor='mapa-fletxa' fontSize='sm'>
              {t('mapes.style.arrow', { defaultValue: 'Punta de fletxa' })}
            </Text>
            <Switch
              id='mapa-fletxa'
              isChecked={!!branca.fletxa}
              onChange={(e) => onBranca({ fletxa: e.target.checked })}
              colorScheme='primary'
            />
          </Flex>
          <Button
            variant='outline'
            colorScheme='gray'
            leftIcon={<Icon as={icons.lineText} />}
            onClick={onEditLabel}
            size='sm'
          >
            {branca.text
              ? t('mapes.style.edit_line_text', { defaultValue: 'Edita el text de la línia' })
              : t('mapes.style.add_line_text', { defaultValue: 'Escriu sobre la línia' })}
          </Button>
        </>
      )}
    </Stack>
  )
}
