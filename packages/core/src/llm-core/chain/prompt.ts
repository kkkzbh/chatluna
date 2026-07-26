/* eslint-disable max-len */
import { Document } from '@langchain/core/documents'
import {
    BaseMessage,
    HumanMessage,
    MessageContent,
    SystemMessage
} from '@langchain/core/messages'
import {
    BaseChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder
} from '@langchain/core/prompts'
import { ChainValues, PartialValues } from '@langchain/core/utils/types'
import {
    allocateBlockBudgets,
    assembleContextMessages,
    AuthorsNote,
    ChatLunaContextManagerService,
    CompiledPreset,
    ContextPresetCompileError,
    getLongMemoryQueryTrace,
    PromptContextRuntime,
    PromptDocumentCollection,
    prepareLoreBooks,
    registerAfterUserMessageMiddleware,
    registerAuthorsNoteMiddleware,
    registerChatHistoryMiddleware,
    registerInjectionsMiddleware,
    registerInputBoundaryMiddleware,
    registerLongHistoryMiddleware,
    registerLoreBooksMiddleware,
    registerReadFilesContextMiddleware,
    registerSystemPromptsMiddleware,
    measureDocumentCollectionDemand,
    MatchedLoreEntry,
    traceDocument,
    traceMessage
} from 'koishi-plugin-chatluna/llm-core/prompt'
import {
    createContextTrace,
    registerContextTrace,
    releaseContextTrace
} from 'koishi-plugin-chatluna/context-trace'
import { countMessageTokens } from '../prompt/system_prompts'
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
    getPresetKnowledgeMetadata,
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

function cloneMessageForModelTrace(
    message: BaseMessage,
    traceId: string
): BaseMessage {
    const cloned = Object.assign(
        Object.create(Object.getPrototypeOf(message)),
        message
    ) as BaseMessage
    cloned.additional_kwargs = { ...(message.additional_kwargs ?? {}) }
    cloned.response_metadata = {
        ...(message.response_metadata ?? {}),
        chatluna_context_trace: traceId
    }
    return cloned
}

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
            registerInputBoundaryMiddleware(cm)

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
        const renderConfigurable = {
            ...(configurable ?? {}),
            contextPreset: preset
        }
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
                preset.knowledgeBlocks.some(
                    (block) => block.enabled && block.sources.length > 0
                ) &&
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
        const documentCollections: PromptDocumentCollection[] =
            preset.definition.blocks.flatMap((block) => {
                if (block.type === 'longMemory' && block.enabled) {
                    return [
                        {
                            blockId: block.id,
                            documents: longHistory,
                            source: 'long_memory' as const,
                            prompt: longMemoryPrompt,
                            promptVariable: 'long_history' as const,
                            promptPath:
                                block.prompt == null
                                    ? ('runtimeDefaults.longMemoryPrompt' as const)
                                    : ('promptConfig.longMemoryPrompt' as const)
                        }
                    ]
                }
                if (block.type === 'knowledge' && block.enabled) {
                    const index = preset.knowledgeBlocks.indexOf(block)
                    return [
                        {
                            blockId: block.id,
                            documents: knowledge.filter(
                                (document) =>
                                    getPresetKnowledgeMetadata(document)
                                        ?.blockId === block.id
                            ),
                            source: `knowledge.${block.id}` as const,
                            prompt: HumanMessagePromptTemplate.fromTemplate(
                                block.prompt ?? DEFAULT_KNOWLEDGE_PROMPT
                            ),
                            promptVariable: 'knowledge' as const,
                            promptPath:
                                block.prompt == null
                                    ? ('runtimeDefaults.knowledgePrompt' as const)
                                    : (`knowledgeBlocks.${index}.prompt` as const)
                        }
                    ]
                }
                if (block.type !== 'requestDocuments' || !block.enabled) {
                    return []
                }
                return additionalDocumentCollections.map(
                    (documents, idx): PromptDocumentCollection => ({
                        blockId: block.id,
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
            })
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
        const scratchCandidate = preset.definition.blocks.find(
            (block) => block.type === 'agentScratchpad'
        )
        const scratchBlock =
            scratchCandidate?.type === 'agentScratchpad' &&
            scratchCandidate.enabled
                ? scratchCandidate
                : undefined
        if (scratchBlock == null) {
            agentScratchpad = undefined
        }
        const rendered = await this.promptRenderService.renderCompiledPreset(
            preset,
            runtimeVariables,
            { configurable: renderConfigurable }
        )
        const preparedSystemPrompts = [
            ...(rendered.messages ?? []),
            ...(instructions == null ? [] : [new SystemMessage(instructions)])
        ]
        const roleTokens = (
            await Promise.all(
                preparedSystemPrompts.map((message) =>
                    countMessageTokens(message, this.tokenCounter)
                )
            )
        ).reduce((total, tokens) => total + tokens, 0)
        const inputTokens = await countMessageTokens(input, this.tokenCounter)
        const scratchMessages =
            agentScratchpad == null
                ? []
                : Array.isArray(agentScratchpad)
                  ? agentScratchpad
                  : [agentScratchpad]
        const scratchTokens = (
            await Promise.all(
                scratchMessages.map((message) =>
                    countMessageTokens(message, this.tokenCounter)
                )
            )
        ).reduce((total, tokens) => total + tokens, 0)
        const modelLimit = this.sendTokenLimit ?? 4096
        const outputBlock = preset.definition.blocks.find(
            (block) => block.type === 'modelOutput'
        )!
        const inputLimit = modelLimit - outputBlock.maxOutputTokens
        if (inputLimit < 0) {
            throw new ContextPresetCompileError(
                'required_block_over_limit',
                'budget',
                `Output reservation ${outputBlock.maxOutputTokens} exceeds the model limit ${modelLimit}.`,
                outputBlock.id,
                modelLimit
            )
        }
        const roleBlock = preset.definition.blocks.find(
            (block) => block.type === 'role'
        )!
        if (roleTokens > inputLimit) {
            throw new ContextPresetCompileError(
                'required_block_over_limit',
                'budget',
                `Role prompt requires ${roleTokens} tokens with an input limit of ${inputLimit}.`,
                roleBlock.id,
                inputLimit
            )
        }
        const inputBlock = preset.definition.blocks.find(
            (block) => block.type === 'currentInput'
        )!
        if (roleTokens + inputTokens > inputLimit) {
            throw new ContextPresetCompileError(
                'required_block_over_limit',
                'budget',
                `Current input requires ${inputTokens} tokens after the role prompt.`,
                inputBlock.id,
                inputLimit - roleTokens
            )
        }
        if (
            scratchBlock != null &&
            scratchBlock.maxTokens != null &&
            scratchTokens > scratchBlock.maxTokens
        ) {
            throw new ContextPresetCompileError(
                'required_block_over_limit',
                'budget',
                `Agent scratchpad requires ${scratchTokens} tokens.`,
                scratchBlock.id,
                scratchBlock.maxTokens
            )
        }
        if (roleTokens + inputTokens + scratchTokens > inputLimit) {
            throw new ContextPresetCompileError(
                'required_block_over_limit',
                'budget',
                `Agent protocol boundary exceeds the remaining input budget.`,
                scratchBlock?.id ?? inputBlock.id,
                inputLimit - roleTokens - inputTokens
            )
        }
        const injections = this.contextManager.collectInjections({
            traceId: trace.traceId,
            configurable,
            afterUserMessage: agentScratchpad ? afterUserMessage : undefined,
            currentMessages: preparedSystemPrompts
        })
        const demands = new Map<string, number>()
        const preparedInjections = new Map<string, unknown>()
        const historyBlock = preset.definition.blocks.find(
            (block) => block.type === 'chatHistory' && block.enabled
        )
        if (historyBlock != null) {
            const tokens = await Promise.all(
                normalizedChatHistory.map((message) =>
                    countMessageTokens(message, this.tokenCounter)
                )
            )
            demands.set(
                historyBlock.id,
                tokens.reduce((total, value) => total + value, 0)
            )
        }
        for (const collection of documentCollections) {
            const tokens = await measureDocumentCollectionDemand(
                collection,
                normalizedChatHistory,
                this.tokenCounter
            )
            demands.set(
                collection.blockId,
                (demands.get(collection.blockId) ?? 0) + tokens
            )
        }
        for (const injection of injections.beforeScratchpad) {
            if (injection.name === 'lore_books') {
                const prepared = await prepareLoreBooks(
                    injection.value as MatchedLoreEntry[],
                    {
                        preset,
                        tokenCounter: this.tokenCounter,
                        promptRenderService: this.promptRenderService,
                        variables: runtimeVariables,
                        configurable: renderConfigurable
                    }
                )
                preparedInjections.set(injection.id, prepared)
                for (const group of prepared.groups) {
                    demands.set(
                        group.blockId,
                        (demands.get(group.blockId) ?? 0) + group.tokenCount
                    )
                }
            }
            if (injection.name === 'authors_note') {
                const note = injection.value as AuthorsNote
                const renderedNote = await this.promptRenderService
                    .renderTemplate(note.content, runtimeVariables, {
                        configurable: renderConfigurable
                    })
                    .then((value) => value.text)
                demands.set(
                    note.blockId,
                    (demands.get(note.blockId) ?? 0) +
                        (await countMessageTokens(
                            new HumanMessage(renderedNote),
                            this.tokenCounter
                        ))
                )
            }
        }
        const { budgets: blockBudgets } = allocateBlockBudgets(
            preset.definition,
            demands,
            inputLimit - roleTokens - inputTokens - scratchTokens
        )
        traceMessage(trace, input, {
            stage: 'input',
            source: {
                kind: 'input',
                name: 'current user input',
                path: `blocks.${inputBlock.id}`
            },
            tokenEstimate: inputTokens,
            status: 'candidate'
        })
        for (const message of scratchMessages) {
            traceMessage(trace, message, {
                stage: 'scratchpad',
                source: {
                    kind: 'scratchpad',
                    name: 'agent scratchpad',
                    path: `blocks.${scratchBlock!.id}`
                },
                tokenEstimate: await countMessageTokens(
                    message,
                    this.tokenCounter
                ),
                status: 'candidate'
            })
        }

        // Build the runtime that flows through the entire pipeline
        const runtime: PromptContextRuntime = {
            result: [],
            variables: runtimeVariables,
            configurable: renderConfigurable,
            usedTokens: 0,
            sendTokenLimit: inputLimit,
            requiredTailTokens: inputTokens + scratchTokens,
            blockBudgets,
            blockUsage: new Map(),
            preparedSystemPrompts,
            injections,
            tokenCounter: this.tokenCounter,
            promptRenderService: this.promptRenderService,
            preset,
            trace,
            systemPrompts: [],
            blockSegments: new Map(),
            runtimeInjectionSegments: [],
            preparedInjections,
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
            assembleContextMessages(runtime)

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

            const resultWithTrace = runtime.result.map((message) =>
                cloneMessageForModelTrace(message, trace.traceId)
            )
            registerContextTrace(trace)
            return resultWithTrace
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
