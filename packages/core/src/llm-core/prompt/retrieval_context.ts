export interface LongMemoryQueryTrace {
    query: string
    promptPath:
        | 'promptConfig.longMemoryNewQuestionPrompt'
        | 'runtimeDefaults.longMemoryNewQuestionPrompt'
}

const LONG_MEMORY_QUERY_TRACE = Symbol.for('chatluna.longMemoryQueryTrace')

export function attachLongMemoryQueryTrace(
    variables: Record<PropertyKey, unknown>,
    trace: LongMemoryQueryTrace
): void {
    variables[LONG_MEMORY_QUERY_TRACE] = trace
}

export function getLongMemoryQueryTrace(
    variables: Record<PropertyKey, unknown> | undefined
): LongMemoryQueryTrace | undefined {
    if (variables == null) {
        return undefined
    }
    const value = variables[LONG_MEMORY_QUERY_TRACE]
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return undefined
    }
    const input = value as Partial<LongMemoryQueryTrace>
    if (
        typeof input.query !== 'string' ||
        (input.promptPath !== 'promptConfig.longMemoryNewQuestionPrompt' &&
            input.promptPath !== 'runtimeDefaults.longMemoryNewQuestionPrompt')
    ) {
        return undefined
    }
    return {
        query: input.query,
        promptPath: input.promptPath
    }
}
