import {
    appendBlockMessages,
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptPipelineMiddleware
} from './context_manager'
import { traceMessage } from './context_trace'

// ---------------------------------------------------------------------------
// injections pipeline middleware
// ---------------------------------------------------------------------------

/**
 * The `injections` pipeline stage collects all pending injections
 * (persistent + queued) and applies them
 * through the injection middleware chain.
 *
 * This replaces the manual `collectInjections` + `applyInjections`
 * calls that were previously scattered in ChatLunaChatPrompt.
 */
export function createInjectionsMiddleware(
    contextManager: ChatLunaContextManagerService
): PromptPipelineMiddleware {
    return async (runtime: PromptContextRuntime, next) => {
        // Pass runtime.result so collectInjections can stamp ids and prune
        // stale anchor-based persistent injections in place.
        const injections = runtime.injections
        runtime.trace.onceInjectionLease = injections.onceInjectionLease

        // Apply before-scratchpad injections (lore_books, authors_note, etc.)
        await contextManager.applyInjections(
            injections.beforeScratchpad,
            runtime
        )
        await next()
    }
}

export function createInputBoundaryMiddleware(
    contextManager: ChatLunaContextManagerService
): PromptPipelineMiddleware {
    return async (runtime: PromptContextRuntime, next) => {
        runtime.usedTokens += runtime.requiredTailTokens
        runtime.requiredTailTokens = 0

        // Push user input
        if (runtime.input) {
            runtime.result.push(runtime.input)
            const inputBlock = runtime.preset.definition.blocks.find(
                (block) => block.type === 'currentInput'
            )!
            appendBlockMessages(runtime, inputBlock.id, [runtime.input])
            const entry = runtime.trace.entries.find(
                (item) => item.messageId === runtime.input?.id
            )
            traceMessage(runtime.trace, runtime.input, {
                stage: 'input',
                source: {
                    kind: 'input',
                    name: 'current user input',
                    path: 'input'
                },
                tokenEstimate: entry?.tokenEstimate ?? 0,
                status: 'included'
            })
        }

        // Push agent scratchpad
        const scratchpad = runtime.agentScratchpad
        if (scratchpad) {
            const scratchBlock = runtime.preset.definition.blocks.find(
                (block) => block.type === 'agentScratchpad' && block.enabled
            )!
            if (Array.isArray(scratchpad)) {
                runtime.result.push(...scratchpad)
                appendBlockMessages(runtime, scratchBlock.id, scratchpad)
                for (const msg of scratchpad) {
                    const entry = runtime.trace.entries.find(
                        (item) => item.messageId === msg.id
                    )
                    traceMessage(runtime.trace, msg, {
                        stage: 'scratchpad',
                        source: {
                            kind: 'scratchpad',
                            name: 'agent scratchpad',
                            path: 'agent_scratchpad'
                        },
                        tokenEstimate: entry?.tokenEstimate ?? 0,
                        status: 'included'
                    })
                }
            } else {
                runtime.result.push(scratchpad)
                appendBlockMessages(runtime, scratchBlock.id, [scratchpad])
                const entry = runtime.trace.entries.find(
                    (item) => item.messageId === scratchpad.id
                )
                traceMessage(runtime.trace, scratchpad, {
                    stage: 'scratchpad',
                    source: {
                        kind: 'scratchpad',
                        name: 'agent scratchpad',
                        path: 'agent_scratchpad'
                    },
                    tokenEstimate: entry?.tokenEstimate ?? 0,
                    status: 'included'
                })
            }
        } else if (runtime.input) {
            // No scratchpad – input already pushed above
        }

        // Apply after-scratchpad injections (after_user_message, etc.)
        await contextManager.applyInjections(
            runtime.injections.afterScratchpad,
            runtime
        )

        await next()
    }
}

/**
 * Register the injections pipeline middleware on the context manager.
 *
 * This middleware covers the `injections`, `input`, `scratchpad`, and
 * `after_scratchpad` stages in a single pass.
 */
export function registerInjectionsMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.pipeline(
        'injections',
        createInjectionsMiddleware(contextManager),
        0
    )
}

export function registerInputBoundaryMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.pipeline(
        'input',
        createInputBoundaryMiddleware(contextManager),
        0
    )
}
