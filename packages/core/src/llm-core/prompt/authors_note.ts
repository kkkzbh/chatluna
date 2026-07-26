import { HumanMessage } from '@langchain/core/messages'
import {
    appendBlockMessages,
    ChatLunaContextManagerService,
    claimBlockTokens,
    PromptContextMiddleware
} from './context_manager'
import { AuthorsNote } from './type'
import { findMessageIndex, resolveAnchorPosition } from './lore_books'
import { countMessageTokens } from './system_prompts'
import { traceMessage } from './context_trace'

// ---------------------------------------------------------------------------
// authors_note injection middleware
// ---------------------------------------------------------------------------

/**
 * Handles `authors_note` injections.  Renders the note content using the
 * prompt render service, counts its tokens, then inserts it at the
 * configured position in the result list.
 */
export function createAuthorsNoteMiddleware(): PromptContextMiddleware {
    return async (context, next) => {
        const authorsNote = context.injection.value as AuthorsNote
        const runtime = context.runtime

        if (!authorsNote || (authorsNote.content?.length ?? 0) < 1) {
            return next()
        }

        // Render template variables in the note content
        const formatAuthorsNote = await runtime.promptRenderService
            .renderTemplate(authorsNote.content, runtime.variables, {
                configurable: runtime.configurable ?? {}
            })
            .then((value) => value.text)

        const message = new HumanMessage(formatAuthorsNote)
        const tokenCount = await countMessageTokens(
            message,
            runtime.tokenCounter
        )

        if (tokenCount <= 0) {
            return next()
        }

        if (!claimBlockTokens(runtime, authorsNote.blockId, tokenCount)) {
            return next()
        }

        const rawPosition = resolveAnchorPosition(
            authorsNote.anchor,
            runtime.preset
        )

        const insertPosition = findMessageIndex(
            runtime.result,
            runtime.systemPrompts,
            rawPosition
        )

        if (rawPosition === 'inChat') {
            const safeInsertPosition = Math.max(
                0,
                insertPosition -
                    (authorsNote.anchor.type === 'chatHistory'
                        ? authorsNote.anchor.depth
                        : 0)
            )

            runtime.result.splice(
                safeInsertPosition,
                0,
                message
            )
        } else {
            runtime.result.splice(insertPosition, 0, message)
        }
        appendBlockMessages(runtime, authorsNote.blockId, [message])
        traceMessage(runtime.trace, message, {
            stage: 'injections',
            source: {
                kind: 'authors_note',
                name: 'authors note rendered context',
                path: `blocks.${authorsNote.blockId}`
            },
            tokenEstimate: tokenCount,
            status: 'included'
        })

        context.markHandled()
    }
}

/**
 * Register the authors_note injection middleware on the context manager.
 */
export function registerAuthorsNoteMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.intercept(
        'authors_note',
        createAuthorsNoteMiddleware(),
        0
    )
}
