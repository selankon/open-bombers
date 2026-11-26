import {
  Box,
  Button,
  Flex,
  Icon,
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverBody,
  PopoverContent,
  Portal,
  Stack,
  Textarea,
} from '@chakra-ui/react'
import { memo, MouseEvent, PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ColorSwatches } from '~components/Mapes/Editor/StylePanel'
import { icons } from '~theme/icons'
import { MAPA, PDF } from '~utils/constants'
import { NotaPdf } from '../types'
import { PageHandlers, trackPointer } from './handlers'

type NotesLayerProps = {
  page: number
  scale: number
  notes: NotaPdf[]
  openNoteId: string | null
  // Pins react to the pointer (not while drawing, so ink can go over them)
  interactive: boolean
  handlers: PageHandlers
}

const NotePin = ({
  page,
  scale,
  note,
  isOpen,
  interactive,
  handlers,
}: { note: NotaPdf; isOpen: boolean } & Omit<NotesLayerProps, 'notes' | 'openNoteId'>) => {
  const { t } = useTranslation()
  const preview = note.text.trim()
  const label = preview
    ? t('anotacions.note_aria', { defaultValue: 'Nota: {{text}}', text: preview.slice(0, 80) })
    : t('anotacions.note_empty_aria', { defaultValue: 'Nota buida' })

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()
    let last = { x: e.clientX, y: e.clientY }
    trackPointer(e, MAPA.DRAG_THRESHOLD, {
      onDragStart: handlers.onCheckpoint,
      onDrag: (c) => {
        handlers.onNoteMove(page, note.id, (c.x - last.x) / scale, (c.y - last.y) / scale)
        last = c
      },
      onTap: () => handlers.onOpenNote(isOpen ? null : note.id),
    })
  }

  // Keyboard (Enter / Space) opens it too; pointer taps are handled above
  const onClick = (e: MouseEvent) => e.detail === 0 && handlers.onOpenNote(isOpen ? null : note.id)

  return (
    <Popover isOpen={isOpen} onClose={() => handlers.onOpenNote(null)} placement='bottom' isLazy>
      <PopoverAnchor>
        <Box
          as='button'
          aria-label={label}
          title={preview || undefined}
          position='absolute'
          left={`${note.x * scale}px`}
          top={`${note.y * scale}px`}
          w={`${PDF.NOTE_PIN}px`}
          h={`${PDF.NOTE_PIN}px`}
          ml={`${-PDF.NOTE_PIN / 2}px`}
          mt={`${-PDF.NOTE_PIN / 2}px`}
          display='flex'
          alignItems='center'
          justifyContent='center'
          borderRadius='full'
          bg={`mapa.${note.color}.solid`}
          color='mapa.onSolid'
          boxShadow={isOpen ? '0 0 0 3px var(--chakra-colors-accent)' : 'raised'}
          pointerEvents={interactive ? 'auto' : 'none'}
          cursor='pointer'
          onPointerDown={onPointerDown}
          onClick={onClick}
          sx={{ touchAction: 'none' }}
          _focusVisible={{ outline: '2px solid', outlineColor: 'accent', outlineOffset: '2px' }}
        >
          <Icon as={icons.note} boxSize={4} />
        </Box>
      </PopoverAnchor>
      <Portal>
        <PopoverContent w='300px' maxW='calc(100vw - 24px)' borderRadius='md' boxShadow='floating' borderColor='border'>
          <PopoverArrow />
          <PopoverBody p={4}>
            <Stack spacing={3}>
              <Textarea
                autoFocus
                value={note.text}
                onChange={(e) => handlers.onSaveNote(page, note.id, { text: e.target.value })}
                placeholder={t('anotacions.note_placeholder', { defaultValue: 'Escriu la nota…' })}
                aria-label={t('anotacions.note_text', { defaultValue: 'Text de la nota' })}
                rows={4}
                resize='vertical'
                borderRadius='sm'
              />
              <ColorSwatches
                value={note.color}
                onChange={(color) => handlers.onSaveNote(page, note.id, { color })}
                palette='pdf'
              />
              <Flex justify='space-between' gap={2}>
                <Button
                  variant='ghost'
                  colorScheme='red'
                  leftIcon={<Icon as={icons.delete} />}
                  onClick={() => handlers.onRemoveNote(page, note.id)}
                >
                  {t('anotacions.note_delete', { defaultValue: 'Elimina' })}
                </Button>
                <Button onClick={() => handlers.onOpenNote(null)}>
                  {t('anotacions.note_done', { defaultValue: 'Fet' })}
                </Button>
              </Flex>
            </Stack>
          </PopoverBody>
        </PopoverContent>
      </Portal>
    </Popover>
  )
}

/**
 * Sticky notes of one page. Pins keep the same size at every zoom; tap one to read or edit it.
 */
export const NotesLayer = memo(({ notes, openNoteId, ...props }: NotesLayerProps) => (
  <Box position='absolute' inset={0} zIndex={3} pointerEvents='none'>
    {notes.map((note) => (
      <NotePin key={note.id} note={note} isOpen={note.id === openNoteId} {...props} />
    ))}
  </Box>
))
NotesLayer.displayName = 'NotesLayer'
