// The legacy build ships its own polyfills, so the reader also works on older Safari / Android WebViews
import { getDocument, GlobalWorkerOptions, PDFWorker } from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'

export type { PDFDocumentProxy, PDFPageProxy, RenderTask } from 'pdfjs-dist/legacy/build/pdf.mjs'
export { TextLayer } from 'pdfjs-dist/legacy/build/pdf.mjs'

// The worker is a precached asset of the app, so it also works offline
GlobalWorkerOptions.workerSrc = workerUrl

// One worker for every PDF opened (otherwise each document starts its own)
let worker: PDFWorker | null = null
const sharedWorker = () => {
  if (!worker || worker.destroyed) worker = new PDFWorker()
  return worker
}

/** Opens a PDF from its bytes */
export const openPdf = (data: ArrayBuffer) =>
  getDocument({ data: new Uint8Array(data), worker: sharedWorker(), isEvalSupported: false, enableXfa: false }).promise
