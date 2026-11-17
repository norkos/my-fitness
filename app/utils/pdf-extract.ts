import { toPageContent, type PdfPageContent } from '#shared/pdf-content'

export class NotAPdfError extends Error {
  constructor() {
    super('This file is not a PDF')
    this.name = 'NotAPdfError'
  }
}

/**
 * Reads the text and link annotations of the first page of a PDF in the browser.
 * pdf.js (about 1 MB) is loaded only when this runs. Its worker is a same-origin asset and pdf.js 6 uses no eval,
 * so it works under the app's `script-src 'self'` CSP.
 */
export async function extractPdfFirstPage(data: ArrayBuffer): Promise<PdfPageContent> {
  const [pdfjs, { default: workerUrl }] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

  const task = pdfjs.getDocument({ data: new Uint8Array(data) })
  try {
    let doc: Awaited<typeof task.promise>
    try {
      doc = await task.promise
    }
    catch (error) {
      if ((error as { name?: string }).name === 'InvalidPDFException') throw new NotAPdfError()
      throw error
    }
    const page = await doc.getPage(1)
    const [text, annotations] = await Promise.all([page.getTextContent(), page.getAnnotations()])
    return toPageContent(text.items, annotations)
  }
  finally {
    await task.destroy()
  }
}
