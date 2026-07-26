import {
    appendBlockMessages,
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptPipelineMiddleware
} from './context_manager'
import { traceMessage } from './context_trace'
import { ContextPresetCompileError } from './type'
import {
    countMessagesTokens,
    countMessageTokens
} from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'

export { countMessageTokens, countMessagesTokens }

// ---------------------------------------------------------------------------
// system_prompts pipeline middleware
// ---------------------------------------------------------------------------

/**
 * Renders the preset template into system messages and pushes them onto
 * the result list.  Also handles the optional `instructions` partial.
 *
 */
export function createSystemPromptsMiddleware(): PromptPipelineMiddleware {
    return async (runtime: PromptContextRuntime, next) => {
        const role = runtime.preset.definition.blocks.find(
            (block) => block.type === 'role'
        )!
        for (const [idx, message] of runtime.preparedSystemPrompts.entries()) {
            const tokens = await countMessageTokens(
                message,
                runtime.tokenCounter
            )
            if (
                runtime.usedTokens + tokens + runtime.requiredTailTokens >
                runtime.sendTokenLimit
            ) {
                const block = runtime.preset.definition.blocks.find(
                    (candidate) => candidate.type === 'role'
                )!
                throw new ContextPresetCompileError(
                    'required_block_over_limit',
                    'budget',
                    `Role prompt exceeds the input token limit ${runtime.sendTokenLimit}.`,
                    block.id,
                    runtime.sendTokenLimit
                )
            }
            runtime.result.push(message)
            appendBlockMessages(runtime, role.id, [message])
            runtime.usedTokens += tokens
            traceMessage(runtime.trace, message, {
                stage: 'system_prompts',
                source: {
                    kind: 'preset',
                    name: 'preset message',
                    path: `messages.${idx}`
                },
                tokenEstimate: tokens,
                status: 'included'
            })
        }

        runtime.systemPrompts = runtime.preparedSystemPrompts

        await next()
    }
}

/**
 * Register the system_prompts pipeline middleware on the context manager.
 */
export function registerSystemPromptsMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.pipeline(
        'system_prompts',
        createSystemPromptsMiddleware(),
        0
    )
}
