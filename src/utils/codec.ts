/**
 * Compresses a string with gzip (native CompressionStream) and encodes it as base64url.
 * Falls back to plain base64url when CompressionStream is not available.
 */
export const encodeText = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text)
  if (typeof CompressionStream === 'undefined') return 'r' + toBase64Url(bytes)
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = new Uint8Array(await new Response(stream).arrayBuffer())
  return 'z' + toBase64Url(compressed)
}

/**
 * Reverses encodeText
 */
export const decodeText = async (code: string): Promise<string> => {
  const kind = code[0]
  const bytes = fromBase64Url(code.slice(1))
  if (kind === 'r') return new TextDecoder().decode(bytes)
  if (kind !== 'z') throw new Error('Unknown encoding')
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return await new Response(stream).text()
}

const toBase64Url = (bytes: Uint8Array) => {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

const fromBase64Url = (s: string) => {
  const clean = s.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(clean + '='.repeat((4 - (clean.length % 4)) % 4))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/**
 * Small, fast, non-cryptographic string hash (FNV-1a 32 bits), as hex
 */
export const hashString = (s: string) => {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}
