import type { Config } from '../config'
import { z } from 'zod'
import { webError } from '../error'
import type { WebFetch, WebResponse } from '../request'
import { canonicalUrl } from '../security'
import type {
    ImageSearchArtifact,
    SearchQuery,
    WebSearchArtifact
} from '../types'

const tavilyResponseSchema = z.object({
    results: z.array(
        z.object({
            title: z.string(),
            url: z.string(),
            content: z.string(),
            score: z.number().optional(),
            published_date: z.string().optional()
        })
    ),
    images: z
        .array(
            z.union([
                z.string(),
                z.object({
                    url: z.string(),
                    description: z.string().optional()
                })
            ])
        )
        .optional()
})

interface TavilyErrorResponse {
    code?: string
    detail?: string
    message?: string
}

export class TavilySearchProvider {
    readonly name = 'tavily'

    constructor(
        private readonly config: Config,
        private readonly fetcher: WebFetch
    ) {}

    async search(query: SearchQuery, currentTime: string) {
        const response = await this.request(query, 'search_query')
        const seen = new Set<string>()
        const domains = new Map<string, number>()
        const threshold =
            query.recency == null
                ? undefined
                : new Date(currentTime).valueOf() -
                  query.recency * 24 * 60 * 60 * 1000
        const results: Omit<
            WebSearchArtifact,
            'refId' | 'requestId' | 'sessionId' | 'createdAt'
        >[] = []

        for (const item of response.results) {
            let url: string
            try {
                url = canonicalUrl(item.url)
            } catch {
                continue
            }
            if (seen.has(url)) continue
            const host = new URL(url).hostname
            const count = domains.get(host) ?? 0
            if (count >= this.config.perDomainLimit) continue

            let publishedAt: string | undefined
            if (item.published_date) {
                const date = new Date(item.published_date)
                if (!Number.isNaN(date.valueOf())) {
                    publishedAt = date.toISOString()
                }
            }
            if (
                threshold != null &&
                (publishedAt == null ||
                    new Date(publishedAt).valueOf() < threshold)
            ) {
                continue
            }

            seen.add(url)
            domains.set(host, count + 1)
            results.push({
                type: 'search',
                query: query.q,
                title: item.title,
                url,
                canonicalUrl: url,
                snippet: item.content,
                source: this.name,
                score: item.score,
                publishedAt
            })
            if (results.length >= this.config.topK) break
        }

        return results
    }

    async images(query: SearchQuery) {
        const response = await this.request(query, 'image_query')
        return (response.images ?? [])
            .flatMap((item) => {
                const imageUrl = typeof item === 'string' ? item : item.url
                try {
                    const url = new URL(imageUrl)
                    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                        return []
                    }
                } catch {
                    return []
                }
                const artifact: Omit<
                    ImageSearchArtifact,
                    'refId' | 'requestId' | 'sessionId' | 'createdAt'
                > = {
                    type: 'image',
                    query: query.q,
                    title:
                        typeof item === 'string'
                            ? `Image result for ${query.q}`
                            : item.description || `Image result for ${query.q}`,
                    imageUrl,
                    description:
                        typeof item === 'string' ? undefined : item.description,
                    source: this.name
                }
                return [artifact]
            })
            .slice(0, this.config.topK)
    }

    private async request(
        query: SearchQuery,
        operation: 'search_query' | 'image_query'
    ) {
        let response: WebResponse
        try {
            response = await this.fetcher('https://api.tavily.com/search', {
                method: 'POST',
                signal: AbortSignal.timeout(this.config.fetchTimeout),
                headers: {
                    Authorization: `Bearer ${this.config.tavilyApiKey}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'ChatLuna-WebRun/1.0'
                },
                body: JSON.stringify({
                    query: query.q,
                    search_depth: 'basic',
                    include_images: true,
                    include_image_descriptions: true,
                    max_results: this.config.topK * 3,
                    include_domains: query.domains,
                    time_range:
                        query.recency != null && query.recency <= 1
                            ? 'day'
                            : query.recency != null && query.recency <= 7
                              ? 'week'
                              : query.recency != null && query.recency <= 31
                                ? 'month'
                                : query.recency != null && query.recency <= 366
                                  ? 'year'
                                  : undefined
                })
            })
        } catch (err) {
            throw webError({
                operation,
                stage: 'provider',
                code: 'provider_request_failed',
                message: `Tavily request failed: ${String(err)}`,
                provider: this.name,
                retryable: true
            })
        }

        if (!response.ok) {
            const body = (await response
                .json()
                .catch(() => ({}))) as TavilyErrorResponse
            throw webError({
                operation,
                stage: 'provider',
                code: 'provider_http_error',
                message:
                    body.detail ??
                    body.message ??
                    `Tavily returned HTTP ${response.status}`,
                provider: this.name,
                httpStatus: response.status,
                providerCode: body.code,
                retryable: response.status === 429 || response.status >= 500
            })
        }

        const parsed = tavilyResponseSchema.safeParse(
            await response.json().catch(() => undefined)
        )
        if (!parsed.success) {
            throw webError({
                operation,
                stage: 'provider',
                code: 'provider_invalid_response',
                message: 'Tavily returned an invalid response payload',
                provider: this.name,
                httpStatus: response.status,
                retryable: true
            })
        }
        return parsed.data
    }
}
