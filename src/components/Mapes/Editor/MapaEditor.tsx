import { Box, Button, Icon, useToast } from '@chakra-ui/react'
import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { icons } from '~theme/icons'
import { MAPA } from '~utils/constants'
import {
  addChild,
  addRoot,
  addSibling,
  attachTo,
  byId,
  centerOn,
  colorOf,
  fitViewport,
  isOffscreen,
  moveSubtree,
  neighbour,
  newId,
  removeSubtree,
  setBranchColor,
  subtreeIds,
  toWorld,
  updateNode,
} from '../logic'
import { useSaveMapaContent } from '../queries'
import { MapaColor, MapaMental } from '../types'
import { Canvas, CanvasHandle } from './Canvas'
import { EditorHeader } from './EditorHeader'
import { Toolbar } from './Toolbar'
import { useEditorState } from './useEditorState'
import { useViewport } from './useViewport'

// Callback with a stable identity that always runs the latest version (keeps memoized nodes from re-rendering)
const useStable = <A extends unknown[], R>(fn: (...args: A) => R) => {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: A) => ref.current(...args), [])
}

/**
 * Mind map editor: canvas, tools, keyboard shortcuts and autosave
 */
export const MapaEditor = ({ mapa }: { mapa: MapaMental }) => {
  const { t } = useTranslation()
  const toast = useToast()
  const { nodes, apply, patch, checkpoint, undo, redo, drop, canUndo, canRedo } = useEditorState(mapa.nodes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<{ id: string; draft: string | null } | null>(null)
  const [drag, setDrag] = useState<{ ids: Set<string>; target: string | null } | null>(null)
  // Node just created: its first text joins the creation in the undo history
  const freshId = useRef<string | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<CanvasHandle>(null)
  const { vp, vpRef, setVp, size, zoomBy } = useViewport(areaRef)
  const nodesRef = useRef(nodes)
  nodesRef.current = nodes

  const map = useMemo(() => byId(nodes), [nodes])
  const selected = selectedId ? map[selectedId] : undefined

  // ---- Autosave ----
  const { mutateAsync: saveContent } = useSaveMapaContent()
  const savedRef = useRef(mapa.nodes)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  // The map is being deleted: nothing more to save
  const removed = useRef(false)
  const stopSaving = useStable(() => {
    removed.current = true
    clearTimeout(timer.current)
  })

  const flush = useStable(async () => {
    clearTimeout(timer.current)
    const current = nodesRef.current
    if (removed.current || current === savedRef.current) return
    savedRef.current = current
    try {
      await saveContent({ id: mapa.id, nodes: current, traces: mapa.traces })
    } catch {
      savedRef.current = mapa.nodes
      if (!toast.isActive('mapa-save-error')) {
        toast({
          id: 'mapa-save-error',
          title: t('mapes.save_error', { defaultValue: 'No s’han pogut desar els canvis' }),
          description: t('mapes.save_error_desc', {
            defaultValue: 'Els canvis són a la pantalla però no al dispositiu. Ho tornarem a provar al proper canvi.',
          }),
          status: 'error',
          duration: 5000,
          isClosable: true,
        })
      }
    }
  })

  // Save a moment after the last change
  useEffect(() => {
    if (nodes === savedRef.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, MAPA.SAVE_DELAY)
  }, [nodes, flush])

  // Save right away when leaving the editor or hiding the app
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  // ---- Viewport ----
  const fitted = useRef(false)
  const fit = useStable(() => setVp(fitViewport(nodesRef.current, size.w, size.h)))

  // Show the whole map once the canvas has a size (or its main idea, when the whole map would be too small)
  useEffect(() => {
    if (fitted.current || !size.w || !size.h) return
    fitted.current = true
    const all = fitViewport(nodesRef.current, size.w, size.h)
    const root = nodesRef.current.find((n) => !n.pare)
    if (all.k >= MAPA.READABLE_ZOOM || !root) return setVp(all)
    setVp(centerOn({ x: 0, y: 0, k: MAPA.READABLE_ZOOM }, root.x, root.y, size.w, size.h))
  }, [size, setVp])

  // Keep the selected node in view (new nodes, keyboard navigation)
  useEffect(() => {
    if (!selected || drag) return
    if (isOffscreen(vpRef.current, selected.x, selected.y, size.w, size.h)) {
      setVp((v) => centerOn(v, selected.x, selected.y, size.w, size.h))
    }
    // Only when the selection changes, not on every move of the node
  }, [selectedId])

  // ---- Actions ----
  const select = useStable((id: string | null) => {
    setSelectedId(id)
    if (editing && editing.id !== id) setEditing(null)
  })

  const startEdit = useStable((id: string, draft: string | null = null) => {
    setSelectedId(id)
    setEditing({ id, draft })
  })

  const createAndEdit = (id: string, make: (ns: typeof nodes) => typeof nodes) => {
    apply(make)
    freshId.current = id
    startEdit(id)
  }

  const addChildOf = useStable((parentId: string | null) => {
    const id = newId()
    if (parentId) return createAndEdit(id, (ns) => addChild(ns, parentId, '', id).nodes)
    const c = toWorld(vpRef.current, size.w / 2, size.h / 2)
    createAndEdit(id, (ns) => addRoot(ns, c.x, c.y, '', id).nodes)
  })

  const addSiblingOf = useStable((nodeId: string) => {
    const id = newId()
    createAndEdit(id, (ns) => addSibling(ns, nodeId, '', id).nodes)
  })

  const removeNode = useStable((id: string) => {
    const parent = map[id]?.pare ?? null
    apply((ns) => removeSubtree(ns, id))
    setEditing(null)
    setSelectedId(parent)
    keepFocus()
  })

  // When the text box closes the focus falls to the page: bring it back to the canvas for the shortcuts
  const keepFocus = () =>
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (!active || active === document.body) canvasRef.current?.focus()
    })

  const commit = useStable((id: string, text: string, next?: 'child' | 'sibling') => {
    if (editing?.id !== id) return
    setEditing(null)
    keepFocus()
    const node = nodesRef.current.find((n) => n.id === id)
    if (!node) return
    const value = text.trim()
    const hasChildren = nodesRef.current.some((n) => n.pare === id)
    if (freshId.current === id) {
      freshId.current = null
      if (!value && !hasChildren) {
        // A new idea left empty disappears without leaving an undo step
        drop()
        setSelectedId(node.pare)
        return
      }
      patch((ns) => updateNode(ns, id, { text: value }))
    } else if (value !== node.text) {
      apply((ns) => updateNode(ns, id, { text: value }))
    }
    if (next === 'child') addChildOf(id)
    else if (next === 'sibling') addSiblingOf(id)
  })

  const cancel = useStable((id: string) => {
    if (editing?.id !== id) return
    setEditing(null)
    const node = nodesRef.current.find((n) => n.id === id)
    if (freshId.current === id) {
      freshId.current = null
      drop()
      setSelectedId(node?.pare ?? null)
    }
    keepFocus()
  })

  const toggleFold = useStable((id: string) => {
    const node = map[id]
    if (node) apply((ns) => updateNode(ns, id, { plegat: !node.plegat }))
  })

  const setColor = useStable((c: MapaColor) => selectedId && apply((ns) => setBranchColor(ns, selectedId, c)))

  const onDragStart = useStable((id: string) => {
    checkpoint()
    setSelectedId(id)
    setDrag({ ids: subtreeIds(nodesRef.current, id), target: null })
  })
  const onDragMove = useStable((id: string, dx: number, dy: number, target: string | null) => {
    patch((ns) => moveSubtree(ns, id, dx, dy))
    setDrag((d) => (d && d.target !== target ? { ...d, target } : d))
  })
  const onDragEnd = useStable((id: string, target: string | null) => {
    if (target) patch((ns) => attachTo(ns, id, target))
    setDrag(null)
  })

  const onBackgroundDoubleClick = useStable((x: number, y: number) => {
    const id = newId()
    createAndEdit(id, (ns) => addRoot(ns, x, y, '', id).nodes)
  })

  const onKeyDown = useStable((e: KeyboardEvent) => {
    if (editing) return
    const mod = e.ctrlKey || e.metaKey
    const key = e.key.toLowerCase()
    if (mod && key === 'z') {
      e.preventDefault()
      return e.shiftKey ? redo() : undo()
    }
    if (mod && key === 'y') {
      e.preventDefault()
      return redo()
    }
    if (mod || e.altKey) return
    const handled = () => e.preventDefault()
    switch (e.key) {
      case 'Tab':
        handled()
        return addChildOf(selectedId)
      case 'Enter':
        handled()
        return selectedId ? addSiblingOf(selectedId) : addChildOf(null)
      case 'F2':
      case ' ':
        if (selectedId) {
          handled()
          startEdit(selectedId)
        }
        return
      case 'Delete':
      case 'Backspace':
        if (selectedId) {
          handled()
          removeNode(selectedId)
        }
        return
      case 'ArrowUp':
      case 'ArrowDown':
      case 'ArrowLeft':
      case 'ArrowRight': {
        handled()
        if (!selectedId) return setSelectedId(nodes.find((n) => !n.pare)?.id ?? null)
        const dir = e.key.slice(5).toLowerCase() as 'up' | 'down' | 'left' | 'right'
        const next = neighbour(nodes, selectedId, dir)
        if (next) setSelectedId(next)
        return
      }
      case 'Escape':
        return setSelectedId(null)
      case '+':
      case '=':
        handled()
        return zoomBy(1)
      case '-':
        handled()
        return zoomBy(-1)
      case '0':
        handled()
        return fit()
    }
    // Typing on a selected idea starts editing it with that character
    if (selectedId && e.key.length === 1) {
      handled()
      startEdit(selectedId, e.key)
    }
  })

  return (
    <Box
      ref={areaRef}
      position='relative'
      h='calc(100dvh - 56px - env(safe-area-inset-top))'
      // clip (not hidden): focusing popovers or text boxes must never scroll the editor
      sx={{ overflow: 'clip' }}
    >
      <Canvas
        ref={canvasRef}
        nodes={nodes}
        vp={vp}
        vpRef={vpRef}
        setVp={setVp}
        selectedId={selectedId}
        editingId={editing?.id ?? null}
        editDraft={editing?.draft ?? null}
        dragIds={drag?.ids ?? null}
        dropTarget={drag?.target ?? null}
        onSelect={select}
        onTapSelected={startEdit}
        onEdit={startEdit}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onToggleFold={toggleFold}
        onBackgroundDoubleClick={onBackgroundDoubleClick}
        onCommit={commit}
        onCancel={cancel}
        onKeyDown={onKeyDown}
        ariaLabel={t('mapes.canvas_label', { defaultValue: 'Mapa mental {{title}}', title: mapa.titol })}
      />

      <EditorHeader mapa={mapa} onBeforeLeave={flush} onBeforeRemove={stopSaving} />

      {!nodes.length && (
        <Box
          position='absolute'
          inset={0}
          display='flex'
          alignItems='center'
          justifyContent='center'
          pointerEvents='none'
        >
          <ElementNotFound
            pointerEvents='auto'
            icon={icons.mapes}
            title={t('mapes.empty_map_title', { defaultValue: 'Aquest mapa està buit' })}
            desc={t('mapes.empty_map_desc', {
              defaultValue: 'Comença per la idea central i després afegeix-hi branques amb Tab o amb el botó +.',
            })}
            action={
              <Button leftIcon={<Icon as={icons.add} />} onClick={() => addChildOf(null)}>
                {t('mapes.add_central', { defaultValue: 'Afegeix la idea central' })}
              </Button>
            }
          />
        </Box>
      )}

      <Toolbar
        hasSelection={!!selected}
        color={selected ? colorOf(map, selected.id) : null}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={vp.k}
        onAddChild={() => addChildOf(selectedId)}
        onAddSibling={() => selectedId && addSiblingOf(selectedId)}
        onEdit={() => selectedId && startEdit(selectedId)}
        onDelete={() => selectedId && removeNode(selectedId)}
        onColor={setColor}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFit={fit}
      />
    </Box>
  )
}
