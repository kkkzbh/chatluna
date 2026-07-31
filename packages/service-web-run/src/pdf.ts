import { createCanvas, DOMMatrix, ImageData, Path2D } from '@napi-rs/canvas'
import { webError, WebRunError } from './error'
import type { ScreenshotArtifact, StagedArtifact } from './types'

Object.assign(globalThis, { DOMMatrix, ImageData, Path2D })

export class PdfRenderer {
    async render(
        pdf: Buffer,
        pageno: number,
        source: {
            sourceRefId?: string
            title: string
            url: string
            canonicalUrl: string
        }
    ): Promise<StagedArtifact> {
        try {
            const { getDocument } =
                await import('pdfjs-dist/legacy/build/pdf.mjs')
            const loadingTask = getDocument({
                data: new Uint8Array(pdf),
                useSystemFonts: true
            })
            const document = await loadingTask.promise
            if (pageno >= document.numPages) {
                await loadingTask.destroy()
                throw webError({
                    operation: 'screenshot',
                    stage: 'render',
                    code: 'invalid_page_number',
                    message: `PDF page ${pageno} does not exist; page count is ${document.numPages}`
                })
            }

            const page = await document.getPage(pageno + 1)
            const viewport = page.getViewport({ scale: 1.5 })
            const canvas = createCanvas(
                Math.ceil(viewport.width),
                Math.ceil(viewport.height)
            )
            await page.render({
                canvas: canvas as never,
                viewport
            }).promise
            const data = canvas.toBuffer('image/png')
            await page.cleanup()
            await loadingTask.destroy()

            return {
                artifact: {
                    type: 'screenshot',
                    sourceRefId: source.sourceRefId,
                    title: source.title,
                    url: source.url,
                    canonicalUrl: source.canonicalUrl,
                    pageno,
                    width: canvas.width,
                    height: canvas.height,
                    mimeType: 'image/png',
                    filePath: ''
                } satisfies Omit<
                    ScreenshotArtifact,
                    'refId' | 'requestId' | 'sessionId' | 'createdAt'
                >,
                file: { extension: 'png', data }
            }
        } catch (err) {
            if (err instanceof WebRunError) throw err
            throw webError({
                operation: 'screenshot',
                stage: 'render',
                code: 'pdf_render_failed',
                message: `PDF rendering failed: ${String(err)}`
            })
        }
    }
}
