import { Box, Button, Icon, useToast } from '@chakra-ui/react'
import { DragEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ElementNotFound } from '~components/Layout/ElementNotFound'
import { icons } from '~theme/icons'
import { MAPA } from '~utils/constants'
import {
  contentBounds,
  eraseAt,
  findItem,
  makeTrace,
  moveItem,
  onNodes,
  placeImatge,
  removeItem,
  removeNodeContent,
  resizeImatge,
  restyleItem,
} from '../content'
import { useExportMapa } from '../export/useExportMapa'
import { imageFromData, imageFromFile } from '../images'
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
  rootOf,
  growSide,
  setBoxSize,
  BoxSize,
  setBranchColor,
  subtreeIds,
  toWorld,
  updateNode,
} from '../logic'
import { useSaveMapaContent } from '../queries'
import {
  BrancaStyle,
  ItemRef,
  MapaColor,
  MapaContingut,
  MapaForma,
  MapaMental,
  MapaNode,
  MapaTrace,
  NodeColor,
  NodeSizes,
  Tool,
} from '../types'
import { Brush, Canvas, CanvasHandle } from './Canvas'
import { EditorHeader } from './EditorHeader'
import { StylePanel } from './StylePanel'
import { ContextBar, ToolRail } from './Toolbar'
import { useEditorState } from './useEditorState'
import { useViewport } from './useViewport'

// Callback with a stable identity that always runs the latest version (keeps memoized nodes from re-rendering)
const useStable = <A extends unknown[], R>(fn: (...args: A) => R) => {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: A) => ref.current(...args), [])
}

type BrushTool = 'ploma' | 'subratllador' | 'forma'

const DEFAULT_BRUSHES: Record<BrushTool, Brush> = {
  ploma: { color: 'tinta', gruix: MAPA.GRUIX.ploma[1], forma: 'rect' },
  subratllador: { color: 'groc', gruix: MAPA.GRUIX.subratllador[1], forma: 'rect' },
  forma: { color: 'tinta', gruix: MAPA.GRUIX.forma[1], forma: 'rect' },
}

const contentOf = (m: MapaMental): MapaContingut => ({
  nodes: m.nodes,
  traces: m.traces,
  formes: m.formes,
  imatges: m.imatges,
})

const isTyping = () => {
  const el = document.activeElement
  return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || (el as HTMLElement).isContentEditable)
}

/**
 * Mind map editor: canvas, tools, keyboard shortcuts, pictures, export and autosave
 */
export const MapaEditor = ({ mapa }: { mapa: MapaMental }) => {
  const { t } = useTranslation()
  const toast = useToast()
  // The editor owns the content once opened (later cache updates are its own saves)
  const initial = useMemo(() => contentOf(mapa), [])
  const { content, apply, patch, checkpoint, undo, redo, drop, canUndo, canRedo } = useEditorState(initial)
  const nodes = content.nodes
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<ItemRef | null>(null)
  const [editing, setEditing] = useState<{ id: string; draft: string | null } | null>(null)
  const [labelEditingId, setLabelEditingId] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ ids: Set<string>; target: string | null } | null>(null)
  const [tool, setToolState] = useState<Tool>('seleccio')
  // Style panel of the selected idea (also opened with Ctrl+E)
  const [styleOpen, setStyleOpen] = useState(false)
  const [brushes, setBrushes] = useState(DEFAULT_BRUSHES)
  // Node just created: its first text joins the creation in the undo history
  const freshId = useRef<string | null>(null)
  const areaRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<CanvasHandle>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { vp, vpRef, setVp, size, zoomBy } = useViewport(areaRef)
  const contentRef = useRef(content)
  contentRef.current = content
  const { exportMapa, busy: exporting } = useExportMapa()

  const map = useMemo(() => byId(nodes), [nodes])
  const selected = selectedId ? map[selectedId] : undefined
  const brushTool: BrushTool = tool === 'subratllador' || tool === 'forma' ? tool : 'ploma'
  const brush = brushes[brushTool]

  // ---- Measured node sizes (batched once per frame) ----
  const sizesRef = useRef<NodeSizes>({})
  const [sizes, setSizes] = useState<NodeSizes>({})
  const sizeFrame = useRef(0)
  const onSize = useCallback((id: string, w: number, h: number) => {
    const prev = sizesRef.current[id]
    if (prev && prev.w === w && prev.h === h) return
    sizesRef.current = { ...sizesRef.current, [id]: { w, h } }
    cancelAnimationFrame(sizeFrame.current)
    sizeFrame.current = requestAnimationFrame(() => setSizes(sizesRef.current))
  }, [])

  // ---- Autosave ----
  const { mutateAsync: saveContent } = useSaveMapaContent()
  const savedRef = useRef(initial)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  // The map is being deleted: nothing more to save
  const removed = useRef(false)
  const stopSaving = useStable(() => {
    removed.current = true
    clearTimeout(timer.current)
  })

  const flush = useStable(async () => {
    clearTimeout(timer.current)
    const current = contentRef.current
    if (removed.current || current === savedRef.current) return
    const previous = savedRef.current
    savedRef.current = current
    try {
      await saveContent({ id: mapa.id, ...current })
    } catch {
      savedRef.current = previous
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
    if (content === savedRef.current) return
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, MAPA.SAVE_DELAY)
  }, [content, flush])

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
  const fit = useStable(() => setVp(fitViewport(contentBounds(contentRef.current, sizesRef.current), size.w, size.h)))

  // Centers the main idea of the selected branch (or of the map) keeping the zoom
  const center = useStable(() => {
    const c = contentRef.current
    const root = (selectedId && rootOf(byId(c.nodes), selectedId)) || c.nodes.find((n) => !n.pare)
    if (root) return setVp((v) => centerOn(v, root.x, root.y, size.w, size.h))
    const b = contentBounds(c, sizesRef.current)
    if (b) setVp((v) => centerOn(v, (b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, size.w, size.h))
  })

  // Show the whole map once the canvas has a size (or its main idea, when the whole map would be too small)
  useEffect(() => {
    if (fitted.current || !size.w || !size.h) return
    fitted.current = true
    const all = fitViewport(contentBounds(contentRef.current, sizesRef.current), size.w, size.h)
    const root = contentRef.current.nodes.find((n) => !n.pare)
    if (all.k >= MAPA.READABLE_ZOOM || !root) return setVp(all)
    setVp(centerOn({ x: 0, y: 0, k: MAPA.READABLE_ZOOM }, root.x, root.y, size.w, size.h))
  }, [size, setVp])

  // Keep the selected node in view (new nodes, keyboard navigation)
  useEffect(() => {
    if (!selected || drag) return
    if (isOffscreen(vpRef.current, selected.x, selected.y, size.w, size.h)) {
      setVp((v) => centerOn(v, selected.x, selected.y, size.w, size.h))
    }
  }, [selectedId])

  // Close the style panel when the selection changes
  useEffect(() => setStyleOpen(false), [selectedId])

  // ---- Selection and tools ----
  const keepFocus = () =>
    requestAnimationFrame(() => {
      const active = document.activeElement
      if (!active || active === document.body) canvasRef.current?.focus()
    })

  const select = useStable((id: string | null) => {
    setSelectedId(id)
    if (id) setSelectedItem(null)
    if (editing && editing.id !== id) setEditing(null)
  })

  const selectItem = useStable((ref: ItemRef | null) => {
    setSelectedItem(ref)
    if (ref) {
      setSelectedId(null)
      setEditing(null)
    }
  })

  const setTool = useStable((next: Tool) => {
    setToolState(next)
    setSelectedItem(null)
    setEditing(null)
    setLabelEditingId(null)
    if (next !== 'seleccio') setSelectedId(null)
    canvasRef.current?.focus()
  })

  const setBrush = useStable((p: Partial<Brush>) =>
    setBrushes((b) => ({ ...b, [brushTool]: { ...b[brushTool], ...p } }))
  )

  const startEdit = useStable((id: string, draft: string | null = null) => {
    setSelectedId(id)
    setSelectedItem(null)
    setEditing({ id, draft })
  })

  // ---- Ideas ----
  const createAndEdit = (id: string, make: (ns: MapaNode[]) => MapaNode[]) => {
    apply(onNodes(make))
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
    apply((c) => removeNodeContent(c, id))
    setEditing(null)
    setSelectedId(parent)
    keepFocus()
  })

  const commit = useStable((id: string, text: string, next?: 'child' | 'sibling') => {
    if (editing?.id !== id) return
    setEditing(null)
    keepFocus()
    const node = contentRef.current.nodes.find((n) => n.id === id)
    if (!node) return
    const value = text.trim()
    const hasChildren = contentRef.current.nodes.some((n) => n.pare === id)
    if (freshId.current === id) {
      freshId.current = null
      if (!value && !hasChildren) {
        // A new idea left empty disappears without leaving an undo step
        drop()
        setSelectedId(node.pare)
        return
      }
      patch(onNodes((ns) => updateNode(ns, id, { text: value })))
    } else if (value !== node.text) {
      apply(onNodes((ns) => updateNode(ns, id, { text: value })))
    }
    if (next === 'child') addChildOf(id)
    else if (next === 'sibling') addSiblingOf(id)
  })

  const cancel = useStable((id: string) => {
    if (editing?.id !== id) return
    setEditing(null)
    const node = contentRef.current.nodes.find((n) => n.id === id)
    if (freshId.current === id) {
      freshId.current = null
      drop()
      setSelectedId(node?.pare ?? null)
    }
    keepFocus()
  })

  const toggleFold = useStable((id: string) => {
    const node = map[id]
    if (node) apply(onNodes((ns) => updateNode(ns, id, { plegat: !node.plegat })))
  })

  // Dragging in the color picker or a slider of the style panel: the whole drag is a single undo step
  const pickingColor = useRef(false)
  const setColor = useStable((c: NodeColor) => {
    pickingColor.current = false
    if (selectedId) apply(onNodes((ns) => setBranchColor(ns, selectedId, c)))
  })
  const previewColor = useStable((c: NodeColor) => {
    if (!selectedId) return
    if (!pickingColor.current) {
      pickingColor.current = true
      checkpoint()
    }
    patch(onNodes((ns) => setBranchColor(ns, selectedId, c)))
  })
  const endColorPreview = useStable(() => (pickingColor.current = false))
  // Size sliders: wider boxes grow away from the parent, taller ones on both sides
  const previewBox = useStable((size: BoxSize) => {
    if (!selectedId) return
    const node = map[selectedId]
    if (!node) return
    if (!pickingColor.current) {
      pickingColor.current = true
      checkpoint()
    }
    const measured = sizesRef.current[node.id]
    const x =
      size.ample === undefined
        ? node.x
        : node.x + ((size.ample - (node.ample ?? measured?.w ?? size.ample)) / 2) * growSide(map, node.id)
    patch(onNodes((ns) => setBoxSize(ns, node.id, size, { x, y: node.y })))
  })
  const resetBox = useStable(() => {
    pickingColor.current = false
    if (selectedId) apply(onNodes((ns) => setBoxSize(ns, selectedId, null)))
  })

  const setNodeStyle = useStable((p: Partial<Pick<MapaNode, 'forma' | 'emplenat' | 'mida'>>) => {
    if (selectedId) apply(onNodes((ns) => updateNode(ns, selectedId, p)))
  })

  const setBranca = (id: string, p: Partial<BrancaStyle>) =>
    apply(
      onNodes((ns) => {
        const node = ns.find((n) => n.id === id)
        if (!node) return ns
        const branca: BrancaStyle = { ...node.branca, ...p }
        if (!branca.text?.trim()) delete branca.text
        if (!branca.fletxa) delete branca.fletxa
        return updateNode(ns, id, { branca: Object.keys(branca).length ? branca : undefined })
      })
    )

  // ---- Labels on lines ----
  const editLabel = useStable((id: string) => {
    if (!contentRef.current.nodes.find((n) => n.id === id)?.pare) return
    setSelectedId(id)
    setLabelEditingId(id)
  })
  const commitLabel = useStable((id: string, text: string) => {
    setLabelEditingId(null)
    if ((map[id]?.branca?.text ?? '') !== text.trim()) setBranca(id, { text: text.trim() })
    keepFocus()
  })
  const cancelLabel = useStable(() => {
    setLabelEditingId(null)
    keepFocus()
  })

  // ---- Dragging ----
  const onDragStart = useStable((id: string) => {
    checkpoint()
    setSelectedId(id)
    setDrag({ ids: subtreeIds(contentRef.current.nodes, id), target: null })
  })
  const onDragMove = useStable((id: string, dx: number, dy: number, target: string | null) => {
    patch(onNodes((ns) => moveSubtree(ns, id, dx, dy)))
    setDrag((d) => (d && d.target !== target ? { ...d, target } : d))
  })
  const onDragEnd = useStable((id: string, target: string | null) => {
    if (target) patch(onNodes((ns) => attachTo(ns, id, target)))
    setDrag(null)
  })
  const onItemDragStart = useStable(() => checkpoint())
  const onItemDragMove = useStable((ref: ItemRef, dx: number, dy: number) => patch((c) => moveItem(c, ref, dx, dy)))
  const onResize = useStable((id: string, w: number, h: number) => patch((c) => resizeImatge(c, id, w, h)))
  // Dragging a corner patches (after onResizeStart's checkpoint); a double click resets the size as one step
  const onNodeBox = useStable((id: string, size: BoxSize | null, at?: { x: number; y: number }) =>
    (size ? patch : apply)(onNodes((ns) => setBoxSize(ns, id, size, at)))
  )

  const onBackgroundDoubleClick = useStable((x: number, y: number) => {
    const id = newId()
    createAndEdit(id, (ns) => addRoot(ns, x, y, '', id).nodes)
  })

  // ---- Drawing ----
  const onAddTrace = useStable((punts: [number, number, number][], pressio: boolean) => {
    if (tool !== 'ploma' && tool !== 'subratllador') return
    const base: Omit<MapaTrace, 'node' | 'punts'> = {
      id: newId(),
      eina: tool,
      color: brush.color,
      gruix: brush.gruix,
      ...(pressio ? { pressio: true } : {}),
    }
    apply((c) => ({ ...c, traces: [...c.traces, makeTrace(base, punts, c.nodes, sizesRef.current)] }))
  })

  const onAddForma = useStable((f: Omit<MapaForma, 'id'>) => {
    const round = (v: number) => Math.round(v * 10) / 10
    const forma: MapaForma = { ...f, id: newId(), x1: round(f.x1), y1: round(f.y1), x2: round(f.x2), y2: round(f.y2) }
    apply((c) => ({ ...c, formes: [...c.formes, forma] }))
  })

  // The eraser makes one undo step, created at the first stroke it really removes
  const erasing = useRef(false)
  const onEraseStart = useStable(() => (erasing.current = false))
  const onErase = useStable((x: number, y: number, r: number) => {
    const next = eraseAt(contentRef.current, x, y, r)
    if (next === contentRef.current) return
    if (!erasing.current) {
      erasing.current = true
      checkpoint()
    }
    patch((c) => eraseAt(c, x, y, r))
  })

  // ---- Drawings selected with the selection tool ----
  const item = selectedItem ? findItem(content, selectedItem) : undefined
  // An undo can remove the selected drawing
  const activeItem = item ? selectedItem : null
  const restyle = useStable(
    (p: { color?: MapaColor; gruix?: number }) => selectedItem && apply((c) => restyleItem(c, selectedItem, p))
  )
  const removeSelectedItem = useStable(() => {
    if (!selectedItem) return
    apply((c) => removeItem(c, selectedItem))
    setSelectedItem(null)
    keepFocus()
  })

  // ---- Pictures ----
  const insertImage = useStable(async (file: Blob) => {
    try {
      const img = await imageFromFile(file)
      const place = placeImatge(vpRef.current, size, img.w, img.h)
      const id = newId()
      apply((c) => ({ ...c, imatges: [...c.imatges, { id, src: img.src, ...place }] }))
      setToolState('seleccio')
      selectItem({ kind: 'imatge', id })
    } catch {
      toast({
        title: t('mapes.image_error', { defaultValue: 'No s’ha pogut afegir la imatge' }),
        description: t('mapes.image_error_desc', {
          defaultValue: 'Prova amb una altra imatge (PNG, JPG o WebP) o fes-ne una captura de pantalla.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  })

  // Paste pictures from the clipboard (Ctrl+V) anywhere in the editor
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping()) return
      const file = imageFromData(e.clipboardData)
      if (!file) return
      e.preventDefault()
      insertImage(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [insertImage])

  const onDrop = (e: DragEvent) => {
    const file = imageFromData(e.dataTransfer)
    if (!file) return
    e.preventDefault()
    insertImage(file)
  }

  // ---- Keyboard ----
  const onKeyDown = useStable((e: KeyboardEvent) => {
    if (editing || labelEditingId) return
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
    if (mod && key === 'e') {
      e.preventDefault()
      if (tool === 'seleccio' && selectedId) setStyleOpen(true)
      return
    }
    if (mod || e.altKey) return
    const handled = () => e.preventDefault()
    if (e.key === 'Escape') {
      if (tool !== 'seleccio') return setTool('seleccio')
      setSelectedItem(null)
      return setSelectedId(null)
    }
    if (selectedItem && (e.key === 'Delete' || e.key === 'Backspace')) {
      handled()
      return removeSelectedItem()
    }
    switch (e.key) {
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
      case 'Home':
        handled()
        return center()
    }
    if (tool !== 'seleccio') return
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
    }
    // Typing on a selected idea starts editing it with that character
    if (selectedId && e.key.length === 1) {
      handled()
      startEdit(selectedId, e.key)
    }
  })

  const itemWidths =
    selectedItem?.kind === 'trace'
      ? MAPA.GRUIX[(item as MapaTrace | undefined)?.eina ?? 'ploma']
      : selectedItem?.kind === 'forma'
        ? MAPA.GRUIX.forma
        : []

  return (
    <Box
      ref={areaRef}
      position='relative'
      h='calc(100dvh - 56px - env(safe-area-inset-top))'
      // clip (not hidden): focusing popovers or text boxes must never scroll the editor
      sx={{ overflow: 'clip' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Canvas
        ref={canvasRef}
        content={content}
        sizes={sizes}
        vp={vp}
        vpRef={vpRef}
        setVp={setVp}
        tool={tool}
        brush={brush}
        selectedId={selectedId}
        selectedItem={activeItem}
        editingId={editing?.id ?? null}
        editDraft={editing?.draft ?? null}
        labelEditingId={labelEditingId}
        dragIds={drag?.ids ?? null}
        dropTarget={drag?.target ?? null}
        onSize={onSize}
        onSelect={select}
        onSelectItem={selectItem}
        onTapSelected={startEdit}
        onEdit={startEdit}
        onDragStart={onDragStart}
        onDragMove={onDragMove}
        onDragEnd={onDragEnd}
        onItemDragStart={onItemDragStart}
        onItemDragMove={onItemDragMove}
        onResizeStart={checkpoint}
        onResize={onResize}
        onNodeBox={onNodeBox}
        onToggleFold={toggleFold}
        onBackgroundDoubleClick={onBackgroundDoubleClick}
        onCommit={commit}
        onCancel={cancel}
        onEditLabel={editLabel}
        onCommitLabel={commitLabel}
        onCancelLabel={cancelLabel}
        onAddTrace={onAddTrace}
        onAddForma={onAddForma}
        onEraseStart={onEraseStart}
        onErase={onErase}
        onKeyDown={onKeyDown}
        ariaLabel={t('mapes.canvas_label', { defaultValue: 'Mapa mental {{title}}', title: mapa.titol })}
      />

      <EditorHeader
        mapa={mapa}
        onBeforeLeave={flush}
        onBeforeRemove={stopSaving}
        onExport={(kind) => exportMapa(kind, mapa.titol, contentRef.current, sizesRef.current)}
        exporting={exporting}
      />

      {!nodes.length && !content.traces.length && !content.formes.length && !content.imatges.length && (
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

      <ToolRail tool={tool} onTool={setTool} onImage={() => fileRef.current?.click()} onCenter={center} />
      <input
        ref={fileRef}
        type='file'
        accept='image/*'
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) insertImage(file)
          e.target.value = ''
        }}
      />

      <ContextBar
        tool={tool}
        brush={brush}
        onBrush={setBrush}
        hasSelection={!!selected}
        itemSelected={activeItem?.kind ?? null}
        itemColor={(item as { color?: MapaColor } | undefined)?.color ?? null}
        itemGruix={(item as { gruix?: number } | undefined)?.gruix ?? null}
        itemWidths={itemWidths}
        onItemStyle={restyle}
        stylePanel={
          selected && (
            <StylePanel
              node={selected}
              color={colorOf(map, selected.id)}
              isRoot={!selected.pare}
              onColor={setColor}
              onColorPreview={previewColor}
              onColorPreviewEnd={endColorPreview}
              width={selected.ample ?? sizes[selected.id]?.w ?? MAPA.NODE_W}
              height={selected.alt ?? sizes[selected.id]?.h ?? MAPA.NODE_H}
              onBoxReset={resetBox}
              onBoxPreview={previewBox}
              onNode={setNodeStyle}
              onBranca={(p) => setBranca(selected.id, p)}
              onEditLabel={() => editLabel(selected.id)}
            />
          )
        }
        styleOpen={styleOpen && !!selected}
        onStyleOpen={() => setStyleOpen(true)}
        onStyleClose={() => {
          setStyleOpen(false)
          keepFocus()
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        zoom={vp.k}
        onAddChild={() => addChildOf(selectedId)}
        onAddSibling={() => selectedId && addSiblingOf(selectedId)}
        onEdit={() => selectedId && startEdit(selectedId)}
        onDelete={() => (activeItem ? removeSelectedItem() : selectedId && removeNode(selectedId))}
        onUndo={undo}
        onRedo={redo}
        onZoomIn={() => zoomBy(1)}
        onZoomOut={() => zoomBy(-1)}
        onFit={fit}
        onCenter={center}
      />
    </Box>
  )
}
