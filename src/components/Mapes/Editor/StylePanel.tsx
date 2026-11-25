import { Box, Button, Flex, Icon, SimpleGrid, Stack, Switch, Text } from '@chakra-ui/react'
import { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
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

export const ColorSwatches = ({ value, onChange }: { value: MapaColor | null; onChange: (c: MapaColor) => void }) => {
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
          bg={`mapa.${c}`}
          _hover={{ bg: `mapa.${c}`, opacity: 0.85 }}
          _active={{ bg: `mapa.${c}` }}
          boxShadow={
            value === c ? `0 0 0 2px var(--chakra-colors-surface), 0 0 0 4px var(--chakra-colors-mapa-${c})` : 'none'
          }
        >
          {value === c && <Icon as={icons.check} color='surface' boxSize={4} />}
        </Button>
      ))}
    </Flex>
  )
}

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
  color: MapaColor
  isRoot: boolean
  onColor: (c: MapaColor) => void
  onNode: (patch: Partial<Pick<MapaNode, 'forma' | 'emplenat' | 'mida'>>) => void
  onBranca: (patch: Partial<BrancaStyle>) => void
  onEditLabel: () => void
}

/**
 * Look of the selected idea and of the line that reaches it
 */
export const StylePanel = ({ node, color, isRoot, onColor, onNode, onBranca, onEditLabel }: StylePanelProps) => {
  const { t } = useTranslation()
  const forma = node.forma ?? 'rectangle'
  const emplenat = node.emplenat ?? (isRoot ? 'suau' : 'buit')
  const mida = node.mida ?? 'm'
  const branca = node.branca ?? {}
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
        <ColorSwatches value={color} onChange={onColor} />
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
