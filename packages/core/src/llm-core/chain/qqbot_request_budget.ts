import { BaseMessage } from '@langchain/core/messages'
import { getMessageContent } from 'koishi-plugin-chatluna/utils/string'
import { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'

type QqbotRequestBudgetPolicy = {
    historyWindow: number
    historyTriggerCount: number
    historyTokenRatio: number
}

type QqbotRequestBudgetStats = {
    historyWindowCount: number
    originalHistoryCount: number
    estimatedInputTokens: number
    trimmedHistoryCount: number
    applied: boolean
}

function clampNatural(value: unknown, fallback: number) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed < 1) {
        return fallback
    }
    return Math.floor(parsed)
}

function clampRatio(value: unknown, fallback: number) {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
        return fallback
    }
    return parsed
}

function parsePolicy(
    additionalKwargs: Record<string, unknown> | null | undefined
): QqbotRequestBudgetPolicy | null {
    const raw = additionalKwargs?.qqbot_request_budget_policy
    if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
        return null
    }

    return {
        historyWindow: clampNatural(
            (raw as Record<string, unknown>).historyWindow,
            80
        ),
        historyTriggerCount: clampNatural(
            (raw as Record<string, unknown>).historyTriggerCount,
            120
        ),
        historyTokenRatio: clampRatio(
            (raw as Record<string, unknown>).historyTokenRatio,
            0.7
        )
    }
}

async function estimateHistoryTokens(
    llm: ChatLunaChatModel,
    messages: BaseMessage[]
) {
    if (messages.length < 1) {
        return 0
    }

    const text = messages
        .map((message) => `${message.getType()}: ${getMessageContent(message.content)}`)
        .join('\n')

    return await llm.getNumTokens(text)
}

export async function applyQqbotRequestBudget(
    llm: ChatLunaChatModel,
    history: BaseMessage[],
    additionalKwargs: Record<string, unknown> | null | undefined
): Promise<{
    messages: BaseMessage[]
    stats: QqbotRequestBudgetStats | null
}> {
    const policy = parsePolicy(additionalKwargs)
    if (policy == null) {
        return {
            messages: history,
            stats: null
        }
    }

    const originalHistoryCount = history.length
    const maxPromptTokens = Math.max(
        1,
        Math.floor(llm.getModelMaxContextSize() * policy.historyTokenRatio)
    )
    const originalEstimatedInputTokens = await estimateHistoryTokens(llm, history)

    const needsTrim =
        history.length > policy.historyTriggerCount ||
        originalEstimatedInputTokens > maxPromptTokens

    if (!needsTrim) {
        return {
            messages: history,
            stats: {
                historyWindowCount: history.length,
                originalHistoryCount,
                estimatedInputTokens: originalEstimatedInputTokens,
                trimmedHistoryCount: 0,
                applied: false
            }
        }
    }

    const systemMessages = history.filter((message) => message.getType() === 'system')
    let tailMessages = history.filter((message) => message.getType() !== 'system')
    if (tailMessages.length > policy.historyWindow) {
        tailMessages = tailMessages.slice(-policy.historyWindow)
    }

    let trimmed = history
    let estimatedInputTokens = originalEstimatedInputTokens
    while (true) {
        const kept = new Set<BaseMessage>([...systemMessages, ...tailMessages])
        trimmed = history.filter((message) => kept.has(message))
        estimatedInputTokens = await estimateHistoryTokens(llm, trimmed)

        if (
            estimatedInputTokens <= maxPromptTokens ||
            tailMessages.length <= 1
        ) {
            break
        }

        const shrinkBy = Math.max(
            1,
            Math.min(8, tailMessages.length - 1)
        )
        tailMessages = tailMessages.slice(shrinkBy)
    }

    return {
        messages: trimmed,
        stats: {
            historyWindowCount: trimmed.length,
            originalHistoryCount,
            estimatedInputTokens,
            trimmedHistoryCount: Math.max(0, originalHistoryCount - trimmed.length),
            applied: trimmed.length !== originalHistoryCount
        }
    }
}
