import { BaseMessage } from '@langchain/core/messages'
import {
    ChatLunaContextManagerService,
    PromptContextRuntime,
    PromptPipelineMiddleware
} from './context_manager'
import { countMessageTokens } from './system_prompts'
import { logger } from 'koishi-plugin-chatluna'
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
        const hasDocuments = (runtime.documentCollections ?? []).some(
            (collection) => collection.documents.length > 0
        )

        // Pre-account input tokens
        if (runtime.input) {
            const inputTokens = await countMessageTokens(
                runtime.input,
                runtime.tokenCounter
            )
            runtime.usedTokens += inputTokens
            traceMessage(runtime.trace, runtime.input, {
                stage: 'input',
                source: {
                    kind: 'input',
                    name: 'current user input',
                    path: 'input'
                },
                tokenEstimate: inputTokens,
                status: 'candidate'
            })
        }

        // Pre-account scratchpad tokens
        if (runtime.agentScratchpad) {
            if (Array.isArray(runtime.agentScratchpad)) {
                for (const msg of runtime.agentScratchpad) {
                    const tokens = await countMessageTokens(
                        msg,
                        runtime.tokenCounter
                    )
                    runtime.usedTokens += tokens
                    traceMessage(runtime.trace, msg, {
                        stage: 'scratchpad',
                        source: {
                            kind: 'scratchpad',
                            name: 'agent scratchpad',
                            path: 'agent_scratchpad'
                        },
                        tokenEstimate: tokens,
                        status: 'candidate'
                    })
                }
            } else {
                const tokens = await countMessageTokens(
                    runtime.agentScratchpad as BaseMessage,
                    runtime.tokenCounter
                )
                runtime.usedTokens += tokens
                traceMessage(
                    runtime.trace,
                    runtime.agentScratchpad as BaseMessage,
                    {
                        stage: 'scratchpad',
                        source: {
                            kind: 'scratchpad',
                            name: 'agent scratchpad',
                            path: 'agent_scratchpad'
                        },
                        tokenEstimate: tokens,
                        status: 'candidate'
                    }
                )
            }
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
        const availableLimit =
            runtime.sendTokenLimit - (hasDocuments ? 480 : 80)
        const hasValidLimit = availableLimit > 0
        let truncated = false
        let usedTokens = runtime.usedTokens

        for (let i = rounds.length - 1; i >= 0; i--) {
            const round = rounds[i]
            const exceedsLimit = hasValidLimit
                ? usedTokens + roundTokens[i] > availableLimit
                : false

            if (exceedsLimit && selectedRounds.length > 0) {
                truncated = true
                break
            }

            usedTokens += roundTokens[i]
            selectedRounds.unshift(round)

            if (exceedsLimit) {
                truncated = true
                break
            }
        }

        // Ensure at least one round
        if (rounds.length > 0 && selectedRounds.length === 0) {
            const lastRound = rounds[rounds.length - 1]
            usedTokens += roundTokens[rounds.length - 1]
            selectedRounds.unshift(lastRound)
            truncated = hasValidLimit
        }

        // Flatten selected rounds and push
        const historyMessages = selectedRounds.reduce<BaseMessage[]>(
            (acc, round) => acc.concat(round),
            []
        )
        runtime.result.push(...historyMessages)
        runtime.usedTokens = usedTokens

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

        if (truncated && hasValidLimit) {
            logger?.warn(
                `Exceeded token limit (${usedTokens} > ${availableLimit}) of the message placeholder; kept the most recent complete turns.`
            )
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
