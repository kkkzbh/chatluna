import { BaseMessage } from '@langchain/core/messages'
import { Document } from '@langchain/core/documents'
import {
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptDocumentCollection,
    PromptPipelineMiddleware
} from './context_manager'
import { ContextTraceEntry, traceDocument, traceMessage } from './context_trace'
import { countMessageTokens } from './system_prompts'
import { getPresetKnowledgeMetadata } from '../../services/knowledge'

// ---------------------------------------------------------------------------
// long_history pipeline middleware
// ---------------------------------------------------------------------------

/**
 * Formats document collections (long memory, knowledge, other documents)
 * into the conversation context using each collection's explicit prompt
 * contract. Each collection is rendered and appended after history.
 */
export function createLongHistoryMiddleware(): PromptPipelineMiddleware {
    return async (runtime: PromptContextRuntime, next) => {
        const collections = runtime.documentCollections ?? []

        for (const collection of collections) {
            runtime.usedTokens = await formatLongHistory(
                collection,
                runtime.chatHistory ?? [],
                runtime.usedTokens,
                runtime.result,
                runtime
            )
        }

        await next()
    }
}

async function formatLongHistory(
    collection: PromptDocumentCollection,
    chatHistory: BaseMessage[] | string,
    usedTokens: number,
    result: BaseMessage[],
    runtime: PromptContextRuntime
): Promise<number> {
    const formatDocuments: Document[] = []
    const acceptedEntries: ContextTraceEntry[] = []
    let accepting = true

    for (const [idx, document] of collection.documents.entries()) {
        const source = resolveDocumentSource(collection, document, idx)
        if (document.pageContent.length === 0) {
            traceDocument(runtime.trace, {
                id: `${collection.source}:${document.id ?? idx}`,
                content: document.pageContent,
                source,
                tokenEstimate: 0,
                status: 'dropped',
                reason: 'empty'
            })
            continue
        }
        const documentTokens = await runtime.tokenCounter(document.pageContent)

        const accepted =
            accepting &&
            usedTokens + documentTokens <= runtime.sendTokenLimit - 80
        const entry = traceDocument(runtime.trace, {
            id: `${collection.source}:${document.id ?? idx}`,
            content: document.pageContent,
            source,
            tokenEstimate: documentTokens,
            status: accepted ? 'included' : 'dropped',
            reason: accepted ? undefined : 'document_budget'
        })

        if (!accepted) {
            accepting = false
            continue
        }
        usedTokens += documentTokens
        formatDocuments.push(document)
        acceptedEntries.push(entry)
    }

    if (formatDocuments.length < 1) {
        return usedTokens
    }

    const documentText = formatDocuments
        .map(
            (document) =>
                `<doc metadata="${JSON.stringify(document.metadata)}" id="${document.id}">${document.pageContent}</doc>`
        )
        .join(' ')
    const formatted = await collection.prompt.format({
        [collection.promptVariable]: documentText,
        chat_history: chatHistory
    })

    if (formatted) {
        result.push(formatted)
        const renderedEntry = traceMessage(runtime.trace, formatted, {
            stage: 'long_history',
            source: {
                kind: sourceKind(collection.source),
                name: `${collection.source} rendered context`,
                path: collection.promptPath
            },
            tokenEstimate: await countMessageTokens(
                formatted,
                runtime.tokenCounter
            ),
            status: 'included'
        })
        for (const entry of acceptedEntries) {
            entry.parentMessageId = renderedEntry.messageId
        }
    }

    return usedTokens
}

function sourceKind(source: PromptDocumentCollection['source']) {
    return source === 'long_memory'
        ? ('long_memory' as const)
        : source === 'knowledge'
          ? ('knowledge' as const)
          : ('document' as const)
}

function resolveDocumentSource(
    collection: PromptDocumentCollection,
    document: Document,
    index: number
) {
    if (collection.source === 'knowledge') {
        const metadata = getPresetKnowledgeMetadata(document)
        if (metadata != null) {
            return {
                kind: 'knowledge' as const,
                name: metadata.source,
                path: metadata.fieldPath
            }
        }
    }

    return {
        kind: sourceKind(collection.source),
        name: collection.source,
        path: `${collection.source}.${index}`
    }
}

/**
 * Register the long_history pipeline middleware on the context manager.
 */
export function registerLongHistoryMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.pipeline(
        'long_history',
        createLongHistoryMiddleware(),
        0
    )
}
