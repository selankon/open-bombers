/**
 * Saves a Blob as a file using a temporary link
 */
export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Whether the browser can share files through the Web Share API
 */
export const canShareFiles = () => {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })
  } catch {
    return false
  }
}

/**
 * Opens the system share sheet with a file. Returns false if the user cancelled.
 */
export const shareFile = async (file: File, title?: string) => {
  try {
    await navigator.share({ files: [file], title })
    return true
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return false
    throw e
  }
}
