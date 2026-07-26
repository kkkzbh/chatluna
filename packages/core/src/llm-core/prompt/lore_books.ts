import { BaseMessage } from '@langchain/core/messages'
import { HumanMessagePromptTemplate } from '@langchain/core/prompts'
import {
    appendBlockMessages,
    ChatLunaContextManagerService,
    claimBlockTokens,
    PromptContextMiddleware,
    PromptContextRuntime
} from './context_manager'
import {
    CompiledPreset,
    ContextAnchor,
    LoreInsertPosition,
    MatchedLoreEntry
} from './type'
import { logger } from 'koishi-plugin-chatluna/utils/logger'
import { traceDocument, traceMessage } from './context_trace'
import { countMessageTokens } from './system_prompts'

// ---------------------------------------------------------------------------
// lore_books injection middleware
// ---------------------------------------------------------------------------

/**
 * Handles `lore_books` injections.  Renders each matched lore book using
 * the preset's `loreBooksPrompt` template, then inserts it at the
 * appropriate position in the result message list (respecting
 * `insertPosition`).
 */
export function createLoreBooksMiddleware(): PromptContextMiddleware {
    return async (context, next) => {
        const loreBooks = context.injection.value as MatchedLoreEntry[]
        const runtime = context.runtime

        if (!Array.isArray(loreBooks) || loreBooks.length < 1) {
            return next()
        }

        const prepared = runtime.preparedInjections.get(
            context.injection.id
        ) as PreparedLoreBooks
        await applyPreparedLoreBooks(prepared, runtime)
        context.markHandled()
    }
}

export interface PreparedLoreBooks {
    groups: Array<{
        blockId: string
        message: BaseMessage
        tokenCount: number
        entries: Array<{
            matched: MatchedLoreEntry
            tokenCount: number
        }>
    }>
    emptyEntries: MatchedLoreEntry[]
}

export async function prepareLoreBooks(
    loreBooks: MatchedLoreEntry[],
    runtime: Pick<
        PromptContextRuntime,
        | 'preset'
        | 'tokenCounter'
        | 'promptRenderService'
        | 'variables'
        | 'configurable'
    >
): Promise<PreparedLoreBooks> {
    const preset = runtime.preset
    const grouped = new Map<string, MatchedLoreEntry[]>()
    const emptyEntries: MatchedLoreEntry[] = []

    for (const matchedLore of loreBooks) {
        const { entry: loreBook } = matchedLore
        const block = preset.loreBlocks.find(
            (candidate) =>
                candidate.id === matchedLore.blockId && candidate.enabled
        )
        if (block == null) {
            continue
        }
        if ((loreBook.content?.length ?? 0) === 0) {
            emptyEntries.push(matchedLore)
            continue
        }
        const entries = grouped.get(block.id) ?? []
        entries.push(matchedLore)
        grouped.set(block.id, entries)
    }

    const groups = await Promise.all(
        [...grouped.entries()]
            .sort(
                ([left], [right]) =>
                    preset.definition.blocks.findIndex(
                        (block) => block.id === left
                    ) -
                    preset.definition.blocks.findIndex(
                        (block) => block.id === right
                    )
            )
            .map(async ([blockId, matched]) => {
                const block = preset.loreBlocks.find(
                    (candidate) => candidate.id === blockId
                )!
                const loreBooksPrompt =
                    HumanMessagePromptTemplate.fromTemplate(
                        block.prompt ?? '{input}'
                    )
                const message = await runtime.promptRenderService
                    .renderMessages(
                        [
                            await loreBooksPrompt.format({
                                input: matched
                                    .map(({ entry }) => entry.content)
                                    .join('\n')
                            })
                        ],
                        runtime.variables,
                        {
                            configurable: runtime.configurable ?? {}
                        }
                    )
                    .then((value) => value[0])
                return {
                    blockId,
                    message,
                    tokenCount: await countMessageTokens(
                        message,
                        runtime.tokenCounter
                    ),
                    entries: await Promise.all(
                        matched.map(async (entry) => ({
                            matched: entry,
                            tokenCount: await runtime.tokenCounter(
                                entry.entry.content
                            )
                        }))
                    )
                }
            })
    )

    return { groups, emptyEntries }
}

async function applyPreparedLoreBooks(
    prepared: PreparedLoreBooks,
    runtime: PromptContextRuntime
) {
    for (const matchedLore of prepared.emptyEntries) {
        const { entry, presetEntryIndex, blockId } = matchedLore
        traceDocument(runtime.trace, {
            id: `lore:${presetEntryIndex}`,
            content: entry.content,
            stage: 'injections',
            source: {
                kind: 'lore',
                name: entry.keywords.join(', '),
                path: `blocks.${blockId}.entries.${presetEntryIndex}`
            },
            tokenEstimate: 0,
            status: 'dropped',
            reason: 'empty'
        })
    }

    for (const group of prepared.groups) {
        const accepted = claimBlockTokens(
            runtime,
            group.blockId,
            group.tokenCount
        )
        const traceEntries = group.entries.map(({ matched, tokenCount }) => {
            const { entry, presetEntryIndex } = matched
            return traceDocument(runtime.trace, {
                id: `lore:${presetEntryIndex}`,
                content: entry.content,
                stage: 'injections',
                source: {
                    kind: 'lore',
                    name: entry.keywords.join(', '),
                    path: `blocks.${group.blockId}.entries.${presetEntryIndex}`
                },
                tokenEstimate: tokenCount,
                status: accepted ? 'included' : 'dropped',
                reason: accepted ? undefined : 'lore_budget'
            })
        })

        if (!accepted) {
            logger?.warn(
                `Lore block ${group.blockId} exceeds its token budget.`
            )
            continue
        }

        runtime.result.push(group.message)
        appendBlockMessages(runtime, group.blockId, [group.message])
        const renderedEntry = traceMessage(runtime.trace, group.message, {
            stage: 'injections',
            source: {
                kind: 'lore',
                name: 'lore rendered context',
                path: `blocks.${group.blockId}`
            },
            tokenEstimate: group.tokenCount,
            status: 'included'
        })
        for (const entry of traceEntries) {
            entry.parentMessageId = renderedEntry.messageId
        }
    }
}

/**
 * Find the index in the result list where a lore book should be inserted
 * based on its `insertPosition` setting.
 */
function findMessageIndex(
    chatHistory: BaseMessage[],
    systemPrompts: BaseMessage[],
    insertPosition: LoreInsertPosition | 'inChat' | 'afterCharacterDefinitions'
): number {
    if (insertPosition === 'inChat') {
        return chatHistory.length - 1
    }

    const findIndexByType = (type: string) =>
        chatHistory.findIndex(
            (message) => message?.additional_kwargs?.purpose === type
        )

    const descriptionIndex = findIndexByType('description')
    const personalityIndex = findIndexByType('personality')
    const scenarioIndex = findIndexByType('scenario')
    const exampleMessageStartIndex = findIndexByType('exampleStart')
    const exampleMessageEndIndex = findIndexByType('exampleEnd')
    const firstMessageIndex = findIndexByType('firstMessage')

    const charStartIndex = [descriptionIndex, personalityIndex]
        .filter((idx) => idx >= 0)
        .sort((a, b) => a - b)[0]
    const charEndIndex = Math.max(descriptionIndex, personalityIndex)

    switch (insertPosition) {
        case 'beforeCharacterDefinitions':
            return charStartIndex ?? 1
        case 'afterCharacterDefinitions':
            return charEndIndex !== -1 ? charEndIndex + 1 : systemPrompts.length
        case 'beforeScenario':
            if (scenarioIndex !== -1) return scenarioIndex
            return charEndIndex !== -1 ? charEndIndex + 1 : systemPrompts.length
        case 'afterScenario':
            if (scenarioIndex !== -1) return scenarioIndex + 1
            return charEndIndex !== -1 ? charEndIndex + 1 : systemPrompts.length
        case 'beforeExampleMessages':
            if (exampleMessageStartIndex !== -1) return exampleMessageStartIndex
            if (firstMessageIndex !== -1) return firstMessageIndex
            return scenarioIndex !== -1
                ? scenarioIndex + 1
                : charEndIndex !== -1
                  ? charEndIndex + 1
                  : systemPrompts.length
        case 'afterExampleMessages':
            if (exampleMessageEndIndex !== -1) return exampleMessageEndIndex + 1
            if (firstMessageIndex !== -1) return firstMessageIndex + 1
            return chatHistory.length
        default:
            return chatHistory.length
    }
}

/**
 * Register the lore_books injection middleware on the context manager.
 */
export function registerLoreBooksMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.intercept(
        'lore_books',
        createLoreBooksMiddleware(),
        0
    )
}

// Re-export findMessageIndex for use by other middlewares (e.g. authors_note)
export { findMessageIndex }

export function resolveAnchorPosition(
    anchor: ContextAnchor,
    preset: CompiledPreset
): LoreInsertPosition | 'inChat' {
    if (anchor.type === 'role') return anchor.position
    if (anchor.type === 'chatHistory') return 'inChat'
    const target = preset.definition.blocks.find(
        (block) => block.id === anchor.blockId
    )!
    if (target.type !== 'role') return 'inChat'
    return anchor.position === 'before'
        ? 'beforeCharacterDefinitions'
        : 'afterCharacterDefinitions'
}
