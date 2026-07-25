import { Context, Logger, Schema } from 'koishi'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import { SearchResult } from './types'
import { Config } from './config'
import { Document } from '@langchain/core/documents'
import { MemoryVectorStore } from 'koishi-plugin-chatluna/llm-core/vectorstores'
import { parseRawModelName } from 'koishi-plugin-chatluna/llm-core/utils/count_tokens'
import { ChatLunaBaseEmbeddings } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { ComputedRef } from 'koishi-plugin-chatluna'
import { EmptyEmbeddings } from 'koishi-plugin-chatluna/llm-core/model/in_memory'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'

export class SearchManagerError extends Error {
    readonly operation = 'search'

    constructor(
        public readonly stage:
            | 'provider_lookup'
            | 'provider_request'
            | 'provider_result',
        message: string,
        public readonly provider?: string,
        options?: ErrorOptions
    ) {
        super(message, options)
        this.name = 'SearchManagerError'
    }
}

export abstract class SearchProvider {
    constructor(
        protected ctx: Context,
        protected config: Config,
        protected _plugin: ChatLunaPlugin
    ) {}

    abstract search(query: string, limit: number): Promise<SearchResult[]>

    abstract name: string
}

export class SearchManager {
    private providers: Map<string, SearchProvider> = new Map()
    private schemas: Schema[] = []
    private _embeddings: ComputedRef<ChatLunaBaseEmbeddings>
    private readonly logger: Logger

    constructor(
        private ctx: Context,
        public config: Config
    ) {
        this.logger = createLogger(ctx, 'chatluna-search-service')
    }

    addProvider(provider: SearchProvider) {
        this.providers.set(provider.name, provider)

        return () => this._deleteProvider(provider.name)
    }

    getProvider(name: string): SearchProvider | undefined {
        return this.providers.get(name)
    }

    private _deleteProvider(name: string) {
        this.providers.delete(name)
    }

    updateSchema(schema: Schema) {
        this.schemas.push(schema)

        this.ctx.schema.set(
            'search-engine',
            Schema.array(Schema.union(this.schemas))
        )
    }

    async search(
        query: string,
        limit: number = this.config.topK,
        providerNames: string[] = this.config.searchEngine
    ): Promise<SearchResult[]> {
        const providers = providerNames
            ? Array.from(this.providers.values()).filter((p) =>
                  providerNames.includes(p.name)
              )
            : Array.from(this.providers.values())

        if (providers.length < 1) return []

        if (providers.length === 1) {
            // 一个源就不用分了，直接返回
            try {
                return await providers[0].search(query, limit)
            } catch (error) {
                this.logger.error(
                    `Error searching with provider ${providers[0].name}:`,
                    error
                )
                return []
            }
        }

        const searchResults: SearchResult[] = []

        const signalLimit =
            this.config.multiSourceMode === 'average'
                ? Math.max(1, Math.round(limit / providers.length))
                : limit

        const searchPromises = providers.map(async (provider) => {
            try {
                const results = await provider.search(query, signalLimit)
                searchResults.push(...results)
            } catch (error) {
                this.logger.error(
                    `Error searching with provider ${provider.name}:`,
                    error
                )
            }
        })

        await Promise.all(searchPromises)

        if (searchResults.length > limit) {
            return this._reRankResults(query, searchResults, limit)
        }

        return searchResults
    }

    async searchOrThrow(
        query: string,
        limit: number = this.config.topK,
        providerNames: readonly string[] = this.config.searchEngine
    ): Promise<SearchResult[]> {
        const names = [...new Set(providerNames)]
        if (names.length === 0) {
            throw new SearchManagerError(
                'provider_lookup',
                'Strict search requires at least one configured provider.'
            )
        }

        const providers = names.map((name) => {
            const provider = this.providers.get(name)
            if (provider == null) {
                throw new SearchManagerError(
                    'provider_lookup',
                    `Search provider is not registered: ${name}`,
                    name
                )
            }
            return provider
        })
        const resultLimit = Math.max(1, Math.trunc(limit))
        const providerLimit =
            this.config.multiSourceMode === 'average'
                ? Math.max(1, Math.ceil(resultLimit / providers.length))
                : resultLimit
        const batches = await Promise.all(
            providers.map(async (provider) => {
                let results: SearchResult[]
                try {
                    results = await provider.search(query, providerLimit)
                } catch (error) {
                    throw new SearchManagerError(
                        'provider_request',
                        `Search provider request failed: ${provider.name}`,
                        provider.name,
                        { cause: error }
                    )
                }
                if (!Array.isArray(results)) {
                    throw new SearchManagerError(
                        'provider_result',
                        `Search provider returned an invalid result collection: ${provider.name}`,
                        provider.name
                    )
                }
                return results
            })
        )

        const merged: SearchResult[] = []
        const maxBatchLength = Math.max(...batches.map((batch) => batch.length))
        for (let index = 0; index < maxBatchLength; index += 1) {
            for (const batch of batches) {
                const result = batch[index]
                if (result != null) {
                    merged.push(result)
                }
            }
        }
        return merged.slice(0, resultLimit)
    }

    private async _getEmbeddings() {
        if (this._embeddings) return this._embeddings

        try {
            const [platform, model] = parseRawModelName(
                this.ctx.chatluna.config.defaultEmbeddings
            )
            this._embeddings = await this.ctx.chatluna.createEmbeddings(
                platform,
                model
            )
        } catch (e) {
            this.logger.warn(
                `Get embeddings failed: ${e}. Try check your defaultEmbeddings`
            )
            return null
        }

        return this._embeddings
    }

    private async _reRankResults(
        query: string,
        results: SearchResult[],
        limit: number
    ) {
        // 1. 构建临时的向量数据库

        const embeddings = await this._getEmbeddings()

        if (!embeddings || embeddings.value instanceof EmptyEmbeddings) {
            this.logger.warn('Embeddings is null. Return original results.')
            return results
        }

        const vectorStore = new MemoryVectorStore(embeddings.value)

        // 2. 存储搜索标题进去

        const docs = results.map(
            (r) =>
                ({
                    pageContent: r.title,
                    metadata: r
                }) satisfies Document
        )

        await vectorStore.addDocuments(docs)

        // 3. 搜索

        const searchResults = await vectorStore.similaritySearch(query, limit)

        // 4. 重映射

        return searchResults.map((r) => r.metadata) as SearchResult[]
    }
}
