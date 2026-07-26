/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/naming-convention */
import { Context, Logger } from 'koishi'
import { ClientConfig } from 'koishi-plugin-chatluna/llm-core/platform/config'
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { ChatLunaBrowsingChain } from './chain/browsing_chain'
import { Config } from './config'
import { SearchManager } from './provide'
import { providerPlugin } from './plugin'
import { SEARCH_TOOL_DESCRIPTION, SearchTool } from './tools/search'
import { SummaryType } from './types'
import { computed } from 'koishi-plugin-chatluna'
import { BrowserManager } from './tools/browser/manager'
import { registerBrowserTools } from './tools/browser/tools'
import { registerWebSearchPresetKnowledgeSource } from './knowledge'

export { Config } from './config'
export {
    registerWebSearchPresetKnowledgeSource,
    WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE
} from './knowledge'

export let logger: Logger

export function apply(ctx: Context, config: Config) {
    logger = createLogger(ctx, 'chatluna-search-service')

    ctx.on('ready', async () => {
        const plugin = new ChatLunaPlugin<ClientConfig, Config>(
            ctx,
            config,
            'search-service',
            false
        )

        const searchManager = new SearchManager(ctx, config)
        const browserManager = new BrowserManager(ctx, config)

        registerBrowserTools(ctx, plugin, browserManager)

        if (config.searchEngine.length > 0) {
            await providerPlugin(ctx, config, plugin, searchManager)
            ctx.effect(() =>
                registerWebSearchPresetKnowledgeSource(
                    ctx.chatluna.knowledge,
                    searchManager
                )
            )

            plugin.registerTool('web_search', {
                description: SEARCH_TOOL_DESCRIPTION,
                createTool(params) {
                    const summaryType: SummaryType =
                        params['summaryType'] ?? config.summaryType

                    return new SearchTool(
                        ctx,
                        searchManager,
                        browserManager,
                        params.embeddings,
                        summaryType
                    )
                },
                selector() {
                    return true
                },
                meta: {
                    source: 'extension',
                    group: 'search',
                    tags: ['search', 'web'],
                    defaultAvailability: {
                        enabled: true,
                        main: true,
                        chatluna: true,
                        characterScope: 'all'
                    }
                }
            })
        }

        if (config.searchEngine.length > 0) {
            plugin.registerChatChainProvider(
                'browsing',
                {
                    'zh-CN': '浏览模式，可以从外部获取信息',
                    'en-US': 'Browsing mode, can get information from web'
                },
                (params) => {
                    const tools = getTools(
                        ctx.chatluna.platform,
                        (name) =>
                            name === 'web_search' || name.startsWith('browser_')
                    )

                    const model = params.model
                    const options = {
                        preset: params.preset,
                        botName: params.botName,
                        embeddings: params.embeddings,
                        historyMemory: params.historyMemory,
                        summaryType: config.summaryType,
                        chatluna: ctx.chatluna,
                        thoughtMessage: ctx.chatluna.config.showThoughtMessage,
                        searchPrompt: config.searchPrompt,
                        newQuestionPrompt: config.newQuestionPrompt,
                        contextualCompressionPrompt:
                            config.contextualCompression
                                ? config.contextualCompressionPrompt
                                : undefined,
                        searchFailedPrompt: config.searchFailedPrompt,
                        variableService: ctx.chatluna.promptRenderer,
                        knowledgeService: ctx.chatluna.knowledge,
                        contextManager: ctx.chatluna.contextManager,
                        browserManager
                    }

                    return ChatLunaBrowsingChain.fromLLMAndTools(
                        model,
                        tools,
                        options
                    )
                }
            )
        }
    })
}

function getTools(service: PlatformService, filter: (name: string) => boolean) {
    const tools = service.getTools()

    return computed(() =>
        tools.value.filter(filter).map((name) => ({
            name,
            tool: service.getTool(name)
        }))
    )
}

export const inject = {
    required: ['chatluna', 'puppeteer'],
    optional: ['chatluna_agent']
}

export const name = 'chatluna-search-service'
