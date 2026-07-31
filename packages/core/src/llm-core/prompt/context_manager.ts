import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage
} from '@langchain/core/messages'
import { Document } from '@langchain/core/documents'
import { HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { ChainValues } from '@langchain/core/utils/types'
import {
    CompiledPreset,
    ContextAnchor,
    ContextPresetCompileError
} from './type'
import type {
    ChatLunaPromptRenderService,
    RenderConfigurable
} from '../../services/chat'
import { Context } from 'koishi'
import { countMessageTokens } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import {
    ContextTrace,
    ContextTraceLease,
    ContextTraceStage,
    traceMessage
} from './context_trace'

// ---------------------------------------------------------------------------
// Pipeline stages – ordered from first to last
// ---------------------------------------------------------------------------

/**
 * Built-in pipeline stages executed in order during prompt assembly.
 *
 * Custom string stages are also allowed; they run after all built-in stages
 * unless an explicit order is given.
 */
export type PromptPipelineStage =
    | 'system_prompts'
    | 'after_system_prompts'
    | 'chat_history'
    | 'long_history'
    | 'injections'
    | 'input'
    | 'scratchpad'
    | 'after_scratchpad'
    | string

/** Canonical ordering for built-in stages. */
export const STAGE_ORDER: Record<string, number> = {
    system_prompts: 0,
    after_system_prompts: 50,
    chat_history: 100,
    long_history: 200,
    injections: 300,
    input: 400,
    scratchpad: 500,
    after_scratchpad: 600
}

function runtimeStageOrder(stage: PromptPipelineStage, preset: CompiledPreset) {
    if (stage === 'system_prompts') return -1
    const input = preset.definition.blocks.findIndex(
        (block) => block.type === 'currentInput'
    )
    if (stage === 'chat_history') {
        return preset.definition.blocks.findIndex(
            (block) => block.type === 'chatHistory'
        )
    }
    if (stage === 'long_history') {
        const indexes = preset.definition.blocks
            .map((block, index) =>
                block.type === 'longMemory' ||
                block.type === 'knowledge' ||
                block.type === 'requestDocuments'
                    ? index
                    : -1
            )
            .filter((index) => index >= 0)
        return indexes.length === 0 ? input - 1 : Math.min(...indexes)
    }
    if (stage === 'injections') {
        const indexes = preset.definition.blocks
            .map((block, index) =>
                block.type === 'lore' || block.type === 'authorsNote'
                    ? index
                    : -1
            )
            .filter((index) => index >= 0)
        return indexes.length === 0 ? input - 1 : Math.min(...indexes)
    }
    if (stage === 'input') return input
    return preset.definition.blocks.length + (STAGE_ORDER[stage] ?? 999)
}

// ---------------------------------------------------------------------------
// Anchor-based injection – messages anchored between two message IDs
// ---------------------------------------------------------------------------

/**
 * An injection anchored between two messages in the conversation context,
 * identified by `BaseMessage.id`.
 *
 * At collection time every message in the assembled result that lacks an
 * `.id` is stamped with a generated one.  An injection whose
 * `afterMessageId` is no longer found in the current result is immediately
 * pruned from persistent storage — it is considered permanently stale.
 *
 * If only `afterMessageId` is given, the content is inserted after that
 * message.  If only `beforeMessageId` is given, it is inserted before it.
 * If neither is given, the content is appended at the end of the stage.
 */
export interface AnchoredInjection {
    id: string
    name: string
    value: unknown

    /** Insert after the message whose `BaseMessage.id` matches. */
    afterMessageId?: string
    /** Insert before the message whose `BaseMessage.id` matches. */
    beforeMessageId?: string

    /** Pipeline stage where this injection should be applied. */
    stage: PromptPipelineStage

    /** Lower priority = earlier execution within the same stage. */
    priority: number
    createdAt: number

    /**
     * If true the injection is removed after a single collection cycle.
     * Otherwise it persists until its `afterMessageId` anchor disappears
     * from the assembled result or it is explicitly removed.
     */
    once?: boolean
}

// ---------------------------------------------------------------------------
// Runtime context that flows through the entire pipeline
// ---------------------------------------------------------------------------

export interface PromptContextRuntime {
    /** The final message array being assembled (mutated in place). */
    result: BaseMessage[]

    /** Template / chat variables. */
    variables: ChainValues

    /** Per-request configurable (session, conversationId, …). */
    configurable?: RenderConfigurable

    /** Running token count consumed so far. */
    usedTokens: number

    /** Hard ceiling for the whole prompt. */
    sendTokenLimit: number

    /** Required input/scratchpad tokens reserved before optional blocks. */
    requiredTailTokens: number

    /** Per-block optional token capacities allocated by budget priority. */
    blockBudgets: Map<string, number>

    /** Per-block optional token consumption. */
    blockUsage: Map<string, number>

    /** Preset messages rendered once before the pipeline starts. */
    preparedSystemPrompts: BaseMessage[]

    /** Request injections leased once during budget planning. */
    injections: PromptContextInjectionCollection

    /** Counts tokens for an arbitrary string. */
    tokenCounter: (text: string) => Promise<number>

    /** Render service for template expansion. */
    promptRenderService: ChatLunaPromptRenderService

    /** The preset in use for this request. */
    preset: CompiledPreset

    /** Request-scoped provenance and budget trace. */
    trace: ContextTrace

    /** Rendered preset messages used by anchored insertion. */
    systemPrompts: BaseMessage[]

    /** Messages emitted by each stored context block. */
    blockSegments: Map<string, BaseMessage[]>

    /** Runtime-owned message segments emitted by generic injections. */
    runtimeInjectionSegments: {
        injection: AnchoredInjection
        messages: BaseMessage[]
    }[]

    /** Request-local prepared injection payloads. */
    preparedInjections: Map<string, unknown>

    // -- Inputs provided by the caller (ChatLunaChatPrompt.formatMessages) --

    /** The current user input message. */
    input?: BaseMessage

    /** Raw chat history before truncation. */
    chatHistory?: BaseMessage[]

    /** Document collections with their explicit rendering contracts. */
    documentCollections?: PromptDocumentCollection[]

    /** Agent scratchpad messages, if any. */
    agentScratchpad?: BaseMessage[] | BaseMessage

    /** Instructions (e.g. partial variable). */
    instructions?: string

    /** Message inserted after user message in agent mode. */
    afterUserMessage?: BaseMessage
}

export interface PromptDocumentCollection {
    blockId: string
    documents: Document[]
    source: 'long_memory' | `knowledge.${string}` | `documents.${number}`
    prompt: HumanMessagePromptTemplate
    promptVariable: 'long_history' | 'knowledge'
    promptPath:
        | 'promptConfig.longMemoryPrompt'
        | `knowledgeBlocks.${number}.prompt`
        | 'runtimeDefaults.longMemoryPrompt'
        | 'runtimeDefaults.knowledgePrompt'
}

export function claimBlockTokens(
    runtime: PromptContextRuntime,
    blockId: string,
    tokens: number
) {
    const used = runtime.blockUsage.get(blockId) ?? 0
    const limit = runtime.blockBudgets.get(blockId) ?? 0
    if (
        used + tokens > limit ||
        runtime.usedTokens + runtime.requiredTailTokens + tokens >
            runtime.sendTokenLimit
    ) {
        return false
    }
    runtime.blockUsage.set(blockId, used + tokens)
    runtime.usedTokens += tokens
    return true
}

export function appendBlockMessages(
    runtime: PromptContextRuntime,
    blockId: string,
    messages: BaseMessage[]
) {
    const segment = runtime.blockSegments.get(blockId)
    if (segment == null) {
        runtime.blockSegments.set(blockId, [...messages])
        return
    }
    segment.push(...messages)
}

export function assembleContextMessages(runtime: PromptContextRuntime) {
    const definition = runtime.preset.definition
    const definitionIndex = new Map(
        definition.blocks.map((block, index) => [block.id, index] as const)
    )
    const before = new Map<string, string[]>()
    const after = new Map<string, string[]>()
    const roleAnchors: { blockId: string; anchor: ContextAnchor }[] = []
    const historyAnchors: { blockId: string; anchor: ContextAnchor }[] = []
    const anchored = new Set<string>()

    for (const block of definition.blocks) {
        if (block.type !== 'lore' && block.type !== 'authorsNote') continue
        anchored.add(block.id)
        if (block.anchor.type === 'role') {
            roleAnchors.push({ blockId: block.id, anchor: block.anchor })
            continue
        }
        if (block.anchor.type === 'chatHistory') {
            historyAnchors.push({ blockId: block.id, anchor: block.anchor })
            continue
        }
        const target = block.anchor.position === 'before' ? before : after
        const children = target.get(block.anchor.blockId) ?? []
        children.push(block.id)
        target.set(block.anchor.blockId, children)
    }

    const sortByDefinition = (ids: string[]) =>
        ids.sort(
            (left, right) =>
                definitionIndex.get(left)! - definitionIndex.get(right)!
        )
    for (const ids of before.values()) sortByDefinition(ids)
    for (const ids of after.values()) sortByDefinition(ids)
    roleAnchors.sort(
        (left, right) =>
            definitionIndex.get(left.blockId)! -
            definitionIndex.get(right.blockId)!
    )
    historyAnchors.sort(
        (left, right) =>
            definitionIndex.get(left.blockId)! -
            definitionIndex.get(right.blockId)!
    )

    const emit = (blockId: string): BaseMessage[] => [
        ...(before.get(blockId) ?? []).flatMap(emit),
        ...(runtime.blockSegments.get(blockId) ?? []),
        ...(after.get(blockId) ?? []).flatMap(emit)
    ]

    const roleBlock = definition.blocks.find((block) => block.type === 'role')!
    const roleMessages = runtime.blockSegments.get(roleBlock.id) ?? []
    const roleInsertions = new Map<number, BaseMessage[]>()
    for (const { blockId, anchor } of roleAnchors) {
        const index = findRoleAnchorIndex(roleMessages, anchor)
        const messages = roleInsertions.get(index) ?? []
        messages.push(...emit(blockId))
        roleInsertions.set(index, messages)
    }
    if (roleInsertions.size > 0) {
        const merged: BaseMessage[] = []
        for (let index = 0; index <= roleMessages.length; index++) {
            merged.push(...(roleInsertions.get(index) ?? []))
            if (index < roleMessages.length) merged.push(roleMessages[index])
        }
        runtime.blockSegments.set(roleBlock.id, merged)
    }

    const historyBlock = definition.blocks.find(
        (block) => block.type === 'chatHistory' && block.enabled
    )
    if (historyBlock != null && historyAnchors.length > 0) {
        const historyMessages = runtime.blockSegments.get(historyBlock.id) ?? []
        const historyInsertions = new Map<number, BaseMessage[]>()
        for (const { blockId, anchor } of historyAnchors) {
            const depth = anchor.type === 'chatHistory' ? anchor.depth : 0
            const index = Math.max(0, historyMessages.length - depth)
            const messages = historyInsertions.get(index) ?? []
            messages.push(...emit(blockId))
            historyInsertions.set(index, messages)
        }
        const merged: BaseMessage[] = []
        for (let index = 0; index <= historyMessages.length; index++) {
            merged.push(...(historyInsertions.get(index) ?? []))
            if (index < historyMessages.length) {
                merged.push(historyMessages[index])
            }
        }
        runtime.blockSegments.set(historyBlock.id, merged)
    }

    const result = definition.blocks
        .filter((block) => !anchored.has(block.id))
        .flatMap((block) => emit(block.id))
    const inputBlock = definition.blocks.find(
        (block) => block.type === 'currentInput'
    )!
    const inputMessages = new Set(
        runtime.blockSegments.get(inputBlock.id) ?? []
    )
    const roleSegment = new Set(runtime.blockSegments.get(roleBlock.id) ?? [])
    const afterAnchorOffsets = new Map<string, number>()
    let afterRoleOffset = 0

    for (const segment of runtime.runtimeInjectionSegments) {
        const { injection, messages } = segment
        if (injection.afterMessageId != null) {
            const anchorIndex = result.findIndex(
                (message) => message.id === injection.afterMessageId
            )
            const offset = afterAnchorOffsets.get(injection.afterMessageId) ?? 0
            const index =
                anchorIndex < 0 ? result.length : anchorIndex + 1 + offset
            result.splice(index, 0, ...messages)
            afterAnchorOffsets.set(
                injection.afterMessageId,
                offset + messages.length
            )
            continue
        }
        if (injection.beforeMessageId != null) {
            const index = result.findIndex(
                (message) => message.id === injection.beforeMessageId
            )
            result.splice(index < 0 ? result.length : index, 0, ...messages)
            continue
        }
        if (injection.stage === 'after_scratchpad') {
            result.push(...messages)
            continue
        }
        if (injection.stage === 'after_system_prompts') {
            let lastRoleIndex = -1
            for (let index = result.length - 1; index >= 0; index--) {
                if (roleSegment.has(result[index])) {
                    lastRoleIndex = index
                    break
                }
            }
            const index =
                lastRoleIndex < 0
                    ? afterRoleOffset
                    : lastRoleIndex + 1 + afterRoleOffset
            result.splice(index, 0, ...messages)
            afterRoleOffset += messages.length
            continue
        }
        const inputIndex = result.findIndex((message) =>
            inputMessages.has(message)
        )
        result.splice(
            inputIndex < 0 ? result.length : inputIndex,
            0,
            ...messages
        )
    }

    runtime.result = result
}

function findRoleAnchorIndex(messages: BaseMessage[], anchor: ContextAnchor) {
    if (anchor.type !== 'role') return messages.length
    const purposeIndex = (purpose: string) =>
        messages.findIndex(
            (message) => message.additional_kwargs?.purpose === purpose
        )
    const description = purposeIndex('description')
    const personality = purposeIndex('personality')
    const scenario = purposeIndex('scenario')
    const exampleStart = purposeIndex('exampleStart')
    const exampleEnd = purposeIndex('exampleEnd')
    const firstMessage = purposeIndex('firstMessage')
    const characterStart = [description, personality]
        .filter((index) => index >= 0)
        .sort((left, right) => left - right)[0]
    const characterEnd = Math.max(description, personality)

    if (anchor.position === 'beforeCharacterDefinitions') {
        return characterStart ?? 0
    }
    if (anchor.position === 'afterCharacterDefinitions') {
        return characterEnd >= 0 ? characterEnd + 1 : messages.length
    }
    if (anchor.position === 'beforeScenario') {
        return scenario >= 0
            ? scenario
            : characterEnd >= 0
              ? characterEnd + 1
              : messages.length
    }
    if (anchor.position === 'afterScenario') {
        return scenario >= 0
            ? scenario + 1
            : characterEnd >= 0
              ? characterEnd + 1
              : messages.length
    }
    if (anchor.position === 'beforeExampleMessages') {
        if (exampleStart >= 0) return exampleStart
        if (firstMessage >= 0) return firstMessage
        if (scenario >= 0) return scenario + 1
        return characterEnd >= 0 ? characterEnd + 1 : messages.length
    }
    if (exampleEnd >= 0) return exampleEnd + 1
    if (firstMessage >= 0) return firstMessage + 1
    return messages.length
}

// ---------------------------------------------------------------------------
// Middleware types
// ---------------------------------------------------------------------------

export interface PromptContextMiddlewareContext {
    injection: AnchoredInjection
    runtime: PromptContextRuntime
    handled: boolean
    markHandled: () => void

    /** Helper to convert raw values to messages and push onto result. */
    appendMessages: (
        input: BaseMessage | BaseMessage[] | string | string[]
    ) => BaseMessage[]

    /**
     * Insert messages at the anchor position described by the injection.
     * Returns the index where the first message was inserted.
     */
    insertAtAnchor: (messages: BaseMessage | BaseMessage[]) => number
}

export type PromptContextMiddleware = (
    context: PromptContextMiddlewareContext,
    next: () => Promise<void>
) => Promise<void>

interface PromptContextMiddlewareWithPriority {
    middleware: PromptContextMiddleware
    priority: number
}

// ---------------------------------------------------------------------------
// Pipeline middleware — one per stage
// ---------------------------------------------------------------------------

/**
 * A pipeline middleware handles an entire stage of prompt assembly.
 *
 * Unlike injection middlewares (which handle a single `AnchoredInjection`),
 * pipeline middlewares are responsible for a whole stage and receive the full
 * runtime context to produce their output.
 */
export type PromptPipelineMiddleware = (
    runtime: PromptContextRuntime,
    next: () => Promise<void>
) => Promise<void>

export interface PipelineMiddlewareEntry {
    stage: PromptPipelineStage
    middleware: PromptPipelineMiddleware
    priority: number
}

// ---------------------------------------------------------------------------
// Inject options
// ---------------------------------------------------------------------------

export interface InjectPromptContextOptions {
    name: string
    value: unknown
    conversationId?: string
    stage?: PromptPipelineStage

    /**
     * Anchor: insert after the message whose `BaseMessage.id` equals this
     * value.  The injection is considered stale and will be pruned the
     * moment this message is no longer present in the assembled result.
     */
    afterMessageId?: string

    /**
     * Anchor: insert before the message whose `BaseMessage.id` equals this
     * value.
     */
    beforeMessageId?: string

    /** If true the injection is consumed after one collection cycle. */
    once?: boolean

    priority?: number
}

export interface PlainPromptMessage {
    role?: 'system' | 'human' | 'ai' | 'assistant'
    type?: 'system' | 'human' | 'ai' | 'assistant'
    content: unknown
    name?: string
    id?: string
    additional_kwargs?: Record<string, unknown>
    response_metadata?: Record<string, unknown>
    tool_calls?: unknown
    tool_call_id?: string
}

// ---------------------------------------------------------------------------
// Collect options (passed by ChatLunaChatPrompt.formatMessages)
// ---------------------------------------------------------------------------

export interface CollectPromptContextOptions {
    traceId: string
    configurable?: RenderConfigurable
    afterUserMessage?: BaseMessage
    /**
     * The messages assembled so far in the current pipeline run (i.e.
     * `runtime.result` at the moment the injections stage fires).
     *
     * `collectInjections` will:
     * 1. Stamp a generated `id` on any message that has none.
     * 2. Build the live id set from these messages.
     * 3. Prune persistent injections whose `afterMessageId` is no longer
     *    present — they are dropped from storage immediately.
     */
    currentMessages: BaseMessage[]
}

export interface PromptContextInjectionCollection {
    beforeScratchpad: AnchoredInjection[]
    afterScratchpad: AnchoredInjection[]
    onceInjectionLease?: ContextTraceLease
}

// ==========================================================================
// ChatLunaContextManagerService
// ==========================================================================

export class ChatLunaContextManagerService {
    // -- injection middlewares (per-name, handles a single AnchoredInjection) --
    private _middlewares = new Map<
        string,
        PromptContextMiddlewareWithPriority[]
    >()

    // -- pipeline middlewares (per-stage, handles the whole stage) --
    private _pipelineMiddlewares: PipelineMiddlewareEntry[] = []

    // -- storage --
    private _conversationPersistent = new Map<string, AnchoredInjection[]>()
    private _conversationQueue = new Map<string, AnchoredInjection[]>()
    private _onceInjectionLeases = new Map<string, string>()

    private _skillProviders = new Set<unknown>()

    private _coreRegistered = false

    ensureCoreMiddlewares(register: () => void): void {
        if (this._coreRegistered) return
        this._coreRegistered = true
        register()
    }

    constructor(ctx: Context) {
        const clearQueue = (conversationId: string) => {
            this._clearQueuedInjections(conversationId)
        }

        ctx.on('chatluna/after-conversation-clear-history', async (payload) =>
            this.clearConversation(payload.conversation.id)
        )
        ctx.on('chatluna/after-conversation-archive', async (payload) =>
            clearQueue(payload.conversation.id)
        )
        ctx.on('chatluna/after-conversation-restore', async (payload) =>
            clearQueue(payload.conversation.id)
        )
        ctx.on('chatluna/after-conversation-delete', async (payload) =>
            this.clearConversation(payload.conversation.id)
        )
    }

    // -----------------------------------------------------------------------
    // Pipeline middleware registration
    // -----------------------------------------------------------------------

    /**
     * Register a pipeline middleware for a given stage.
     *
     * Pipeline middlewares execute in `(stage-order, priority)` order.
     * Lower priority = earlier within the same stage.
     *
     * Returns a disposer function.
     */
    pipeline(
        stage: PromptPipelineStage,
        middleware: PromptPipelineMiddleware,
        priority = 0
    ): () => void {
        const entry: PipelineMiddlewareEntry = { stage, middleware, priority }
        this._pipelineMiddlewares.push(entry)
        this._pipelineMiddlewares.sort((a, b) => {
            const sa = STAGE_ORDER[a.stage] ?? 999
            const sb = STAGE_ORDER[b.stage] ?? 999
            if (sa !== sb) return sa - sb
            return a.priority - b.priority
        })

        return () => {
            const idx = this._pipelineMiddlewares.indexOf(entry)
            if (idx !== -1) this._pipelineMiddlewares.splice(idx, 1)
        }
    }

    /**
     * Execute the full pipeline.  Each registered pipeline middleware is
     * called in order.  The `next()` function advances to the next
     * middleware.
     */
    async runPipeline(runtime: PromptContextRuntime): Promise<void> {
        const entries = [...this._pipelineMiddlewares].sort(
            (left, right) =>
                runtimeStageOrder(left.stage, runtime.preset) -
                    runtimeStageOrder(right.stage, runtime.preset) ||
                left.priority - right.priority
        )
        let index = -1

        const dispatch = async (step: number): Promise<void> => {
            if (step <= index) {
                throw new Error('Pipeline middleware called next() twice')
            }
            index = step
            const current = entries[step]
            if (!current) return
            const before = new Set(runtime.result)
            const capture = () => {
                const stored = new Set(
                    [...runtime.blockSegments.values()].flat()
                )
                const runtimeOwned = new Set(
                    runtime.runtimeInjectionSegments.flatMap(
                        (segment) => segment.messages
                    )
                )
                const messages = runtime.result.filter(
                    (message) =>
                        !before.has(message) &&
                        !stored.has(message) &&
                        !runtimeOwned.has(message)
                )
                if (messages.length === 0) return
                runtime.runtimeInjectionSegments.push({
                    injection: {
                        id: `pipeline-${step}-${current.stage}`,
                        name: `pipeline-${current.stage}`,
                        value: messages,
                        stage: current.stage,
                        priority: current.priority,
                        createdAt: step
                    },
                    messages
                })
            }
            await current.middleware(runtime, async () => {
                capture()
                await dispatch(step + 1)
            })
            capture()
        }

        await dispatch(0)
    }

    // -----------------------------------------------------------------------
    // Injection middleware registration (per-name)
    // -----------------------------------------------------------------------

    intercept(
        name: string,
        middleware: PromptContextMiddleware,
        priority = 0
    ): () => void {
        const wrappers = this._middlewares.get(name) ?? []
        const wrapper = { middleware, priority }

        const insertAt = wrappers.findIndex((item) => item.priority > priority)
        if (insertAt === -1) {
            wrappers.push(wrapper)
        } else {
            wrappers.splice(insertAt, 0, wrapper)
        }

        this._middlewares.set(name, wrappers)

        return () => {
            const current = this._middlewares.get(name)
            if (!current) return
            const idx = current.findIndex(
                (item) => item.middleware === middleware
            )
            if (idx === -1) return
            if (current.length === 1) {
                this._middlewares.delete(name)
            } else {
                current.splice(idx, 1)
            }
        }
    }

    replace(name: string, middleware: PromptContextMiddleware): () => void {
        this._middlewares.set(name, [{ middleware, priority: 0 }])
        return () => this._middlewares.delete(name)
    }

    has(name: string): boolean {
        const wrappers = this._middlewares.get(name)
        return wrappers != null && wrappers.length > 0
    }

    // -----------------------------------------------------------------------
    // Injection storage
    // -----------------------------------------------------------------------

    /**
     * Inject content into a conversation's context.
     *
     * Content can be anchored between two messages (by message ID).  As long
     * as both anchor messages exist in the assembled prompt, the injection
     * will be placed between them.
     *
     * If `once` is true the injection is consumed after one collection.
     * Otherwise it persists until the anchor messages are gone or it is
     * cleared.
     */
    inject(options: InjectPromptContextOptions): void {
        const injection = this._createInjection(options)

        if (!options.conversationId) return

        const store = options.once
            ? this._conversationQueue
            : this._conversationPersistent

        this._addToStore(store, options.conversationId, injection)
    }

    /**
     * Remove a specific persistent injection by id.
     */
    removeInjection(conversationId: string, injectionId: string): boolean {
        const list = this._conversationPersistent.get(conversationId)
        if (!list) return false
        const idx = list.findIndex((item) => item.id === injectionId)
        if (idx === -1) return false
        list.splice(idx, 1)
        return true
    }

    // -----------------------------------------------------------------------
    // Collecting injections for the current prompt render
    // -----------------------------------------------------------------------

    collectInjections({
        traceId,
        configurable,
        afterUserMessage,
        currentMessages
    }: CollectPromptContextOptions): PromptContextInjectionCollection {
        const conversationId = configurable?.conversationId

        // Step 1: stamp ids on any message that lacks one.
        for (const msg of currentMessages) {
            if (!msg.id) {
                msg.id = this._createId()
            }
        }

        // Step 2: build the live id set from the already-assembled result.
        const liveIds = new Set(
            currentMessages.map((m) => m.id).filter(Boolean)
        )

        const collected: AnchoredInjection[] = []
        let onceInjectionLease: ContextTraceLease | undefined

        if (conversationId) {
            const persistent =
                this._conversationPersistent.get(conversationId) ?? []

            // Step 3: prune persistent injections whose anchor references
            // are no longer present in the live result.
            const alive = persistent.filter((inj) => {
                if (inj.beforeMessageId && !liveIds.has(inj.beforeMessageId)) {
                    return false
                }
                if (!inj.afterMessageId) return true
                return liveIds.has(inj.afterMessageId)
            })

            if (alive.length !== persistent.length) {
                this._conversationPersistent.set(conversationId, alive)
            }

            collected.push(...alive)

            const queued = this._conversationQueue.get(conversationId) ?? []
            const leased = queued.filter((injection) => {
                const owner = this._onceInjectionLeases.get(injection.id)
                if (owner != null) return owner === traceId
                this._onceInjectionLeases.set(injection.id, traceId)
                return true
            })
            collected.push(...leased)

            if (leased.length > 0) {
                const injectionIds = new Set(
                    leased.map((injection) => injection.id)
                )
                let settled = false
                onceInjectionLease = {
                    commit: () => {
                        if (settled) return
                        settled = true
                        const current =
                            this._conversationQueue.get(conversationId) ?? []
                        const remaining = current.filter(
                            (injection) =>
                                !injectionIds.has(injection.id) ||
                                this._onceInjectionLeases.get(injection.id) !==
                                    traceId
                        )
                        if (remaining.length > 0) {
                            this._conversationQueue.set(
                                conversationId,
                                remaining
                            )
                        } else {
                            this._conversationQueue.delete(conversationId)
                        }
                        for (const injectionId of injectionIds) {
                            if (
                                this._onceInjectionLeases.get(injectionId) ===
                                traceId
                            ) {
                                this._onceInjectionLeases.delete(injectionId)
                            }
                        }
                    },
                    release: () => {
                        if (settled) return
                        settled = true
                        for (const injectionId of injectionIds) {
                            if (
                                this._onceInjectionLeases.get(injectionId) ===
                                traceId
                            ) {
                                this._onceInjectionLeases.delete(injectionId)
                            }
                        }
                    }
                }
            }
        }

        if (afterUserMessage) {
            collected.push(
                this._createInjection({
                    name: 'after_user_message',
                    value: afterUserMessage,
                    stage: 'after_scratchpad'
                })
            )
        }

        collected.sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority
            return a.createdAt - b.createdAt
        })

        return {
            beforeScratchpad: collected.filter(
                (item) =>
                    item.stage !== 'after_scratchpad' &&
                    item.stage !== 'scratchpad'
            ),
            afterScratchpad: collected.filter(
                (item) => item.stage === 'after_scratchpad'
            ),
            onceInjectionLease
        }
    }

    // -----------------------------------------------------------------------
    // Applying injections (runs per-name middleware chains)
    // -----------------------------------------------------------------------

    async applyInjections(
        injections: AnchoredInjection[],
        runtime: PromptContextRuntime
    ): Promise<PromptContextRuntime> {
        for (const injection of injections) {
            await this._applySingleInjection(injection, runtime)
        }
        return runtime
    }

    // -----------------------------------------------------------------------
    // Anchor helpers – find position by message ID
    // -----------------------------------------------------------------------

    /**
     * Find the index in `messages` where content anchored by
     * `afterMessageId` / `beforeMessageId` should be inserted.
     *
     * Matches against `BaseMessage.id`.  Returns the splice index.
     */
    static findAnchorIndex(
        messages: BaseMessage[],
        afterMessageId?: string,
        beforeMessageId?: string
    ): number {
        if (afterMessageId) {
            const idx = messages.findIndex((m) => m.id === afterMessageId)
            if (idx !== -1) return idx + 1
        }

        if (beforeMessageId) {
            const idx = messages.findIndex((m) => m.id === beforeMessageId)
            if (idx !== -1) return idx
        }

        // Fallback: append at the end
        return messages.length
    }

    /**
     * Return true when all specified anchor messages are present in
     * `messages` (matched by `BaseMessage.id`).
     */
    static anchorsExist(
        messages: BaseMessage[],
        afterMessageId?: string,
        beforeMessageId?: string
    ): boolean {
        if (!afterMessageId && !beforeMessageId) return true

        const ids = new Set(messages.map((m) => m.id).filter(Boolean))

        if (afterMessageId && !ids.has(afterMessageId)) return false
        if (beforeMessageId && !ids.has(beforeMessageId)) return false

        return true
    }

    // -----------------------------------------------------------------------
    // Cleanup
    // -----------------------------------------------------------------------

    clearConversation(conversationId: string): void {
        this._clearQueuedInjections(conversationId)
        this._conversationPersistent.delete(conversationId)
    }

    clearAll(): void {
        this._conversationQueue.clear()
        this._onceInjectionLeases.clear()
        this._conversationPersistent.clear()
    }

    registerSkillProvider(provider: unknown): () => void {
        this._skillProviders.add(provider)
        return () => {
            this._skillProviders.delete(provider)
        }
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private _createInjection(
        options: InjectPromptContextOptions
    ): AnchoredInjection {
        return {
            id: this._createId(),
            name: options.name,
            value: options.value,
            afterMessageId: options.afterMessageId,
            beforeMessageId: options.beforeMessageId,
            stage: options.stage ?? this._resolveDefaultStage(options.name),
            createdAt: Date.now(),
            priority: options.priority ?? 0,
            once: options.once
        }
    }

    private _resolveDefaultStage(name: string): PromptPipelineStage {
        if (name === 'after_user_message' || name === 'tool_observation') {
            return 'after_scratchpad'
        }
        return 'injections'
    }

    private _createId(): string {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    }

    private _addToStore(
        store: Map<string, AnchoredInjection[]>,
        key: string,
        injection: AnchoredInjection
    ): void {
        const current = store.get(key)
        if (!current) {
            store.set(key, [injection])
            return
        }
        current.push(injection)
    }

    private _clearQueuedInjections(conversationId: string): void {
        const queued = this._conversationQueue.get(conversationId) ?? []
        for (const injection of queued) {
            this._onceInjectionLeases.delete(injection.id)
        }
        this._conversationQueue.delete(conversationId)
    }

    private async _applySingleInjection(
        injection: AnchoredInjection,
        runtime: PromptContextRuntime
    ): Promise<void> {
        const before = new Set(runtime.result)
        const wrappers = [
            ...(this._middlewares.get('*') ?? []),
            ...(this._middlewares.get(injection.name) ?? [])
        ]

        const context: PromptContextMiddlewareContext = {
            injection,
            runtime,
            handled: false,
            markHandled: () => {
                context.handled = true
            },
            appendMessages: (
                input: BaseMessage | BaseMessage[] | string | string[]
            ) => {
                const messages = toMessages(input)
                if (messages.length > 0) {
                    runtime.result.push(...messages)
                }
                return messages
            },
            insertAtAnchor: (input: BaseMessage | BaseMessage[]) => {
                const messages = Array.isArray(input) ? input : [input]
                if (messages.length === 0) return runtime.result.length

                const idx = ChatLunaContextManagerService.findAnchorIndex(
                    runtime.result,
                    injection.afterMessageId,
                    injection.beforeMessageId
                )
                runtime.result.splice(idx, 0, ...messages)
                return idx
            }
        }

        if (wrappers.length > 0) {
            let index = -1
            const dispatch = async (step: number): Promise<void> => {
                if (step <= index) {
                    throw new Error(
                        'Prompt context middleware called next() twice'
                    )
                }
                index = step
                const current = wrappers[step]
                if (!current) return
                await current.middleware(context, () => dispatch(step + 1))
            }
            await dispatch(0)
        }

        if (!context.handled) {
            const messages = toMessages(injection.value)
            if (messages.length > 0) {
                if (injection.afterMessageId || injection.beforeMessageId) {
                    context.insertAtAnchor(messages)
                } else {
                    runtime.result.push(...messages)
                }
            }
        }

        const addedMessages = runtime.result.filter(
            (message) => !before.has(message)
        )
        const tokenEstimates = new Map<BaseMessage, number>()
        const blockOwned =
            injection.name === 'lore_books' || injection.name === 'authors_note'
        if (!blockOwned && addedMessages.length > 0) {
            const tokenCounts = await Promise.all(
                addedMessages.map((message) =>
                    countMessageTokens(message, runtime.tokenCounter)
                )
            )
            const tokens = tokenCounts.reduce(
                (total, tokenCount) => total + tokenCount,
                0
            )
            const remaining =
                runtime.sendTokenLimit -
                runtime.usedTokens -
                runtime.requiredTailTokens
            if (tokens > remaining) {
                for (const message of addedMessages) {
                    const index = runtime.result.indexOf(message)
                    if (index >= 0) runtime.result.splice(index, 1)
                }
                throw new ContextPresetCompileError(
                    'required_block_over_limit',
                    'budget',
                    `Runtime injection ${injection.name} requires ${tokens} tokens with ${Math.max(0, remaining)} remaining.`,
                    `runtime-${injection.name}`,
                    Math.max(0, remaining)
                )
            }
            for (const [index, message] of addedMessages.entries()) {
                tokenEstimates.set(message, tokenCounts[index])
            }
            runtime.usedTokens += tokens
            runtime.runtimeInjectionSegments.push({
                injection,
                messages: addedMessages
            })
        }

        const stage: ContextTraceStage =
            injection.stage === 'after_scratchpad'
                ? 'after_scratchpad'
                : injection.stage === 'scratchpad'
                  ? 'scratchpad'
                  : 'injections'
        const kind =
            injection.name === 'lore_books'
                ? ('lore' as const)
                : injection.name === 'authors_note'
                  ? ('authors_note' as const)
                  : ('injection' as const)

        for (const msg of runtime.result) {
            if (before.has(msg)) continue
            if (
                runtime.trace.entries.some(
                    (entry) =>
                        entry.messageId === msg.id && entry.role !== 'document'
                )
            ) {
                continue
            }
            traceMessage(runtime.trace, msg, {
                stage,
                source: {
                    kind,
                    name: injection.name,
                    path: `injections.${injection.id}`
                },
                tokenEstimate:
                    tokenEstimates.get(msg) ??
                    (await countMessageTokens(msg, runtime.tokenCounter)),
                status: 'included'
            })
        }
    }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export function toMessages(input: unknown): BaseMessage[] {
    if (input == null) return []

    if (Array.isArray(input)) {
        return input.flatMap((item) => toMessages(item))
    }

    if (input instanceof BaseMessage) return [input]

    if (isPlainPromptMessage(input)) {
        return createMessageFromPlainObject(input)
    }

    if (typeof input === 'string') {
        if (input.trim().length < 1) return []
        return [new HumanMessage(input)]
    }

    return []
}

function isPlainPromptMessage(input: unknown): input is PlainPromptMessage {
    if (input == null || typeof input !== 'object' || Array.isArray(input)) {
        return false
    }

    if (!('content' in input)) {
        return false
    }

    const role =
        typeof (input as PlainPromptMessage).role === 'string'
            ? (input as PlainPromptMessage).role
            : typeof (input as PlainPromptMessage).type === 'string'
              ? (input as PlainPromptMessage).type
              : undefined

    return (
        role === 'system' ||
        role === 'human' ||
        role === 'ai' ||
        role === 'assistant'
    )
}

function createMessageFromPlainObject(
    input: PlainPromptMessage
): BaseMessage[] {
    const content =
        typeof input.content === 'string'
            ? input.content
            : String(input.content ?? '')
    if (content.trim().length < 1) return []

    const role = input.role ?? input.type
    const baseFields = {
        content,
        name: input.name,
        id: input.id,
        additional_kwargs: input.additional_kwargs,
        response_metadata: input.response_metadata
    }

    switch (role) {
        case 'system':
            return [new SystemMessage(baseFields)]
        case 'human':
            return [new HumanMessage(baseFields)]
        case 'ai':
        case 'assistant':
            return [
                new AIMessage({
                    ...baseFields,
                    tool_calls: Array.isArray(input.tool_calls)
                        ? (input.tool_calls as AIMessage['tool_calls'])
                        : undefined,
                    additional_kwargs: {
                        ...(input.additional_kwargs ?? {}),
                        ...(input.tool_call_id != null
                            ? { tool_call_id: input.tool_call_id }
                            : {})
                    }
                })
            ]
        default:
            return []
    }
}
