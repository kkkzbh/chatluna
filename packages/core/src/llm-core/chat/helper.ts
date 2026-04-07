import { Embeddings } from '@langchain/core/embeddings'
import { AIMessage } from '@langchain/core/messages'
import { computed, ComputedRef } from '@vue/reactivity'
import { Context } from 'koishi'
import { logger } from 'koishi-plugin-chatluna'
import { emptyEmbeddings } from 'koishi-plugin-chatluna/llm-core/model/in_memory'
import {
    PlatformEmbeddingsClient,
    PlatformModelAndEmbeddingsClient,
    PlatformModelClient
} from 'koishi-plugin-chatluna/llm-core/platform/client'
import { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service'
import {
    ModelCapabilities,
    ModelInfo,
    ModelType
} from 'koishi-plugin-chatluna/llm-core/platform/types'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'

export type ChatLunaRequestMode = 'chat_completions' | 'responses'

export interface ChatModelInitDescriptor {
    platform: string
    canonicalModel: string
    transportModel: string
    requestMode: ChatLunaRequestMode
}

export function createDisplayResponse(responseMessage: AIMessage) {
    const msg = new AIMessage({
        content: responseMessage.content
    })

    msg.additional_kwargs = responseMessage.additional_kwargs
    return msg
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) {
        return null
    }

    return value as Record<string, unknown>
}

function normalizeModelName(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function getRecordString(
    record: Record<string, unknown> | null,
    key: string
): string | null {
    return normalizeModelName(record?.[key])
}

function resolveTransportModelFromOverride(
    platform: string,
    overrideRequestParams: Record<string, unknown> | null
) {
    const explicitTransportModel = getRecordString(
        overrideRequestParams,
        'qqbot_transport_model'
    )

    if (!explicitTransportModel) {
        return null
    }

    const [transportPlatform, transportModelName] = parseRawModelName(
        explicitTransportModel
    )

    if (transportModelName) {
        return {
            platform: transportPlatform,
            transportModel: transportModelName
        }
    }

    return {
        platform,
        transportModel: explicitTransportModel
    }
}

export function resolveChatModelInitDescriptor(args: {
    model: string
    requestMode?: string | null
    transportModel?: string | null
    additionalKwargs?: Record<string, unknown> | null
}): ChatModelInitDescriptor {
    const canonicalModel = normalizeModelName(args.model) ?? args.model.trim()
    const [defaultPlatform, defaultTransportModel] =
        parseRawModelName(canonicalModel)
    const overrideRequestParams =
        asPlainRecord(args.additionalKwargs?.overrideRequestParams) ??
        asPlainRecord(args.additionalKwargs?.qqbot_override_request_params)
    const overrideTransport =
        resolveTransportModelFromOverride(defaultPlatform, overrideRequestParams)
    const requestMode =
        getRecordString(overrideRequestParams, 'qqbot_request_mode') ===
            'responses' ||
        args.requestMode === 'responses'
            ? 'responses'
            : 'chat_completions'

    const explicitTransportModel =
        normalizeModelName(args.transportModel) ??
        overrideTransport?.transportModel ??
        defaultTransportModel ??
        canonicalModel

    const explicitTransportPlatform =
        overrideTransport?.platform ?? defaultPlatform

    return {
        platform: explicitTransportPlatform,
        canonicalModel,
        transportModel: explicitTransportModel,
        requestMode
    }
}

export function buildChatModelInitCacheKey(
    descriptor: ChatModelInitDescriptor
) {
    return [
        descriptor.platform,
        descriptor.canonicalModel,
        descriptor.transportModel,
        descriptor.requestMode
    ].join('|')
}

function isChatModelLike(value: unknown): value is ChatLunaChatModel {
    if (value == null || typeof value !== 'object') {
        return false
    }

    const record = value as Record<string, unknown>
    return (
        typeof record.invocationParams === 'function' &&
        typeof record.getNumTokens === 'function' &&
        typeof record.getModelMaxContextSize === 'function'
    )
}

function buildModelInitDiagnostic(args: {
    descriptor: ChatModelInitDescriptor
    availableModelCount: number
    availableModelSample?: string[]
    findModelHit?: boolean
    clientAvailable?: boolean
    createModelValue?: unknown
}) {
    const value =
        args.createModelValue != null &&
        typeof args.createModelValue === 'object'
            ? (args.createModelValue as { constructor?: { name?: string } })
            : null

    return {
        platform: args.descriptor.platform,
        canonicalModel: args.descriptor.canonicalModel,
        transportModel: args.descriptor.transportModel,
        requestMode: args.descriptor.requestMode,
        findModelHit: args.findModelHit ?? false,
        clientAvailable: args.clientAvailable ?? false,
        availableModelCount: args.availableModelCount,
        availableModelSample: args.availableModelSample ?? [],
        createModelValueType:
            args.createModelValue == null
                ? String(args.createModelValue)
                : typeof args.createModelValue,
        createModelConstructorName: value?.constructor?.name ?? null
    }
}

function emitModelInitDiagnostic(
    message: string,
    diagnostic: ReturnType<typeof buildModelInitDiagnostic>
) {
    logger.error(
        'Model init diagnostic: %s',
        JSON.stringify({
            message,
            ...diagnostic
        })
    )
}

export async function initEmbeddings(
    service: PlatformService,
    model: string | undefined
) {
    const [platform, modelName] = parseRawModelName(model)

    if (model == null || model.length < 1 || model === '无') {
        return computed(() => emptyEmbeddings)
    }

    const clientRef = await service.getClient(platform)

    return computed<Embeddings>(() => {
        const client = clientRef.value

        logger.info(`Init embeddings for %c`, model)

        if (client == null || client instanceof PlatformModelClient) {
            logger.warn(
                `Platform ${platform} is not supported, falling back to fake embeddings`
            )
            return emptyEmbeddings
        }

        if (client instanceof PlatformEmbeddingsClient) {
            return client.createModel(modelName)
        }

        if (client instanceof PlatformModelAndEmbeddingsClient) {
            const ref = client.createModel(modelName)

            if (ref instanceof ChatLunaChatModel) {
                logger.warn(
                    `Model ${modelName} is not an embeddings model, falling back to fake embeddings`
                )
                return emptyEmbeddings
            }

            return ref
        }

        return emptyEmbeddings
    })
}

export async function initModel(
    ctx: Context,
    service: PlatformService,
    descriptor: ChatModelInitDescriptor
): Promise<
    [ComputedRef<ChatLunaChatModel>, ComputedRef<ModelInfo | undefined>]
> {
    const availableModels =
        service.listPlatformModels(descriptor.platform, ModelType.llm).value ??
        []
    const availableModelNames = availableModels
        .map((item) => item?.name)
        .filter((item): item is string => typeof item === 'string')
    const llmInfo = service.findModel(
        descriptor.platform,
        descriptor.transportModel
    )
    const client = await service.getClient(descriptor.platform)
    const baseDiagnostic = {
        descriptor,
        availableModelCount: availableModelNames.length,
        availableModelSample: availableModelNames.slice(0, 10),
        findModelHit: llmInfo.value != null,
        clientAvailable: client.value != null
    }

    if (client.value == null) {
        const diagnostic = buildModelInitDiagnostic(baseDiagnostic)
        emitModelInitDiagnostic('provider client unavailable', diagnostic)
        throw new ChatLunaError(
            ChatLunaErrorCode.MODEL_INIT_ERROR,
            new Error(
                `Provider ${descriptor.platform} is not available for ${descriptor.canonicalModel}.`
            )
        )
    }

    if (llmInfo.value == null) {
        const diagnostic = buildModelInitDiagnostic(baseDiagnostic)
        emitModelInitDiagnostic('target model not found in provider list', diagnostic)
        throw new ChatLunaError(
            ChatLunaErrorCode.MODEL_NOT_FOUND,
            new Error(
                `Model ${descriptor.transportModel} is not available on provider ${descriptor.platform}.`
            )
        )
    }

    const llmModel = await ctx.chatluna.createChatModel(
        descriptor.platform,
        descriptor.transportModel
    )
    const resolvedModel = llmModel.value

    if (resolvedModel == null) {
        const diagnostic = buildModelInitDiagnostic({
            ...baseDiagnostic,
            createModelValue: resolvedModel
        })
        emitModelInitDiagnostic('createChatModel returned empty value', diagnostic)
        throw new ChatLunaError(
            ChatLunaErrorCode.MODEL_INIT_ERROR,
            new Error(
                `Model ${descriptor.transportModel} returned an empty chat model value on provider ${descriptor.platform}.`
            )
        )
    }

    if (isChatModelLike(resolvedModel)) {
        return [llmModel as ComputedRef<ChatLunaChatModel>, llmInfo]
    }

    const diagnostic = buildModelInitDiagnostic({
        ...baseDiagnostic,
        createModelValue: resolvedModel
    })
    emitModelInitDiagnostic('createChatModel returned a non-chat model value', diagnostic)

    throw new ChatLunaError(
        ChatLunaErrorCode.MODEL_INIT_ERROR,
        new Error(
            `Model ${descriptor.transportModel} returned a non-chat model value on provider ${descriptor.platform}.`
        )
    )
}

export function supportChatMode(modelInfo: ModelInfo, chatMode: string) {
    if (
        !modelInfo.capabilities.includes(ModelCapabilities.ToolCall) &&
        chatMode === 'plugin'
    ) {
        return false
    }

    return true
}
