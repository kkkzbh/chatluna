import { BaseMessage } from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { Session } from 'koishi'
import {
    ChatLunaLLMCallArg,
    ChatLunaLLMChainWrapper,
    SystemPrompts
} from 'koishi-plugin-chatluna/llm-core/chain/base'
import {
    ChatLunaBaseEmbeddings,
    ChatLunaChatModel
} from 'koishi-plugin-chatluna/llm-core/platform/model'
import { ChatLunaTool } from 'koishi-plugin-chatluna/llm-core/platform/types'
import {
    AgentAction,
    AgentExecutor,
    createAgentExecutor,
    createToolsRef,
    ToolMask
} from 'koishi-plugin-chatluna/llm-core/agent'
import { BufferMemory } from 'koishi-plugin-chatluna/llm-core/memory/langchain'
import { logger } from 'koishi-plugin-chatluna'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { PresetTemplate } from 'koishi-plugin-chatluna/llm-core/prompt'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import type { ChatLunaPromptRenderService } from 'koishi-plugin-chatluna/services/chat'
import { KoishiChatMessageHistory } from 'koishi-plugin-chatluna/llm-core/memory/message'
import { computed, ComputedRef } from '@vue/reactivity'
import {
    getMessageContent,
    sanitizeToolLogValue
} from 'koishi-plugin-chatluna/utils/string'
import type { ChatLunaContextManagerService } from 'koishi-plugin-chatluna/llm-core/prompt'

export interface ChatLunaPluginChainInput {
    prompt: ChatLunaChatPrompt
    historyMemory: BufferMemory
    embeddings: ChatLunaBaseEmbeddings
    agentMode?: 'tool-calling' | 'react'
    variableService: ChatLunaPromptRenderService
    preset: ComputedRef<PresetTemplate>
    contextManager: ChatLunaContextManagerService
    toolMask?: ToolMask
}

export class ChatLunaPluginChain
    extends ChatLunaLLMChainWrapper
    implements ChatLunaPluginChainInput
{
    executor: ComputedRef<AgentExecutor>

    historyMemory: BufferMemory

    systemPrompts?: SystemPrompts

    llm: ChatLunaChatModel

    embeddings: ChatLunaBaseEmbeddings

    tools: ComputedRef<ChatLunaTool[]>

    variableService: ChatLunaPromptRenderService

    prompt: ChatLunaChatPrompt

    preset: ComputedRef<PresetTemplate>

    contextManager: ChatLunaContextManagerService

    agentMode?: 'tool-calling' | 'react'

    toolMask?: ToolMask

    private _toolsRef: ReturnType<typeof createToolsRef>

    constructor({
        historyMemory,
        prompt,
        llm,
        tools,
        preset,
        embeddings,
        agentMode,
        contextManager,
        toolMask
    }: ChatLunaPluginChainInput & {
        tools: ComputedRef<ChatLunaTool[]>
        llm: ChatLunaChatModel
    }) {
        super()

        this.historyMemory = historyMemory
        this.prompt = prompt
        this.tools = tools
        this.embeddings = embeddings
        this.llm = llm
        this.agentMode = agentMode ?? 'react'
        this.preset = preset
        this.contextManager = contextManager
        this.toolMask = toolMask

        this._toolsRef = createToolsRef({
            tools: this.tools,
            embeddings: this.embeddings,
            toolMask: this.toolMask
        })

        this.executor = this._createExecutor()
    }

    static fromLLMAndTools(
        llm: ChatLunaChatModel,
        tools: ComputedRef<ChatLunaTool[]>,
        {
            historyMemory,
            preset,
            embeddings,
            agentMode,
            variableService,
            contextManager,
            toolMask
        }: Omit<ChatLunaPluginChainInput, 'prompt'>
    ): ChatLunaPluginChain {
        const prompt = new ChatLunaChatPrompt({
            preset,
            tokenCounter: (text) => llm.getNumTokens(text),
            promptRenderService: variableService,
            contextManager,
            sendTokenLimit:
                llm.invocationParams().maxTokenLimit ??
                llm.getModelMaxContextSize()
        })

        return new ChatLunaPluginChain({
            historyMemory,
            prompt,
            llm,
            agentMode,
            embeddings,
            tools,
            preset,
            variableService,
            contextManager,
            toolMask
        })
    }

    private _createExecutor() {
        return createAgentExecutor({
            llm: computed(() => this.llm),
            tools: this._toolsRef.tools,
            prompt: this.prompt,
            agentMode: this.agentMode,
            returnIntermediateSteps: this.agentMode === 'tool-calling',
            handleParsingErrors: true,
            instructions: computed(() => {
                if (this.agentMode === 'react') {
                    return this.preset.value.config.reActInstruction
                }
                return undefined
            })
        })
    }

    async call({
        message,
        signal,
        session,
        events,
        conversationId,
        variables,
        maxToken,
        messageQueue,
        onAgentEvent,
        toolMask: callToolMask,
        subagentContext
    }: ChatLunaLLMCallArg): Promise<ChainValues> {
        const requests: ChainValues & {
            chat_history?: BaseMessage[]
            id?: string
            session?: Session
        } = {
            input: message
        }
        const nextVars = Object.assign({}, variables ?? {})
        const toolMask = subagentContext?.toolMask ?? callToolMask

        const chatHistory = this.historyMemory
            .chatHistory as KoishiChatMessageHistory

        const messages = await chatHistory.getMessages()

        if (this.agentMode === 'react') {
            await chatHistory.removeAllToolAndFunctionMessages()
        }

        requests['chat_history'] = [...messages]
        requests['id'] = conversationId
        requests['variables'] = Object.assign(nextVars, {
            prompt: getMessageContent(message.content)
        })
        requests['variables']['built'] = {
            conversationId
        }
        requests['variables_hide'] = requests['variables']
        const overrideRequestParams =
            message.additional_kwargs?.overrideRequestParams ??
            message.additional_kwargs?.qqbot_override_request_params
        if (overrideRequestParams != null) {
            requests['overrideRequestParams'] = overrideRequestParams
        }
        requests['configurable'] = {
            session,
            conversationId,
            toolMask,
            subagentContext
        }

        this._toolsRef.update(session, messages.concat(message), toolMask)

        const preset = this.preset.value
        const executor = this.executor.value

        let usedToken = 0
        let response: ChainValues | undefined
        let error

        const request = () => {
            return executor.invoke(
                {
                    ...requests,
                    maxTokens: maxToken
                },
                {
                    signal,
                    callbacks: [
                        {
                            handleLLMEnd(out) {
                                usedToken +=
                                    out.llmOutput?.usage_metadata
                                        ?.total_tokens ?? 0
                            },
                            handleAgentAction(action: AgentAction) {
                                return events?.['llm-call-tool']?.(
                                    action.tool,
                                    action.toolInput,
                                    action.content,
                                    action.log
                                )
                            },
                            handleToolEnd(out) {
                                logger.debug(
                                    'Tool end:',
                                    sanitizeToolLogValue(out)
                                )
                            },
                            handleLLMNewToken(token) {
                                return events?.['llm-new-token']?.(token)
                            },
                            handleCustomEvent(name, data) {
                                if (name === 'LLMNewChunk') {
                                    return events?.['llm-new-chunk']?.(data)
                                }
                            }
                        }
                    ],
                    configurable: {
                        session,
                        model: this.llm,
                        conversationId,
                        preset: preset.triggerKeyword[0],
                        userId: session.userId,
                        toolMask,
                        messageQueue,
                        onAgentEvent,
                        subagentContext
                    }
                }
            )
        }

        for (let i = 0; i < 3; i++) {
            if (signal?.aborted) {
                throw (
                    signal.reason ??
                    new ChatLunaError(ChatLunaErrorCode.ABORTED)
                )
            }

            try {
                response = await request()
                break
            } catch (e) {
                if (
                    e instanceof ChatLunaError &&
                    e.errorCode === ChatLunaErrorCode.ABORTED
                ) {
                    throw e
                }

                if ((e as Error)?.message?.includes('Aborted')) {
                    throw new ChatLunaError(ChatLunaErrorCode.ABORTED)
                }

                logger.error(e)
                error = e
            }
        }

        await events?.['llm-used-token-count']?.(usedToken)

        if (error != null && response == null) {
            if (error instanceof ChatLunaError) {
                throw error
            } else {
                throw new ChatLunaError(
                    ChatLunaErrorCode.API_REQUEST_FAILED,
                    error
                )
            }
        }

        if (response == null) {
            throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED)
        }

        return response
    }

    get model() {
        return this.llm
    }
}
