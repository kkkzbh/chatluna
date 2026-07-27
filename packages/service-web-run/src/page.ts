import type { Context } from 'koishi'
import type {} from 'koishi-plugin-puppeteer'
import type { Config } from './config'
import { webError, WebRunError } from './error'
import { fetchPublic, readBounded, type WebFetch } from './request'
import { canonicalUrl, safeUrlForError } from './security'
import type {
    PageArtifact,
    StagedArtifact,
    WebArtifactDraft,
    WebCapability
} from './types'

export class PageFetcher {
    constructor(
        private readonly ctx: Context,
        private readonly config: Config,
        private readonly fetcher: WebFetch
    ) {}

    async open(
        value: string,
        operation: WebCapability,
        sourceRefId?: string,
        startLine?: number
    ): Promise<StagedArtifact> {
        const { response, url } = await fetchPublic(
            this.fetcher,
            value,
            operation,
            this.config.fetchTimeout
        )
        if (!response.ok) {
            throw webError({
                operation,
                stage: 'fetch',
                code: 'page_http_error',
                message: `Page returned HTTP ${response.status}: ${safeUrlForError(url)}`,
                httpStatus: response.status,
                retryable: response.status === 429 || response.status >= 500
            })
        }

        const contentType = response.headers.get('content-type') ?? ''
        const pdf =
            contentType.toLowerCase().includes('application/pdf') ||
            url.pathname.toLowerCase().endsWith('.pdf')
        const body = await readBounded(
            response,
            pdf ? this.config.maxPdfBytes : this.config.maxHtmlBytes,
            operation
        )

        if (pdf) {
            const encodedTitle = url.pathname.split('/').pop() || ''
            let title = encodedTitle
            try {
                title = decodeURIComponent(encodedTitle)
            } catch {
                title = encodedTitle
            }
            title ||= 'PDF document'
            const publicUrl = canonicalUrl(url.href)
            return {
                artifact: {
                    type: 'page',
                    sourceRefId,
                    title,
                    url: publicUrl,
                    canonicalUrl: publicUrl,
                    mediaType: 'pdf',
                    startLine,
                    text: '',
                    lines: [],
                    links: []
                },
                file: { extension: 'pdf', data: body }
            }
        }

        if (
            !contentType.toLowerCase().includes('text/html') &&
            !contentType.toLowerCase().includes('application/xhtml+xml')
        ) {
            throw webError({
                operation,
                stage: 'extract',
                code: 'unsupported_media_type',
                message: `Unsupported page content type: ${contentType || 'unknown'}`
            })
        }

        if (!this.ctx.puppeteer) {
            throw webError({
                operation,
                stage: 'extract',
                code: 'capability_unavailable',
                message: 'HTML page extraction requires Puppeteer'
            })
        }

        const page = await this.ctx.puppeteer.page().catch((err) => {
            throw webError({
                operation,
                stage: 'extract',
                code: 'page_extract_failed',
                message: `Failed to create a page for ${safeUrlForError(url)}: ${
                    err instanceof Error ? err.name : 'extraction error'
                }`,
                retryable: true
            })
        })
        const requestHandler = (request: {
            abort(errorCode?: 'blockedbyclient'): Promise<void>
        }) => request.abort('blockedbyclient')

        try {
            await page.setJavaScriptEnabled(false)
            await page.setRequestInterception(true)
            page.on('request', requestHandler)
            const baseUrl = url.href
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
            const html = body.toString('utf8')
            const htmlDocument = /<head(?:\s[^>]*)?>/i.test(html)
                ? html.replace(
                      /<head(\s[^>]*)?>/i,
                      `<head$1><base href="${baseUrl}">`
                  )
                : `<base href="${baseUrl}">${html}`
            await page.setContent(htmlDocument, {
                waitUntil: 'domcontentloaded',
                timeout: this.config.fetchTimeout
            })

            const result = await page.evaluate((maxCharacters) => {
                for (const node of document.querySelectorAll(
                    'script, style, noscript, template, svg'
                )) {
                    node.remove()
                }
                const text = (document.body?.innerText ?? '')
                    .replace(/\r/g, '')
                    .split('\n')
                    .map((line) => line.replace(/\s+/g, ' ').trim())
                    .filter(Boolean)
                    .join('\n')
                    .slice(0, maxCharacters)
                const links = [...document.querySelectorAll('a[href]')]
                    .map((node) => ({
                        text: (node.textContent ?? '')
                            .replace(/\s+/g, ' ')
                            .trim(),
                        url: (node as HTMLAnchorElement).href
                    }))
                    .filter(
                        (link) =>
                            link.url.startsWith('http://') ||
                            link.url.startsWith('https://')
                    )
                return {
                    title: document.title.trim(),
                    text,
                    links
                }
            }, this.config.maxPageCharacters)

            const finalUrl = url.href
            const publicUrl = canonicalUrl(finalUrl)
            const seen = new Set<string>()
            const links = result.links.flatMap((link) => {
                let url: string
                try {
                    url = canonicalUrl(link.url)
                } catch {
                    return []
                }
                if (seen.has(url)) return []
                seen.add(url)
                return [
                    {
                        id: seen.size - 1,
                        text: link.text || url,
                        url
                    }
                ]
            })

            return {
                artifact: {
                    type: 'page',
                    sourceRefId,
                    title: result.title || finalUrl,
                    url: publicUrl,
                    canonicalUrl: publicUrl,
                    mediaType: 'html',
                    startLine,
                    text: result.text,
                    lines: result.text.split('\n'),
                    links
                } satisfies WebArtifactDraft
            }
        } catch (err) {
            if (err instanceof WebRunError) throw err
            throw webError({
                operation,
                stage: 'extract',
                code: 'page_extract_failed',
                message: `Failed to extract ${safeUrlForError(url)}: ${
                    err instanceof Error ? err.name : 'extraction error'
                }`,
                retryable: true
            })
        } finally {
            page.off('request', requestHandler)
            await page.close()
        }
    }

    find(
        page: Pick<PageArtifact, 'title' | 'url' | 'canonicalUrl' | 'lines'> & {
            refId?: string
        },
        pattern: string
    ): WebArtifactDraft {
        const needle = pattern.toLocaleLowerCase()
        const matches = page.lines.flatMap((line, index) => {
            if (!line.toLocaleLowerCase().includes(needle)) return []
            return [
                {
                    line: index + 1,
                    text: line,
                    context: page.lines.slice(
                        Math.max(0, index - 2),
                        Math.min(page.lines.length, index + 3)
                    )
                }
            ]
        })
        return {
            type: 'find',
            sourceRefId: page.refId,
            title: page.title,
            url: page.url,
            canonicalUrl: page.canonicalUrl,
            pattern,
            matches: matches.slice(0, 20)
        }
    }
}
