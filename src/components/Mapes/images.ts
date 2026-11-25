import { MAPA } from '~utils/constants'

/**
 * Pictures pasted or picked: downscaled and re-encoded so maps stay small enough for backups
 */

const loadImage = (url: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load error'))
    img.src = url
  })

export const imageFromFile = async (file: Blob): Promise<{ src: string; w: number; h: number }> => {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = Math.min(1, MAPA.IMAGE_MAX_PX / Math.max(img.naturalWidth, img.naturalHeight))
    const w = Math.max(1, Math.round(img.naturalWidth * scale))
    const h = Math.max(1, Math.round(img.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no canvas')
    ctx.drawImage(img, 0, 0, w, h)
    // WebP keeps transparency and is small; browsers that can't encode it fall back to JPEG
    let src = canvas.toDataURL('image/webp', MAPA.IMAGE_QUALITY)
    if (!src.startsWith('data:image/webp')) {
      ctx.globalCompositeOperation = 'destination-over'
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, h)
      src = canvas.toDataURL('image/jpeg', MAPA.IMAGE_QUALITY)
    }
    return { src, w, h }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** First picture of a paste / drop, if any */
export const imageFromData = (data: DataTransfer | null) => {
  if (!data) return null
  for (const item of Array.from(data.items || [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) return item.getAsFile()
  }
  return Array.from(data.files || []).find((f) => f.type.startsWith('image/')) ?? null
}
