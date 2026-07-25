import { SystemMessage } from '@langchain/core/messages'
import {
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptPipelineMiddleware
} from './context_manager'
import { traceMessage } from './context_trace'
import { logger } from 'koishi-plugin-chatluna'
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
        const preset = runtime.preset
        const variables = runtime.variables
        const configurable = runtime.configurable

        // -- instructions (e.g. agent instructions) --
        if (runtime.instructions) {
            const msg = new SystemMessage(runtime.instructions)
            const tokens = await countMessageTokens(msg, runtime.tokenCounter)
            runtime.result.push(msg)
            runtime.usedTokens += tokens
            traceMessage(runtime.trace, msg, {
                stage: 'system_prompts',
                source: {
                    kind: 'instructions',
                    name: 'runtime instructions',
                    path: 'instructions'
                },
                tokenEstimate: tokens,
                status: 'included'
            })
        }

        // -- render preset system prompts --
        const rendered = await runtime.promptRenderService.renderCompiledPreset(
            preset,
            variables,
            { configurable: configurable ?? {} }
        )

        for (const [idx, message] of (rendered.messages ?? []).entries()) {
            const tokens = await countMessageTokens(
                message,
                runtime.tokenCounter
            )
            runtime.result.push(message)
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

        runtime.systemPrompts = rendered.messages ?? []

        if (runtime.usedTokens > runtime.sendTokenLimit) {
            logger?.warn(
                // eslint-disable-next-line max-len
                `After system prompts, the max tokens exceeded: ${runtime.usedTokens} > ${runtime.sendTokenLimit}. Try increasing the adapter token limit or optimizing the system prompts.`
            )
        }

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
