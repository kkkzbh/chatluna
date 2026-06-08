import { ChatGenerationChunk } from '@langchain/core/outputs'
import {
    EmbeddingsRequestParams,
    ModelRequester,
    ModelRequestParams
} from 'koishi-plugin-chatluna/llm-core/platform/api'
import { ClientConfig } from 'koishi-plugin-chatluna/llm-core/platform/config'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { SSEEvent, sseIterable } from 'koishi-plugin-chatluna/utils/sse'
import {
    ChatCompletionResponse,
    ChatCompletionResponseMessageRoleEnum,
    CreateEmbeddingResponse,
    ResponsesApiResponse
} from './types.js'
import {
    convertDeltaToMessageChunk,
    convertMessageToMessageChunk,
    createUsageMetadata,
    formatToolsToOpenAITools,
    formatToolsToResponsesTools,
    langchainMessageToOpenAIMessage,
    langchainMessageToResponsesInput,
    openAIUsageToUsageMetadata,
    PROVIDER_RESPONSE_DIAGNOSTIC_KEY
} from './utils.js'
import type { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import type { Context } from 'koishi'
import { AIMessageChunk } from '@langchain/core/messages'
import { Response } from 'undici/types/fetch'
import { getMessageContent } from 'koishi-plugin-chatluna/utils/string'
import { RunnableConfig } from '@langchain/core/runnables'
import { trackLogToLocal } from 'koishi-plugin-chatluna/utils/logger'
import { deepAssign } from 'koishi-plugin-chatluna/utils/object'
import {
    expandReasoningEffortModelVariants,
    parseOpenAIModelNameWithReasoningEffort
} from './client.js'

interface RequestContext<
    T extends ClientConfig = ClientConfig,
    R extends ChatLunaPlugin.Config = ChatLunaPlugin.Config
> {
    ctx: Context
    config: T
    pluginConfig: R
    plugin: ChatLunaPlugin
    modelRequester: ModelRequester<T, R>
}

type RequestLogContext = Context & {
    chatluna?: {
        currentConfig?: {
            isLog?: boolean
        }
    }
}

function isRequestLoggingEnabled(ctx: Context): boolean {
    return (ctx as RequestLogContext).chatluna?.currentConfig?.isLog === true
}

function sanitizeOverrideRequestParams(
    value: ModelRequestParams['overrideRequestParams']
) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return undefined
    }

    const result = { ...value }
    for (const key of Object.keys(result)) {
        if (key.startsWith('qqbot_')) {
            delete result[key]
        }
    }
    return result
}

export async function buildChatCompletionParams(
    params: ModelRequestParams,
    plugin: ChatLunaPlugin,
    enableGoogleSearch: boolean,
    supportImageInput?: boolean
) {
    const parsedModel = parseOpenAIModelNameWithReasoningEffort(params.model)
    const normalizedModel = parsedModel.model

    const base = {
        model: normalizedModel,
        messages: await langchainMessageToOpenAIMessage(
            params.input,
            plugin,
            normalizedModel,
            supportImageInput
        ),
        tools:
            enableGoogleSearch || params.tools != null
                ? formatToolsToOpenAITools(
                      params.tools ?? [],
                      enableGoogleSearch
                  )
                : undefined,
        tool_choice: params.tool_choice,
        stop: params.stop || undefined,
        max_tokens: normalizedModel.includes('vision')
            ? undefined
            : params.maxTokens,
        temperature: params.temperature === 0 ? undefined : params.temperature,
        presence_penalty:
            params.presencePenalty === 0 ? undefined : params.presencePenalty,
        frequency_penalty:
            params.frequencyPenalty === 0 ? undefined : params.frequencyPenalty,
        n: params.n,
        top_p: params.topP,
        prompt_cache_key: params.id,
        prompt_cache_retention: undefined,
        prediction: undefined,
        reasoning_effort: parsedModel.reasoningEffort,
        response_format: undefined,
        safety_identifier: undefined,
        service_tier: undefined,
        stream: true,
        logit_bias: params.logitBias,
        stream_options: {
            include_usage: true
        }
    }

    const lowerModel = normalizedModel.toLowerCase()
    const isOpenAIReasoningModel =
        lowerModel.startsWith('o1') ||
        lowerModel.startsWith('o3') ||
        lowerModel.startsWith('o4') ||
        lowerModel.startsWith('gpt-5')

    if (isOpenAIReasoningModel) {
        delete base.temperature
        delete base.presence_penalty
        delete base.frequency_penalty
        delete base.n
        delete base.top_p
    }
    return deepAssign(
        {},
        base,
        sanitizeOverrideRequestParams(params.overrideRequestParams) ?? {}
    )
}

export async function buildResponsesParams(
    params: ModelRequestParams,
    plugin: ChatLunaPlugin,
    enableGoogleSearch: boolean,
    supportImageInput?: boolean
) {
    const overrideRequestParams =
        params.overrideRequestParams != null &&
        typeof params.overrideRequestParams === 'object' &&
        !Array.isArray(params.overrideRequestParams)
            ? { ...params.overrideRequestParams }
            : undefined
    const toolProfile =
        typeof overrideRequestParams?.qqbot_tool_profile === 'string'
            ? overrideRequestParams.qqbot_tool_profile
            : 'default'
    if (overrideRequestParams != null) {
        for (const key of Object.keys(overrideRequestParams)) {
            if (key.startsWith('qqbot_')) {
                delete overrideRequestParams[key]
            }
        }
    }
    const parsedModel = parseOpenAIModelNameWithReasoningEffort(params.model)
    const normalizedModel = parsedModel.model

    const base = {
        model: normalizedModel,
        input: await langchainMessageToResponsesInput(
            params.input,
            plugin,
            normalizedModel,
            supportImageInput
        ),
        tools:
            enableGoogleSearch || params.tools != null
                ? formatToolsToResponsesTools(
                      params.tools ?? [],
                      enableGoogleSearch,
                      toolProfile
                  )
                : undefined,
        tool_choice: params.tool_choice,
        stop: params.stop || undefined,
        max_output_tokens: normalizedModel.includes('vision')
            ? undefined
            : params.maxTokens,
        temperature: params.temperature === 0 ? undefined : params.temperature,
        top_p: params.topP,
        reasoning:
            parsedModel.reasoningEffort == null
                ? undefined
                : {
                      effort: parsedModel.reasoningEffort
                  },
        text: undefined
    }

    const request = deepAssign({}, base, overrideRequestParams ?? {})
    delete request['qqbot_request_mode']
    return request
}

function summarizeLastUserMessage(messages: unknown) {
    if (!Array.isArray(messages)) {
        return null
    }

    for (let index = messages.length - 1; index >= 0; index--) {
        const message = messages[index]
        if (
            message == null ||
            typeof message !== 'object' ||
            (message as { role?: unknown }).role !== 'user'
        ) {
            continue
        }

        const content = (message as { content?: unknown }).content
        if (!Array.isArray(content)) {
            return {
                contentKind: typeof content === 'string' ? 'string' : 'unknown',
                imageCount: 0,
                hasImageUrl: false
            }
        }

        const imageCount = content.filter(
            (part) =>
                part != null &&
                typeof part === 'object' &&
                (part as { type?: unknown }).type === 'image_url'
        ).length
        const fileCount = content.filter(
            (part) =>
                part != null &&
                typeof part === 'object' &&
                (part as { type?: unknown }).type === 'file_url'
        ).length

        return {
            contentKind: 'array',
            imageCount,
            fileCount,
            hasImageUrl: imageCount > 0
        }
    }

    return null
}

function summarizeLastUserInput(input: unknown) {
    if (!Array.isArray(input)) {
        return null
    }

    for (let index = input.length - 1; index >= 0; index--) {
        const item = input[index]
        if (
            item == null ||
            typeof item !== 'object' ||
            (item as { role?: unknown }).role !== 'user'
        ) {
            continue
        }

        const content = (item as { content?: unknown }).content
        if (!Array.isArray(content)) {
            return {
                contentKind: typeof content === 'string' ? 'string' : 'unknown',
                imageCount: 0,
                hasImageUrl: false
            }
        }

        const imageCount = content.filter((part) => {
            if (part == null || typeof part !== 'object') {
                return false
            }

            const type = (part as { type?: unknown }).type
            return type === 'image_url' || type === 'input_image'
        }).length
        const fileCount = content.filter((part) => {
            if (part == null || typeof part !== 'object') {
                return false
            }

            const type = (part as { type?: unknown }).type
            return type === 'file_url' || type === 'input_file'
        }).length

        return {
            contentKind: 'array',
            imageCount,
            fileCount,
            hasImageUrl: imageCount > 0
        }
    }

    return null
}

function logRequestPayloadSummary(
    requestContext: RequestContext,
    payload: Record<string, unknown>
) {
    const summary =
        summarizeLastUserMessage(payload.messages) ??
        summarizeLastUserInput(payload.input)
    if (summary == null) {
        return
    }

    requestContext.modelRequester.logger.debug(
        'llm request payload summary: %s',
        JSON.stringify({
            model: payload.model,
            requestBytes: estimateRequestBytes(payload),
            lastUserMessage: summary
        })
    )
}

function resolveMaxRequestBodyBytes() {
    const raw = Number(process.env.QQBOT_ATTACHMENT_MAX_REQUEST_BODY_BYTES)
    if (!Number.isFinite(raw) || raw < 1) {
        return 20 * 1024 * 1024
    }

    return Math.floor(raw)
}

function estimateRequestBytes(payload: Record<string, unknown>) {
    try {
        return Buffer.byteLength(JSON.stringify(payload))
    } catch {
        return 0
    }
}

function enforceRequestBodyBudget(payload: Record<string, unknown>) {
    const bytes = estimateRequestBytes(payload)
    const maxBytes = resolveMaxRequestBodyBytes()

    if (bytes <= maxBytes) {
        return
    }

    throw new ChatLunaError(
        ChatLunaErrorCode.API_REQUEST_FAILED,
        new Error(
            `Attachment request body is too large before provider call (${bytes} bytes > ${maxBytes} bytes).`
        )
    )
}

function isResponsesRequestMode(params: ModelRequestParams) {
    const override = params.overrideRequestParams
    return (
        override != null &&
        typeof override === 'object' &&
        !Array.isArray(override) &&
        override['qqbot_request_mode'] === 'responses'
    )
}

type ProviderResponseDiagnostic = {
    requestMode: 'chat_completions' | 'responses'
    providerToolCallCount: number
    messageToolCallCount: number
    toolCallChunkCount: number
    unparseableToolCallCount: number
    functionCallPresent: boolean
    providerOutputTokens: number | null
    rawMessageKeys: string[]
    rawChoiceKeys: string[]
    rawContentKind: string | null
    rawContentLength: number | null
}

function summarizeRecordKeys(value: unknown) {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return []
    }

    return Object.keys(value).slice(0, 24)
}

function summarizeContentShape(content: unknown): {
    kind: string | null
    length: number | null
} {
    if (typeof content === 'string') {
        return {
            kind: 'string',
            length: content.length
        }
    }

    if (Array.isArray(content)) {
        return {
            kind: 'array',
            length: content.length
        }
    }

    if (content == null) {
        return {
            kind: 'null',
            length: 0
        }
    }

    if (typeof content === 'object') {
        return {
            kind: 'object',
            length: Object.keys(content).length
        }
    }

    return {
        kind: typeof content,
        length: null
    }
}

function countMessageToolCalls(message: unknown) {
    if (
        message == null ||
        typeof message !== 'object' ||
        !('tool_calls' in message)
    ) {
        return 0
    }

    const toolCalls = (message as { tool_calls?: unknown }).tool_calls
    return Array.isArray(toolCalls) ? toolCalls.length : 0
}

function countToolCallChunks(message: unknown) {
    if (
        message == null ||
        typeof message !== 'object' ||
        !('tool_call_chunks' in message)
    ) {
        return 0
    }

    const toolCallChunks = (message as { tool_call_chunks?: unknown })
        .tool_call_chunks
    return Array.isArray(toolCallChunks) ? toolCallChunks.length : 0
}

function hasFunctionCall(message: unknown) {
    if (
        message == null ||
        typeof message !== 'object' ||
        !('additional_kwargs' in message)
    ) {
        return false
    }

    const additionalKwargs = (message as { additional_kwargs?: unknown })
        .additional_kwargs
    return (
        additionalKwargs != null &&
        typeof additionalKwargs === 'object' &&
        !Array.isArray(additionalKwargs) &&
        'function_call' in additionalKwargs &&
        (additionalKwargs as { function_call?: unknown }).function_call != null
    )
}

function countUnparseableToolCalls(message: unknown) {
    if (
        message == null ||
        typeof message !== 'object' ||
        !('additional_kwargs' in message)
    ) {
        return 0
    }

    const additionalKwargs = (message as { additional_kwargs?: unknown })
        .additional_kwargs
    if (
        additionalKwargs == null ||
        typeof additionalKwargs !== 'object' ||
        Array.isArray(additionalKwargs)
    ) {
        return 0
    }

    const count = (
        additionalKwargs as {
            __provider_tool_calls_unparseable?: unknown
        }
    ).__provider_tool_calls_unparseable
    return typeof count === 'number' && Number.isFinite(count) ? count : 0
}

function buildProviderResponseDiagnostic(args: {
    requestMode: 'chat_completions' | 'responses'
    rawChoice?: unknown
    rawMessage?: unknown
    messageChunk: unknown
    outputTokens?: number | null
    providerToolCallCount?: number
}) {
    const contentShape = summarizeContentShape(
        args.rawMessage != null &&
            typeof args.rawMessage === 'object' &&
            !Array.isArray(args.rawMessage) &&
            'content' in args.rawMessage
            ? (args.rawMessage as { content?: unknown }).content
            : undefined
    )

    return {
        requestMode: args.requestMode,
        providerToolCallCount:
            args.providerToolCallCount ??
            countMessageToolCalls(args.rawMessage),
        messageToolCallCount: countMessageToolCalls(args.messageChunk),
        toolCallChunkCount: countToolCallChunks(args.messageChunk),
        unparseableToolCallCount: countUnparseableToolCalls(args.messageChunk),
        functionCallPresent: hasFunctionCall(args.messageChunk),
        providerOutputTokens:
            typeof args.outputTokens === 'number' &&
            Number.isFinite(args.outputTokens)
                ? args.outputTokens
                : null,
        rawMessageKeys: summarizeRecordKeys(args.rawMessage),
        rawChoiceKeys: summarizeRecordKeys(args.rawChoice),
        rawContentKind: contentShape.kind,
        rawContentLength: contentShape.length
    } satisfies ProviderResponseDiagnostic
}

function attachProviderResponseDiagnostic(
    messageChunk: unknown,
    diagnostic: ProviderResponseDiagnostic
) {
    if (
        messageChunk == null ||
        typeof messageChunk !== 'object' ||
        !('additional_kwargs' in messageChunk)
    ) {
        return
    }

    const currentAdditionalKwargs = (
        messageChunk as { additional_kwargs?: unknown }
    ).additional_kwargs
    const additionalKwargs =
        currentAdditionalKwargs != null &&
        typeof currentAdditionalKwargs === 'object' &&
        !Array.isArray(currentAdditionalKwargs)
            ? { ...(currentAdditionalKwargs as Record<string, unknown>) }
            : {}

    additionalKwargs[PROVIDER_RESPONSE_DIAGNOSTIC_KEY] = diagnostic
    ;(
        messageChunk as { additional_kwargs?: Record<string, unknown> }
    ).additional_kwargs = additionalKwargs
}

function isEmptyAssistantFinish(diagnostic: ProviderResponseDiagnostic) {
    return (
        (diagnostic.rawContentLength ?? 0) < 1 &&
        diagnostic.messageToolCallCount < 1 &&
        diagnostic.toolCallChunkCount < 1 &&
        !diagnostic.functionCallPresent
    )
}

function logProviderResponseDiagnosticIfNeeded<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    diagnostic: ProviderResponseDiagnostic
) {
    if (isEmptyAssistantFinish(diagnostic)) {
        requestContext.modelRequester.logger.warn(
            'provider returned empty assistant finish: %s',
            JSON.stringify(diagnostic)
        )
        return
    }

    if (diagnostic.unparseableToolCallCount > 0) {
        requestContext.modelRequester.logger.warn(
            'provider tool calls contained unparseable arguments: %s',
            JSON.stringify(diagnostic)
        )
    }

    if (
        diagnostic.providerToolCallCount > 0 &&
        diagnostic.messageToolCallCount < 1 &&
        diagnostic.toolCallChunkCount < 1 &&
        !diagnostic.functionCallPresent
    ) {
        requestContext.modelRequester.logger.warn(
            'provider tool calls were not preserved on assistant finish: %s',
            JSON.stringify(diagnostic)
        )
    }
}

// eslint-disable-next-line generator-star-spacing
export async function* processStreamResponse<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    iterator: AsyncGenerator<SSEEvent, string, unknown>
) {
    let defaultRole: ChatCompletionResponseMessageRoleEnum = 'assistant'
    let errorCount = 0
    const reasoningState = {
        content: '',
        startedAt: Date.now(),
        endedAt: undefined as number | undefined
    }

    for await (const event of iterator) {
        const chunk = event.data
        if (chunk === '[DONE]') break
        if (chunk === '' || chunk == null || chunk === 'undefined') continue

        try {
            const data = JSON.parse(chunk) as ChatCompletionResponse

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((data as any).error) {
                throw new ChatLunaError(
                    ChatLunaErrorCode.API_REQUEST_FAILED,
                    new Error('Error when calling completion, Result: ' + chunk)
                )
            }

            const choice = data.choices?.[0]

            if (data.usage) {
                const usageMetadata = openAIUsageToUsageMetadata(data.usage)
                yield new ChatGenerationChunk({
                    generationInfo: {
                        usage_metadata: usageMetadata
                    },
                    message: new AIMessageChunk({
                        content: '',
                        usage_metadata: usageMetadata
                    }),
                    text: ''
                })
            }

            if (!choice) continue

            const delta = choice.delta

            if (delta == null) {
                const messageChunk = convertMessageToMessageChunk(
                    reasoningState.content.length > 0 &&
                        (choice.message.reasoning_content?.length ?? 0) < 1
                        ? {
                              ...choice.message,
                              reasoning_content: reasoningState.content
                          }
                        : choice.message
                )
                const diagnostic = buildProviderResponseDiagnostic({
                    requestMode: 'chat_completions',
                    rawChoice: choice,
                    rawMessage: choice.message,
                    messageChunk,
                    outputTokens: data.usage?.completion_tokens ?? null
                })
                attachProviderResponseDiagnostic(messageChunk, diagnostic)
                logProviderResponseDiagnosticIfNeeded(
                    requestContext,
                    diagnostic
                )

                reasoningState.content = ''

                if (reasoningState.endedAt == null) {
                    reasoningState.endedAt = Date.now()
                }

                defaultRole = (
                    (choice.message.role?.length ?? 0) > 0
                        ? choice.message.role
                        : defaultRole
                ) as ChatCompletionResponseMessageRoleEnum

                yield new ChatGenerationChunk({
                    message: messageChunk,
                    text: getMessageContent(messageChunk.content)
                })
                continue
            }

            const hasResult =
                (delta.content?.length ?? 0) > 0 ||
                (delta.tool_calls?.length ?? 0) > 0 ||
                delta.function_call != null

            if (reasoningState.endedAt == null && hasResult) {
                reasoningState.endedAt = Date.now()
            }

            if (
                reasoningState.endedAt == null &&
                !hasResult &&
                delta.reasoning_content
            ) {
                reasoningState.content += delta.reasoning_content
            }

            const messageChunk = convertDeltaToMessageChunk(
                {
                    ...delta,
                    reasoning_content: undefined
                },
                defaultRole
            )

            const hasMessageChunk =
                (typeof messageChunk.content === 'string'
                    ? messageChunk.content.length > 0
                    : Array.isArray(messageChunk.content) &&
                      messageChunk.content.length > 0) ||
                (messageChunk instanceof AIMessageChunk &&
                    (messageChunk.tool_call_chunks?.length ?? 0) > 0) ||
                messageChunk.additional_kwargs.function_call != null

            if (!hasMessageChunk) {
                defaultRole = (
                    (delta.role?.length ?? 0) > 0 ? delta.role : defaultRole
                ) as ChatCompletionResponseMessageRoleEnum
                continue
            }

            defaultRole = (
                (delta.role?.length ?? 0) > 0 ? delta.role : defaultRole
            ) as ChatCompletionResponseMessageRoleEnum

            yield new ChatGenerationChunk({
                message: messageChunk,
                text: getMessageContent(messageChunk.content)
            })
        } catch (e) {
            if (
                chunk.includes('tool_calls') ||
                chunk.includes('function_call') ||
                chunk.includes('tool_call_id')
            ) {
                requestContext.modelRequester.logger.error(
                    'error with chunk',
                    chunk
                )
                throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
            }

            if (errorCount > 5) {
                requestContext.modelRequester.logger.error(
                    'error with chunk',
                    chunk
                )
                throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
            }
            errorCount++
        }
    }

    if (reasoningState.content.length > 0) {
        const reasoningTime =
            (reasoningState.endedAt ?? Date.now()) - reasoningState.startedAt

        yield new ChatGenerationChunk({
            message: new AIMessageChunk({
                content: '',
                additional_kwargs: {
                    reasoning_content: reasoningState.content,
                    ...(reasoningTime != null
                        ? { reasoning_time: reasoningTime }
                        : {})
                }
            }),
            text: ''
        })

        requestContext.modelRequester.logger.debug(
            `Reasoning Content: ${reasoningState.content}. Thought for: ${(reasoningTime ?? 0) / 1000}s`
        )
    }
}

export async function processResponse<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(requestContext: RequestContext<T, R>, response: Response) {
    if (response.status !== 200) {
        throw new ChatLunaError(
            ChatLunaErrorCode.API_REQUEST_FAILED,
            new Error(
                'Error when calling completion, Status: ' +
                    response.status +
                    ' ' +
                    response.statusText +
                    ', Response: ' +
                    (await response.text())
            )
        )
    }

    const responseText = await response.text()

    try {
        const data = JSON.parse(responseText) as ChatCompletionResponse

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((data as any).error) {
            throw new ChatLunaError(
                ChatLunaErrorCode.API_REQUEST_FAILED,
                new Error(
                    'Error when calling completion, Result: ' + responseText
                )
            )
        }

        const choice = data.choices?.[0]

        if (!choice) {
            throw new ChatLunaError(
                ChatLunaErrorCode.API_REQUEST_FAILED,
                new Error(
                    'Error when calling completion, Result: ' + responseText
                )
            )
        }

        const messageChunk = convertMessageToMessageChunk(choice.message)
        const usageMetadata = data.usage
            ? openAIUsageToUsageMetadata(data.usage)
            : undefined
        const diagnostic = buildProviderResponseDiagnostic({
            requestMode: 'chat_completions',
            rawChoice: choice,
            rawMessage: choice.message,
            messageChunk,
            outputTokens: data.usage?.completion_tokens ?? null
        })
        attachProviderResponseDiagnostic(messageChunk, diagnostic)
        logProviderResponseDiagnosticIfNeeded(requestContext, diagnostic)

        if (messageChunk instanceof AIMessageChunk) {
            messageChunk.usage_metadata = usageMetadata
        }

        return new ChatGenerationChunk({
            message: messageChunk,
            text: getMessageContent(messageChunk.content),
            generationInfo:
                usageMetadata == null
                    ? undefined
                    : {
                          usage_metadata: usageMetadata
                      }
        })
    } catch (e) {
        if (e instanceof ChatLunaError) {
            throw e
        } else {
            throw new ChatLunaError(
                ChatLunaErrorCode.API_REQUEST_FAILED,
                new Error(
                    'Error when calling completion, Error: ' +
                        e +
                        ', Response: ' +
                        responseText
                )
            )
        }
    }
}

function parseJsonValue(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return text
    }
}

function normalizeResponsesToolCall(
    name: string,
    args: unknown
): { name: string; args: unknown } {
    if (
        name === 'web_post' &&
        args != null &&
        typeof args === 'object' &&
        !Array.isArray(args)
    ) {
        const payload = args as Record<string, unknown>
        const normalized: Record<string, unknown> = {
            ...payload
        }

        if (
            normalized.data == null &&
            typeof normalized.json_payload === 'string'
        ) {
            normalized.data = parseJsonValue(normalized.json_payload)
        }

        delete normalized.json_payload
        return {
            name,
            args: normalized
        }
    }

    return {
        name,
        args
    }
}

export async function processResponsesApiResponse<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(requestContext: RequestContext<T, R>, response: Response) {
    if (response.status !== 200) {
        throw new ChatLunaError(
            ChatLunaErrorCode.API_REQUEST_FAILED,
            new Error(
                'Error when calling responses, Status: ' +
                    response.status +
                    ' ' +
                    response.statusText +
                    ', Response: ' +
                    (await response.text())
            )
        )
    }

    const responseText = await response.text()

    try {
        const data = JSON.parse(responseText) as ResponsesApiResponse
        const output = Array.isArray(data.output) ? data.output : []
        const toolCalls = output
            .filter(
                (
                    item
                ): item is Extract<
                    ResponsesApiResponse['output'][number],
                    { type: 'function_call' }
                > =>
                    item != null &&
                    typeof item === 'object' &&
                    item.type === 'function_call' &&
                    typeof item.name === 'string' &&
                    typeof item.call_id === 'string' &&
                    typeof item.arguments === 'string'
            )
            .map((item) => {
                const normalizedToolCall = normalizeResponsesToolCall(
                    item.name,
                    parseJsonValue(item.arguments)
                )
                return {
                    id: item.call_id,
                    name: normalizedToolCall.name,
                    args: normalizedToolCall.args
                }
            })

        const text = output
            .filter(
                (
                    item
                ): item is Extract<
                    ResponsesApiResponse['output'][number],
                    { type: 'message' }
                > =>
                    item != null &&
                    typeof item === 'object' &&
                    item.type === 'message' &&
                    Array.isArray(item.content)
            )
            .flatMap((item) => item.content)
            .filter(
                (item): item is { type: 'output_text'; text: string } =>
                    item != null &&
                    typeof item === 'object' &&
                    item.type === 'output_text' &&
                    typeof item.text === 'string'
            )
            .map((item) => item.text)
            .join('\n')

        const usageMetadata =
            data.usage == null
                ? undefined
                : createUsageMetadata({
                      inputTokens: data.usage.input_tokens,
                      outputTokens: data.usage.output_tokens,
                      totalTokens: data.usage.total_tokens,
                      cacheReadTokens:
                          data.usage.input_tokens_details?.cached_tokens,
                      reasoningTokens:
                          data.usage.output_tokens_details?.reasoning_tokens
                  })

        const message = new AIMessageChunk({
            content: text,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
            ...(usageMetadata == null
                ? {}
                : {
                      usage_metadata: usageMetadata
                  })
        })
        const diagnostic = buildProviderResponseDiagnostic({
            requestMode: 'responses',
            rawMessage: {
                content: text,
                output
            },
            rawChoice: {
                output
            },
            messageChunk: message,
            outputTokens: data.usage?.output_tokens ?? null,
            providerToolCallCount: toolCalls.length
        })
        attachProviderResponseDiagnostic(message, diagnostic)
        logProviderResponseDiagnosticIfNeeded(requestContext, diagnostic)

        return new ChatGenerationChunk({
            message,
            text,
            generationInfo:
                usageMetadata == null
                    ? undefined
                    : {
                          usage_metadata: usageMetadata
                      }
        })
    } catch (e) {
        if (e instanceof ChatLunaError) {
            throw e
        }

        throw new ChatLunaError(
            ChatLunaErrorCode.API_REQUEST_FAILED,
            new Error(
                'Error when calling responses, Error: ' +
                    e +
                    ', Response: ' +
                    responseText
            )
        )
    }
}

// eslint-disable-next-line generator-star-spacing
export async function* completionStream<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    params: ModelRequestParams,
    completionUrl: string = 'chat/completions',
    enableGoogleSearch?: boolean,
    supportImageInput?: boolean
): AsyncGenerator<ChatGenerationChunk> {
    const { modelRequester } = requestContext
    const requestMode = isResponsesRequestMode(params)

    if (requestMode) {
        const generation = await completionResponses(
            requestContext,
            params,
            'responses',
            enableGoogleSearch,
            supportImageInput
        )
        yield generation
        return
    }

    const chatCompletionParams = await buildChatCompletionParams(
        params,
        requestContext.plugin,
        enableGoogleSearch ?? false,
        supportImageInput ?? true
    )
    enforceRequestBodyBudget(chatCompletionParams)
    logRequestPayloadSummary(requestContext, chatCompletionParams)

    try {
        const response = await modelRequester.post(
            completionUrl,
            chatCompletionParams,
            {
                signal: params.signal
            }
        )

        const iterator = sseIterable(response)
        yield* processStreamResponse(requestContext, iterator)
    } catch (e) {
        if (isRequestLoggingEnabled(requestContext.ctx)) {
            await trackLogToLocal(
                'Request',
                JSON.stringify(chatCompletionParams),
                requestContext.ctx.logger('')
            )
        }
        if (e instanceof ChatLunaError) {
            throw e
        } else {
            throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
        }
    }
}

export async function completion<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    params: ModelRequestParams,
    completionUrl: string = 'chat/completions',
    enableGoogleSearch?: boolean,
    supportImageInput?: boolean
): Promise<ChatGenerationChunk> {
    if (isResponsesRequestMode(params)) {
        return completionResponses(
            requestContext,
            params,
            'responses',
            enableGoogleSearch,
            supportImageInput
        )
    }

    const { modelRequester } = requestContext

    const chatCompletionParams = await buildChatCompletionParams(
        params,
        requestContext.plugin,
        enableGoogleSearch ?? false,
        supportImageInput ?? true
    )
    enforceRequestBodyBudget(chatCompletionParams)
    logRequestPayloadSummary(requestContext, chatCompletionParams)

    delete chatCompletionParams.stream
    delete chatCompletionParams.stream_options

    try {
        const response = await modelRequester.post(
            completionUrl,
            chatCompletionParams,
            {
                signal: params.signal
            }
        )

        return await processResponse(requestContext, response)
    } catch (e) {
        if (isRequestLoggingEnabled(requestContext.ctx)) {
            await trackLogToLocal(
                'Request',
                JSON.stringify(chatCompletionParams),
                requestContext.ctx.logger('')
            )
        }
        if (e instanceof ChatLunaError) {
            throw e
        } else {
            throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
        }
    }
}

export async function completionResponses<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    params: ModelRequestParams,
    completionUrl: string = 'responses',
    enableGoogleSearch?: boolean,
    supportImageInput?: boolean
): Promise<ChatGenerationChunk> {
    const { modelRequester } = requestContext

    const requestParams = await buildResponsesParams(
        params,
        requestContext.plugin,
        enableGoogleSearch ?? false,
        supportImageInput ?? true
    )
    enforceRequestBodyBudget(requestParams)
    logRequestPayloadSummary(requestContext, requestParams)

    try {
        const response = await modelRequester.post(
            completionUrl,
            requestParams,
            {
                signal: params.signal
            }
        )

        return await processResponsesApiResponse(requestContext, response)
    } catch (e) {
        if (isRequestLoggingEnabled(requestContext.ctx)) {
            await trackLogToLocal(
                'Request',
                JSON.stringify(requestParams),
                requestContext.ctx.logger('')
            )
        }
        if (e instanceof ChatLunaError) {
            throw e
        } else {
            throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
        }
    }
}

export async function createEmbeddings<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    params: EmbeddingsRequestParams,
    embeddingUrl: string = 'embeddings'
): Promise<number[] | number[][]> {
    const { modelRequester } = requestContext
    let data: CreateEmbeddingResponse | string

    try {
        const response = await modelRequester.post(embeddingUrl, {
            input: params.input,
            model: params.model
        })

        data = await response.text()
        data = JSON.parse(data as string) as CreateEmbeddingResponse

        if (data.data && data.data.length > 0) {
            return data.data.map((item) => item.embedding)
        }

        throw new Error(`Call Embedding Error: ${JSON.stringify(data)}`)
    } catch (e) {
        if (e instanceof ChatLunaError) {
            throw e
        }

        throw new ChatLunaError(ChatLunaErrorCode.API_REQUEST_FAILED, e)
    }
}

export async function getModels<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    requestContext: RequestContext<T, R>,
    config?: RunnableConfig
): Promise<string[]> {
    const { modelRequester } = requestContext
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let data: any

    try {
        const response = await modelRequester.get(
            'models',
            {},
            { signal: config?.signal }
        )

        data = await response.text()
        data = JSON.parse(data as string)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawModels = data.data.map((model: any) => model.id) as string[]

        const expanded: string[] = []
        const seen = new Set<string>()

        const isOpenAIReasoningModel = (model: string) => {
            const lower = model.toLowerCase()
            return (
                lower.startsWith('gpt-5') ||
                lower.startsWith('o1') ||
                lower.startsWith('o3') ||
                lower.startsWith('o4')
            )
        }

        const hasThinkingTag = (model: string) => {
            const lower = model.toLowerCase()
            return (
                lower.includes('thinking') ||
                ['minimal', 'low', 'medium', 'high', 'xhigh'].some((level) =>
                    lower.includes(level)
                )
            )
        }

        const push = (model: string) => {
            if (seen.has(model)) return
            seen.add(model)
            expanded.push(model)
        }

        for (const model of rawModels) {
            push(model)

            if (!isOpenAIReasoningModel(model)) continue
            if (hasThinkingTag(model)) continue

            // OpenAI-style "thinking" via model suffixes. These are virtual
            // variants that map to request params (e.g. reasoning_effort).
            for (const variant of expandReasoningEffortModelVariants(model)) {
                push(variant)
            }
        }

        return expanded
    } catch (e) {
        if (e instanceof ChatLunaError) {
            throw e
        }

        throw new Error(
            'error when listing openai models, Result: ' + JSON.stringify(data)
        )
    }
}

export function createRequestContext<
    T extends ClientConfig,
    R extends ChatLunaPlugin.Config
>(
    ctx: Context,
    config: T,
    pluginConfig: R,
    plugin: ChatLunaPlugin,
    modelRequester: ModelRequester<T, R>
): RequestContext<T, R> {
    return { ctx, config, pluginConfig, plugin, modelRequester }
}
