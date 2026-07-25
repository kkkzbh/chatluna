/* eslint-disable max-len */
import { Document } from '@langchain/core/documents'
import {
    BaseMessage,
    HumanMessage,
    MessageContent
} from '@langchain/core/messages'
import {
    BaseChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder
} from '@langchain/core/prompts'
import { ChainValues, PartialValues } from '@langchain/core/utils/types'
import {
    ChatLunaContextManagerService,
    CompiledPreset,
    createContextTrace,
    getLongMemoryQueryTrace,
    PromptContextRuntime,
    PromptDocumentCollection,
    registerAfterUserMessageMiddleware,
    registerAuthorsNoteMiddleware,
    registerChatHistoryMiddleware,
    registerContextTrace,
    registerInjectionsMiddleware,
    registerLongHistoryMiddleware,
    registerLoreBooksMiddleware,
    registerReadFilesContextMiddleware,
    registerSystemPromptsMiddleware,
    releaseContextTrace,
    traceDocument,
    traceMessage
} from 'koishi-plugin-chatluna/llm-core/prompt'
import { logger } from 'koishi-plugin-chatluna'
import { SystemPrompts } from 'koishi-plugin-chatluna/llm-core/chain/base'
import { Logger } from 'koishi'
import { truncateMessageContentUrls } from 'koishi-plugin-chatluna/utils/langchain'
import { getMessageContent } from 'koishi-plugin-chatluna/utils/string'
import { trackLogToLocal } from 'koishi-plugin-chatluna/utils/logger'
import type {
    ChatLunaPromptRenderService,
    RenderConfigurable
} from 'koishi-plugin-chatluna/services/chat'
import { ComputedRef } from '@vue/reactivity'
import type { PresetResolution } from '../../types'
import {
    attachPresetKnowledgeDocuments,
    getPresetKnowledgeDocuments,
    hasPresetKnowledgeDocuments,
    PresetKnowledgeError,
    PresetKnowledgeService
} from '../../services/knowledge'

export interface ChatLunaChatPromptInput {
    messagesPlaceholder?: MessagesPlaceholder
    tokenCounter: (text: string) => Promise<number>
    sendTokenLimit?: number
    preset: ComputedRef<CompiledPreset>
    partialVariables?: PartialValues
    promptRenderService: ChatLunaPromptRenderService
    contextManager: ChatLunaContextManagerService
    knowledgeService: PresetKnowledgeService
}

export interface ChatLunaChatPromptFormat {
    input: BaseMessage
    chat_history: BaseMessage[] | string
    variables?: ChainValues
    agent_scratchpad?: BaseMessage[] | BaseMessage
    instructions?: string
    configurable?: RenderConfigurable
    after_user_message?: BaseMessage
}

export const DEFAULT_LONG_MEMORY_PROMPT =
    `<system>As you answer the user's questions, use the following context ` +
    `when it is relevant: <context>{long_history}</context>\n\n` +
    `Treat retrieved context as supporting material. Follow the preset ` +
    `instructions and ignore unrelated material.</system>`

export const DEFAULT_KNOWLEDGE_PROMPT =
    `<system>Relevant knowledge from the preset's configured sources: ` +
    `<knowledge>{knowledge}</knowledge>\n\n` +
    `Use relevant knowledge as supporting material and ignore unrelated ` +
    `material.</system>`

export class ChatLunaChatPrompt
    extends BaseChatPromptTemplate<ChatLunaChatPromptFormat>
    implements ChatLunaChatPromptInput
{
    preset: ComputedRef<CompiledPreset>

    tokenCounter: (text: string) => Promise<number>

    _tempPreset?: [CompiledPreset, SystemPrompts]

    sendTokenLimit?: number

    promptRenderService: ChatLunaPromptRenderService

    contextManager: ChatLunaContextManagerService

    knowledgeService: PresetKnowledgeService

    partialVariables: PartialValues = {}

    private _systemPrompts: BaseMessage[]

    private fields: ChatLunaChatPromptInput

    constructor(fields: ChatLunaChatPromptInput) {
        super({
            inputVariables: [
                'chat_history',
                'variables',
                'input',
                'agent_scratchpad',
                'instructions',
                'configurable'
            ]
        })

        this.partialVariables = fields.partialVariables

        this.tokenCounter = fields.tokenCounter

        this.sendTokenLimit = fields.sendTokenLimit ?? 4096
        this.preset = fields.preset
        this.promptRenderService = fields.promptRenderService
        this.knowledgeService = fields.knowledgeService

        if (fields.contextManager == null) {
            throw new Error('contextManager is required')
        }
        if (fields.knowledgeService == null) {
            throw new Error('knowledgeService is required')
        }

        this.contextManager = fields.contextManager
        this.fields = fields

        this._ensurePipelineRegistered()
    }

    _getPromptType() {
        return 'chatluna_chat' as const
    }

    /**
     * Register the built-in pipeline and injection middlewares on the
     * context manager. This is done once per context manager; subsequent
     * calls (including across prompt instances) are no-ops.
     */
    private _ensurePipelineRegistered() {
        const cm = this.contextManager
        if (cm == null) {
            throw new Error('contextManager is required')
        }

        cm.ensureCoreMiddlewares(() => {
            // Pipeline stages (execute in STAGE_ORDER)
            registerSystemPromptsMiddleware(cm)
            registerChatHistoryMiddleware(cm)
            registerLongHistoryMiddleware(cm)
            registerInjectionsMiddleware(cm)

            // Injection middlewares (per-name, triggered during 'injections' stage)
            registerLoreBooksMiddleware(cm)
            registerAuthorsNoteMiddleware(cm)
            registerAfterUserMessageMiddleware(cm)
            registerReadFilesContextMiddleware(cm)
        })
    }

    // -----------------------------------------------------------------------
    // Main entry point
    // -----------------------------------------------------------------------

    async formatMessages({
        chat_history: chatHistory,
        input,
        variables,
        agent_scratchpad: agentScratchpad,
        instructions,
        after_user_message: afterUserMessage,
        configurable
    }: ChatLunaChatPromptFormat) {
        instructions =
            instructions ??
            (typeof this.partialVariables?.instructions === 'function'
                ? await this.partialVariables.instructions()
                : this.partialVariables?.instructions)

        // Handle scratchpad type normalisation
        if (agentScratchpad && typeof agentScratchpad === 'string') {
            agentScratchpad = new HumanMessage(agentScratchpad)
        }

        const preset = this.preset.value
        const runtimeVariables = variables ?? {}
        const built = runtimeVariables['built'] as
            | {
                  requestId?: string
                  conversationId?: string
                  presetResolution?: PresetResolution
              }
            | undefined
        if (!hasPresetKnowledgeDocuments(runtimeVariables)) {
            const conversationId =
                configurable?.conversationId ?? built?.conversationId
            if (
                preset.knowledge != null &&
                preset.knowledge.sources.length > 0 &&
                conversationId == null
            ) {
                throw new PresetKnowledgeError(
                    'request_context',
                    'Preset knowledge resolution requires a conversation id.',
                    preset.id
                )
            }
            const rawContent = input.additional_kwargs?.['raw_content']
            const knowledge = await this.knowledgeService.resolve(preset, {
                conversationId: conversationId ?? '',
                query:
                    typeof rawContent === 'string'
                        ? rawContent
                        : getMessageContent(input.content),
                session: configurable?.session
            })
            attachPresetKnowledgeDocuments(runtimeVariables, knowledge)
        }

        // Prepare document collections
        const longHistory = (runtimeVariables['long_memory'] ??
            []) as Document[]
        const knowledge = [...getPresetKnowledgeDocuments(runtimeVariables)]
        const otherDocuments = (runtimeVariables['documents'] ??
            []) as Document[][]
        const additionalDocumentCollections =
            otherDocuments.length === 0
                ? []
                : Array.isArray(otherDocuments[0])
                  ? otherDocuments
                  : [otherDocuments as unknown as Document[]]
        const longMemoryPrompt = HumanMessagePromptTemplate.fromTemplate(
            preset.promptConfig.longMemoryPrompt ?? DEFAULT_LONG_MEMORY_PROMPT
        )
        const documentCollections: PromptDocumentCollection[] = [
            {
                documents: longHistory,
                source: 'long_memory',
                prompt: longMemoryPrompt,
                promptVariable: 'long_history',
                promptPath:
                    preset.promptConfig.longMemoryPrompt == null
                        ? 'runtimeDefaults.longMemoryPrompt'
                        : 'promptConfig.longMemoryPrompt'
            },
            {
                documents: knowledge,
                source: 'knowledge',
                prompt: HumanMessagePromptTemplate.fromTemplate(
                    preset.knowledge?.prompt ?? DEFAULT_KNOWLEDGE_PROMPT
                ),
                promptVariable: 'knowledge',
                promptPath:
                    preset.knowledge?.prompt == null
                        ? 'runtimeDefaults.knowledgePrompt'
                        : 'knowledge.prompt'
            },
            ...additionalDocumentCollections.map(
                (documents, idx): PromptDocumentCollection => ({
                    documents,
                    source: `documents.${idx}`,
                    prompt: longMemoryPrompt,
                    promptVariable: 'long_history',
                    promptPath:
                        preset.promptConfig.longMemoryPrompt == null
                            ? 'runtimeDefaults.longMemoryPrompt'
                            : 'promptConfig.longMemoryPrompt'
                })
            )
        ]
        const presetMeta = this.preset.value as CompiledPreset & {
            id?: string
            revision?: string
        }
        const trace = createContextTrace({
            requestId: built?.requestId,
            conversationId:
                configurable?.conversationId ?? built?.conversationId,
            presetId: presetMeta.id,
            presetRevision: presetMeta.revision,
            presetResolution: built?.presetResolution
        })
        const longMemoryQuery = getLongMemoryQueryTrace(runtimeVariables)
        if (longMemoryQuery != null) {
            traceDocument(trace, {
                content: longMemoryQuery.query,
                source: {
                    kind: 'long_memory',
                    name: 'long memory retrieval query',
                    path: longMemoryQuery.promptPath
                },
                tokenEstimate: await this.tokenCounter(longMemoryQuery.query),
                status: 'candidate'
            })
        }

        const normalizedChatHistory: BaseMessage[] = Array.isArray(chatHistory)
            ? chatHistory
            : typeof chatHistory === 'string'
              ? [new HumanMessage(chatHistory)]
              : []

        // Build the runtime that flows through the entire pipeline
        const runtime: PromptContextRuntime = {
            result: [],
            variables: runtimeVariables,
            configurable,
            usedTokens: 0,
            sendTokenLimit: this.sendTokenLimit ?? 4096,
            tokenCounter: this.tokenCounter,
            promptRenderService: this.promptRenderService,
            preset,
            trace,
            systemPrompts: [],
            input,
            chatHistory: normalizedChatHistory,
            documentCollections,
            agentScratchpad,
            instructions,
            afterUserMessage: agentScratchpad ? afterUserMessage : undefined
        }

        // Run the full pipeline
        if (this.contextManager == null) {
            throw new Error('contextManager is required')
        }

        try {
            await this.contextManager.runPipeline(runtime)

            for (const [idx, msg] of runtime.result.entries()) {
                const entry =
                    runtime.trace.entries.find(
                        (item) => item.messageId === msg.id
                    ) ??
                    traceMessage(runtime.trace, msg, {
                        stage: 'after_scratchpad',
                        source: {
                            kind: 'model_input',
                            name: 'unclassified model input'
                        },
                        tokenEstimate: await this.tokenCounter(
                            typeof msg.content === 'string'
                                ? msg.content
                                : JSON.stringify(msg.content)
                        ),
                        status: 'included'
                    })
                entry.assembledOrder = idx
            }
            runtime.trace.assembledMessageIds = runtime.result.map(
                (msg) => msg.id as string
            )

            // Cache system prompts for backward compat
            this._systemPrompts = runtime.systemPrompts
            this._tempPreset = [this.preset.value, this._systemPrompts]

            // Debug logging
            if (logger?.level === Logger.DEBUG) {
                logger?.debug(
                    `[Agent ${runtime.configurable?.subagentContext?.agentName || 'main'}] ` +
                        (runtime.usedTokens > runtime.sendTokenLimit
                            ? `Used tokens: ${runtime.usedTokens} exceed limit: ${runtime.sendTokenLimit}`
                            : `Used tokens: ${runtime.usedTokens}, token limit: ${runtime.sendTokenLimit}`)
                )

                const mapMessages = runtime.result.map((msg) => {
                    const original = msg?.toDict?.()

                    if (original == null) return msg

                    const content = original.data.content as MessageContent

                    if (Array.isArray(content)) {
                        original.data.content = truncateMessageContentUrls(
                            content
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        ) as any
                    }

                    return original
                })

                await trackLogToLocal(
                    'ChatLunaPrompt',
                    JSON.stringify(mapMessages),
                    logger
                )
            }

            for (const message of runtime.result) {
                message.response_metadata = {
                    ...message.response_metadata,
                    chatluna_context_trace: trace.traceId
                }
            }
            registerContextTrace(trace)
            return runtime.result
        } catch (error) {
            releaseContextTrace(trace)
            throw error
        }
    }

    get tempPreset() {
        return this._tempPreset?.[0]
    }

    async partial<NewPartialVariableName extends string>(
        values: PartialValues<NewPartialVariableName>
    ) {
        return this.partialSync(values)
    }

    partialSync<NewPartialVariableName extends string>(
        values: PartialValues<NewPartialVariableName>
    ) {
        const newInputVariables = this.inputVariables.filter(
            (iv) => !(iv in values)
        )

        const newPartialVariables = {
            ...(this.partialVariables ?? {}),
            ...values
        }
        const promptDict = {
            ...this.fields,
            inputVariables: newInputVariables,
            partialVariables: newPartialVariables
        }
        return new ChatLunaChatPrompt(promptDict)
    }
}
