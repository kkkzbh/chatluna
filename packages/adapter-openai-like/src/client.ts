import { Context } from 'koishi'
import { PlatformModelEmbeddingsAndRerankerClient } from 'koishi-plugin-chatluna/llm-core/platform/client'
import {
    ChatLunaBaseEmbeddings,
    ChatLunaChatModel,
    ChatLunaEmbeddings
} from 'koishi-plugin-chatluna/llm-core/platform/model'
import { ChatLunaReranker } from 'koishi-plugin-chatluna/llm-core/platform/rerank'
import {
    ModelCapabilities,
    ModelInfo,
    ModelType
} from 'koishi-plugin-chatluna/llm-core/platform/types'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { Config } from '.'
import { OpenAIRequester } from './requester'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import {
    getModelMaxContextSize,
    getOpenAIFileHandlingConfig,
    isEmbeddingModel,
    isImageGenerationModel,
    isNonLLMModel,
    isRerankerModel,
    supportAudioInput,
    supportImageInput
} from '@chatluna/v1-shared-adapter'
import { RunnableConfig } from '@langchain/core/runnables'

import type { ModelUsageReporter } from 'koishi-plugin-chatluna/llm-core/platform/usage'

export class OpenAIClient extends PlatformModelEmbeddingsAndRerankerClient {
    platform = 'openai'

    private _requester: OpenAIRequester
    private readonly _logger

    constructor(
        ctx: Context,
        private _config: Config,
        public plugin: ChatLunaPlugin
    ) {
        super(ctx, plugin.platformConfigPool)
        this.platform = _config.platform
        this._logger = createLogger(ctx, `chatluna-${this.platform}-adapter`)
        this._requester = new OpenAIRequester(
            ctx,
            plugin.platformConfigPool,
            _config,
            plugin
        )
    }

    async refreshModels(config?: RunnableConfig): Promise<ModelInfo[]> {
        try {
            const rawModels = this._config.pullModels
                ? await this._requester.getModels(config)
                : []

            const additionalModels = this._config.additionalModels.map(
                ({ model, modelType, contextSize, modelCapabilities }) => {
                    const type =
                        modelType === 'Embeddings 嵌入模型'
                            ? ModelType.embeddings
                            : modelType === 'Reranker 重排序模型'
                              ? ModelType.reranker
                              : ModelType.llm

                    return {
                        name: model,
                        type,
                        capabilities:
                            type === ModelType.llm
                                ? modelCapabilities
                                : modelCapabilities.filter(
                                      (cap) =>
                                          cap !== ModelCapabilities.ToolCall
                                  ),
                        maxTokens: contextSize ?? 4096
                    } as ModelInfo
                }
            )

            const filteredModels = rawModels.filter(
                (model) =>
                    !isNonLLMModel(model) || isImageGenerationModel(model)
            )

            const blacklist = this._config.blacklistModels
                .map((keyword) => keyword.trim().toLowerCase())
                .filter((keyword) => keyword.length > 0)

            const supportToolCalling = (model: string) => {
                // const lower = model.toLowerCase()

                if (isImageGenerationModel(model)) {
                    return {
                        capabilities: [ModelCapabilities.ImageGeneration]
                    }
                }

                return {
                    capabilities: [
                        ModelCapabilities.ToolCall,
                        supportImageInput(model)
                            ? ModelCapabilities.ImageInput
                            : null,
                        supportAudioInput(model)
                            ? ModelCapabilities.AudioInput
                            : null
                    ].filter(Boolean)
                }
            }

            const formattedModels = filteredModels
                .filter((model) => {
                    const id = model.toLowerCase()
                    return !blacklist.some((keyword) => id.includes(keyword))
                })
                .map((model) => {
                    const type = isRerankerModel(model)
                        ? ModelType.reranker
                        : isEmbeddingModel(model)
                          ? ModelType.embeddings
                          : ModelType.llm

                    return {
                        name: model,
                        type,
                        ...(type === ModelType.llm
                            ? supportToolCalling(model)
                            : { capabilities: [] })
                    } as ModelInfo
                })

            return additionalModels.concat(
                formattedModels.filter(
                    (model) =>
                        additionalModels.findIndex(
                            (additionalModel) =>
                                additionalModel.name === model.name
                        ) === -1
                )
            )
        } catch (e) {
            if (e instanceof ChatLunaError) {
                throw e
            }
            throw new ChatLunaError(ChatLunaErrorCode.MODEL_INIT_ERROR, e)
        }
    }

    protected _createModel(
        model: string,
        report: ModelUsageReporter
    ): ChatLunaChatModel | ChatLunaBaseEmbeddings | ChatLunaReranker {
        const info = this._modelInfos[model]

        if (info == null) {
            this._logger.warn(
                `Model ${model} not found`,
                JSON.stringify(this._modelInfos)
            )
            throw new ChatLunaError(
                ChatLunaErrorCode.MODEL_NOT_FOUND,
                new Error(
                    `The model ${model} is not found in the models: ${JSON.stringify(Object.keys(this._modelInfos))}`
                )
            )
        }

        if (info.type === ModelType.llm) {
            const profile = this._config.additionalModels.find(
                (item) => item.model === model
            )
            const modelMaxContextSize = getModelMaxContextSize(info)
            return new ChatLunaChatModel({
                usageReporter: report,
                modelInfo: info,
                requester: this._requester,
                model: profile?.transportModel ?? model,
                maxTokenLimit: Math.floor(
                    (info.maxTokens || modelMaxContextSize || 128_000) *
                        this._config.maxContextRatio
                ),
                modelMaxContextSize,
                frequencyPenalty:
                    profile?.requestDefaults?.frequencyPenalty ??
                    this._config.frequencyPenalty,
                presencePenalty:
                    profile?.requestDefaults?.presencePenalty ??
                    this._config.presencePenalty,
                reasoningEffort: profile?.requestDefaults?.reasoningEffort,
                thinkingMode: profile?.requestDefaults?.thinkingMode,
                topP: profile?.requestDefaults?.topP,
                maxTokens: profile?.requestDefaults?.maxTokens,
                timeout: profile?.timeoutMs ?? this._config.timeout,
                temperature:
                    profile?.requestDefaults?.temperature ??
                    this._config.temperature,
                maxRetries: this._config.maxRetries,
                llmType: 'openai',
                overrideRequestParams:
                    profile == null
                        ? undefined
                        : {
                              qqbot_canonical_model: `${this.platform}/${model}`,
                              qqbot_transport_model: profile.transportModel,
                              qqbot_request_mode:
                                  profile.requestMode === 'responses'
                                      ? 'responses'
                                      : 'chatCompletions'
                          },
                fileHandlingConfig: getOpenAIFileHandlingConfig(
                    profile?.transportModel ?? model
                ),
                isThinkModel:
                    (profile?.transportModel ?? model).includes('reasoner') ||
                    (profile?.transportModel ?? model).includes('r1') ||
                    (profile?.transportModel ?? model).includes('thinking')
            })
        }

        if (info.type === ModelType.reranker) {
            return new ChatLunaReranker({
                usageReporter: report,
                client: this._requester,
                model,
                maxRetries: this._config.maxRetries,
                timeout: this._config.timeout
            })
        }

        return new ChatLunaEmbeddings({
            usageReporter: report,
            client: this._requester,
            model:
                this._config.additionalModels.find(
                    (item) => item.model === model
                )?.transportModel ?? model,
            maxRetries: this._config.maxRetries
        })
    }
}
