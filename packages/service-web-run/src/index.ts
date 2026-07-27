import { Context, Logger } from 'koishi'
import { ClientConfig } from 'koishi-plugin-chatluna/llm-core/platform/config'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { Config } from './config'
import { ChatLunaWebService } from './service'

export { Config } from './config'
export * from './types'
export { ChatLunaWebService } from './service'

export let logger: Logger

export function apply(ctx: Context, config: Config) {
    logger = createLogger(ctx, 'chatluna-web-run-service')
    const plugin = new ChatLunaPlugin<ClientConfig, Config>(
        ctx,
        config,
        'web-run-service',
        false
    )
    const requiresPuppeteer =
        config.mode === 'live' &&
        config.requiredCapabilities.some((capability) =>
            ['open', 'click', 'find'].includes(capability)
        )
    const requiresTavily =
        config.mode === 'live' &&
        config.requiredCapabilities.some((capability) =>
            ['search_query', 'image_query'].includes(capability)
        )
    if (requiresTavily && !config.tavilyApiKey.trim()) {
        throw new Error(
            'Required web.run search capabilities need a Tavily API key'
        )
    }
    let reportRequiredService: (result: {
        ready: boolean
        error?: unknown
    }) => void = () => undefined
    const requiredService = new Promise<{
        ready: boolean
        error?: unknown
    }>((resolve) => {
        reportRequiredService = resolve
    })
    class PuppeteerBoundWebService extends ChatLunaWebService {
        static inject = ['puppeteer']

        start() {
            try {
                super.start()
                reportRequiredService({ ready: true })
            } catch (error) {
                reportRequiredService({ ready: false, error })
                throw error
            }
        }
    }
    const service = requiresPuppeteer
        ? PuppeteerBoundWebService
        : ChatLunaWebService
    ctx.plugin(service, {
        config,
        plugin
    })
    if (requiresPuppeteer) {
        ctx.on('ready', async () => {
            let timer: NodeJS.Timeout | undefined
            const result = await Promise.race([
                requiredService,
                new Promise<{ ready: boolean; error?: unknown }>((resolve) => {
                    timer = setTimeout(() => resolve({ ready: false }), 10000)
                })
            ])
            if (timer) clearTimeout(timer)
            if (result.ready) return
            if (result.error) throw result.error
            throw new Error(
                'Required web.run page capabilities need Puppeteer'
            )
        })
    }
}

export const inject = {
    required: ['chatluna', 'database'],
    optional: ['puppeteer']
}

export const name = 'chatluna-web-run-service'
