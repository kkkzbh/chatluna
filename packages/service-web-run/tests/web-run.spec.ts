import { expect } from 'chai'
import { Context } from 'koishi'
import memory from '@koishijs/plugin-database-memory'
import { mkdtemp, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Config } from '../src/config'
import { WebRunError } from '../src/error'
import { formatWebOutput } from '../src/format'
import { SearchOrchestrator } from '../src/orchestrator'
import { PdfRenderer } from '../src/pdf'
import { TavilySearchProvider } from '../src/providers/tavily'
import type { WebFetch } from '../src/request'
import { canonicalUrl, validatePublicUrl } from '../src/security'
import { ChatLunaWebService } from '../src/service'
import { SearchSessionStore } from '../src/store'
import { createWebRunSchema, WebRunTool } from '../src/tool'
import type {
    SearchSettings,
    WebArtifact,
    WebArtifactDraft,
    WebCapability,
    WebRunRequest,
    WebRunResponse
} from '../src/types'

const settings: SearchSettings = {
    mode: 'live',
    topK: 5,
    perDomainLimit: 2,
    maxOperationsPerCall: 8,
    maxConcurrency: 4
}

function config(overrides: Partial<Config> = {}) {
    return {
        mode: 'live',
        requiredCapabilities: [],
        tavilyApiKey: 'test-key',
        topK: 5,
        perDomainLimit: 2,
        maxOperationsPerCall: 8,
        maxConcurrency: 4,
        fetchTimeout: 30000,
        maxHtmlBytes: 8 * 1024 * 1024,
        maxPdfBytes: 32 * 1024 * 1024,
        maxPageCharacters: 100000,
        artifactDir: 'artifacts',
        proxyMode: 'off',
        proxyAddress: '',
        ...overrides
    } as Config
}

function request(
    requestId: string,
    sessionId: string,
    commands: WebRunRequest['commands'],
    overrideSettings: Partial<SearchSettings> = {}
): WebRunRequest {
    return {
        requestId,
        sessionId,
        commands,
        settings: { ...settings, ...overrideSettings },
        runtime: {
            locale: 'zh-CN',
            timezone: 'Asia/Shanghai',
            currentTime: '2026-07-27T12:00:00.000Z'
        }
    }
}

function jsonResponse(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), {
        status,
        headers: { 'Content-Type': 'application/json' }
    })
}

function fakeFetch(
    handler: (
        url: string,
        init?: Parameters<WebFetch>[1]
    ) => Response | Promise<Response>
) {
    return (async (input, init) => {
        return await handler(String(input), init)
    }) as unknown as WebFetch
}

function createPdf() {
    const stream = 'BT /F1 18 Tf 72 72 Td (web.run PDF) Tj ET'
    const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
        `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ]
    let body = '%PDF-1.4\n'
    const offsets = [0]
    for (const [index, object] of objects.entries()) {
        offsets.push(Buffer.byteLength(body))
        body += `${index + 1} 0 obj\n${object}\nendobj\n`
    }
    const xref = Buffer.byteLength(body)
    body += `xref\n0 ${objects.length + 1}\n`
    body += '0000000000 65535 f \n'
    body += offsets
        .slice(1)
        .map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)
        .join('')
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
    body += `startxref\n${xref}\n%%EOF\n`
    return Buffer.from(body)
}

class FakePage {
    private currentUrl = ''
    private readonly pages: Record<
        string,
        {
            title: string
            text: string
            links: { text: string; url: string }[]
        }
    >
    private requestHandler?: (request: {
        url(): string
        continue(): Promise<void>
        abort(): Promise<void>
    }) => Promise<void>

    constructor(
        pages: Record<
            string,
            {
                title: string
                text: string
                links: { text: string; url: string }[]
            }
        >
    ) {
        this.pages = pages
    }

    async setRequestInterception() {}

    on(
        _event: string,
        handler: (request: {
            url(): string
            continue(): Promise<void>
            abort(): Promise<void>
        }) => Promise<void>
    ) {
        this.requestHandler = handler
    }

    off() {
        this.requestHandler = undefined
    }

    async setJavaScriptEnabled() {}

    async setContent(html: string) {
        const href = html.match(/<base href="([^"]+)">/i)?.[1]
        if (!href) throw new Error('Missing base URL in fake page content')
        this.currentUrl = href.replace(/&amp;/g, '&')
    }

    async goto(url: string) {
        this.currentUrl = url
        let aborted = false
        await this.requestHandler?.({
            url: () => url,
            continue: async () => undefined,
            abort: async () => {
                aborted = true
            }
        })
        if (aborted) throw new Error(`Blocked ${url}`)
    }

    async evaluate() {
        const page = this.pages[this.currentUrl]
        if (!page) throw new Error(`Missing fake page: ${this.currentUrl}`)
        return page
    }

    url() {
        return this.currentUrl
    }

    async close() {}
}

async function createRuntime(
    fetcher: WebFetch,
    capabilities: WebCapability[],
    pages: ConstructorParameters<typeof FakePage>[0] = {}
) {
    const app = new Context()
    const baseDir = await mkdtemp(join(tmpdir(), 'chatluna-web-run-'))
    app.baseDir = baseDir
    app.plugin(memory)
    if (capabilities.some((item) => ['open', 'click', 'find'].includes(item))) {
        ;(app as unknown as { puppeteer: unknown }).puppeteer = {
            page: async () => new FakePage(pages)
        }
    }
    const resolvedConfig = config()
    const store = new SearchSessionStore(app, resolvedConfig)
    await app.start()
    const orchestrator = new SearchOrchestrator(
        app,
        resolvedConfig,
        fetcher,
        store,
        new Set(capabilities)
    )
    return {
        app,
        store,
        orchestrator,
        async close() {
            await app.stop()
            await rm(baseDir, { recursive: true, force: true })
        }
    }
}

describe('web_run schema and formatting', () => {
    it('exposes only configured capabilities and enforces search batch size', () => {
        const schema = createWebRunSchema(new Set(['search_query', 'weather']))
        expect(Object.keys(schema.shape)).to.have.members([
            'search_query',
            'weather',
            'response_length'
        ])
        expect(() =>
            schema.parse({
                open: [{ ref_id: 'https://8.8.8.8' }]
            })
        ).to.throw()
        expect(() =>
            schema.parse({
                search_query: [
                    { q: '1' },
                    { q: '2' },
                    { q: '3' },
                    { q: '4' },
                    { q: '5' }
                ]
            })
        ).to.throw()
    })

    it('changes only the model-facing page projection', () => {
        const artifact = {
            type: 'page',
            refId: 'turn0view0',
            requestId: 'request',
            sessionId: 'session',
            createdAt: '2026-07-27T00:00:00.000Z',
            title: 'Page',
            url: 'https://example.com/',
            canonicalUrl: 'https://example.com/',
            mediaType: 'html',
            startLine: 2,
            text: 'one\ntwo\nthree',
            lines: ['one', 'two', 'three'],
            links: []
        } satisfies WebArtifact

        expect(formatWebOutput([artifact], 'short')).to.include('2: two')
        expect(formatWebOutput([artifact], 'short')).to.not.include('1: one')
        expect(artifact.lines).to.deep.equal(['one', 'two', 'three'])

        const search = {
            type: 'search',
            refId: 'turn0search0',
            requestId: 'request',
            sessionId: 'session',
            createdAt: '2026-07-27T00:00:00.000Z',
            query: 'query',
            title: 'Result',
            url: 'https://8.8.8.8/result',
            canonicalUrl: 'https://8.8.8.8/result',
            snippet: 'snippet',
            source: 'tavily',
            publishedAt: '2026-07-26T00:00:00.000Z'
        } satisfies WebArtifact
        expect(formatWebOutput([search], 'short')).to.not.include('Published:')
        expect(formatWebOutput([search], 'short')).to.not.include('Source:')
        expect(formatWebOutput([search], 'medium')).to.include(
            'Published: 2026-07-26T00:00:00.000Z'
        )
        expect(formatWebOutput([search], 'medium')).to.include(
            'Source: tavily'
        )
    })
})

describe('web.run capability lifecycle', () => {
    it('registers only available optional capabilities', async () => {
        const app = new Context()
        const baseDir = await mkdtemp(join(tmpdir(), 'chatluna-web-service-'))
        app.baseDir = baseDir
        app.plugin(memory)
        const registered: string[] = []
        const service = new ChatLunaWebService(app, {
            config: config({
                tavilyApiKey: '',
                requiredCapabilities: []
            }),
            plugin: {
                registerTool(name: string) {
                    registered.push(name)
                }
            } as never
        })
        try {
            await app.start()
            expect([...service.availableCapabilities]).to.deep.equal([
                'screenshot',
                'weather'
            ])
            expect(registered).to.deep.equal(['web_run'])
        } finally {
            await app.stop()
            await rm(baseDir, { recursive: true, force: true })
        }
    })

    it('fails when a required provider is unavailable', async () => {
        const app = new Context()
        const baseDir = await mkdtemp(join(tmpdir(), 'chatluna-web-service-'))
        app.baseDir = baseDir
        app.plugin(memory)
        const service = new ChatLunaWebService(app, {
            config: config({
                tavilyApiKey: '',
                requiredCapabilities: ['search_query']
            }),
            plugin: { registerTool() {} } as never
        })
        try {
            let failure: unknown
            try {
                await service.start()
            } catch (err) {
                failure = err
            }
            expect(failure).to.be.instanceOf(Error)
            expect((failure as Error).message).to.include('search_query')
        } finally {
            await app.stop()
            await rm(baseDir, { recursive: true, force: true })
        }
    })

    it('keeps web_run unregistered in disabled mode', async () => {
        const app = new Context()
        const baseDir = await mkdtemp(join(tmpdir(), 'chatluna-web-service-'))
        app.baseDir = baseDir
        app.plugin(memory)
        const registered: string[] = []
        const service = new ChatLunaWebService(app, {
            config: config({
                mode: 'disabled',
                requiredCapabilities: []
            }),
            plugin: {
                registerTool(name: string) {
                    registered.push(name)
                }
            } as never
        })
        try {
            await app.start()
            expect([...service.availableCapabilities]).to.deep.equal([])
            expect(registered).to.deep.equal([])
        } finally {
            await app.stop()
            await rm(baseDir, { recursive: true, force: true })
        }
    })
})

describe('web boundary and providers', () => {
    it('blocks local, private, link-local, and metadata targets', async () => {
        for (const url of [
            'http://127.0.0.1/',
            'http://10.0.0.1/',
            'http://169.254.169.254/latest/meta-data/',
            'http://[::1]/',
            'http://[::ffff:7f00:1]/',
            'http://[64:ff9b::7f00:1]/',
            'http://metadata.google.internal/'
        ]) {
            try {
                await validatePublicUrl(url, 'open')
                expect.fail(`Expected ${url} to be blocked`)
            } catch (err) {
                expect(err).to.be.instanceOf(WebRunError)
                expect((err as WebRunError).failure.code).to.equal('unsafe_url')
            }
        }
        expect(
            canonicalUrl(
                'HTTPS://Example.COM:443/a?utm_source=x&token=secret&keep=1#fragment'
            )
        ).to.equal('https://example.com/a?keep=1')
        try {
            await validatePublicUrl('https://user:password@8.8.8.8/', 'open')
            expect.fail('Expected URL credentials to be blocked')
        } catch (err) {
            expect((err as WebRunError).failure.code).to.equal('unsafe_url')
        }
    })

    it('preserves Tavily order while deduplicating and limiting domains', async () => {
        const provider = new TavilySearchProvider(
            config({ topK: 5, perDomainLimit: 1 }),
            fakeFetch(() =>
                jsonResponse({
                    results: [
                        {
                            title: 'First',
                            url: 'https://one.example/a?utm_source=x',
                            content: 'first',
                            score: 0.9
                        },
                        {
                            title: 'Duplicate',
                            url: 'https://one.example/a',
                            content: 'duplicate',
                            score: 0.8
                        },
                        {
                            title: 'Same domain',
                            url: 'https://one.example/b',
                            content: 'same domain',
                            score: 0.7
                        },
                        {
                            title: 'Second',
                            url: 'https://two.example/c',
                            content: 'second',
                            score: 0.6
                        }
                    ],
                    images: [
                        {
                            url: 'https://one.example/image.png',
                            description: null
                        }
                    ]
                })
            )
        )
        const results = await provider.search(
            { q: 'query' },
            '2026-07-27T00:00:00.000Z'
        )
        expect(results.map((item) => item.title)).to.deep.equal([
            'First',
            'Second'
        ])
    })

    it('retains provider HTTP details in typed errors', async () => {
        const provider = new TavilySearchProvider(
            config(),
            fakeFetch(() =>
                jsonResponse(
                    { code: 'rate_limit', detail: 'quota exceeded' },
                    429
                )
            )
        )
        try {
            await provider.search(
                { q: 'query' },
                '2026-07-27T00:00:00.000Z'
            )
            expect.fail('Expected Tavily failure')
        } catch (err) {
            expect(err).to.be.instanceOf(WebRunError)
            expect((err as WebRunError).failure).to.include({
                operation: 'search_query',
                stage: 'provider',
                provider: 'tavily',
                httpStatus: 429,
                providerCode: 'rate_limit',
                retryable: true
            })
        }
    })
})

describe('web.run orchestration', () => {
    it('persists search, open, click, and find refs across tool instances', async () => {
        const pages = {
            'https://8.8.8.8/start': {
                title: 'Start page',
                text: 'start body',
                links: [
                    {
                        text: 'Next',
                        url: 'https://8.8.4.4/next'
                    }
                ]
            },
            'https://8.8.4.4/next': {
                title: 'Next page',
                text: 'Alpha\nNeedle value\nOmega',
                links: []
            }
        }
        const fetcher = fakeFetch((url, init) => {
            if (url === 'https://api.tavily.com/search') {
                return jsonResponse({
                    results: [
                        {
                            title: 'Start page',
                            url: 'https://8.8.8.8/start',
                            content: 'start'
                        }
                    ]
                })
            }
            expect(init?.dispatcher).to.exist
            return new Response('<html></html>', {
                headers: { 'Content-Type': 'text/html' }
            })
        })
        const runtime = await createRuntime(
            fetcher,
            ['search_query', 'open', 'click', 'find'],
            pages
        )
        try {
            const searched = await runtime.orchestrator.execute(
                request('request-0', 'session-a', {
                    search_query: [{ q: 'start' }]
                })
            )
            expect(searched.results[0].refId).to.equal('turn0search0')

            const otherSession = await runtime.orchestrator.execute(
                request('request-other', 'session-b', {
                    search_query: [{ q: 'start' }]
                })
            )
            expect(otherSession.results[0].refId).to.equal('turn0search0')
            expect(
                await runtime.store.getArtifact('session-a', 'turn0search0')
            ).to.include({ sessionId: 'session-a' })
            expect(
                await runtime.store.getArtifact('session-b', 'turn0search0')
            ).to.include({ sessionId: 'session-b' })

            const reopened = new SearchOrchestrator(
                runtime.app,
                config(),
                fetcher,
                new SearchSessionStore(runtime.app, config()),
                new Set(['search_query', 'open', 'click', 'find'])
            )
            const opened = await reopened.execute(
                request('request-1', 'session-a', {
                    open: [{ ref_id: 'turn0search0' }]
                })
            )
            expect(opened.results[0].refId).to.equal('turn1view0')

            const clicked = await reopened.execute(
                request('request-2', 'session-a', {
                    click: [{ ref_id: 'turn1view0', id: 0 }]
                })
            )
            expect(clicked.results[0].refId).to.equal('turn2view0')

            const found = await reopened.execute(
                request('request-3', 'session-a', {
                    find: [
                        {
                            ref_id: 'turn2view0',
                            pattern: 'needle'
                        }
                    ]
                })
            )
            expect(found.results[0]).to.include({
                refId: 'turn3find0',
                type: 'find'
            })
            expect(
                found.results[0].type === 'find'
                    ? found.results[0].matches[0].line
                    : undefined
            ).to.equal(2)
        } finally {
            await runtime.close()
        }
    })

    it('rolls back every artifact when one mixed command fails', async () => {
        const fetcher = fakeFetch((_url, init) => {
            const query = JSON.parse(String(init?.body)).query
            if (query === 'fail') {
                return jsonResponse({ code: 'upstream', detail: 'failed' }, 503)
            }
            return jsonResponse({
                results: [
                    {
                        title: 'Success',
                        url: 'https://8.8.8.8/result',
                        content: 'success'
                    }
                ]
            })
        })
        const runtime = await createRuntime(fetcher, ['search_query'])
        try {
            const response = await runtime.orchestrator.execute(
                request('atomic-request', 'atomic-session', {
                    search_query: [{ q: 'success' }, { q: 'fail' }]
                })
            )
            expect(response.execution.status).to.equal('failed')
            expect(response.execution.commands).to.have.length(2)
            expect(
                response.execution.commands.every(
                    (command) => command.status === 'failed'
                )
            ).to.equal(true)
            expect(response.results).to.deep.equal([])
            expect(
                await runtime.store.listArtifacts('atomic-session')
            ).to.deep.equal([])
        } finally {
            await runtime.close()
        }
    })

    it('supports image and weather commands without an embedding service', async () => {
        const fetcher = fakeFetch((url) => {
            if (url === 'https://api.tavily.com/search') {
                return jsonResponse({
                    results: [],
                    images: [
                        {
                            url: 'https://8.8.8.8/image.png',
                            description: null
                        }
                    ]
                })
            }
            if (url.startsWith('https://geocoding-api.open-meteo.com')) {
                return jsonResponse({
                    results: [
                        {
                            name: 'Beijing',
                            country: 'China',
                            latitude: 39.9,
                            longitude: 116.4,
                            timezone: 'Asia/Shanghai'
                        }
                    ]
                })
            }
            return jsonResponse({
                timezone: 'Asia/Shanghai',
                current: {
                    time: '2026-07-27T12:00',
                    temperature_2m: 30,
                    apparent_temperature: 32,
                    precipitation: 0,
                    weather_code: 1,
                    wind_speed_10m: 5
                },
                daily: {
                    time: ['2026-07-27'],
                    weather_code: [1],
                    temperature_2m_max: [32],
                    temperature_2m_min: [24],
                    precipitation_probability_max: [10]
                }
            })
        })
        const runtime = await createRuntime(fetcher, ['image_query', 'weather'])
        Object.defineProperty(runtime.app, 'chatluna_rag', {
            get() {
                throw new Error('Embedding service must not be accessed')
            }
        })
        try {
            const response = await runtime.orchestrator.execute(
                request('media-request', 'media-session', {
                    image_query: [{ q: 'image' }],
                    weather: [{ location: 'Beijing', duration: 1 }]
                })
            )
            expect(response.results.map((item) => item.type)).to.deep.equal([
                'image',
                'weather'
            ])
            expect(response.results[0]).to.include({
                title: 'Image result for image'
            })
            expect(response.results[0]).not.to.have.property('description')
        } finally {
            await runtime.close()
        }
    })

    it('returns deterministic disabled and invalid-ref failures', async () => {
        const runtime = await createRuntime(
            fakeFetch(() => jsonResponse({ results: [] })),
            ['open']
        )
        try {
            const disabled = await runtime.orchestrator.execute(
                request(
                    'disabled-request',
                    'disabled-session',
                    { search_query: [{ q: 'query' }] },
                    { mode: 'disabled' }
                )
            )
            expect(disabled.execution.failure?.code).to.equal('search_disabled')
            expect(disabled.results).to.deep.equal([])

            const invalid = await runtime.orchestrator.execute(
                request('invalid-request', 'invalid-session', {
                    open: [{ ref_id: 'turn99search0' }]
                })
            )
            expect(invalid.execution.failure?.code).to.equal('invalid_ref')
        } finally {
            await runtime.close()
        }
    })

    it('preserves empty results and page HTTP failures as typed outcomes', async () => {
        const runtime = await createRuntime(
            fakeFetch((url) => {
                if (url === 'https://api.tavily.com/search') {
                    return jsonResponse({ results: [] })
                }
                return new Response('unavailable', { status: 503 })
            }),
            ['search_query', 'open']
        )
        try {
            const empty = await runtime.orchestrator.execute(
                request('empty-request', 'outcome-session', {
                    search_query: [{ q: 'nothing' }]
                })
            )
            expect(empty.execution.status).to.equal('completed')
            expect(empty.results).to.deep.equal([])
            expect(empty.output).to.equal('web.run completed with no results.')

            const failed = await runtime.orchestrator.execute(
                request('page-failure', 'outcome-session', {
                    open: [{ ref_id: 'https://8.8.8.8/unavailable' }]
                })
            )
            expect(failed.execution.failure).to.include({
                operation: 'open',
                stage: 'fetch',
                code: 'page_http_error',
                httpStatus: 503,
                retryable: true
            })
            expect(failed.results).to.deep.equal([])
        } finally {
            await runtime.close()
        }
    })
})

describe('PDF, multimodal output, and citations', () => {
    it('renders a zero-indexed PDF page and rejects an invalid page', async () => {
        const renderer = new PdfRenderer()
        const rendered = await renderer.render(createPdf(), 0, {
            title: 'PDF',
            url: 'https://8.8.8.8/file.pdf',
            canonicalUrl: 'https://8.8.8.8/file.pdf'
        })
        expect(rendered.artifact.type).to.equal('screenshot')
        expect(rendered.file?.data.subarray(1, 4).toString()).to.equal('PNG')

        try {
            await renderer.render(createPdf(), 1, {
                title: 'PDF',
                url: 'https://8.8.8.8/file.pdf',
                canonicalUrl: 'https://8.8.8.8/file.pdf'
            })
            expect.fail('Expected invalid PDF page failure')
        } catch (err) {
            expect(err).to.be.instanceOf(WebRunError)
            expect((err as WebRunError).failure.code).to.equal(
                'invalid_page_number'
            )
        }
    })

    it('opens, persists, and renders a PDF through its refId', async () => {
        const runtime = await createRuntime(
            fakeFetch(() => {
                return new Response(createPdf(), {
                    headers: { 'Content-Type': 'application/pdf' }
                })
            }),
            ['open', 'screenshot']
        )
        try {
            const opened = await runtime.orchestrator.execute(
                request('pdf-open', 'pdf-session', {
                    open: [{ ref_id: 'https://8.8.8.8/file.pdf' }]
                })
            )
            expect(opened.results[0]).to.include({
                refId: 'turn0view0',
                type: 'page',
                mediaType: 'pdf'
            })

            const rendered = await runtime.orchestrator.execute(
                request('pdf-render', 'pdf-session', {
                    screenshot: [{ ref_id: 'turn0view0', pageno: 0 }]
                })
            )
            expect(rendered.results[0]).to.include({
                refId: 'turn1screenshot0',
                type: 'screenshot',
                sourceRefId: 'turn0view0'
            })
            expect(
                (await runtime.store.readArtifactFile(rendered.results[0]))?.subarray(
                    1,
                    4
                ).toString()
            ).to.equal('PNG')
        } finally {
            await runtime.close()
        }
    })

    it('returns screenshot text and image content from web_run', async () => {
        const artifact = {
            type: 'screenshot',
            refId: 'turn0screenshot0',
            requestId: 'request',
            sessionId: 'session',
            createdAt: '2026-07-27T00:00:00.000Z',
            title: 'PDF',
            url: 'https://8.8.8.8/file.pdf',
            canonicalUrl: 'https://8.8.8.8/file.pdf',
            pageno: 0,
            width: 100,
            height: 100,
            mimeType: 'image/png',
            filePath: '/unused'
        } satisfies WebArtifact
        const response: WebRunResponse = {
            execution: {
                requestId: 'request',
                sessionId: 'session',
                turn: 0,
                status: 'completed',
                startedAt: '2026-07-27T00:00:00.000Z',
                commands: []
            },
            output: '[turn0screenshot0]\nPDF page: 0',
            results: [artifact]
        }
        const service = {
            settings,
            execute: async () => response,
            readArtifactFile: async () => Buffer.from('png')
        }
        const tool = new WebRunTool(service as never, new Set(['screenshot']))
        const content = await tool._call(
            {
                screenshot: [
                    {
                        ref_id: 'turn0view0',
                        pageno: 0
                    }
                ]
            },
            { runId: 'request' } as never,
            {
                configurable: {
                    conversationId: 'session',
                    session: { locales: ['zh-CN'] }
                }
            } as never
        )
        expect(content).to.be.an('array').with.length(2)
        expect(
            Array.isArray(content) &&
                content[1].type === 'image_url' &&
                typeof content[1].image_url === 'object'
                ? content[1].image_url.url
                : ''
        ).to.equal('data:image/png;base64,cG5n')
    })

    it('resolves current-session citations and records invalid refs', async () => {
        const runtime = await createRuntime(
            fakeFetch(() => jsonResponse({ results: [] })),
            []
        )
        try {
            const draft: WebArtifactDraft = {
                type: 'search',
                query: 'query',
                title: 'Verified source',
                url: 'https://8.8.8.8/source?utm_source=test',
                canonicalUrl: 'https://8.8.8.8/source',
                snippet: 'snippet',
                source: 'tavily'
            }
            const execution = {
                requestId: 'citation-request',
                sessionId: 'citation-session',
                turn: 0,
                status: 'started' as const,
                startedAt: '2026-07-27T00:00:00.000Z',
                commands: []
            }
            const webRequest = request('citation-request', 'citation-session', {
                search_query: [{ q: 'query' }]
            })
            await runtime.store.begin(webRequest, execution)
            await runtime.store.complete(webRequest, execution, [
                { artifact: draft }
            ])

            const assembled = await runtime.store.assembleCitations(
                'citation-session',
                'Answer [turn0search0] [Named](turn0search0) citeturn0search0turn99search0'
            )
            expect(assembled.text).to.include(
                '[Verified source](https://8.8.8.8/source)'
            )
            expect(assembled.text).to.not.include('turn99search0')
            expect(assembled.text).to.include('部分引用无法核验')
            expect(assembled.invalidRefs).to.deep.equal(['turn99search0'])
        } finally {
            await runtime.close()
        }
    })

    it('does not duplicate an adjacent verified markdown source', async () => {
        const runtime = await createRuntime(
            fakeFetch(() => jsonResponse({ results: [] })),
            []
        )
        try {
            const draft: WebArtifactDraft = {
                type: 'search',
                query: 'query',
                title: 'Verified source',
                url: 'https://8.8.8.8/source?utm_source=test',
                canonicalUrl: 'https://8.8.8.8/source',
                snippet: 'snippet',
                source: 'tavily'
            }
            const execution = {
                requestId: 'deduplicated-citation-request',
                sessionId: 'deduplicated-citation-session',
                turn: 0,
                status: 'started' as const,
                startedAt: '2026-07-28T00:00:00.000Z',
                commands: []
            }
            const webRequest = request(
                'deduplicated-citation-request',
                'deduplicated-citation-session',
                {
                    search_query: [{ q: 'query' }]
                }
            )
            await runtime.store.begin(webRequest, execution)
            await runtime.store.complete(webRequest, execution, [
                { artifact: draft }
            ])

            const assembled = await runtime.store.assembleCitations(
                'deduplicated-citation-session',
                'Source: [Model label](https://8.8.8.8/source) [turn0search0]'
            )

            expect(assembled.text).to.equal(
                'Source: [Model label](https://8.8.8.8/source)'
            )
            expect(
                assembled.text.match(/https:\/\/8\.8\.8\.8\/source/g)
            ).to.have.length(1)
            expect(assembled.invalidRefs).to.deep.equal([])

            const reversed = await runtime.store.assembleCitations(
                'deduplicated-citation-session',
                'Source: [turn0search0] [Model label](https://8.8.8.8/source)'
            )
            expect(reversed.text).to.equal(
                'Source: [Model label](https://8.8.8.8/source)'
            )
        } finally {
            await runtime.close()
        }
    })

    it('removes persisted artifacts and files when a session is cleared', async () => {
        const runtime = await createRuntime(
            fakeFetch(() => jsonResponse({ results: [] })),
            []
        )
        try {
            const execution = {
                requestId: 'cleanup-request',
                sessionId: 'cleanup-session',
                turn: 0,
                status: 'started' as const,
                startedAt: '2026-07-27T00:00:00.000Z',
                commands: []
            }
            const webRequest = request(
                'cleanup-request',
                'cleanup-session',
                {
                    open: [{ ref_id: 'https://8.8.8.8/file.pdf' }]
                }
            )
            await runtime.store.begin(webRequest, execution)
            const [artifact] = await runtime.store.complete(
                webRequest,
                execution,
                [
                    {
                        artifact: {
                            type: 'page',
                            title: 'PDF',
                            url: 'https://8.8.8.8/file.pdf',
                            canonicalUrl: 'https://8.8.8.8/file.pdf',
                            mediaType: 'pdf',
                            text: '',
                            lines: [],
                            links: []
                        },
                        file: { extension: 'pdf', data: createPdf() }
                    }
                ]
            )
            expect(await runtime.store.readArtifactFile(artifact)).to.exist

            await runtime.store.clear('cleanup-session')

            expect(
                await runtime.store.listArtifacts('cleanup-session')
            ).to.deep.equal([])
            expect(
                await runtime.store.getExecution('cleanup-request')
            ).to.equal(undefined)
            let readFailure: unknown
            try {
                await runtime.store.readArtifactFile(artifact)
            } catch (err) {
                readFailure = err
            }
            expect(readFailure).to.be.instanceOf(Error)
        } finally {
            await runtime.close()
        }
    })
})
