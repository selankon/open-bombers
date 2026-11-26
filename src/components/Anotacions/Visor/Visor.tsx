import { Box, useToast } from '@chakra-ui/react'
import { useReducedMotion } from 'framer-motion'
import { DragEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ConfirmDialog } from '~components/Layout/ConfirmDialog'
import { useEditorState } from '~components/Mapes/Editor/useEditorState'
import { findItem, moveItem, removeItem, resizeImatge, restyleItem } from '~components/Mapes/content'
import { imageFromData, imageFromFile } from '~components/Mapes/images'
import { newId } from '~components/Mapes/logic'
import { MapaColor, MapaTrace } from '~components/Mapes/types'
import { useSavedPdfs, useSavePdfs } from '~components/Temari/queries'
import { TemariPdf } from '~components/Temari/types'
import { usePdfActions } from '~components/Temari/usePdfActions'
import { PDF } from '~utils/constants'
import { useExportPdf } from '../export/useExportPdf'
import { countPagines, eraseAll, onPagina, paginaOf, removeMarca, updateMarca } from '../logic'
import type { PDFDocumentProxy } from '../pdfjs'
import { useSaveAnotacions } from '../queries'
import { BrushPdf, EinaPdf, MarcaText, MarcaTipus, PageSize, Pagines, SeleccioPdf, TextBrush } from '../types'
import { PageHandlers } from './handlers'
import { PdfPage } from './PdfPage'
import { hasTextSelection, readTextSelection } from './textSelection'
import { VisorHeader } from './VisorHeader'
import { VisorToolbar } from './VisorToolbar'

// Callback with a stable identity that always runs the latest version (keeps memoized pages from re-rendering)
const useStable = <A extends unknown[], R>(fn: (...args: A) => R) => {
  const ref = useRef(fn)
  ref.current = fn
  return useCallback((...args: A) => ref.current(...args), [])
}

type BrushTool = 'ploma' | 'subratllador' | 'forma'

const DEFAULT_BRUSHES: Record<BrushTool, BrushPdf> = {
  ploma: { color: 'blau', gruix: PDF.GRUIX.ploma[1], forma: 'rect' },
  subratllador: { color: 'groc', gruix: PDF.GRUIX.subratllador[1], forma: 'rect' },
  forma: { color: 'vermell', gruix: PDF.GRUIX.forma[1], forma: 'fletxa' },
}

// Text tool: highlights in yellow, underlines in red
const DEFAULT_TEXT_BRUSH: TextBrush = { tipus: 'ressaltat', colors: { ressaltat: 'groc', subratllat: 'vermell' } }

// Room for the floating header and the toolbars, so the first and last pages can be read whole
const TOP_PAD = 72
const BOTTOM_PAD = 168

// Fewer decimals: smaller records, same look
const round = (v: number) => Math.round(v * 10) / 10

const isTyping = () => {
  const el = document.activeElement
  return !!el && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || (el as HTMLElement).isContentEditable)
}

const clampZoom = (z: number) => Math.min(PDF.ZOOM_MAX, Math.max(PDF.ZOOM_MIN, z))

type VisorProps = {
  pdf: TemariPdf
  title: string
  subtitle: string | null
  doc: PDFDocumentProxy
  sizes: PageSize[]
  initial: Pagines
}

/**
 * PDF reader with annotations: pages, tools, zoom (buttons, ctrl + wheel, pinch), pictures,
 * notes, undo / redo and autosave
 */
export const Visor = ({ pdf, title, subtitle, doc, sizes, initial }: VisorProps) => {
  const { t } = useTranslation()
  const toast = useToast()
  const reduceMotion = useReducedMotion()
  // The reader owns the annotations once opened (later cache updates are its own saves)
  const initialContent = useMemo(() => initial, [])
  const { content, apply, patch, checkpoint, undo, redo, drop, canUndo, canRedo } =
    useEditorState<Pagines>(initialContent)
  const [tool, setToolState] = useState<EinaPdf>('seleccio')
  const [brushes, setBrushes] = useState(DEFAULT_BRUSHES)
  const [textBrush, setTextBrush] = useState(DEFAULT_TEXT_BRUSH)
  // Some text of the pages is selected (text tool): the toolbar offers to mark it
  const [hasTextSel, setHasTextSel] = useState(false)
  const [selected, setSelected] = useState<SeleccioPdf | null>(null)
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)
  const [penSeen, setPenSeen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [width, setWidth] = useState(0)
  const [page, setPage] = useState(1)
  const [isClearOpen, setIsClearOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pagesRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef(content)
  contentRef.current = content
  const toolRef = useRef(tool)
  toolRef.current = tool
  const brushesRef = useRef(brushes)
  brushesRef.current = brushes
  const textBrushRef = useRef(textBrush)
  textBrushRef.current = textBrush
  const pageRef = useRef(page)
  pageRef.current = page
  const { exportPdf, busy: exporting } = useExportPdf()
  const { download } = usePdfActions()
  const { data: savedPdfs = [] } = useSavedPdfs()
  const { mutate: saveOffline } = useSavePdfs()

  const brushTool: BrushTool = tool === 'subratllador' || tool === 'forma' ? tool : 'ploma'
  const brush = brushes[brushTool]

  // ---- Layout: page scale and where every page starts ----
  const maxPageW = useMemo(() => Math.max(1, ...sizes.map((s) => s.w)), [sizes])
  const fitW = Math.max(160, Math.min(width - PDF.GUTTER * 2, PDF.FIT_MAX_W))
  const scale = width ? (fitW * zoom) / maxPageW : 0
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const tops = useMemo(() => {
    let y = TOP_PAD
    return sizes.map((s) => {
      const top = y
      y += s.h * scale + PDF.PAGE_GAP
      return top
    })
  }, [sizes, scale])
  const topsRef = useRef(tops)
  topsRef.current = tops

  // Track the width of the reading area
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () => setWidth(el.clientWidth)
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Page shown in the header: the one crossing the upper third of the screen
  const scrollFrame = useRef(0)
  const onScroll = () => {
    cancelAnimationFrame(scrollFrame.current)
    scrollFrame.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const y = el.scrollTop + el.clientHeight / 3
      const list = topsRef.current
      let n = 1
      for (let i = 0; i < list.length && list[i] <= y; i++) n = i + 1
      if (n !== pageRef.current) setPage(n)
    })
  }

  const goToPage = useStable((n: number) => {
    scrollRef.current?.scrollTo({ top: tops[n - 1] - TOP_PAD + 4, behavior: reduceMotion ? 'auto' : 'smooth' })
  })

  // ---- Zoom, keeping the point under the fingers / mouse in place ----
  const pending = useRef<{ cx: number; cy: number; ax: number; ay: number; scale: number } | null>(null)
  const zoomTo = useStable((next: number, anchor?: { x: number; y: number }, target?: { x: number; y: number }) => {
    const el = scrollRef.current
    const z = clampZoom(next)
    if (!el || z === zoom) return
    const a = anchor ?? { x: el.clientWidth / 2, y: el.clientHeight / 2 }
    const to = target ?? a
    pending.current = { cx: el.scrollLeft + a.x, cy: el.scrollTop + a.y, ax: to.x, ay: to.y, scale }
    setZoom(z)
  })

  // After a zoom, scroll so the anchored point stays where it was
  useLayoutEffect(() => {
    const p = pending.current
    const el = scrollRef.current
    if (!p || !el || !scale) return
    pending.current = null
    const ratio = scale / p.scale
    el.scrollLeft = (p.cx - PDF.GUTTER) * ratio + PDF.GUTTER - p.ax
    el.scrollTop = (p.cy - TOP_PAD) * ratio + TOP_PAD - p.ay
  }, [scale])

  // Pinch with two fingers (CSS scale while moving, real zoom at the end) and ctrl / cmd + wheel
  useEffect(() => {
    const el = scrollRef.current
    const pages = pagesRef.current
    if (!el || !pages) return
    type Pinch = { d0: number; m0: { x: number; y: number }; m: { x: number; y: number }; f: number; z0: number }
    let pinch: Pinch | null = null
    const local = (a: Touch, b: Touch) => {
      const r = el.getBoundingClientRect()
      return { x: (a.clientX + b.clientX) / 2 - r.left, y: (a.clientY + b.clientY) / 2 - r.top }
    }
    const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) || 1
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const [a, b] = [e.touches[0], e.touches[1]]
      const m0 = local(a, b)
      pinch = { d0: dist(a, b), m0, m: m0, f: 1, z0: zoomRef.current }
      pages.style.transformOrigin = `${el.scrollLeft + m0.x}px ${el.scrollTop + m0.y}px`
    }
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return
      e.preventDefault()
      const [a, b] = [e.touches[0], e.touches[1]]
      pinch.m = local(a, b)
      pinch.f = clampZoom((pinch.z0 * dist(a, b)) / pinch.d0) / pinch.z0
      pages.style.transform = `translate(${pinch.m.x - pinch.m0.x}px, ${pinch.m.y - pinch.m0.y}px) scale(${pinch.f})`
    }
    const onEnd = (e: TouchEvent) => {
      if (!pinch || e.touches.length >= 2) return
      const p = pinch
      pinch = null
      pages.style.transform = ''
      pages.style.transformOrigin = ''
      zoomTo(p.z0 * p.f, p.m0, p.m)
    }
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * unit * 0.01), { x: e.clientX - r.left, y: e.clientY - r.top })
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
      el.removeEventListener('wheel', onWheel)
    }
  }, [zoomTo])

  // ---- Autosave ----
  const { mutateAsync: saveAnotacions } = useSaveAnotacions()
  const savedRef = useRef(initialContent)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const flush = useStable(async () => {
    clearTimeout(timer.current)
    const current = contentRef.current
    if (current === savedRef.current) return
    const previous = savedRef.current
    savedRef.current = current
    try {
      await saveAnotacions({ id: pdf.id, pagines: current })
      // Annotated PDFs are kept on the device, so the notes can always be read offline
      if (countPagines(current) && !savedPdfs.includes(pdf.id) && navigator.onLine) saveOffline({ ids: [pdf.id] })
    } catch {
      savedRef.current = previous
      if (!toast.isActive('anotacions-save-error')) {
        toast({
          id: 'anotacions-save-error',
          title: t('anotacions.save_error', { defaultValue: 'No s’han pogut desar les anotacions' }),
          description: t('anotacions.save_error_desc', {
            defaultValue:
              'Les veus a la pantalla però no s’han guardat al dispositiu. Ho tornarem a provar al proper canvi.',
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
    timer.current = setTimeout(flush, PDF.SAVE_DELAY)
  }, [content, flush])

  // Save right away when leaving the reader or hiding the app
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
  }, [flush])

  // ---- Notes: a note being edited is one undo step; a new note closed empty disappears ----
  const noteSession = useRef<{ id: string; page: number; fresh: boolean; touched: boolean } | null>(null)
  const lastNoteClose = useRef(0)

  const pageOfNote = (id: string) =>
    Number(Object.entries(contentRef.current).find(([, p]) => p.notes.some((n) => n.id === id))?.[0] ?? 0)

  const openNote = useStable((id: string | null) => {
    const s = noteSession.current
    if (s && s.id !== id) {
      const note = paginaOf(contentRef.current, s.page).notes.find((n) => n.id === s.id)
      if (s.fresh && note && !note.text.trim()) drop()
      noteSession.current = null
      lastNoteClose.current = Date.now()
    }
    if (id && noteSession.current?.id !== id) {
      noteSession.current = { id, page: pageOfNote(id), fresh: false, touched: false }
    }
    setOpenNoteId(id)
    if (id) setSelected(null)
  })

  // ---- What the pages report ----
  const erasing = useRef(false)
  const handlers = useMemo<PageHandlers>(
    () => ({
      onPenSeen: () => setPenSeen(true),
      onAddTrace: (n, punts, pressio) => {
        const eina = toolRef.current
        if (eina !== 'ploma' && eina !== 'subratllador') return
        const b = brushesRef.current[eina]
        const trace: MapaTrace = {
          id: newId(),
          node: null,
          eina,
          color: b.color,
          gruix: b.gruix,
          ...(pressio ? { pressio: true } : {}),
          punts: punts.map(([x, y, p]) => [round(x), round(y), Math.round(p * 100) / 100]),
        }
        apply(onPagina(n, (p) => ({ ...p, traces: [...p.traces, trace] })))
      },
      onAddForma: (n, f) => {
        const forma = { ...f, id: newId(), x1: round(f.x1), y1: round(f.y1), x2: round(f.x2), y2: round(f.y2) }
        apply(onPagina(n, (p) => ({ ...p, formes: [...p.formes, forma] })))
      },
      // The eraser makes one undo step, created at the first stroke it really removes
      onEraseStart: () => (erasing.current = false),
      onErase: (n, x, y, r) => {
        const fn = onPagina(n, (p) => eraseAll(p, x, y, r))
        if (fn(contentRef.current) === contentRef.current) return
        if (!erasing.current) {
          erasing.current = true
          checkpoint()
        }
        patch(fn)
      },
      onSelect: (sel) => {
        setSelected(sel)
        openNote(null)
      },
      onCheckpoint: checkpoint,
      onItemDragMove: (n, ref, dx, dy) => patch(onPagina(n, (p) => moveItem(p, ref, dx, dy))),
      onResize: (n, id, w, h) => patch(onPagina(n, (p) => resizeImatge(p, id, w, h))),
      onAddNote: (n, x, y) => {
        // The tap that closed a note doesn't create another one
        if (Date.now() - lastNoteClose.current < 400) return
        openNote(null)
        const id = newId()
        apply(
          onPagina(n, (p) => ({ ...p, notes: [...p.notes, { id, x: round(x), y: round(y), text: '', color: 'groc' }] }))
        )
        noteSession.current = { id, page: n, fresh: true, touched: false }
        setOpenNoteId(id)
        setSelected(null)
      },
      onOpenNote: openNote,
      onNoteMove: (n, id, dx, dy) =>
        patch(
          onPagina(n, (p) => ({
            ...p,
            notes: p.notes.map((note) => (note.id === id ? { ...note, x: note.x + dx, y: note.y + dy } : note)),
          }))
        ),
      onSaveNote: (n, id, changes) => {
        const s = noteSession.current
        if (s?.id === id && (s.fresh || s.touched)) s.touched = true
        else {
          checkpoint()
          noteSession.current = { id, page: n, fresh: false, touched: true }
        }
        patch(
          onPagina(n, (p) => ({
            ...p,
            notes: p.notes.map((note) => (note.id === id ? { ...note, ...changes } : note)),
          }))
        )
      },
      onRemoveNote: (n, id) => {
        const s = noteSession.current
        if (s?.id === id && s.fresh) drop()
        else apply(onPagina(n, (p) => ({ ...p, notes: p.notes.filter((note) => note.id !== id) })))
        noteSession.current = null
        lastNoteClose.current = Date.now()
        setOpenNoteId(null)
      },
    }),
    [apply, patch, checkpoint, drop, openNote]
  )

  // ---- Tools and the selected annotation ----
  const setTool = useStable((next: EinaPdf) => {
    setToolState(next)
    setSelected(null)
    openNote(null)
  })

  const onTextBrush = useStable((p: Partial<{ tipus: MarcaTipus; color: MapaColor }>) =>
    setTextBrush((b) => {
      const tipus = p.tipus ?? b.tipus
      return { tipus, colors: p.color ? { ...b.colors, [tipus]: p.color } : b.colors }
    })
  )

  const setBrush = useStable((p: Partial<BrushPdf>) =>
    setBrushes((b) => ({ ...b, [brushTool]: { ...b[brushTool], ...p } }))
  )

  const selectedPagina = selected ? paginaOf(content, selected.page) : null
  const item =
    !selected || !selectedPagina
      ? undefined
      : selected.kind === 'marca'
        ? selectedPagina.marques.find((m) => m.id === selected.id)
        : findItem(selectedPagina, { kind: selected.kind, id: selected.id })
  // An undo can remove the selected annotation
  const activeSelection = item ? selected : null
  const marca = selected?.kind === 'marca' ? (item as MarcaText | undefined) : undefined

  const restyle = useStable((p: { color?: MapaColor; gruix?: number; tipus?: MarcaTipus }) => {
    if (!selected) return
    const { kind, id } = selected
    if (kind === 'marca') {
      const { color, tipus } = p
      return apply(
        onPagina(selected.page, (pg) => updateMarca(pg, id, { ...(color && { color }), ...(tipus && { tipus }) }))
      )
    }
    apply(onPagina(selected.page, (pg) => restyleItem(pg, { kind, id }, p)))
  })
  const removeSelected = useStable(() => {
    if (!selected) return
    const { kind, id } = selected
    apply(onPagina(selected.page, (pg) => (kind === 'marca' ? removeMarca(pg, id) : removeItem(pg, { kind, id }))))
    setSelected(null)
  })

  // ---- Text tool: the selected text becomes a highlight or an underline ----
  const markSelection = useStable(() => {
    const bySelection = readTextSelection(pagesRef.current, sizes)
    const pages = Object.keys(bySelection).map(Number)
    window.getSelection()?.removeAllRanges()
    setHasTextSel(false)
    if (!pages.length) return
    const { tipus, colors } = textBrushRef.current
    const add = (n: number) =>
      onPagina(n, (p) => ({
        ...p,
        marques: [...p.marques, { id: newId(), tipus, color: colors[tipus], ...bySelection[n] }],
      }))
    // One undo step, even when the selection spans several pages
    if (pages.length === 1) return apply(add(pages[0]))
    checkpoint()
    pages.forEach((n) => patch(add(n)))
  })

  // While the text tool is on: follow the selection (for the toolbar) and, with a mouse, mark on release
  useEffect(() => {
    if (tool !== 'text') return
    let timer: ReturnType<typeof setTimeout> | undefined
    let mouseInPages = false
    const onSelectionChange = () => {
      clearTimeout(timer)
      timer = setTimeout(() => setHasTextSel(hasTextSelection(pagesRef.current)), PDF.SELECTION_DEBOUNCE)
    }
    const onDown = (e: PointerEvent) => {
      mouseInPages = e.pointerType === 'mouse' && e.button === 0 && !!pagesRef.current?.contains(e.target as Node)
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !mouseInPages) return
      mouseInPages = false
      // After the browser has finished the selection (double click selects a word)
      setTimeout(() => hasTextSelection(pagesRef.current) && markSelection())
    }
    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('pointerdown', onDown, true)
    document.addEventListener('pointerup', onUp, true)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('pointerdown', onDown, true)
      document.removeEventListener('pointerup', onUp, true)
      setHasTextSel(false)
    }
  }, [tool, markSelection])

  // ---- Pictures: placed on the page in view, in the middle of its visible part ----
  const insertImage = useStable(async (file: Blob) => {
    try {
      const img = await imageFromFile(file)
      const n = pageRef.current
      const size = sizes[n - 1]
      const w = Math.min(size.w * PDF.IMAGE_PAGE_SHARE, img.w)
      const h = (w * img.h) / img.w
      let cy = size.h / 2
      const pageEl = scrollRef.current?.querySelector(`[data-page="${n}"]`)
      const area = scrollRef.current?.getBoundingClientRect()
      if (pageEl && area) {
        const r = pageEl.getBoundingClientRect()
        const mid = (Math.max(r.top, area.top) + Math.min(r.bottom, area.bottom)) / 2
        cy = ((mid - r.top) / r.height) * size.h
      }
      const id = newId()
      const imatge = {
        id,
        src: img.src,
        w: round(w),
        h: round(h),
        x: round((size.w - w) / 2),
        y: round(Math.min(Math.max(0, cy - h / 2), Math.max(0, size.h - h))),
      }
      apply(onPagina(n, (p) => ({ ...p, imatges: [...p.imatges, imatge] })))
      setToolState('seleccio')
      setSelected({ page: n, kind: 'imatge', id })
    } catch {
      toast({
        title: t('anotacions.image_error', { defaultValue: 'No s’ha pogut afegir la imatge' }),
        description: t('anotacions.image_error_desc', {
          defaultValue: 'Prova amb una altra imatge (PNG, JPG o WebP) o fes-ne una captura de pantalla.',
        }),
        status: 'error',
        duration: 5000,
        isClosable: true,
      })
    }
  })

  // Paste pictures from the clipboard (Ctrl+V) anywhere in the reader
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
    if (isTyping() || openNoteId) return
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
    switch (e.key) {
      case 'Escape':
        if (tool !== 'seleccio') return setTool('seleccio')
        return setSelected(null)
      case 'Delete':
      case 'Backspace':
        if (!activeSelection) return
        e.preventDefault()
        return removeSelected()
      case '+':
      case '=':
        e.preventDefault()
        return zoomTo(zoom * PDF.ZOOM_STEP)
      case '-':
        e.preventDefault()
        return zoomTo(zoom / PDF.ZOOM_STEP)
      case '0':
        e.preventDefault()
        return zoomTo(1)
    }
  })

  // Reader shortcuts (undo, delete, zoom, Esc) while no text box has the focus
  useEffect(() => {
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  // ---- Menu actions ----
  const onExport = async () => {
    await flush()
    exportPdf(pdf, contentRef.current)
  }

  const onClear = () => {
    apply(() => ({}))
    setSelected(null)
    setOpenNoteId(null)
    noteSession.current = null
    setIsClearOpen(false)
    toast({
      title: t('anotacions.cleared', { defaultValue: 'Anotacions esborrades. Pots desfer-ho amb Desfés.' }),
      status: 'success',
      duration: 3000,
    })
  }

  const itemWidths =
    selected?.kind === 'trace'
      ? PDF.GRUIX[(item as MapaTrace | undefined)?.eina ?? 'ploma']
      : selected?.kind === 'forma'
        ? PDF.GRUIX.forma
        : []

  return (
    <Box
      position='relative'
      h='calc(100dvh - 56px - env(safe-area-inset-top))'
      bg='pdf.canvas'
      // clip (not hidden): focusing popovers or text boxes must never scroll the reader
      sx={{ overflow: 'clip' }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Box
        ref={scrollRef}
        position='absolute'
        inset={0}
        overflow='auto'
        onScroll={onScroll}
        sx={{ overscrollBehavior: 'contain' }}
        aria-label={t('anotacions.reader_label', { defaultValue: 'Pàgines de {{title}}', title })}
        role='region'
      >
        <Box
          ref={pagesRef}
          w='max-content'
          minW='100%'
          pt={`${TOP_PAD}px`}
          pb={`${BOTTOM_PAD}px`}
          px={`${PDF.GUTTER}px`}
          sx={{ '& > [data-page]': { mx: 'auto', mb: `${PDF.PAGE_GAP}px` } }}
          // A tap on a page (not on an annotation) drops the selection
          onPointerDown={() => selected && tool === 'seleccio' && setSelected(null)}
        >
          {scale > 0 &&
            sizes.map((size, i) => {
              const n = i + 1
              return (
                <PdfPage
                  key={n}
                  doc={doc}
                  page={n}
                  size={size}
                  scale={scale}
                  scrollRef={scrollRef}
                  pagina={paginaOf(content, n)}
                  tool={tool}
                  brush={brush}
                  penSeen={penSeen}
                  selected={activeSelection?.page === n ? activeSelection : null}
                  openNoteId={openNoteId}
                  handlers={handlers}
                />
              )
            })}
        </Box>
      </Box>

      <VisorHeader
        title={title}
        subtitle={subtitle}
        page={page}
        total={sizes.length}
        onGoToPage={goToPage}
        hasAnnotations={countPagines(content) > 0}
        onExport={onExport}
        exporting={exporting}
        onDownloadOriginal={() => download(pdf)}
        onClear={() => setIsClearOpen(true)}
      />

      <VisorToolbar
        tool={tool}
        onTool={setTool}
        onImage={() => fileRef.current?.click()}
        brush={brush}
        onBrush={setBrush}
        textBrush={textBrush}
        onTextBrush={onTextBrush}
        hasTextSelection={hasTextSel}
        onMarkSelection={markSelection}
        marcaTipus={marca?.tipus ?? null}
        selected={activeSelection}
        itemColor={(item as { color?: MapaColor } | undefined)?.color ?? null}
        itemGruix={(item as { gruix?: number } | undefined)?.gruix ?? null}
        itemWidths={itemWidths}
        onItemStyle={restyle}
        onDelete={removeSelected}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        zoom={zoom}
        onZoomIn={() => zoomTo(zoom * PDF.ZOOM_STEP)}
        onZoomOut={() => zoomTo(zoom / PDF.ZOOM_STEP)}
        onFitWidth={() => zoomTo(1)}
      />

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

      <ConfirmDialog
        isOpen={isClearOpen}
        onClose={() => setIsClearOpen(false)}
        onConfirm={onClear}
        isDestructive
        title={t('anotacions.clear_title', { defaultValue: 'Esborrar totes les anotacions?' })}
        body={t('anotacions.clear_body_all', {
          defaultValue:
            'S’esborraran els traços, els ressaltats, les formes, les imatges i les notes de totes les pàgines d’aquest PDF. El PDF original no es toca, i mentre no surtis del lector ho pots desfer amb Desfés.',
        })}
        confirmLabel={t('anotacions.clear_confirm', { defaultValue: 'Esborra-ho tot' })}
      />
    </Box>
  )
}
