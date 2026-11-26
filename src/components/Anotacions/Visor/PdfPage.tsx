import { Box, Skeleton } from '@chakra-ui/react'
import { CSSProperties, memo, RefObject, useEffect, useRef, useState } from 'react'
import { PDF } from '~utils/constants'
import type { PDFDocumentProxy, RenderTask, TextLayer as TextLayerType } from '../pdfjs'
import { BrushPdf, EinaPdf, PageSize, PaginaAnotacions, SeleccioPdf } from '../types'
import { PageHandlers } from './handlers'
import { NotesLayer } from './NotesLayer'
import { PageOverlay } from './PageOverlay'

type PdfPageProps = {
  doc: PDFDocumentProxy
  page: number
  size: PageSize
  // Screen px per PDF point
  scale: number
  scrollRef: RefObject<HTMLElement>
  pagina: PaginaAnotacions
  tool: EinaPdf
  brush: BrushPdf
  penSeen: boolean
  selected: SeleccioPdf | null
  openNoteId: string | null
  handlers: PageHandlers
}

// pdf.js text layer (from its pdf_viewer.css): invisible text placed over the canvas, so it can be selected
const textLayerSx = {
  position: 'absolute',
  inset: 0,
  overflow: 'clip',
  lineHeight: 1,
  textAlign: 'initial',
  textSizeAdjust: 'none',
  forcedColorAdjust: 'none',
  transformOrigin: '0 0',
  caretColor: 'CanvasText',
  // Its own layer, painted in DOM order: annotations (after it) stay on top
  zIndex: 0,
  '& span, & br': {
    color: 'transparent',
    position: 'absolute',
    whiteSpace: 'pre',
    cursor: 'text',
    transformOrigin: '0% 0%',
  },
  '& span.markedContent': { top: 0, height: 0 },
  '& ::selection': { background: 'color-mix(in srgb, var(--chakra-colors-accent) 30%, transparent)' },
  '& br::selection': { background: 'transparent' },
  '& .endOfContent': {
    display: 'block',
    position: 'absolute',
    inset: '100% 0 0',
    zIndex: 0,
    cursor: 'default',
    userSelect: 'none',
  },
} as const

/** Whether the page is close enough to the screen to be drawn */
const useNearScreen = (ref: RefObject<HTMLElement>, scrollRef: RefObject<HTMLElement>) => {
  const [near, setNear] = useState(false)
  // Watch the page against the scroll area, with a margin of one screen
  useEffect(() => {
    const el = ref.current
    if (!el || !scrollRef.current) return
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      root: scrollRef.current,
      rootMargin: `${PDF.RENDER_MARGIN * 100}% 0px`,
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, scrollRef])
  return near
}

/**
 * One page of the PDF: canvas, selectable text, annotations and notes.
 * Far pages are empty boxes of the right size (long manuals stay light).
 */
export const PdfPage = memo((props: PdfPageProps) => {
  const { doc, page, size, scale, scrollRef } = props
  const boxRef = useRef<HTMLDivElement>(null)
  const canvasHost = useRef<HTMLDivElement>(null)
  const textHost = useRef<HTMLDivElement>(null)
  const near = useNearScreen(boxRef, scrollRef)
  const [drawn, setDrawn] = useState(false)
  const textReady = useRef(false)

  // Draw the page when it gets near the screen, and again (sharper) a moment after a zoom
  useEffect(() => {
    if (!near) return
    let task: RenderTask | null = null
    let cancelled = false
    const timer = setTimeout(
      async () => {
        try {
          const pdfPage = await doc.getPage(page)
          if (cancelled) return
          const dpr = window.devicePixelRatio || 1
          let k = scale * dpr
          const pixels = size.w * k * size.h * k
          if (pixels > PDF.MAX_CANVAS_PX) k *= Math.sqrt(PDF.MAX_CANVAS_PX / pixels)
          const viewport = pdfPage.getViewport({ scale: k })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block'
          const ctx = canvas.getContext('2d')
          if (!ctx) return
          task = pdfPage.render({ canvasContext: ctx, viewport })
          await task.promise
          if (cancelled) return
          // Swap only once the new canvas is complete: no blank flash while zooming
          canvasHost.current?.replaceChildren(canvas)
          setDrawn(true)
        } catch {
          // Cancelled render (scrolled away or zoomed again): nothing to do
        }
      },
      canvasHost.current?.childElementCount ? PDF.RERENDER_DELAY : 0
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
      task?.cancel()
    }
  }, [near, scale, doc, page, size])

  // Free the canvas memory of pages far from the screen
  useEffect(() => {
    if (near) return
    const timer = setTimeout(() => {
      canvasHost.current?.replaceChildren()
      setDrawn(false)
    }, PDF.RERENDER_DELAY)
    return () => clearTimeout(timer)
  }, [near])

  // Build the selectable text once, the first time the page gets near the screen (it scales with CSS)
  useEffect(() => {
    if (!near || textReady.current) return
    let layer: TextLayerType | null = null
    let cancelled = false
    ;(async () => {
      try {
        const [{ TextLayer }, pdfPage] = await Promise.all([import('../pdfjs'), doc.getPage(page)])
        if (cancelled || !textHost.current) return
        layer = new TextLayer({
          textContentSource: pdfPage.streamTextContent(),
          container: textHost.current,
          viewport: pdfPage.getViewport({ scale: 1 }),
        })
        await layer.render()
        if (!cancelled) textReady.current = true
      } catch {
        // No text (scanned page) or cancelled: the page can still be annotated
      }
    })()
    return () => {
      cancelled = true
      if (!textReady.current) {
        layer?.cancel()
        textHost.current?.replaceChildren()
      }
    }
  }, [near, doc, page])

  const w = size.w * scale
  const h = size.h * scale
  // The text can be selected to read / copy it, or to highlight or underline it
  const selectable = props.tool === 'seleccio' || props.tool === 'text'

  return (
    <Box
      ref={boxRef}
      data-page={page}
      position='relative'
      flexShrink={0}
      w={`${w}px`}
      h={`${h}px`}
      bg='pdf.page'
      boxShadow='card'
      style={{ '--scale-factor': scale } as CSSProperties}
    >
      <Box ref={canvasHost} position='absolute' inset={0} aria-hidden />
      {!drawn && <Skeleton position='absolute' inset={0} startColor='pdf.page' endColor='surfaceMuted' />}
      <Box ref={textHost} className='textLayer' sx={textLayerSx} pointerEvents={selectable ? 'auto' : 'none'} />
      {near && (
        <>
          <PageOverlay
            page={page}
            size={size}
            scale={scale}
            pagina={props.pagina}
            tool={props.tool}
            brush={props.brush}
            penSeen={props.penSeen}
            selected={props.selected}
            handlers={props.handlers}
          />
          <NotesLayer
            page={page}
            scale={scale}
            notes={props.pagina.notes}
            openNoteId={props.openNoteId}
            interactive={props.tool === 'seleccio' || props.tool === 'nota'}
            handlers={props.handlers}
          />
        </>
      )}
    </Box>
  )
})
PdfPage.displayName = 'PdfPage'
