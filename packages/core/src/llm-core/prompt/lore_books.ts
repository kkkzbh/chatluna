import { BaseMessage } from '@langchain/core/messages'
import { HumanMessagePromptTemplate } from '@langchain/core/prompts'
import { ChainValues } from '@langchain/core/utils/types'
import {
    ChatLunaContextManagerService,
    PromptContextMiddleware,
    PromptContextRuntime
} from './context_manager'
import { LoreInsertPosition, MatchedLoreEntry } from './type'
import { logger } from 'koishi-plugin-chatluna/utils/logger'
import { ContextTraceEntry, traceDocument, traceMessage } from './context_trace'

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

        const usedTokens = await formatLoreBooks(
            loreBooks,
            runtime.usedTokens,
            runtime.result,
            runtime.variables,
            runtime
        )

        runtime.usedTokens += usedTokens
        context.markHandled()
    }
}

async function formatLoreBooks(
    loreBooks: MatchedLoreEntry[],
    usedTokens: number,
    result: BaseMessage[],
    variables: ChainValues,
    runtime: PromptContextRuntime
): Promise<number> {
    const preset = runtime.preset
    const tokenCounter = runtime.tokenCounter
    let acceptedLoreTokens = 0

    let usedToken = await tokenCounter(
        preset.promptConfig.loreBooksPrompt ?? '{input}'
    )

    const loreBooksPrompt = HumanMessagePromptTemplate.fromTemplate(
        preset.promptConfig.loreBooksPrompt ?? '{input}'
    )

    const accepted = new Map<
        LoreInsertPosition,
        { contents: string[]; entries: ContextTraceEntry[] }
    >()
    const limit = preset.lore.defaults.tokenLimit ?? 300
    let accepting = true

    for (const matchedLore of loreBooks) {
        const { entry: loreBook, presetEntryIndex } = matchedLore
        if ((loreBook.content?.length ?? 0) === 0) {
            traceDocument(runtime.trace, {
                id: `lore:${presetEntryIndex}`,
                content: loreBook.content,
                stage: 'injections',
                source: {
                    kind: 'lore',
                    name: loreBook.keywords.join(', '),
                    path: `lore.entries.${presetEntryIndex}`
                },
                tokenEstimate: 0,
                status: 'dropped',
                reason: 'empty'
            })
            continue
        }

        const loreBookTokens = await tokenCounter(loreBook.content)
        const canAccept =
            accepting &&
            acceptedLoreTokens + loreBookTokens <= limit &&
            usedTokens + usedToken + loreBookTokens <=
                runtime.sendTokenLimit - 80
        const traceEntry = traceDocument(runtime.trace, {
            id: `lore:${presetEntryIndex}`,
            content: loreBook.content,
            stage: 'injections',
            source: {
                kind: 'lore',
                name: loreBook.keywords.join(', '),
                path: `lore.entries.${presetEntryIndex}`
            },
            tokenEstimate: loreBookTokens,
            status: canAccept ? 'included' : 'dropped',
            reason: canAccept ? undefined : 'lore_budget'
        })

        if (!canAccept) {
            accepting = false
            logger?.warn(
                `Lore context exceeds its token budget (${acceptedLoreTokens + loreBookTokens} > ${limit}); remaining lore entries were dropped.`
            )
            continue
        }

        const position =
            loreBook.insertPosition ??
            preset.lore.defaults.insertPosition ??
            'afterCharacterDefinitions'
        const group = accepted.get(position) ?? {
            contents: [],
            entries: []
        }
        group.contents.push(loreBook.content)
        group.entries.push(traceEntry)
        accepted.set(position, group)

        acceptedLoreTokens += loreBookTokens
        usedToken += loreBookTokens
    }

    for (const [position, group] of accepted) {
        const message = await runtime.promptRenderService
            .renderMessages(
                [
                    await loreBooksPrompt.format({
                        input: group.contents.join('\n')
                    })
                ],
                variables
            )
            .then((value) => value[0])
        const renderedEntry = traceMessage(runtime.trace, message, {
            stage: 'injections',
            source: {
                kind: 'lore',
                name: 'lore rendered context',
                path: `lore.${position}`
            },
            tokenEstimate: await tokenCounter(
                typeof message.content === 'string'
                    ? message.content
                    : JSON.stringify(message.content)
            ),
            status: 'included'
        })
        for (const entry of group.entries) {
            entry.parentMessageId = renderedEntry.messageId
        }

        const insertPosition = findMessageIndex(
            result,
            runtime.systemPrompts,
            position
        )
        result.splice(insertPosition, 0, message)
    }

    return usedToken
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
