import { Context, Schema } from 'koishi'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { OpenAIClient } from './client'
import { ModelCapabilities } from 'koishi-plugin-chatluna/llm-core/platform/types'
import type { ResponseBuiltinToolName } from '@chatluna/v1-shared-adapter'
import type { ChatLunaModelCallOptions } from 'koishi-plugin-chatluna/llm-core/platform/model'

export const reusable = true

export function apply(ctx: Context, config: Config) {
    ctx.on('ready', async () => {
        if (config.platform == null || config.platform.length < 1) {
            throw new ChatLunaError(
                ChatLunaErrorCode.UNKNOWN_ERROR,
                new Error('Cannot find any platform')
            )
        }

        const platform = config.platform

        const plugin = new ChatLunaPlugin(ctx, config, platform)

        plugin.parseConfig((config) => {
            return config.apiKeys
                .filter(([apiKey, _, enabled]) => {
                    return apiKey.length > 0 && enabled
                })
                .map(([apiKey, apiEndpoint]) => {
                    return {
                        apiKey,
                        apiEndpoint,
                        platform,
                        chatLimit: config.chatTimeLimit,
                        timeout: config.timeout,
                        maxRetries: config.maxRetries,
                        concurrentMaxSize: config.chatConcurrentMaxSize
                    }
                })
        })

        plugin.registerClient(() => new OpenAIClient(ctx, config, plugin))

        await plugin.initClient()
    })
}

export interface ManagedOpenAIModel {
    id: string
    transportModel: string
    type: 'llm' | 'embeddings' | 'reranker'
    contextSize: number
    capabilities: ModelCapabilities[]
    requestMode?: 'chatCompletions' | 'responses'
    timeoutMs: number
    requestDefaults?: Pick<
        ChatLunaModelCallOptions,
        | 'temperature'
        | 'topP'
        | 'frequencyPenalty'
        | 'presencePenalty'
        | 'maxTokens'
        | 'reasoningEffort'
        | 'thinkingMode'
    >
}

export interface ManagedOpenAIConnection {
    id: string
    baseUrl: string
    apiKey: string
    models: ManagedOpenAIModel[]
    concurrentMaxSize?: number
    maxRetries?: number
}

export interface ManagedOpenAIRegistration {
    platform: string
    models: string[]
    dispose: () => Promise<void>
}

export async function registerManagedOpenAIConnection(
    ctx: Context,
    connection: ManagedOpenAIConnection
): Promise<ManagedOpenAIRegistration> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(connection.id)) {
        throw new Error(`Invalid managed connection id: ${connection.id}`)
    }
    const endpoint = new URL(connection.baseUrl)
    if (endpoint.protocol !== 'http:' && endpoint.protocol !== 'https:') {
        throw new Error(
            `Invalid managed connection protocol: ${endpoint.protocol}`
        )
    }
    if (connection.models.length < 1) {
        throw new Error(
            `Managed connection ${connection.id} has no model profiles`
        )
    }
    if (
        new Set(connection.models.map((model) => model.id)).size !==
        connection.models.length
    ) {
        throw new Error(
            `Managed connection ${connection.id} has duplicate model ids`
        )
    }
    for (const model of connection.models) {
        if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(model.id)) {
            throw new Error(
                `Invalid managed model id ${model.id} in connection ${connection.id}`
            )
        }
        if (model.transportModel.trim().length < 1) {
            throw new Error(
                `Managed model ${model.id} has an empty transport model`
            )
        }
        if (!Number.isInteger(model.contextSize) || model.contextSize < 1) {
            throw new Error(
                `Managed model ${model.id} has an invalid context size`
            )
        }
        if (!Number.isInteger(model.timeoutMs) || model.timeoutMs < 1) {
            throw new Error(`Managed model ${model.id} has an invalid timeout`)
        }
    }

    const platform = `qqbot-${connection.id}`
    const config: Config = {
        configMode: 'default',
        chatConcurrentMaxSize: connection.concurrentMaxSize ?? 3,
        chatTimeLimit: 200,
        timeout: Math.max(...connection.models.map((model) => model.timeoutMs)),
        maxRetries: connection.maxRetries ?? 2,
        proxyMode: 'system',
        proxyAddress: '',
        apiKeys: [[connection.apiKey, connection.baseUrl, true]],
        pullModels: false,
        additionalModels: connection.models.map((model) => ({
            model: model.id,
            transportModel: model.transportModel,
            modelType:
                model.type === 'embeddings'
                    ? 'Embeddings 嵌入模型'
                    : model.type === 'reranker'
                      ? 'Reranker 重排序模型'
                      : 'LLM 大语言模型',
            modelCapabilities: model.capabilities,
            contextSize: model.contextSize,
            requestMode: model.requestMode,
            timeoutMs: model.timeoutMs,
            requestDefaults: model.requestDefaults
        })),
        blacklistModels: [],
        additionCookies: [],
        maxContextRatio: 1,
        temperature: 1,
        presencePenalty: 0,
        frequencyPenalty: 0,
        nonStreaming: false,
        responseApi: false,
        googleSearch: false,
        googleSearchSupportModel: [],
        responseBuiltinTools: [],
        responseBuiltinToolSupportModel: [],
        responseFileSearchVectorStoreIds: [],
        platform
    }
    const plugin = new ChatLunaPlugin(ctx, config, platform, true, 'manual')
    plugin.parseConfig((cfg) =>
        cfg.apiKeys.map(([apiKey, apiEndpoint]) => ({
            apiKey,
            apiEndpoint,
            platform,
            chatLimit: cfg.chatTimeLimit,
            timeout: cfg.timeout,
            maxRetries: cfg.maxRetries,
            concurrentMaxSize: cfg.chatConcurrentMaxSize
        }))
    )

    await ctx.chatluna.installPlugin(plugin)
    let unregister: (() => void) | undefined
    try {
        unregister = ctx.chatluna.platform.registerClient(
            platform,
            () => new OpenAIClient(ctx, config, plugin)
        )
        await ctx.chatluna.platform.createClient(platform)
    } catch (error) {
        unregister?.()
        ctx.chatluna.uninstallPlugin(plugin)
        throw error
    }

    return {
        platform,
        models: connection.models.map((model) => `${platform}/${model.id}`),
        dispose: async () => {
            unregister?.()
            ctx.chatluna.uninstallPlugin(plugin)
        }
    }
}

export interface Config extends ChatLunaPlugin.Config {
    apiKeys: [string, string, boolean][]
    pullModels: boolean
    additionalModels: {
        model: string
        transportModel?: string
        modelType: string
        modelCapabilities: ModelCapabilities[]
        contextSize: number
        requestMode?: 'chatCompletions' | 'responses'
        timeoutMs?: number
        requestDefaults?: ManagedOpenAIModel['requestDefaults']
    }[]
    blacklistModels: string[]
    additionCookies: [string, string][]
    maxContextRatio: number
    temperature: number
    presencePenalty: number
    platform: string
    frequencyPenalty: number
    nonStreaming: boolean
    responseApi: boolean
    googleSearch: boolean
    googleSearchSupportModel: string[]
    responseBuiltinTools: ResponseBuiltinToolName[]
    responseBuiltinToolSupportModel: string[]
    responseFileSearchVectorStoreIds: string[]
}

export const Config: Schema<Config> = Schema.intersect([
    ChatLunaPlugin.Config,
    Schema.object({
        platform: Schema.string().default('openai-like'),
        pullModels: Schema.boolean().default(true),
        additionalModels: Schema.array(
            Schema.object({
                model: Schema.string(),
                modelType: Schema.union([
                    'LLM 大语言模型',
                    'Embeddings 嵌入模型',
                    'Reranker 重排序模型'
                ]).default('LLM 大语言模型'),
                modelCapabilities: Schema.array(
                    Schema.union([
                        ModelCapabilities.TextInput,
                        ModelCapabilities.ToolCall,
                        ModelCapabilities.ImageInput,
                        ModelCapabilities.ImageGeneration
                    ])
                )
                    .default([
                        ModelCapabilities.TextInput,
                        ModelCapabilities.ToolCall
                    ])
                    .role('checkbox'),
                contextSize: Schema.number().default(128000)
            })
        )
            .default([])
            .role('table'),
        blacklistModels: Schema.array(Schema.string()).default([])
    }),
    Schema.object({
        apiKeys: Schema.array(
            Schema.tuple([
                Schema.string().role('secret').default(''),
                Schema.string().default('https://api.openai.com/v1'),
                Schema.boolean().default(true)
            ])
        )
            .default([[]])
            .role('table'),
        additionCookies: Schema.array(
            Schema.tuple([Schema.string(), Schema.string()])
        ).default([])
    }),
    Schema.object({
        maxContextRatio: Schema.number()
            .min(0)
            .max(1)
            .step(0.0001)
            .role('slider')
            .default(0.35),
        temperature: Schema.percent().min(0).max(2).step(0.1).default(1),
        presencePenalty: Schema.number().min(-2).max(2).step(0.1).default(0),
        frequencyPenalty: Schema.number().min(-2).max(2).step(0.1).default(0),
        nonStreaming: Schema.boolean().default(false),
        responseApi: Schema.boolean().default(false)
    }),
    Schema.object({
        googleSearch: Schema.boolean().default(false),
        googleSearchSupportModel: Schema.array(Schema.string()).default([
            'gemini-2.0'
        ]),
        responseBuiltinTools: Schema.array(
            Schema.union([
                'web_search',
                'web_search_preview',
                'image_generation',
                'code_interpreter',
                'file_search'
            ])
        )
            .default([])
            .role('checkbox'),
        responseBuiltinToolSupportModel: Schema.array(Schema.string()).default([
            'gpt-4o',
            'gpt-4o-mini',
            'gpt-5.1',
            'gpt-5.2',
            'gpt-5.3',
            'gpt-5.4',
            'gpt-5.5',
            'gpt-5',
            'gpt-5-mini',
            'gpt-5-nano'
        ]),
        responseFileSearchVectorStoreIds: Schema.array(Schema.string()).default(
            []
        )
    })
]).i18n({
    'zh-CN': require('./locales/zh-CN.schema.yml'),
    'en-US': require('./locales/en-US.schema.yml')
}) as Schema<Config>

export const usage = `
## OpenAI 兼容格式适配器说明

在 apiKeys 配置中填入你的 OpenAI 兼容格式 API Key 和 API 请求地址。

**如果你没有可用的 OpenAI 格式 API，请前往以下地址注册：**

[https://api.bltcy.ai/register](https://api.bltcy.ai/register?aff=ec5e312997)

完成后记得填写：
- API Key：从注册的账号中复制
- API 请求地址：\`https://api.bltcy.ai/v1\`
`

export const inject = {
    required: ['chatluna'],
    optional: ['chatluna_storage']
}

export const name = 'chatluna-openai-like-adapter'
