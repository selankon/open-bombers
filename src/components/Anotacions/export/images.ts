import { canvasBlob } from '~components/Mapes/export/render'
import { PDF } from '~utils/constants'
import { PdfImageData } from './burn'

const mimeOf = (dataUrl: string) => dataUrl.match(/^data:([^;,]+)/)?.[1]?.toLowerCase() ?? ''

const isOpaque = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const data = ctx.getImageData(0, 0, w, h).data
  for (let i = 3; i < data.length; i += 4) if (data[i] < 255) return false
  return true
}

/**
 * Picture data URL → something pdf-lib can embed. PNG and JPEG go as they are; anything else
 * (WebP) is redrawn on a canvas: JPEG when it's opaque (smaller), PNG when it has transparency.
 */
export const imageForPdf = async (src: string): Promise<PdfImageData | null> => {
  const mime = mimeOf(src)
  if (mime === 'image/png') return { data: src, kind: 'png' }
  if (mime === 'image/jpeg' || mime === 'image/jpg') return { data: src, kind: 'jpg' }

  const img = new Image()
  img.src = src
  try {
    await img.decode()
  } catch {
    // A broken picture shouldn't stop the export of everything else
    return null
  }
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const opaque = isOpaque(ctx, w, h)
  const blob = opaque
    ? await canvasBlob(canvas, 'image/jpeg', PDF.EXPORT_JPEG_QUALITY)
    : await canvasBlob(canvas, 'image/png')
  return { data: new Uint8Array(await blob.arrayBuffer()), kind: opaque ? 'jpg' : 'png' }
}
