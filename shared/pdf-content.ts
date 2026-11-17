// No imports: this file is also loaded directly by Node in scripts/extract-plan-fixture.mjs.

/** A piece of text on a PDF page, positioned in PDF units (origin bottom-left, y grows upwards). */
export interface PdfTextItem {
  str: string
  x: number
  y: number
  width: number
  height: number
}

/** A link annotation: the target URL and the clickable rectangle `[x1, y1, x2, y2]`. */
export interface PdfLink {
  url: string
  rect: [number, number, number, number]
}

export interface PdfPageContent {
  items: PdfTextItem[]
  links: PdfLink[]
}

interface RawTextItem {
  str?: unknown
  transform?: unknown
  width?: unknown
  height?: unknown
}

interface RawAnnotation {
  subtype?: unknown
  url?: unknown
  rect?: unknown
}

const round = (n: number) => Math.round(n * 100) / 100

/**
 * Converts pdf.js `getTextContent().items` and `getAnnotations()` output into plain positioned text and links,
 * dropping empty strings, marked-content markers and annotations that are not URL links.
 */
export function toPageContent(textItems: readonly unknown[], annotations: readonly unknown[]): PdfPageContent {
  const items: PdfTextItem[] = []
  for (const raw of textItems as RawTextItem[]) {
    if (typeof raw?.str !== 'string' || !raw.str.trim() || !Array.isArray(raw.transform)) continue
    const [, , , , x, y] = raw.transform as number[]
    items.push({
      str: raw.str,
      x: round(Number(x)),
      y: round(Number(y)),
      width: round(Number(raw.width) || 0),
      height: round(Number(raw.height) || 0),
    })
  }

  const links: PdfLink[] = []
  for (const raw of annotations as RawAnnotation[]) {
    if (raw?.subtype !== 'Link' || typeof raw.url !== 'string' || !Array.isArray(raw.rect) || raw.rect.length !== 4) continue
    const [x1, y1, x2, y2] = (raw.rect as number[]).map(n => round(Number(n)))
    links.push({ url: raw.url, rect: [x1!, y1!, x2!, y2!] })
  }
  return { items, links }
}
