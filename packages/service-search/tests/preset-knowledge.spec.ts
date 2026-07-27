/// <reference types="mocha" />

import { assert } from 'chai'
import {
    compileContextPreset,
    compileRolePreset,
    type ContextPresetDefinitionV1,
    type RolePresetDefinitionV1
} from '../../core/src/llm-core/prompt'
import {
    getPresetKnowledgeMetadata,
    PresetKnowledgeError,
    PresetKnowledgeService
} from '../../core/src/services/knowledge'
import {
    registerWebSearchPresetKnowledgeSource,
    WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE
} from '../src/knowledge'
import {
    SearchManager,
    SearchManagerError,
    SearchProvider
} from '../src/provide'
import type { Config } from '../src/config'
import type { SearchResult } from '../src/types'

type ProviderResponse =
    | readonly SearchResult[]
    | ((query: string, limit: number) => Promise<SearchResult[]>)

class StubSearchProvider extends SearchProvider {
    readonly name: string
    private readonly response: ProviderResponse

    constructor(name: string, config: Config, response: ProviderResponse) {
        super({} as never, config, {} as never)
        this.name = name
        this.response = response
    }

    async search(query: string, limit: number): Promise<SearchResult[]> {
        return typeof this.response === 'function'
            ? this.response(query, limit)
            : [...this.response].slice(0, limit)
    }
}

function searchConfig(overrides: Partial<Config> = {}): Config {
    return {
        searchEngine: ['primary', 'secondary'],
        topK: 3,
        multiSourceMode: 'average',
        ...overrides
    } as Config
}

function searchContext() {
    return {
        logger: () => ({
            debug: () => undefined,
            error: () => undefined,
            info: () => undefined,
            success: () => undefined,
            warn: () => undefined
        })
    } as never
}

function knowledgePreset(source = WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE) {
    const roleDefinition: RolePresetDefinitionV1 = {
        schemaVersion: 1,
        id: 'search-role',
        displayName: 'Search Role',
        messages: []
    }
    const role = compileRolePreset(roleDefinition, {
        source: 'runtime',
        raw: JSON.stringify(roleDefinition)
    })
    const definition: ContextPresetDefinitionV1 = {
        schemaVersion: 1,
        id: 'search-knowledge',
        displayName: 'Search Knowledge',
        aliases: [],
        blocks: [
            {
                id: 'role',
                type: 'role',
                rolePresetId: role.id
            },
            {
                id: 'knowledge',
                type: 'knowledge',
                enabled: true,
                budgetPriority: 100,
                maxTokens: null,
                sources: [source],
                prompt: null
            },
            {
                id: 'current-input',
                type: 'currentInput',
                inputFormat: null
            },
            {
                id: 'model-output',
                type: 'modelOutput',
                maxOutputTokens: 1024,
                postHandler: null
            }
        ]
    }
    return compileContextPreset(definition, role, {
        source: 'runtime',
        raw: JSON.stringify(definition)
    })
}

function result(title: string): SearchResult {
    return {
        title,
        description: `${title} description`,
        url: `https://example.com/${title}`
    }
}

it('registers web-search as a production preset knowledge source', async () => {
    const config = searchConfig()
    const manager = new SearchManager(searchContext(), config)
    manager.addProvider(
        new StubSearchProvider('primary', config, [
            result('primary-1'),
            result('primary-2')
        ])
    )
    manager.addProvider(
        new StubSearchProvider('secondary', config, [
            result('secondary-1'),
            result('secondary-2')
        ])
    )
    const knowledge = new PresetKnowledgeService()
    const unregister = registerWebSearchPresetKnowledgeSource(
        knowledge,
        manager
    )

    const documents = await knowledge.resolve(knowledgePreset(), {
        conversationId: 'conversation-1',
        query: 'current question'
    })

    assert.deepEqual(
        documents.map((document) => document.metadata.title),
        ['primary-1', 'secondary-1', 'primary-2']
    )
    assert.include(
        documents[0].pageContent,
        '[primary-1](https://example.com/primary-1)'
    )
    assert.deepEqual(getPresetKnowledgeMetadata(documents[0]), {
        blockId: 'knowledge',
        source: WEB_SEARCH_PRESET_KNOWLEDGE_SOURCE,
        sourceIndex: 0,
        fieldPath: 'knowledgeBlocks.0.sources.0'
    })

    unregister()
    try {
        await knowledge.resolve(knowledgePreset(), {
            conversationId: 'conversation-1',
            query: 'current question'
        })
        assert.fail('Expected an unregistered source to reject.')
    } catch (error) {
        assert.instanceOf(error, PresetKnowledgeError)
        assert.equal((error as PresetKnowledgeError).stage, 'source_lookup')
    }
})

it('propagates web-search provider failures through the typed knowledge error', async () => {
    const config = searchConfig({ searchEngine: ['failing'] })
    const manager = new SearchManager(searchContext(), config)
    const providerFailure = new Error('upstream unavailable')
    manager.addProvider(
        new StubSearchProvider('failing', config, async () => {
            throw providerFailure
        })
    )
    const knowledge = new PresetKnowledgeService()
    registerWebSearchPresetKnowledgeSource(knowledge, manager)

    try {
        await knowledge.resolve(knowledgePreset(), {
            conversationId: 'conversation-1',
            query: 'current question'
        })
        assert.fail('Expected provider failure to reject.')
    } catch (error) {
        assert.instanceOf(error, PresetKnowledgeError)
        const knowledgeError = error as PresetKnowledgeError
        assert.equal(knowledgeError.stage, 'source_resolve')
        assert.instanceOf(knowledgeError.cause, SearchManagerError)
        const searchError = knowledgeError.cause as SearchManagerError
        assert.equal(searchError.stage, 'provider_request')
        assert.equal(searchError.provider, 'failing')
        assert.strictEqual(searchError.cause, providerFailure)
    }
})

it('fails when web-search names a provider without a registered owner', async () => {
    const config = searchConfig({ searchEngine: ['missing'] })
    const manager = new SearchManager(searchContext(), config)
    const knowledge = new PresetKnowledgeService()
    registerWebSearchPresetKnowledgeSource(knowledge, manager)

    try {
        await knowledge.resolve(knowledgePreset(), {
            conversationId: 'conversation-1',
            query: 'current question'
        })
        assert.fail('Expected missing provider to reject.')
    } catch (error) {
        assert.instanceOf(error, PresetKnowledgeError)
        const knowledgeError = error as PresetKnowledgeError
        assert.equal(knowledgeError.stage, 'source_resolve')
        assert.instanceOf(knowledgeError.cause, SearchManagerError)
        const searchError = knowledgeError.cause as SearchManagerError
        assert.equal(searchError.stage, 'provider_lookup')
        assert.equal(searchError.provider, 'missing')
    }
})
