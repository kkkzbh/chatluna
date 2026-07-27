import { Context, Logger, Service } from 'koishi'
import type {} from 'koishi-plugin-puppeteer'
import type { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import type { Config } from './config'
import { createWebFetch } from './request'
import { SearchOrchestrator } from './orchestrator'
import { SearchSessionStore } from './store'
import { WebRunTool } from './tool'
import type {
    SearchSettings,
    WebArtifact,
    WebCapability,
    WebRunRequest
} from './types'

export class ChatLunaWebService extends Service {
    readonly store: SearchSessionStore
    private readonly webLogger = new Logger('chatluna-web')
    private orchestrator?: SearchOrchestrator
    private capabilities = new Set<WebCapability>()

    constructor(
        public readonly ctx: Context,
        public readonly args: {
            config: Config
            plugin: ChatLunaPlugin
        }
    ) {
        super(ctx, 'chatluna_web', true)
        this.store = new SearchSessionStore(ctx, args.config)

        ctx.on('chatluna/after-conversation-clear-history', async (payload) => {
            await this.store.clear(payload.conversation.id)
        })
        ctx.on('chatluna/after-conversation-delete', async (payload) => {
            await this.store.clear(payload.conversation.id)
        })
        ctx.on(
            'chatluna/after-chat',
            async (conversationId, _source, response) => {
                if (typeof response.content === 'string') {
                    response.content = (
                        await this.store.assembleCitations(
                            conversationId,
                            response.content
                        )
                    ).text
                    return
                }
                for (const part of response.content) {
                    if (part.type !== 'text') continue
                    part.text = (
                        await this.store.assembleCitations(
                            conversationId,
                            part.text
                        )
                    ).text
                }
            }
        )
        ctx.on('web.failed', async ({ execution }) => {
            const failure = execution?.failure
            if (!failure) return
            this.webLogger.warn(
                'request=%s session=%s operation=%s stage=%s code=%s provider=%s httpStatus=%s providerCode=%s retryable=%s',
                execution.requestId,
                execution.sessionId,
                failure.operation,
                failure.stage,
                failure.code,
                failure.provider ?? '',
                failure.httpStatus ?? '',
                failure.providerCode ?? '',
                failure.retryable
            )
        })
    }

    start() {
        const config = this.args.config
        const capabilities = new Set<WebCapability>()
        if (config.mode === 'live') {
            if (config.tavilyApiKey.trim()) {
                capabilities.add('search_query')
                capabilities.add('image_query')
            }
            if (this.ctx.get('puppeteer')) {
                capabilities.add('open')
                capabilities.add('click')
                capabilities.add('find')
            }
            capabilities.add('screenshot')
            capabilities.add('weather')
        }

        const missing = config.requiredCapabilities.filter(
            (capability) => !capabilities.has(capability)
        )
        if (config.mode === 'live' && missing.length > 0) {
            throw new Error(
                `Required web.run capabilities are unavailable: ${missing.join(', ')}`
            )
        }

        this.orchestrator = new SearchOrchestrator(
            this.ctx,
            config,
            createWebFetch(config),
            this.store,
            capabilities
        )
        this.capabilities = capabilities

        if (config.mode === 'live') {
            this.args.plugin.registerTool('web_run', {
                description: 'Unified structured web access.',
                createTool: () => new WebRunTool(this, capabilities),
                selector: () => true,
                meta: {
                    source: 'extension',
                    group: 'search',
                    tags: ['search', 'web', 'browser', 'weather'],
                    defaultAvailability: {
                        enabled: true,
                        main: true,
                        chatluna: true,
                        characterScope: 'all'
                    }
                }
            })
            this.webLogger.info(
                'registered web_run capabilities=%s',
                [...capabilities].join(',')
            )
        }
    }

    get settings(): SearchSettings {
        const config = this.args.config
        return {
            mode: config.mode,
            topK: config.topK,
            perDomainLimit: config.perDomainLimit,
            maxOperationsPerCall: config.maxOperationsPerCall,
            maxConcurrency: config.maxConcurrency
        }
    }

    get availableCapabilities(): ReadonlySet<WebCapability> {
        return this.capabilities
    }

    async execute(request: WebRunRequest) {
        if (!this.orchestrator) {
            throw new Error('chatluna_web service has not started')
        }
        return await this.orchestrator.execute({
            ...request,
            settings: this.settings
        })
    }

    async getExecution(requestId: string) {
        return await this.store.getExecution(requestId)
    }

    async getArtifact(sessionId: string, refId: string) {
        return await this.store.getArtifact(sessionId, refId)
    }

    async listArtifacts(sessionId: string) {
        return await this.store.listArtifacts(sessionId)
    }

    async readArtifactFile(artifact: WebArtifact) {
        return await this.store.readArtifactFile(artifact)
    }

    async assembleCitations(sessionId: string, text: string) {
        return await this.store.assembleCitations(sessionId, text)
    }
}

declare module 'koishi' {
    interface Context {
        chatluna_web: ChatLunaWebService
    }
}
