import {
    AIMessage,
    BaseMessage,
    FunctionMessage,
    ToolMessage
} from '@langchain/core/messages'
import { ChainValues } from '@langchain/core/utils/types'
import { Session } from 'koishi'
import {
    ChatLunaLLMCallArg,
    ChatLunaLLMChainWrapper,
    DEFAULT_CHAT_HISTORY_PERSISTENCE_POLICY,
    SystemPrompts
} from 'koishi-plugin-chatluna/llm-core/chain/base'
import {
    ChatLunaBaseEmbeddings,
    ChatLunaChatModel,
    type ChatLunaModelCallOptions
} from 'koishi-plugin-chatluna/llm-core/platform/model'
import { ChatLunaTool } from 'koishi-plugin-chatluna/llm-core/platform/types'
import {
    AgentAction,
    AgentExecutor,
    createAgentExecutor,
    ensureToolMaskAllows,
    createToolsRef,
    intersectToolMasks,
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
import { TOOL_MEMORY_STORAGE_KEY } from 'koishi-plugin-chatluna/llm-core/memory/message'
import { computed, ComputedRef } from '@vue/reactivity'
import {
    getMessageContent,
    sanitizeToolLogValue
} from 'koishi-plugin-chatluna/utils/string'
import type { ChatLunaContextManagerService } from 'koishi-plugin-chatluna/llm-core/prompt'
import type { AgentFinishContract } from '../agent'

export interface ChatLunaPluginChainInput {
    prompt: ChatLunaChatPrompt
    historyMemory: BufferMemory
    embeddings: ChatLunaBaseEmbeddings
    agentMode?: 'tool-calling' | 'react'
    variableService: ChatLunaPromptRenderService
    preset: ComputedRef<PresetTemplate>
    contextManager: ChatLunaContextManagerService
    toolMask?: ToolMask
    finishContract?: AgentFinishContract
    toolChoice?: ChatLunaModelCallOptions['tool_choice']
}

function cloneAIMessage(
    message: AIMessage,
    toolCalls: AIMessage['tool_calls']
): AIMessage {
    return new AIMessage({
        content: message.content,
        id: message.id,
        name: message.name,
        additional_kwargs: { ...message.additional_kwargs },
        response_metadata: { ...message.response_metadata },
        tool_calls: toolCalls,
        invalid_tool_calls: [],
        usage_metadata: message.usage_metadata
    })
}

function filterHistoricalMessages(
    messages: BaseMessage[],
    allowedToolNames: string[]
): BaseMessage[] {
    const allowedNames = new Set(allowedToolNames)
    const allowedToolCallIds = new Set<string>()
    const filtered: BaseMessage[] = []

    for (const message of messages) {
        const role = message.getType()

        if (role === 'ai') {
            const aiMessage = message as AIMessage
            const nextToolCalls =
                aiMessage.tool_calls?.filter(
                    (toolCall) =>
                        toolCall?.name != null &&
                        allowedNames.has(toolCall.name)
                ) ?? []

            nextToolCalls.forEach((toolCall) => {
                if (toolCall.id) {
                    allowedToolCallIds.add(toolCall.id)
                }
            })

            if (nextToolCalls.length < 1) {
                if (
                    typeof aiMessage.content === 'string'
                        ? aiMessage.content.length > 0
                        : aiMessage.content.length > 0
                ) {
                    filtered.push(cloneAIMessage(aiMessage, []))
                }
                continue
            }

            filtered.push(cloneAIMessage(aiMessage, nextToolCalls))
            continue
        }

        if (role === 'tool') {
            const toolMessage = message as ToolMessage
            if (
                toolMessage.tool_call_id != null &&
                allowedToolCallIds.has(toolMessage.tool_call_id)
            ) {
                filtered.push(toolMessage)
            }
            continue
        }

        if (role === 'function') {
            const functionMessage = message as FunctionMessage
            if (
                functionMessage.name != null &&
                allowedNames.has(functionMessage.name)
            ) {
                filtered.push(functionMessage)
            }
            continue
        }

        filtered.push(message)
    }

    return filtered
}

function resolveAllowedHistoryToolNames(
    toolNames: string[],
    toolMask: ToolMask,
    finishToolName?: string
): string[] {
    const allowed =
        toolMask.mode === 'all'
            ? toolNames
            : toolMask.mode === 'allow'
              ? toolNames.filter((name) => toolMask.allow.includes(name))
              : toolNames.filter((name) => !toolMask.deny.includes(name))

    if (finishToolName != null && !allowed.includes(finishToolName)) {
        allowed.push(finishToolName)
    }

    return allowed
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

    finishContract?: AgentFinishContract

    toolChoice?: ChatLunaModelCallOptions['tool_choice']

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
        toolMask,
        finishContract,
        toolChoice
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
        this.finishContract = finishContract
        this.toolChoice = toolChoice

        this._toolsRef = createToolsRef({
            tools: this.tools,
            embeddings: this.embeddings,
            toolMask: this.toolMask
        })

        this.executor = this._createExecutor()
    }

    getHistoryPersistencePolicy() {
        if (this.finishContract == null) {
            return DEFAULT_CHAT_HISTORY_PERSISTENCE_POLICY
        }

        return {
            persistIntermediateAgentMessages: false,
            toolMemory: {
                enabled: true,
                storageKey: TOOL_MEMORY_STORAGE_KEY,
                maxEntries: 3,
                finishToolName: this.finishContract.toolName
            }
        }
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
            toolMask,
            finishContract,
            toolChoice
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
            toolMask,
            finishContract,
            toolChoice
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
            finishContract: this.finishContract,
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
            tool_choice?: ChatLunaModelCallOptions['tool_choice']
        } = {
            input: message
        }
        const nextVars = Object.assign({}, variables ?? {})
        const finishToolName = this.finishContract?.toolName
        const toolMask = ensureToolMaskAllows(
            intersectToolMasks(
            this.tools.value
                .map((tool) => tool.name)
                .filter((name): name is string => Boolean(name)),
            this.toolMask,
            subagentContext?.toolMask ?? callToolMask
            ),
            finishToolName ? [finishToolName] : []
        )

        const chatHistory = this.historyMemory
            .chatHistory as KoishiChatMessageHistory

        const messages = filterHistoricalMessages(
            await chatHistory.getMessages(),
            resolveAllowedHistoryToolNames(
                this.tools.value
                    .map((tool) => tool.name)
                    .filter((name): name is string => Boolean(name)),
                toolMask,
                finishToolName
            )
        )

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
        if (this.toolChoice != null) {
            requests['tool_choice'] = this.toolChoice
        }
        const overrideRequestParams =
            message.additional_kwargs?.overrideRequestParams ??
            message.additional_kwargs?.qqbot_override_request_params
        if (overrideRequestParams != null) {
            requests['overrideRequestParams'] = overrideRequestParams
        }
        const afterUserMessage =
            message.additional_kwargs?.qqbot_after_user_message
        if (afterUserMessage != null) {
            requests['after_user_message'] = afterUserMessage
        }
        const finalResponseSchema =
            message.additional_kwargs?.qqbot_final_response_schema
        if (finalResponseSchema != null) {
            requests['qqbot_final_response_schema'] = finalResponseSchema
        }
        const finalResponseInstruction =
            message.additional_kwargs?.qqbot_final_response_instruction
        if (
            typeof finalResponseInstruction === 'string' &&
            finalResponseInstruction.trim().length > 0
        ) {
            requests['qqbot_final_response_instruction'] =
                finalResponseInstruction.trim()
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

        if (signal?.aborted) {
            throw (
                signal.reason ?? new ChatLunaError(ChatLunaErrorCode.ABORTED)
            )
        }

        try {
            response = await request()
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
