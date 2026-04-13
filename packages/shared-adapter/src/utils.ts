import {
    AIMessage,
    AIMessageChunk,
    BaseMessage,
    ChatMessageChunk,
    FunctionMessageChunk,
    HumanMessageChunk,
    MessageContentComplex,
    MessageContentImageUrl,
    MessageType,
    SystemMessageChunk,
    ToolMessage,
    ToolMessageChunk,
    type UsageMetadata
} from '@langchain/core/messages'
import { StructuredTool } from '@langchain/core/tools'
import { JsonSchema7Type, zodToJsonSchema } from 'zod-to-json-schema'
import {
    ChatCompletionParts,
    ChatCompletionResponseMessage,
    ChatCompletionResponseMessageRoleEnum,
    ChatCompletionTool,
    ResponsesFunctionTool,
    ChatCompletionUsage,
    ResponsesTool
} from './types.js'
import type { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import {
    getImageMimeType,
    getMimeTypeFromSource,
    isMessageContentImageUrl
} from 'koishi-plugin-chatluna/utils/string'
import { ToolCallChunk } from '@langchain/core/messages/tool'
import { isZodSchemaV3 } from '@langchain/core/utils/types'
import { normalizeOpenAIModelName, supportImageInput } from './client.js'

export const PROVIDER_RESPONSE_DIAGNOSTIC_KEY =
    '__chatluna_provider_response_diagnostic_v1'

export function createUsageMetadata(data: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
    inputAudioTokens?: number
    outputAudioTokens?: number
    cacheReadTokens?: number
    cacheCreationTokens?: number
    reasoningTokens?: number
}): UsageMetadata {
    const inputTokenDetails = {
        ...(data.inputAudioTokens != null
            ? { audio: data.inputAudioTokens }
            : {}),
        ...(data.cacheReadTokens != null
            ? { cache_read: data.cacheReadTokens }
            : {}),
        ...(data.cacheCreationTokens != null
            ? { cache_creation: data.cacheCreationTokens }
            : {})
    }
    const outputTokenDetails = {
        ...(data.outputAudioTokens != null
            ? { audio: data.outputAudioTokens }
            : {}),
        ...(data.reasoningTokens != null
            ? { reasoning: data.reasoningTokens }
            : {})
    }

    return {
        input_tokens: data.inputTokens,
        output_tokens: data.outputTokens,
        total_tokens: data.totalTokens,
        ...(Object.keys(inputTokenDetails).length > 0
            ? { input_token_details: inputTokenDetails }
            : {}),
        ...(Object.keys(outputTokenDetails).length > 0
            ? { output_token_details: outputTokenDetails }
            : {})
    }
}

export function openAIUsageToUsageMetadata(
    usage: ChatCompletionUsage
): UsageMetadata {
    return createUsageMetadata({
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        inputAudioTokens: usage.prompt_tokens_details?.audio_tokens,
        outputAudioTokens: usage.completion_tokens_details?.audio_tokens,
        cacheReadTokens: usage.prompt_tokens_details?.cached_tokens,
        reasoningTokens: usage.completion_tokens_details?.reasoning_tokens
    })
}

export async function langchainMessageToOpenAIMessage(
    messages: BaseMessage[],
    plugin: ChatLunaPlugin,
    model?: string,
    supportImageInputType?: boolean,
    removeSystemMessage?: boolean
): Promise<ChatCompletionResponseMessage[]> {
    const result: ChatCompletionResponseMessage[] = []

    const normalizedModel = model ? normalizeOpenAIModelName(model) : model
    for (const rawMessage of messages) {
        const role = messageTypeToOpenAIRole(rawMessage.getType())
        const content =
            rawMessage.content == null ? '' : rawMessage.content

        const msg = {
            content,
            name:
                role === 'assistant' || role === 'tool'
                    ? rawMessage.name
                    : undefined,
            role,
            //  function_call: rawMessage.additional_kwargs.function_call,

            tool_call_id: (rawMessage as ToolMessage).tool_call_id || undefined
        } as ChatCompletionResponseMessage

        if (msg.tool_calls == null) {
            delete msg.tool_calls
        }

        if (msg.tool_call_id == null) {
            delete msg.tool_call_id
        }

        if (rawMessage.getType() === 'ai') {
            const toolCalls = (rawMessage as AIMessage).tool_calls

            if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                msg.tool_calls = toolCalls
                    .filter(
                        (
                            toolCall
                        ): toolCall is typeof toolCall & { id: string } =>
                            typeof toolCall?.id === 'string'
                    )
                    .map((toolCall) => ({
                        id: toolCall.id,
                        type: 'function',
                        function: {
                            name: toolCall.name,
                            arguments: JSON.stringify(toolCall.args)
                        }
                    }))
            }
        }

        const images = rawMessage.additional_kwargs.images as string[] | null

        const lowerModel = normalizedModel?.toLowerCase() ?? ''
        if (
            images != null &&
            (supportImageInput(lowerModel) || supportImageInputType)
        ) {
            msg.content = [
                {
                    type: 'text',
                    text: rawMessage.content as string
                }
            ]

            const imageContents = await Promise.all(
                images.map(async (image) => {
                    try {
                        const imageUrl = await resolveOpenAIInputImageUrl(
                            plugin,
                            image
                        )
                        return {
                            type: 'image_url',
                            image_url: imageUrl
                        } as const
                    } catch {
                        return null
                    }
                })
            )

            msg.content.push(
                ...imageContents.filter((content) => content != null)
            )
        } else if (Array.isArray(msg.content) && msg.content.length > 0) {
            const mappedContent = await Promise.all(
                msg.content.map(async (content: ChatCompletionParts) => {
                    if (!isMessageContentImageUrl(content)) return content

                    try {
                        const imageContent = content as Extract<
                            ChatCompletionParts,
                            { type: 'image_url' }
                        >
                        const imageUrl = await resolveOpenAIInputImageUrl(
                            plugin,
                            typeof imageContent.image_url === 'string'
                                ? imageContent.image_url
                                : {
                                      url: imageContent.image_url.url,
                                      detail: imageContent.image_url.detail
                                  }
                        )
                        return {
                            type: 'image_url',
                            image_url: imageUrl
                        }
                    } catch {
                        return null
                    }
                })
            )

            msg.content = mappedContent.filter((content) => content != null) as ChatCompletionParts[]
        }

        result.push(msg)
    }

    // Conservatively recover missing tool_call_ids only when the previous
    // assistant message exposed exactly one real tool call.
    for (let i = 0; i < result.length; i++) {
        if (result[i].role !== 'assistant') continue

        const assistantMsg = result[i]
        const toolCalls =
            assistantMsg.tool_calls?.filter(
                (toolCall: NonNullable<ChatCompletionResponseMessage['tool_calls']>[number]) =>
                    typeof toolCall?.id === 'string' &&
                    toolCall.id.trim().length > 0
            ) ?? []

        if (toolCalls.length !== 1) continue

        for (
            let j = i + 1;
            j < result.length && result[j].role === 'tool';
            j++
        ) {
            if (!normalizeToolCallId(result[j].tool_call_id)) {
                result[j].tool_call_id = toolCalls[0].id
            }
        }
    }

    if (removeSystemMessage) {
        return transformSystemMessages(result)
    }

    return processInterleavedThinkMessages(result, messages)
}

export async function langchainMessageToResponsesInput(
    messages: BaseMessage[],
    plugin: ChatLunaPlugin,
    model?: string,
    supportImageInputType?: boolean,
    removeSystemMessage?: boolean
): Promise<Record<string, unknown>[]> {
    const converted = await langchainMessageToOpenAIMessage(
        messages,
        plugin,
        model,
        supportImageInputType,
        removeSystemMessage
    )
    const result: Record<string, unknown>[] = []
    const emittedToolCallIds = new Set<string>()
    let singleToolFallbackId: string | undefined

    for (const message of converted) {
        if (message.role === 'assistant' && Array.isArray(message.tool_calls)) {
            if (
                typeof message.content === 'string' &&
                message.content.trim().length > 0
            ) {
                result.push({
                    role: 'assistant',
                    content: message.content
                })
            } else if (Array.isArray(message.content) && message.content.length > 0) {
                result.push({
                    role: 'assistant',
                    content: normalizeResponsesMessageContent(message.content)
                })
            }

            const validToolCalls = message.tool_calls.filter(
                (toolCall: NonNullable<ChatCompletionResponseMessage['tool_calls']>[number]) =>
                    typeof toolCall?.id === 'string' &&
                    toolCall.id.trim().length > 0 &&
                    typeof toolCall?.function?.name === 'string' &&
                    toolCall.function.name.trim().length > 0 &&
                    typeof toolCall?.function?.arguments === 'string'
            )

            singleToolFallbackId =
                validToolCalls.length === 1 ? validToolCalls[0].id.trim() : undefined

            for (const toolCall of validToolCalls) {
                const callId = toolCall.id.trim()
                emittedToolCallIds.add(callId)
                result.push({
                    type: 'function_call',
                    call_id: callId,
                    name: toolCall.function.name,
                    arguments: toolCall.function.arguments
                })
            }
            continue
        }

        if (message.role === 'tool' || message.role === 'function') {
            const explicitCallId = normalizeToolCallId(message.tool_call_id)
            const callId = explicitCallId ?? singleToolFallbackId

            if (singleToolFallbackId != null && callId === singleToolFallbackId) {
                singleToolFallbackId = undefined
            }

            if (callId == null || !emittedToolCallIds.has(callId)) {
                warnOrphanResponsesToolOutput(
                    callId ?? explicitCallId ?? '<missing>',
                    message.name ?? '<unknown>'
                )
                continue
            }

            result.push({
                type: 'function_call_output',
                call_id: callId,
                output:
                    typeof message.content === 'string'
                        ? message.content
                        : JSON.stringify(message.content ?? '')
            })
            continue
        }

        singleToolFallbackId = undefined
        result.push({
            role: message.role,
            content: normalizeResponsesMessageContent(message.content)
        })
    }

    return result
}

function normalizeToolCallId(value: unknown): string | undefined {
    if (typeof value !== 'string') {
        return undefined
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

function warnOrphanResponsesToolOutput(callId: string, name: string) {
    console.warn(
        `[chatluna-shared-adapter] dropping orphan responses tool output: call_id=${callId} name=${name}`
    )
}

function isPrivateOrLoopbackHost(hostname: string) {
    const lower = hostname.toLowerCase()

    if (
        lower === 'localhost' ||
        lower === '0.0.0.0' ||
        lower === '::1' ||
        lower.endsWith('.local')
    ) {
        return true
    }

    if (/^127\./.test(lower) || /^10\./.test(lower) || /^192\.168\./.test(lower)) {
        return true
    }

    const match = lower.match(/^172\.(\d+)\./)
    if (match) {
        const octet = Number(match[1])
        if (octet >= 16 && octet <= 31) {
            return true
        }
    }

    return false
}

function canUseRemoteOpenAIUrl(url: string) {
    if (!/^https?:\/\//i.test(url)) {
        return false
    }

    try {
        const parsed = new URL(url)
        return !isPrivateOrLoopbackHost(parsed.hostname)
    } catch {
        return false
    }
}

async function resolveOpenAIInputImageUrl(
    plugin: ChatLunaPlugin,
    image:
        | string
        | {
              url: string
              detail?: unknown
          }
) {
    if (typeof image === 'string') {
        if (canUseRemoteOpenAIUrl(image)) {
            return {
                url: image,
                detail: 'high' as const
            }
        }

        return {
            url: await fetchImageUrl(plugin, {
                type: 'image_url',
                image_url: { url: image }
            } as MessageContentImageUrl),
            detail: 'high' as const
        }
    }

    if (canUseRemoteOpenAIUrl(image.url)) {
        return {
            url: image.url,
            ...(typeof image.detail === 'string'
                ? {
                      detail: image.detail
                  }
                : {
                      detail: 'high'
                  })
        }
    }

    return {
        url: await fetchImageUrl(plugin, {
            type: 'image_url',
            image_url: image
        } as MessageContentImageUrl),
        ...(typeof image.detail === 'string'
            ? {
                  detail: image.detail
              }
            : {
                  detail: 'high'
              })
    }
}

function normalizeResponsesMessageContent(
    content: ChatCompletionResponseMessage['content']
): ChatCompletionResponseMessage['content'] | Record<string, unknown>[] {
    if (!Array.isArray(content)) {
        return content
    }

    return content
        .map((part) => {
            if (part == null || typeof part !== 'object') {
                return part as Record<string, unknown>
            }

            const typedPart = part as {
                type?: unknown
                text?: unknown
                image_url?: unknown
            }

            if (typedPart.type === 'text' && typeof typedPart.text === 'string') {
                return {
                    type: 'input_text',
                    text: typedPart.text
                }
            }

            if (typedPart.type === 'image_url' && typedPart.image_url != null) {
                if (typeof typedPart.image_url === 'string') {
                    return {
                        type: 'input_image',
                        image_url: typedPart.image_url
                    }
                }

                if (
                    typeof typedPart.image_url === 'object' &&
                    typedPart.image_url !== null &&
                    typeof (typedPart.image_url as { url?: unknown }).url ===
                        'string'
                ) {
                    const imageUrl = typedPart.image_url as {
                        url: string
                        detail?: unknown
                    }

                    return {
                        type: 'input_image',
                        image_url: imageUrl.url,
                        ...(typeof imageUrl.detail === 'string'
                            ? {
                                  detail: imageUrl.detail
                              }
                            : {})
                    }
                }
            }

            if (typedPart.type === 'file_url') {
                const rawFileUrl = (typedPart as {
                    file_url?: unknown
                }).file_url

                if (typeof rawFileUrl === 'string') {
                    return {
                        type: 'input_file',
                        file_url: rawFileUrl
                    }
                }

                if (
                    rawFileUrl != null &&
                    typeof rawFileUrl === 'object' &&
                    typeof (rawFileUrl as { url?: unknown }).url === 'string'
                ) {
                    return {
                        type: 'input_file',
                        file_url: (rawFileUrl as { url: string }).url
                    }
                }
            }

            return part as Record<string, unknown>
        })
        .filter((part) => part != null)
}

export function processInterleavedThinkMessages(
    convertedMessages: ChatCompletionResponseMessage[],
    originalMessages: BaseMessage[]
): ChatCompletionResponseMessage[] {
    if (originalMessages.length === 0) {
        return convertedMessages
    }

    // Find the start of the last turn by locating the last user message
    // According to DeepSeek docs: a turn starts with a user message
    let lastTurnStartIndex = -1
    for (let i = originalMessages.length - 1; i >= 0; i--) {
        const message = originalMessages[i]
        if (message.getType() === 'human') {
            lastTurnStartIndex = i
            break
        }
    }

    // If no user message found, treat all messages as the last turn
    if (lastTurnStartIndex === -1) {
        lastTurnStartIndex = 0
    }

    // For messages in the last turn, add reasoning_content from additional_kwargs
    return convertedMessages.map((message, index) => {
        // Only process messages in the last turn (from lastTurnStartIndex onwards)
        if (index >= lastTurnStartIndex) {
            const originalMessage = originalMessages[index]
            const reasoningContent = originalMessage?.additional_kwargs
                ?.reasoning_content as string | undefined

            if (reasoningContent) {
                return {
                    ...message,
                    reasoning_content: reasoningContent
                }
            }
        }
        return message
    })
}

export function transformSystemMessages(
    messages: ChatCompletionResponseMessage[]
): ChatCompletionResponseMessage[] {
    const mappedMessage: ChatCompletionResponseMessage[] = []

    for (let i = 0; i < messages.length; i++) {
        const message = messages[i]

        if (message.role !== 'system') {
            mappedMessage.push(message)
            continue
        }

        // Skip system messages (remove them)
        continue
    }

    // Ensure the conversation doesn't end with an assistant message
    if (mappedMessage[mappedMessage.length - 1]?.role === 'assistant') {
        mappedMessage.push({
            role: 'user',
            content:
                'Continue what I said to you last message. Follow these instructions.'
        })
    }

    // Ensure the conversation doesn't start with an assistant message
    if (mappedMessage[0]?.role === 'assistant') {
        mappedMessage.unshift({
            role: 'user',
            content:
                'Continue what I said to you last time. Follow these instructions.'
        })
    }

    return mappedMessage
}

export async function fetchImageUrl(
    plugin: ChatLunaPlugin,
    content: MessageContentImageUrl
) {
    const url =
        typeof content.image_url === 'string'
            ? content.image_url
            : content.image_url.url

    if (url.includes('data:image') && url.includes('base64')) {
        return url
    }

    const ext = url.match(/\.([^.?#]+)(?:[?#]|$)/)?.[1]?.toLowerCase()
    const imageType = getImageMimeType(ext)
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)
    const response = await plugin
        .fetch(url, {
            signal: controller.signal
        })
        .finally(() => {
            clearTimeout(timeout)
        })

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())

    return `data:${imageType};base64,${buffer.toString('base64')}`
}

type MessageContentFileLike = MessageContentComplex &
    (
        | {
              type: 'file_url'
              file_url: string | { url: string; mimeType?: string }
          }
        | {
              type: 'audio_url'
              audio_url: string | { url: string; mimeType?: string }
          }
        | {
              type: 'video_url'
              video_url: string | { url: string; mimeType?: string }
          }
    )

function getFileLikeUrlInfo(content: MessageContentFileLike) {
    switch (content.type) {
        case 'file_url': {
            const raw = content.file_url
            return {
                url: typeof raw === 'string' ? raw : raw.url,
                mimeType: typeof raw === 'string' ? undefined : raw.mimeType
            }
        }
        case 'audio_url': {
            const raw = content.audio_url
            return {
                url: typeof raw === 'string' ? raw : raw.url,
                mimeType: typeof raw === 'string' ? undefined : raw.mimeType
            }
        }
        case 'video_url': {
            const raw = content.video_url
            return {
                url: typeof raw === 'string' ? raw : raw.url,
                mimeType: typeof raw === 'string' ? undefined : raw.mimeType
            }
        }
    }
}

/**
 * Fetch file/audio/video content and return decoded bytes.
 * If the source is a base64 data URL, it is decoded directly.
 */
export async function fetchFileLikeUrl(
    plugin: ChatLunaPlugin,
    content: MessageContentFileLike
) {
    const { url, mimeType } = getFileLikeUrlInfo(content)
    const dataUrlMatch = url.match(/^data:([^;,]+);base64,(.+)$/i)

    if (dataUrlMatch) {
        return {
            buffer: Buffer.from(dataUrlMatch[2], 'base64'),
            mimeType: dataUrlMatch[1] || mimeType || 'application/octet-stream'
        }
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60_000)
    const response = await plugin
        .fetch(url, {
            signal: controller.signal
        })
        .finally(() => {
            clearTimeout(timeout)
        })

    if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const fetchedMimeType = response.headers
        .get('content-type')
        ?.split(';')[0]
        ?.trim()

    return {
        buffer,
        mimeType:
            mimeType ??
            fetchedMimeType ??
            getMimeTypeFromSource(url) ??
            'application/octet-stream'
    }
}

export function messageTypeToOpenAIRole(
    type: MessageType
): ChatCompletionResponseMessageRoleEnum {
    switch (type) {
        case 'system':
            return 'system'
        case 'ai':
            return 'assistant'
        case 'human':
            return 'user'
        case 'function':
            return 'function'
        case 'tool':
            return 'tool'
        default:
            throw new Error(`Unknown message type: ${type}`)
    }
}

export function formatToolsToOpenAITools(
    tools: StructuredTool[],
    includeGoogleSearch: boolean
): ChatCompletionTool[] | undefined {
    const result = tools.map(formatToolToOpenAITool)

    if (includeGoogleSearch) {
        result.push({
            type: 'function',
            function: {
                name: 'googleSearch'
            }
        })
    }

    if (result.length < 1) {
        return undefined
    }

    return result
}

export function formatToolsToResponsesTools(
    tools: StructuredTool[],
    includeGoogleSearch: boolean,
    toolProfile: string = 'default'
): ResponsesTool[] | undefined {
    const result = tools.flatMap((tool) =>
        formatToolToResponsesTool(tool, toolProfile)
    )

    if (includeGoogleSearch) {
        result.push({
            type: 'web_search',
            search_context_size: 'medium'
        })
    }

    if (result.length < 1) {
        return undefined
    }

    return result
}

function formatToolToResponsesTool(
    tool: StructuredTool,
    toolProfile: string
): ResponsesTool[] {
    if (toolProfile === 'qqbot_openai_main_chat') {
        if (
            tool.name === 'question' ||
            tool.name === 'user_confirm' ||
            tool.name === 'web_browser'
        ) {
            return []
        }

        if (tool.name === 'web_search') {
            return [
                {
                    type: 'web_search',
                    search_context_size: 'medium'
                }
            ]
        }

        if (tool.name === 'web_post') {
            return [
                {
                    type: 'function',
                    name: 'web_post',
                    description:
                        'Send a POST request with a JSON payload encoded as a string.',
                    parameters: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url', 'json_payload'],
                        properties: {
                            url: {
                                type: 'string',
                                description:
                                    'The URL to send the POST request to. Must be a valid HTTP/HTTPS URL.'
                            },
                            json_payload: {
                                type: 'string',
                                description:
                                    'A JSON-encoded object string used as the POST request body.'
                            }
                        }
                    },
                    strict: true
                } satisfies ResponsesFunctionTool
            ]
        }
    }

    const formatted = formatToolToOpenAITool(tool)
    return [
        {
            type: 'function',
            name: formatted.function.name,
            description: formatted.function.description,
            parameters: enforceResponsesStrictSchema(
                formatted.function.parameters as JsonSchema7Type
            ),
            strict: true
        }
    ]
}

function enforceResponsesStrictSchema(
    schema: JsonSchema7Type | undefined
): JsonSchema7Type | undefined {
    if (!schema || typeof schema !== 'object') {
        return schema
    }

    const stack: JsonSchema7Type[] = [schema]

    while (stack.length > 0) {
        const current = stack.pop()
        if (!current || typeof current !== 'object') continue
        const currentRecord = current as Record<string, unknown>

        if (
            currentRecord.type === 'object' ||
            Object.hasOwn(currentRecord, 'properties')
        ) {
            currentRecord.additionalProperties = false
            const properties =
                currentRecord.properties &&
                typeof currentRecord.properties === 'object' &&
                !Array.isArray(currentRecord.properties)
                    ? (currentRecord.properties as Record<string, unknown>)
                    : null

            if (properties) {
                currentRecord.required = Object.keys(properties)
            }
        }

        for (const key of Object.keys(currentRecord)) {
            const value = currentRecord[key]
            if (value && typeof value === 'object') {
                stack.push(value as JsonSchema7Type)
            }
        }
    }

    return schema
}

export function formatToolToOpenAITool(
    tool: StructuredTool
): ChatCompletionTool {
    const parameters = removeAdditionalProperties(
        isZodSchemaV3(tool.schema)
            ? zodToJsonSchema(tool.schema as never, {
                  allowedAdditionalProperties: undefined
              })
            : tool.schema
    )

    return {
        type: 'function',
        function: {
            name: tool.name,
            description: tool.description,
            // any?
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            parameters
        }
    }
}

export function removeAdditionalProperties(
    schema: JsonSchema7Type
): JsonSchema7Type {
    if (!schema || typeof schema !== 'object') return schema

    const stack: [JsonSchema7Type, string | null][] = [[schema, null]]

    while (stack.length > 0) {
        const next = stack.pop()
        if (!next) continue
        const [current] = next

        if (typeof current !== 'object' || current === null) continue
        const currentRecord = current as Record<string, unknown>

        // Remove additionalProperties and $schema
        if (Object.hasOwn(currentRecord, 'additionalProperties')) {
            delete currentRecord['additionalProperties']
        }

        if (Object.hasOwn(currentRecord, '$schema')) {
            delete currentRecord['$schema']
        }

        // Convert const to enum for Gemini/Vertex AI compatibility
        // const: X is semantically equivalent to enum: [X] per JSON Schema spec
        if (Object.hasOwn(currentRecord, 'const')) {
            if (!Object.hasOwn(currentRecord, 'enum')) {
                currentRecord['enum'] = [currentRecord['const']]
            }
            delete currentRecord['const']
        }

        // Process all keys in the object
        for (const key of Object.keys(currentRecord)) {
            const value = currentRecord[key]
            if (value && typeof value === 'object') {
                stack.push([value, key])
            }
        }
    }

    return schema
}

export function convertMessageToMessageChunk(
    message: ChatCompletionResponseMessage
) {
    const content = message.content ?? ''
    const reasoningContent = message.reasoning_content ?? ''

    const role = (
        (message.role?.length ?? 0) > 0 ? message.role : 'assistant'
    ).toLowerCase()

    const additionalKwargs: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
        function_call?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
        tool_calls?: any
        reasoning_content?: string
        __provider_tool_calls_unparseable?: number
    } = {}

    if (reasoningContent.length > 0) {
        additionalKwargs.reasoning_content = reasoningContent
    }

    if (role === 'user') {
        return new HumanMessageChunk({ content })
    } else if (role === 'assistant') {
        const toolCallChunks: ToolCallChunk[] = []
        const normalizedToolCalls: {
            id: string
            name: string
            args: Record<string, any>
        }[] = []
        let unparseableToolCallCount = 0
        if (Array.isArray(message.tool_calls)) {
            for (const rawToolCall of message.tool_calls) {
                let name = rawToolCall.function?.name

                if (name != null && name.length < 1) {
                    name = ''
                }
                toolCallChunks.push({
                    name: name ?? '',
                    args: rawToolCall.function?.arguments,
                    id: rawToolCall.id
                })

                if (
                    typeof rawToolCall.id === 'string' &&
                    typeof name === 'string' &&
                    name.length > 0
                ) {
                    let parsedArgs: Record<string, any> = {}
                    const rawArguments = rawToolCall.function?.arguments
                    if (
                        typeof rawArguments === 'string' &&
                        rawArguments.length > 0
                    ) {
                        try {
                            const parsed = JSON.parse(rawArguments) as unknown
                            parsedArgs =
                                parsed != null &&
                                typeof parsed === 'object' &&
                                !Array.isArray(parsed)
                                    ? (parsed as Record<string, any>)
                                    : {
                                          input: parsed
                                      }
                        } catch {
                            unparseableToolCallCount++
                            continue
                        }
                    }

                    normalizedToolCalls.push({
                        id: rawToolCall.id,
                        name,
                        args: parsedArgs
                    })
                }
            }
        }

        additionalKwargs.tool_calls = message.tool_calls
        if (unparseableToolCallCount > 0) {
            additionalKwargs.__provider_tool_calls_unparseable =
                unparseableToolCallCount
        }
        return new AIMessageChunk({
            content,
            tool_call_chunks: toolCallChunks,
            ...(normalizedToolCalls.length > 0
                ? { tool_calls: normalizedToolCalls }
                : {}),
            additional_kwargs: additionalKwargs
        })
    } else if (role === 'system') {
        return new SystemMessageChunk({ content })
    } else if (role === 'function') {
        return new FunctionMessageChunk({
            content,
            additional_kwargs: additionalKwargs,
            name: message.name
        })
    } else if (role === 'tool') {
        return new ToolMessageChunk({
            content,
            additional_kwargs: additionalKwargs,
            tool_call_id: message.tool_call_id ?? ''
        })
    } else {
        return new ChatMessageChunk({ content, role })
    }
}

export function convertDeltaToMessageChunk(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delta: Record<string, any>,
    defaultRole?: ChatCompletionResponseMessageRoleEnum
) {
    const role = (
        (delta.role?.length ?? 0) > 0 ? delta.role : defaultRole
    ).toLowerCase()
    const content = delta.content ?? ''
    const reasoningContent = delta.reasoning_content ?? ''

    let additionalKwargs: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
        function_call?: any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention
        tool_calls?: any
        reasoning_content?: string
    }
    if (delta.function_call) {
        additionalKwargs = {
            function_call: delta.function_call
        }
    } else {
        additionalKwargs = {}
    }

    if (reasoningContent.length > 0) {
        additionalKwargs.reasoning_content = reasoningContent
    }

    if (role === 'user') {
        return new HumanMessageChunk({ content })
    } else if (role === 'assistant') {
        const toolCallChunks = []
        if (Array.isArray(delta.tool_calls)) {
            for (const rawToolCall of delta.tool_calls) {
                const toolCall = {
                    name: rawToolCall.function?.name,
                    args: rawToolCall.function?.arguments,
                    id: rawToolCall.id,
                    index: rawToolCall.index
                }

                if (toolCall.name != null && toolCall.name.length < 1) {
                    delete toolCall.name
                }

                toolCallChunks.push(toolCall)
            }
        }

        return new AIMessageChunk({
            content,
            tool_call_chunks: toolCallChunks,
            additional_kwargs: Array.isArray(delta.tool_calls)
                ? {
                      ...additionalKwargs,
                      tool_calls: delta.tool_calls
                  }
                : additionalKwargs
        })
    } else if (role === 'system') {
        return new SystemMessageChunk({ content })
    } else if (role === 'function') {
        return new FunctionMessageChunk({
            content,
            additional_kwargs: additionalKwargs,
            name: delta.name
        })
    } else if (role === 'tool') {
        return new ToolMessageChunk({
            content,
            additional_kwargs: additionalKwargs,
            tool_call_id: delta.tool_call_id
        })
    } else {
        return new ChatMessageChunk({ content, role })
    }
}
