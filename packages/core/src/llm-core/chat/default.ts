import { Context } from 'koishi'
import { logger } from 'koishi-plugin-chatluna'
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service'
import { ChatLunaChatChain } from '../chain/chat_chain'
import { ChatLunaPluginChain } from '../chain/plugin_chat_chain'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import { computed } from '@vue/reactivity'
import {
    chatChainSchema,
    embeddingsSchema,
    modelSchema,
    vectorStoreSchema
} from 'koishi-plugin-chatluna/utils/schema'
import {
    createSubmitReplyPlanTool,
    REPLY_AGENT_CHAT_MODE,
    REPLY_AGENT_DEFAULT_TOOL_MASK,
    REPLY_AGENT_FINISH_CONTRACT
} from '../agent/reply_plan'

export async function defaultFactory(ctx: Context, service: PlatformService) {
    modelSchema(ctx, true)
    vectorStoreSchema(ctx)
    embeddingsSchema(ctx)
    chatChainSchema(ctx)

    ctx.on('chatluna/model-removed', (service, platform) => {
        const wrapper = ctx.chatluna.getCachedInterfaceWrapper()

        if (wrapper == null) {
            return
        }

        wrapper
            .getCachedConversations()
            .filter(
                ([_, conversation]) =>
                    conversation.room &&
                    parseRawModelName(conversation.room.model)[0] === platform
            )
            .forEach(async ([id, info]) => {
                const result = await wrapper.clearCache(info.room)

                if (result) {
                    logger?.debug(`Cleared cache for room ${id}`)
                }
            })
    })

    ctx.on('chatluna/tool-updated', () => {
        const wrapper = ctx.chatluna.getCachedInterfaceWrapper()

        if (wrapper == null) {
            return
        }

        wrapper
            .getCachedConversations()
            .filter(
                ([_, conversation]) =>
                    conversation?.chatInterface?.chatMode === 'plugin' ||
                    conversation?.chatInterface?.chatMode === 'browsing' ||
                    conversation?.chatInterface?.chatMode ===
                        REPLY_AGENT_CHAT_MODE
            )
            .forEach(async ([id, info]) => {
                const result = await wrapper.clearCache(info.room)

                if (result) {
                    logger?.debug(`Cleared cache for room ${id}`)
                }
            })
    })

    service.registerChatChain(
        'chat',
        { 'zh-CN': '聊天模式', 'en-US': 'Chat mode' },
        (params) =>
            ChatLunaChatChain.fromLLM(params.model, {
                variableService: ctx.chatluna.promptRenderer,
                contextManager: ctx.chatluna.contextManager,
                botName: params.botName,
                preset: params.preset,
                historyMemory: params.historyMemory
            })
    )

    service.registerChatChain(
        'plugin',
        {
            'zh-CN': 'Agent 模式',
            'en-US': 'Agent mode'
        },
        (params) =>
            ChatLunaPluginChain.fromLLMAndTools(
                params.model,
                getTools(service),
                {
                    variableService: ctx.chatluna.promptRenderer,
                    contextManager: ctx.chatluna.contextManager,
                    preset: params.preset,
                    historyMemory: params.historyMemory,
                    embeddings: params.embeddings,
                    agentMode: params.supportChatChain
                        ? 'tool-calling'
                        : 'react'
                }
            )
    )

    service.registerChatChain(
        REPLY_AGENT_CHAT_MODE,
        {
            'zh-CN': '回复 Agent 模式',
            'en-US': 'Reply agent mode'
        },
        (params) =>
            ChatLunaPluginChain.fromLLMAndTools(
                params.model,
                getReplyAgentTools(service),
                {
                    variableService: ctx.chatluna.promptRenderer,
                    contextManager: ctx.chatluna.contextManager,
                    preset: params.preset,
                    historyMemory: params.historyMemory,
                    embeddings: params.embeddings,
                    agentMode: params.supportChatChain
                        ? 'tool-calling'
                        : 'react',
                    toolMask: REPLY_AGENT_DEFAULT_TOOL_MASK,
                    finishContract: REPLY_AGENT_FINISH_CONTRACT
                }
            )
    )
}

function getTools(service: PlatformService) {
    const tools = service.getTools()

    return computed(() => tools.value.map((name) => service.getTool(name)))
}

function getReplyAgentTools(service: PlatformService) {
    const tools = service.getTools()

    return computed(() => [
        ...tools.value.map((name) => service.getTool(name)),
        createSubmitReplyPlanTool()
    ])
}
