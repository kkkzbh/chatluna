import { BaseMessage } from '@langchain/core/messages'
import {
    appendBlockMessages,
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptPipelineMiddleware
} from './context_manager'
import { countMessageTokens } from './system_prompts'
import { isChatLunaUserMessage } from 'koishi-plugin-chatluna/utils/langchain'
import { traceMessage } from './context_trace'

// ---------------------------------------------------------------------------
// chat_history pipeline middleware
// ---------------------------------------------------------------------------

/**
 * Truncates conversation history to fit within the token budget, keeping
 * the most recent complete turns.  Also accounts for input + scratchpad
 * token consumption so that downstream stages know the remaining budget.
 */
export function createChatHistoryMiddleware(): PromptPipelineMiddleware {
    return async (runtime: PromptContextRuntime, next) => {
        const chatHistory = runtime.chatHistory ?? []
        const block = runtime.preset.definition.blocks.find(
            (candidate) => candidate.type === 'chatHistory' && candidate.enabled
        )
        if (block == null) {
            return next()
        }

        // Build conversation rounds and truncate
        const rounds = buildConversationRounds([...chatHistory])
        const tokens = new Map<BaseMessage, number>()
        for (const msg of chatHistory) {
            tokens.set(msg, await countMessageTokens(msg, runtime.tokenCounter))
        }
        const roundTokens = rounds.map((round) =>
            round.reduce((total, msg) => total + tokens.get(msg)!, 0)
        )
        const selectedRounds: BaseMessage[][] = []
        let usedTokens = runtime.usedTokens
        let blockTokens = 0
        const limit = runtime.blockBudgets.get(block.id) ?? 0

        for (let i = rounds.length - 1; i >= 0; i--) {
            const round = rounds[i]
            const exceedsLimit =
                blockTokens + roundTokens[i] > limit ||
                usedTokens + runtime.requiredTailTokens + roundTokens[i] >
                    runtime.sendTokenLimit

            if (exceedsLimit) {
                break
            }

            usedTokens += roundTokens[i]
            blockTokens += roundTokens[i]
            selectedRounds.unshift(round)
        }

        // Flatten selected rounds and push
        const historyMessages = selectedRounds.reduce<BaseMessage[]>(
            (acc, round) => acc.concat(round),
            []
        )
        runtime.result.push(...historyMessages)
        appendBlockMessages(runtime, block.id, historyMessages)
        runtime.usedTokens = usedTokens
        runtime.blockUsage.set(block.id, blockTokens)

        const included = new Set(historyMessages)
        for (const [idx, msg] of chatHistory.entries()) {
            traceMessage(runtime.trace, msg, {
                stage: 'chat_history',
                source: {
                    kind: 'history',
                    name: 'chat history',
                    path: `chat_history.${idx}`
                },
                tokenEstimate: tokens.get(msg)!,
                status: included.has(msg) ? 'included' : 'dropped',
                reason: included.has(msg) ? undefined : 'history_budget'
            })
        }

        await next()
    }
}

/**
 * Split a flat message list into conversation rounds. Marked ChatLuna user
 * messages start rounds; old unmarked human messages still start rounds.
 */
function buildConversationRounds(messages: BaseMessage[]): BaseMessage[][] {
    const rounds: BaseMessage[][] = []
    let current: BaseMessage[] = []

    for (const message of messages) {
        const isStart =
            isChatLunaUserMessage(message) || message.getType() === 'human'

        if (isStart) {
            if (current.length > 0) {
                rounds.push(current)
            }
            current = [message]
        } else {
            if (current.length === 0) {
                current = [message]
            } else {
                current.push(message)
            }
        }
    }

    if (current.length > 0) {
        rounds.push(current)
    }

    return rounds
}

/**
 * Register the chat_history pipeline middleware on the context manager.
 */
export function registerChatHistoryMiddleware(
    contextManager: ChatLunaContextManagerService
): () => void {
    return contextManager.pipeline(
        'chat_history',
        createChatHistoryMiddleware(),
        0
    )
}
