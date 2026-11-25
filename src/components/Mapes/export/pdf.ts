/**
 * Minimal PDF writer: one A4 page (portrait or landscape) with a JPEG picture centered on it.
 * Enough for printing a mind map, without any library.
 */

const A4 = { w: 595.28, h: 841.89 }
const MARGIN = 28

const enc = new TextEncoder()

// PDF text string in UTF-16BE (accents work in the document title)
const pdfText = (s: string) => {
  let hex = 'FEFF'
  for (const ch of s) {
    const code = ch.codePointAt(0)!
    if (code > 0xffff) continue
    hex += code.toString(16).padStart(4, '0').toUpperCase()
  }
  return `<${hex}>`
}

export const jpegToA4Pdf = (jpeg: Uint8Array, imgW: number, imgH: number, title: string) => {
  const landscape = imgW > imgH
  const pageW = landscape ? A4.h : A4.w
  const pageH = landscape ? A4.w : A4.h
  const scale = Math.min((pageW - MARGIN * 2) / imgW, (pageH - MARGIN * 2) / imgH)
  const w = imgW * scale
  const h = imgH * scale
  const x = (pageW - w) / 2
  const y = (pageH - h) / 2
  const f = (n: number) => n.toFixed(2)
  const content = `q ${f(w)} 0 0 ${f(h)} ${f(x)} ${f(y)} cm /Im0 Do Q`

  const parts: BlobPart[] = []
  const offsets: number[] = []
  let length = 0
  const push = (p: string | Uint8Array) => {
    const bytes = typeof p === 'string' ? enc.encode(p) : p
    parts.push(bytes as Uint8Array<ArrayBuffer>)
    length += bytes.length
  }
  const obj = (n: number, body: string | (string | Uint8Array)[]) => {
    offsets[n] = length
    push(`${n} 0 obj\n`)
    ;(Array.isArray(body) ? body : [body]).forEach(push)
    push('\nendobj\n')
  }

  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>')
  obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>')
  obj(
    3,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(pageW)} ${f(pageH)}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`
  )
  obj(4, `<< /Length ${enc.encode(content).length} >>\nstream\n${content}\nendstream`)
  obj(5, [
    `<< /Type /XObject /Subtype /Image /Width ${imgW} /Height ${imgH} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
    jpeg,
    '\nendstream',
  ])
  obj(6, `<< /Title ${pdfText(title)} /Producer (Open Bombers) >>`)

  const xref = length
  push(`xref\n0 7\n0000000000 65535 f \n`)
  for (let i = 1; i <= 6; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`)
  push(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`)
  return new Blob(parts, { type: 'application/pdf' })
}
