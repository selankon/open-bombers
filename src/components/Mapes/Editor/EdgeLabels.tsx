import { Box, chakra, Text } from '@chakra-ui/react'
import { KeyboardEvent, memo, PointerEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sizeOf } from '../content'
import { edgeGeometry } from '../geometry'
import { depthOf } from '../logic'
import { MapaNode, NodeSizes } from '../types'

type EdgeLabelsProps = {
  nodes: MapaNode[]
  map: Record<string, MapaNode>
  sizes: NodeSizes
  editingId: string | null
  interactive: boolean
  onSelect: (id: string) => void
  onEdit: (id: string) => void
  onCommit: (id: string, text: string) => void
  onCancel: () => void
}

const LabelEditor = ({
  initial,
  onCommit,
  onCancel,
}: {
  initial: string
  onCommit: (text: string) => void
  onCancel: () => void
}) => {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)
  const done = useRef(false)

  // Focus the box with the caret at the end
  useEffect(() => {
    requestAnimationFrame(() => {
      ref.current?.focus({ preventScroll: true })
      ref.current?.setSelectionRange(initial.length, initial.length)
    })
  }, [initial])

  const finish = (save: boolean) => {
    if (done.current) return
    done.current = true
    if (save) onCommit(draft)
    else onCancel()
  }

  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      finish(true)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      finish(false)
    }
  }

  return (
    <Box position='relative'>
      <Text visibility='hidden' fontSize='xs' fontWeight={600} whiteSpace='pre-wrap' minW='60px' lineHeight={1.35}>
        {draft || ' '}{' '}
      </Text>
      <chakra.textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => finish(true)}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label={t('mapes.line_text', { defaultValue: 'Text de la línia' })}
        placeholder={t('mapes.line_text_placeholder', { defaultValue: 'Escriu…' })}
        position='absolute'
        inset={0}
        p={0}
        bg='transparent'
        border='none'
        outline='none'
        resize='none'
        overflow='hidden'
        fontSize='xs'
        fontWeight={600}
        lineHeight={1.35}
        textAlign='center'
        color='textPrimary'
      />
    </Box>
  )
}

/**
 * Texts written on the lines, in the middle of each line
 */
export const EdgeLabels = memo(
  ({ nodes, map, sizes, editingId, interactive, onSelect, onEdit, onCommit, onCancel }: EdgeLabelsProps) => (
    <>
      {nodes.map((n) => {
        const parent = n.pare ? map[n.pare] : undefined
        const editing = n.id === editingId
        if (!parent || (!n.branca?.text && !editing)) return null
        const g = edgeGeometry(parent, n, sizeOf(sizes, parent.id), sizeOf(sizes, n.id), depthOf(map, n.id))
        return (
          <Box
            key={n.id}
            position='absolute'
            left={`${g.mid.x}px`}
            top={`${g.mid.y}px`}
            transform='translate(-50%, -50%)'
            w='max-content'
            maxW='180px'
            px={2}
            py={1}
            borderRadius='sm'
            bg='mapa.label'
            boxShadow={editing ? 'raised' : 'none'}
            zIndex={editing ? 4 : 1}
            pointerEvents={interactive || editing ? 'auto' : 'none'}
            cursor='pointer'
            onPointerDown={(e: PointerEvent) => {
              e.stopPropagation()
              onSelect(n.id)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              onEdit(n.id)
            }}
          >
            {editing ? (
              <LabelEditor
                initial={n.branca?.text ?? ''}
                onCommit={(text) => onCommit(n.id, text)}
                onCancel={onCancel}
              />
            ) : (
              <Text
                fontSize='xs'
                fontWeight={600}
                color='textMuted'
                textAlign='center'
                whiteSpace='pre-wrap'
                lineHeight={1.35}
              >
                {n.branca?.text}
              </Text>
            )}
          </Box>
        )
      })}
    </>
  )
)
EdgeLabels.displayName = 'EdgeLabels'
