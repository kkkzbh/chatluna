const CONTEXT_LOOKUP_REASONING_SUFFIX =
    /-(?:none|minimal|low|medium|high|xhigh|tiny)-thinking$|-thinking$/

const knownModelContextSizeTable: Array<{
    size: number
    match: (candidates: string[]) => boolean
}> = [
    {
        size: 400000,
        match: (candidates) =>
            candidates.some((candidate) =>
                /^gpt-5(?:[.-].*)?$/i.test(candidate)
            )
    },
    {
        size: 2000000,
        match: (candidates) =>
            candidates.some((candidate) => candidate.includes('claude'))
    },
    {
        size: 1048576,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-1.5-pro')
            )
    },
    {
        size: 2097152,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-1.5-flash')
            )
    },
    {
        size: 30720,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-1.0-pro')
            )
    },
    {
        size: 1048576,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-2.0-flash')
            )
    },
    {
        size: 2097152,
        match: (candidates) =>
            candidates.some(
                (candidate) =>
                    candidate.includes('gemini-2.0-pro') ||
                    candidate.includes('gemini-2.0')
            )
    },
    {
        size: 2097152,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-2.5')
            )
    },
    {
        size: 1097152,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('gemini-3.0-pro')
            )
    },
    {
        size: 128000,
        match: (candidates) =>
            candidates.some(
                (candidate) =>
                    candidate.includes('deepseek') ||
                    candidate.includes('llama3.1') ||
                    candidate.includes('command-r-plus') ||
                    candidate.includes('moonshot-v1-128k') ||
                    candidate.includes('kimi-k2.5') ||
                    candidate.includes('qwen2.5') ||
                    candidate.includes('qwen3')
            )
    },
    {
        size: 8192,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('moonshot-v1-8k')
            )
    },
    {
        size: 32000,
        match: (candidates) =>
            candidates.some((candidate) =>
                candidate.includes('moonshot-v1-32k')
            )
    },
    {
        size: 32000,
        match: (candidates) =>
            candidates.some((candidate) => candidate.includes('qwen2'))
    }
]

function buildModelContextLookupCandidates(modelName: string): string[] {
    const normalized = modelName.trim().toLowerCase()
    if (normalized.length < 1) {
        return []
    }

    const segments = normalized.split('/').filter(Boolean)
    const tail = segments.at(-1)
    const strippedTail =
        tail != null ? tail.replace(CONTEXT_LOOKUP_REASONING_SUFFIX, '') : null

    return [
        normalized,
        tail,
        strippedTail
    ].filter(
        (candidate, index, all): candidate is string =>
            candidate != null &&
            candidate.length > 0 &&
            all.indexOf(candidate) === index
    )
}

export function getPreferredContextLookupName(modelName: string): string {
    const candidates = buildModelContextLookupCandidates(modelName)
    return candidates[2] ?? candidates[1] ?? candidates[0] ?? modelName
}

export function resolveKnownModelContextSize(
    modelName: string
): number | null {
    const candidates = buildModelContextLookupCandidates(modelName)

    for (const { size, match } of knownModelContextSizeTable) {
        if (match(candidates)) {
            return size
        }
    }

    return null
}

export function resolveDeclaredModelContextSize(
    modelName: string,
    maxTokens?: number | null
): number | null {
    if (maxTokens != null && Number.isFinite(maxTokens) && maxTokens > 0) {
        return maxTokens
    }

    return resolveKnownModelContextSize(modelName)
}
