import { BaseMessage } from '@langchain/core/messages'
import { Document } from '@langchain/core/documents'
import {
    appendBlockMessages,
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

export async function measureDocumentCollectionDemand(
    collection: PromptDocumentCollection,
    chatHistory: BaseMessage[] | string,
    tokenCounter: PromptContextRuntime['tokenCounter']
): Promise<number> {
    const documents = collection.documents.filter(
        (document) => document.pageContent.length > 0
    )
    if (documents.length === 0) return 0

    const formatted = await renderDocumentCollection(
        collection,
        documents,
        chatHistory
    )
    return await countMessageTokens(formatted, tokenCounter)
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
    const baseBlockTokens = runtime.blockUsage.get(collection.blockId) ?? 0
    const baseUsedTokens = usedTokens
    let formatted: BaseMessage | undefined
    let formattedTokens = 0
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
        const candidateDocuments = [...formatDocuments, document]
        const candidate = await renderDocumentCollection(
            collection,
            candidateDocuments,
            chatHistory
        )
        const candidateTokens = await countMessageTokens(
            candidate,
            runtime.tokenCounter
        )
        const accepted =
            accepting &&
            baseBlockTokens + candidateTokens <=
                (runtime.blockBudgets.get(collection.blockId) ?? 0) &&
            baseUsedTokens + runtime.requiredTailTokens + candidateTokens <=
                runtime.sendTokenLimit
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

        formatDocuments.push(document)
        acceptedEntries.push(entry)
        formatted = candidate
        formattedTokens = candidateTokens
    }

    if (formatted == null) {
        return usedTokens
    }

    usedTokens = baseUsedTokens + formattedTokens
    runtime.blockUsage.set(
        collection.blockId,
        baseBlockTokens + formattedTokens
    )
    result.push(formatted)
    appendBlockMessages(runtime, collection.blockId, [formatted])
    const renderedEntry = traceMessage(runtime.trace, formatted, {
        stage: 'long_history',
        source: {
            kind: sourceKind(collection.source),
            name: `${collection.source} rendered context`,
            path: collection.promptPath
        },
        tokenEstimate: formattedTokens,
        status: 'included'
    })
    for (const entry of acceptedEntries) {
        entry.parentMessageId = renderedEntry.messageId
    }

    return usedTokens
}

async function renderDocumentCollection(
    collection: PromptDocumentCollection,
    documents: Document[],
    chatHistory: BaseMessage[] | string
): Promise<BaseMessage> {
    const documentText = documents
        .map(
            (document) =>
                `<doc metadata="${JSON.stringify(document.metadata)}" id="${document.id}">${document.pageContent}</doc>`
        )
        .join(' ')
    return await collection.prompt.format({
        [collection.promptVariable]: documentText,
        chat_history: chatHistory
    })
}

function sourceKind(source: PromptDocumentCollection['source']) {
    return source === 'long_memory'
        ? ('long_memory' as const)
        : source.startsWith('knowledge.')
          ? ('knowledge' as const)
          : ('document' as const)
}

function resolveDocumentSource(
    collection: PromptDocumentCollection,
    document: Document,
    index: number
) {
    if (collection.source.startsWith('knowledge.')) {
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
