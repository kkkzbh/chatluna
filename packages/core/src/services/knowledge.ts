import { Document } from '@langchain/core/documents'
import type { Session } from 'koishi'
import type { CompiledPreset } from '../llm-core/prompt'

export interface PresetKnowledgeResolveContext {
    conversationId: string
    query: string
    session?: Session
    signal?: AbortSignal
}

export interface PresetKnowledgeSourceRequest extends PresetKnowledgeResolveContext {
    source: string
    sourceIndex: number
    presetId: string
    presetRevision: string
}

export type PresetKnowledgeSourceResolver = (
    request: PresetKnowledgeSourceRequest
) => Promise<readonly Document[]>

export interface PresetKnowledgeMetadata {
    source: string
    sourceIndex: number
    fieldPath: string
}

const presetKnowledgeMetadata = new WeakMap<Document, PresetKnowledgeMetadata>()
const PRESET_KNOWLEDGE_DOCUMENTS = Symbol.for(
    'chatluna.presetKnowledgeDocuments'
)

export class PresetKnowledgeError extends Error {
    readonly operation = 'resolve'

    constructor(
        public readonly stage:
            | 'source_registration'
            | 'request_context'
            | 'source_lookup'
            | 'source_resolve'
            | 'source_result',
        message: string,
        public readonly presetId?: string,
        public readonly source?: string,
        options?: ErrorOptions
    ) {
        super(message, options)
        this.name = 'PresetKnowledgeError'
    }
}

export class PresetKnowledgeService {
    private readonly _resolvers = new Map<
        string,
        PresetKnowledgeSourceResolver
    >()

    registerSource(
        source: string,
        resolver: PresetKnowledgeSourceResolver
    ): () => void {
        if (source.trim().length === 0) {
            throw new PresetKnowledgeError(
                'source_registration',
                'Knowledge source id must be non-empty.'
            )
        }
        if (source !== source.trim()) {
            throw new PresetKnowledgeError(
                'source_registration',
                'Knowledge source id must not contain surrounding whitespace.',
                undefined,
                source
            )
        }
        if (this._resolvers.has(source)) {
            throw new PresetKnowledgeError(
                'source_registration',
                `Knowledge source is already registered: ${source}`,
                undefined,
                source
            )
        }

        this._resolvers.set(source, resolver)
        return () => {
            if (this._resolvers.get(source) === resolver) {
                this._resolvers.delete(source)
            }
        }
    }

    async resolve(
        preset: CompiledPreset,
        context: PresetKnowledgeResolveContext
    ): Promise<Document[]> {
        const config = preset.knowledge
        if (config == null || config.sources.length === 0) {
            return []
        }

        const resolved = await Promise.all(
            config.sources.map(async (source, sourceIndex) => {
                const resolver = this._resolvers.get(source)
                if (resolver == null) {
                    throw new PresetKnowledgeError(
                        'source_lookup',
                        `Preset knowledge source is not registered: ${source}`,
                        preset.id,
                        source
                    )
                }

                let documents: readonly Document[]
                try {
                    documents = await resolver({
                        ...context,
                        source,
                        sourceIndex,
                        presetId: preset.id,
                        presetRevision: preset.revision
                    })
                } catch (error) {
                    throw new PresetKnowledgeError(
                        'source_resolve',
                        `Failed to resolve preset knowledge source: ${source}`,
                        preset.id,
                        source,
                        { cause: error }
                    )
                }

                if (
                    !Array.isArray(documents) ||
                    documents.some(
                        (document) => !(document instanceof Document)
                    )
                ) {
                    throw new PresetKnowledgeError(
                        'source_result',
                        `Knowledge source returned an invalid document collection: ${source}`,
                        preset.id,
                        source
                    )
                }

                const metadata = {
                    source,
                    sourceIndex,
                    fieldPath: `knowledge.sources.${sourceIndex}`
                } satisfies PresetKnowledgeMetadata

                return documents.map((document) => {
                    const result = new Document({
                        id: document.id,
                        pageContent: document.pageContent,
                        metadata: document.metadata
                    })
                    presetKnowledgeMetadata.set(result, metadata)
                    return result
                })
            })
        )

        return resolved.flat()
    }

    clear(): void {
        this._resolvers.clear()
    }
}

export function getPresetKnowledgeMetadata(
    document: Document
): PresetKnowledgeMetadata | undefined {
    return presetKnowledgeMetadata.get(document)
}

export function attachPresetKnowledgeDocuments(
    variables: Record<PropertyKey, unknown>,
    documents: readonly Document[]
): void {
    variables[PRESET_KNOWLEDGE_DOCUMENTS] = documents
}

export function getPresetKnowledgeDocuments(
    variables: Record<PropertyKey, unknown> | undefined
): readonly Document[] {
    if (variables == null) {
        return []
    }
    const documents = variables[PRESET_KNOWLEDGE_DOCUMENTS]
    if (documents == null) {
        return []
    }
    if (
        !Array.isArray(documents) ||
        documents.some((document) => !(document instanceof Document))
    ) {
        throw new PresetKnowledgeError(
            'source_result',
            'Resolved preset knowledge contains an invalid document collection.'
        )
    }
    return documents
}

export function hasPresetKnowledgeDocuments(
    variables: Record<PropertyKey, unknown> | undefined
): boolean {
    return (
        variables != null &&
        Object.prototype.hasOwnProperty.call(
            variables,
            PRESET_KNOWLEDGE_DOCUMENTS
        )
    )
}
