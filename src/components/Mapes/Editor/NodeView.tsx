import { Box, chakra, Flex, Icon, Text } from '@chakra-ui/react'
import { motion, useReducedMotion } from 'framer-motion'
import { KeyboardEvent, memo, MouseEvent, PointerEvent, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { icons } from '~theme/icons'
import { duration, spring } from '~theme/motion'
import { LINE_HEIGHT, nodeLook } from '../nodeLook'
import { colorLook, cssColor } from '../colors'
import { MapaNode, NodeColor } from '../types'

const MotionBox = motion(Box)

type NodeViewProps = {
  node: MapaNode
  color: NodeColor
  isRoot: boolean
  // Children count (0: no fold toggle)
  childCount: number
  // Side where children grow: the fold toggle goes there
  side: 1 | -1
  isSelected: boolean
  isEditing: boolean
  isDropTarget: boolean
  isDragging: boolean
  // False while a drawing tool is active: the pen draws over the ideas
  interactive: boolean
  onPointerDown: (id: string, e: PointerEvent) => void
  onDoubleClick: (id: string) => void
  onToggleFold: (id: string) => void
  onSize: (id: string, w: number, h: number) => void
  // Drag of the width handle (dir: side of the handle) and reset with a double click
  onResizePointerDown: (id: string, dir: 1 | -1, e: PointerEvent) => void
  onResetWidth: (id: string) => void
  // Text when editing started from a typed key (replaces the current text)
  initialDraft: string | null
  onCommit: (id: string, text: string, next?: 'child' | 'sibling') => void
  onCancel: (id: string) => void
}

/**
 * One idea of the map, centered on (x, y), with inline text editing.
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
    interactive,
    onPointerDown,
    onDoubleClick,
    onToggleFold,
    onSize,
    onResizePointerDown,
    onResetWidth,
    initialDraft,
    onCommit,
    onCancel,
  }: NodeViewProps) => {
    const { t } = useTranslation()
    const reduce = useReducedMotion()
    const [draft, setDraft] = useState(node.text)
    const areaRef = useRef<HTMLTextAreaElement>(null)
    const boxRef = useRef<HTMLDivElement>(null)
    const placeholder = t('mapes.node_placeholder', { defaultValue: 'Nova idea' })
    const look = nodeLook(node, isRoot, color)

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

    // Report the real size of the box: lines attach to its border and the export draws it
    useLayoutEffect(() => {
      const el = boxRef.current
      if (!el) return
      const report = () => onSize(node.id, el.offsetWidth, el.offsetHeight)
      report()
      const observer = new ResizeObserver(report)
      observer.observe(el)
      return () => observer.disconnect()
    }, [node.id, onSize])

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
    const c = colorLook(color)
    const line = cssColor(c.line)
    const strong = cssColor(c.strong)
    const folded = !!node.plegat && childCount > 0
    // The width handle goes on the side without the fold toggle
    const handleSide: 1 | -1 = childCount > 0 ? (side > 0 ? -1 : 1) : 1
    const round = look.forma === 'cercle'
    const radius =
      look.forma === 'cercle'
        ? '50%'
        : look.forma === 'pindola'
          ? '9999px'
          : look.forma === 'text'
            ? '8px'
            : isRoot
              ? '16px'
              : '10px'
    const textProps = {
      fontSize: `${look.fontPx}px`,
      fontWeight: look.fontWeight,
      lineHeight: LINE_HEIGHT,
      textAlign: 'center' as const,
    }
    const ring = `0 0 0 3px ${cssColor(c.bg)}, 0 0 0 5px ${strong}`

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
        pointerEvents={isDragging || !interactive ? 'none' : 'auto'}
      >
        <Flex
          ref={boxRef}
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
          align='center'
          justify='center'
          minW={`${look.minW}px`}
          maxW={node.ample ? undefined : `${look.maxW + look.padX * 2}px`}
          w={node.ample ? `${node.ample}px` : 'max-content'}
          // A circle is as tall as it is wide (it grows into an ellipse with long texts)
          sx={{ aspectRatio: round ? '1' : undefined, touchAction: 'none' }}
          px={`${look.padX}px`}
          py={`${look.padY}px`}
          borderRadius={radius}
          bg={isDropTarget ? c.bg : (look.fill ?? 'transparent')}
          borderWidth={`${look.borderPx}px`}
          borderColor={look.stroke ? line : 'transparent'}
          boxShadow={
            isSelected || isDropTarget ? ring : isDragging ? 'raised' : look.forma === 'text' ? 'none' : 'card'
          }
          cursor={isEditing ? 'text' : 'pointer'}
          userSelect='none'
        >
          <Text
            {...textProps}
            visibility={isEditing ? 'hidden' : 'visible'}
            whiteSpace='pre-wrap'
            wordBreak='break-word'
            color={look.text}
            opacity={text ? 1 : 0.6}
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
              left={`${look.padX}px`}
              right={`${look.padX}px`}
              top='50%'
              transform='translateY(-50%)'
              h={`calc(100% - ${look.padY * 2}px)`}
              maxH='100%'
              p={0}
              bg='transparent'
              border='none'
              outline='none'
              resize='none'
              overflow='hidden'
              {...textProps}
              color={look.text}
              _placeholder={{ color: look.text, opacity: 0.6 }}
            />
          )}
          {isSelected && !isEditing && interactive && (
            <Box
              role='separator'
              aria-orientation='vertical'
              aria-label={t('mapes.node_resize', {
                defaultValue: 'Arrossega per canviar l’amplada (doble clic: automàtica)',
              })}
              title={t('mapes.node_resize', {
                defaultValue: 'Arrossega per canviar l’amplada (doble clic: automàtica)',
              })}
              onPointerDown={(e: PointerEvent) => {
                e.stopPropagation()
                onResizePointerDown(node.id, handleSide, e)
              }}
              onDoubleClick={(e: MouseEvent) => {
                e.stopPropagation()
                onResetWidth(node.id)
              }}
              position='absolute'
              top='50%'
              {...(handleSide > 0 ? { right: 0 } : { left: 0 })}
              transform={`translate(${handleSide > 0 ? '50%' : '-50%'}, -50%)`}
              // Big invisible hit area around a slim visible grip
              w={5}
              h={8}
              display='flex'
              alignItems='center'
              justifyContent='center'
              cursor='ew-resize'
              sx={{ touchAction: 'none' }}
            >
              <Box w='6px' h={5} borderRadius='full' bg='surface' borderWidth='1.5px' borderColor={strong} />
            </Box>
          )}
          {childCount > 0 && (folded || isSelected) && !isEditing && interactive && (
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
              borderColor={strong}
              color={strong}
              align='center'
              justify='center'
              fontSize='2xs'
              fontWeight={700}
              boxShadow='card'
            >
              {folded ? childCount : <Icon as={icons.collapse} boxSize={4} />}
            </Flex>
          )}
        </Flex>
      </MotionBox>
    )
  }
)
NodeView.displayName = 'NodeView'
