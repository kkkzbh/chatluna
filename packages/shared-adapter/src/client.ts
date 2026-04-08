import { ModelInfo } from 'koishi-plugin-chatluna/llm-core/platform/types'
import { resolveModelContextSize } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'

export type OpenAIReasoningEffort =
    | 'none'
    | 'minimal'
    | 'low'
    | 'medium'
    | 'high'
    | 'xhigh'

export const reasoningEffortModelSuffixes = [
    'non-thinking',
    'minimal-thinking',
    'low-thinking',
    'medium-thinking',
    'high-thinking',
    'xhigh-thinking',
    'thinking'
] as const

export function expandReasoningEffortModelVariants(
    model: string,
    suffixes: readonly string[] = reasoningEffortModelSuffixes
): string[] {
    return suffixes.map((suffix) => `${model}-${suffix}`)
}

export function parseOpenAIModelNameWithReasoningEffort(modelName: string): {
    model: string
    reasoningEffort?: OpenAIReasoningEffort
} {
    let model = modelName
    let reasoningEffort: OpenAIReasoningEffort | undefined

    const explicitMatch = model.match(
        /-(none|minimal|low|medium|high|xhigh|tiny)-thinking$/
    )

    if (explicitMatch?.[1]) {
        const level = explicitMatch[1]
        model = model.replace(`-${level}-thinking`, '')
        reasoningEffort =
            level === 'tiny' ? 'minimal' : (level as OpenAIReasoningEffort)
        return { model, reasoningEffort }
    }

    if (model.endsWith('-non-thinking')) {
        model = model.slice(0, -'-non-thinking'.length)
        reasoningEffort = 'none'
        return { model, reasoningEffort }
    }

    if (model.endsWith('-thinking')) {
        model = model.slice(0, -'-thinking'.length)
        reasoningEffort = 'medium'
        return { model, reasoningEffort }
    }

    return { model }
}

export function normalizeOpenAIModelName(modelName: string): string {
    return parseOpenAIModelNameWithReasoningEffort(modelName).model
}

export function isEmbeddingModel(modelName: string): boolean {
    return (
        modelName.includes('embed') ||
        modelName.includes('bge') ||
        modelName.includes('instructor-large') ||
        modelName.includes('m3e')
    )
}

export function isNonLLMModel(modelName: string): boolean {
    if (modelName.includes('gemini') && modelName.includes('image')) {
        return false
    }
    return ['whisper', 'tts', 'dall-e', 'image', 'rerank'].some((keyword) =>
        modelName.includes(keyword)
    )
}

export function getModelMaxContextSize(info: ModelInfo): number {
    return resolveModelContextSize(
        normalizeOpenAIModelName(info.name),
        info.maxTokens
    )
}

function createGlobMatcher(pattern: string): (text: string) => boolean {
    if (!pattern.includes('*')) {
        return (text: string) => text.includes(pattern)
    }

    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
    return (text: string) => regex.test(text)
}

const imageModelMatchers = [
    'vision',
    'vl',
    'gpt-4o',
    'claude',
    'gemini',
    'qwen-vl',
    'omni',
    'qwen*-omni',
    'qwen-omni',
    'qwen*-vl',
    'qwen-3.5',
    'qwen3.5',
    'qvq',
    'o1',
    'o3',
    'o4',
    'gpt-4.1',
    'gpt-5',
    'glm-*v',
    'kimi-k2.5',
    'step3',
    'grok-4'
].map((pattern) => createGlobMatcher(pattern))

export function supportImageInput(modelName: string) {
    const lowerModel = normalizeOpenAIModelName(modelName).toLowerCase()
    return imageModelMatchers.some((matcher) => matcher(lowerModel))
}
