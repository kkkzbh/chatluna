import { Document } from '@langchain/core/documents'
import type { PresetKnowledgeService } from 'koishi-plugin-chatluna/services/chat'
import type { SearchManager } from './provide'
import type { SearchResult } from './types'

export const WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE = 'web-search'

type StrictSearch = Pick<SearchManager, 'searchOrThrow'>

export function registerWebSearchPresetKnowledgeSource(
    knowledge: PresetKnowledgeService,
    search: StrictSearch
): () => void {
    return knowledge.registerSource(
        WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE,
        async (request) => {
            request.signal?.throwIfAborted()
            const results = await search.searchOrThrow(request.query)
            request.signal?.throwIfAborted()
            return results.map(toKnowledgeDocument)
        }
    )
}

function toKnowledgeDocument(result: SearchResult, index: number): Document {
    const title = result.title.trim()
    const description = result.description.trim()
    const url = result.url.trim()
    const heading =
        title.length > 0 && url.length > 0
            ? `[${title}](${url})`
            : title.length > 0
              ? title
              : url

    return new Document({
        id: `web-search-${index}`,
        pageContent: [heading, description]
            .filter((part) => part.length > 0)
            .join('\n'),
        metadata: {
            title,
            url,
            ...(result.image == null ? {} : { image: result.image })
        }
    })
}
