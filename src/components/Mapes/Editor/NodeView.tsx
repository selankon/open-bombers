import { Box, chakra, Flex, Icon, Text } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { KeyboardEvent, memo, MouseEvent, PointerEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { duration, spring } from '~theme/motion'
import { MapaColor, MapaNode } from '../types'

const MotionBox = motion(Box)

type NodeViewProps = {
  node: MapaNode
  color: MapaColor
  isRoot: boolean
  // Children count (0: no fold toggle)
  childCount: number
  // Side where children grow: the fold toggle goes there
  side: 1 | -1
  isSelected: boolean
  isEditing: boolean
  isDropTarget: boolean
  isDragging: boolean
  onPointerDown: (id: string, e: PointerEvent) => void
  onDoubleClick: (id: string) => void
  onToggleFold: (id: string) => void
  // Text when editing started from a typed key (replaces the current text)
  initialDraft: string | null
  onCommit: (id: string, text: string, next?: 'child' | 'sibling') => void
  onCancel: (id: string) => void
}

/**
 * One idea of the map: a pill centered on (x, y), with inline text editing.
 * While editing, an invisible copy of the text sizes the box and the textarea sits on top.
 */
export const NodeView = memo(
  ({
    node,
    color,
    isRoot,
    childCount,
    side,
    isSelected,
    isEditing,
    isDropTarget,
    isDragging,
    onPointerDown,
    onDoubleClick,
    onToggleFold,
    initialDraft,
    onCommit,
    onCancel,
  }: NodeViewProps) => {
    const { t } = useTranslation()
    const reduce = useReducedMotion()
    const [draft, setDraft] = useState(node.text)
    const areaRef = useRef<HTMLTextAreaElement>(null)
    const placeholder = t('mapes.node_placeholder', { defaultValue: 'Nova idea' })

    // Start editing with the current text (or the typed key) and the caret at the end
    useEffect(() => {
      if (!isEditing) return
      const text = initialDraft ?? node.text
      setDraft(text)
      requestAnimationFrame(() => {
        const el = areaRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        el.setSelectionRange(text.length, text.length)
      })
    }, [isEditing])

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
      e.stopPropagation()
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onCommit(node.id, draft, e.ctrlKey || e.metaKey ? 'sibling' : undefined)
      } else if (e.key === 'Tab') {
        e.preventDefault()
        onCommit(node.id, draft, 'child')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel(node.id)
      }
    }

    const text = isEditing ? draft : node.text
    const line = `var(--chakra-colors-mapa-${color})`
    const tint = `mapa.${color}.bg`
    const folded = !!node.plegat && childCount > 0

    return (
      <MotionBox
        position='absolute'
        left={`${node.x}px`}
        top={`${node.y}px`}
        style={{ x: '-50%', y: '-50%' }}
        initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
        animate={{ opacity: isDragging ? 0.85 : 1, scale: isDropTarget ? 1.06 : 1 }}
        // @ts-ignore framer-motion transition prop through Chakra
        transition={reduce ? { duration: duration.fast } : spring.bouncy}
        zIndex={isEditing || isDragging ? 3 : isSelected ? 2 : 1}
        pointerEvents={isDragging ? 'none' : 'auto'}
      >
        <Box
          data-node-id={node.id}
          role='treeitem'
          aria-selected={isSelected}
          aria-label={node.text || placeholder}
          onPointerDown={(e) => !isEditing && onPointerDown(node.id, e)}
          onDoubleClick={(e) => {
            e.stopPropagation()
            onDoubleClick(node.id)
          }}
          position='relative'
          w='max-content'
          minW={isRoot ? 24 : 16}
          maxW={isRoot ? '280px' : '240px'}
          px={isRoot ? 5 : 4}
          py={isRoot ? 3 : 2}
          borderRadius={isRoot ? 'md' : 'sm'}
          bg={isRoot || isDropTarget ? tint : 'surface'}
          borderWidth={isRoot ? '2px' : '1.5px'}
          borderColor={line}
          boxShadow={
            isSelected || isDropTarget
              ? `0 0 0 3px var(--chakra-colors-mapa-${color}-bg), 0 0 0 5px ${line}`
              : isDragging
                ? 'raised'
                : 'card'
          }
          cursor={isEditing ? 'text' : 'pointer'}
          userSelect='none'
          sx={{ touchAction: 'none' }}
        >
          <Text
            visibility={isEditing ? 'hidden' : 'visible'}
            fontSize={isRoot ? 'md' : 'sm'}
            fontWeight={isRoot ? 700 : 500}
            lineHeight={1.35}
            textAlign='center'
            whiteSpace='pre-wrap'
            wordBreak='break-word'
            color={text ? 'textPrimary' : 'textMuted'}
          >
            {/* The trailing space keeps the height of an empty last line while typing */}
            {text ? (isEditing ? `${text} ` : text) : placeholder}
          </Text>
          {isEditing && (
            <chakra.textarea
              ref={areaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={() => onCommit(node.id, draft)}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={t('mapes.edit_text', { defaultValue: 'Text de la idea' })}
              placeholder={placeholder}
              position='absolute'
              inset={0}
              px={isRoot ? 5 : 4}
              py={isRoot ? 3 : 2}
              bg='transparent'
              border='none'
              outline='none'
              resize='none'
              overflow='hidden'
              fontSize={isRoot ? 'md' : 'sm'}
              fontWeight={isRoot ? 700 : 500}
              lineHeight={1.35}
              textAlign='center'
              color='textPrimary'
              _placeholder={{ color: 'textMuted' }}
            />
          )}
          {childCount > 0 && (folded || isSelected) && !isEditing && (
            <Flex
              as='button'
              type='button'
              aria-label={
                folded
                  ? t('mapes.expand', { defaultValue: 'Mostra les {{count}} idees amagades', count: childCount })
                  : t('mapes.collapse', { defaultValue: 'Amaga les idees d’aquesta branca' })
              }
              onPointerDown={(e: PointerEvent) => e.stopPropagation()}
              onClick={(e: MouseEvent) => {
                e.stopPropagation()
                onToggleFold(node.id)
              }}
              position='absolute'
              top='50%'
              {...(side > 0 ? { right: 0 } : { left: 0 })}
              transform={`translate(${side > 0 ? '50%' : '-50%'}, -50%)`}
              minW={6}
              h={6}
              px={folded ? 1.5 : 0}
              borderRadius='full'
              bg='surface'
              borderWidth='1.5px'
              borderColor={line}
              color={line}
              align='center'
              justify='center'
              fontSize='2xs'
              fontWeight={700}
              boxShadow='card'
            >
              {folded ? childCount : <Icon as={icons.collapse} boxSize={4} />}
            </Flex>
          )}
        </Box>
      </MotionBox>
    )
  }
)
NodeView.displayName = 'NodeView'
