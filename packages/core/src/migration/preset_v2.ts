import { basename } from 'path'
import { load } from 'js-yaml'
import { z } from 'zod'
import {
    PresetDefinitionV2,
    PresetDefinitionV2Schema
} from '../llm-core/prompt/type'

const LegacyPositionSchema = z.enum([
    'before_char_defs',
    'after_char_defs',
    'before_scenario',
    'after_scenario',
    'before_example_messages',
    'after_example_messages'
])

const LegacyLoreSchema = z.union([
    z
        .object({
            keywords: z.union([z.string(), z.array(z.string()).min(1)]),
            content: z.string(),
            insertPosition: LegacyPositionSchema.optional(),
            scanDepth: z.number().optional(),
            recursiveScan: z.boolean().optional(),
            maxRecursionDepth: z.number().optional(),
            matchWholeWord: z.boolean().optional(),
            constant: z.boolean().optional(),
            caseSensitive: z.boolean().optional(),
            enabled: z.boolean().optional(),
            order: z.number().optional()
        })
        .strict(),
    z
        .object({
            scanDepth: z.number().optional(),
            tokenLimit: z.number().optional(),
            recursiveScan: z.boolean().optional(),
            maxRecursionDepth: z.number().optional(),
            insertPosition: LegacyPositionSchema.optional()
        })
        .strict()
])

const LegacyImageSourceSchema = z
    .object({
        url: z.string(),
        detail: z.enum(['auto', 'low', 'high']).optional()
    })
    .strict()

const LegacyMediaSourceSchema = z
    .object({
        url: z.string(),
        mimeType: z.string().optional()
    })
    .strict()

const LegacyContentBlockSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('text'),
            text: z.string()
        })
        .strict(),
    z
        .object({
            type: z.literal('image_url'),
            image_url: z.union([z.string(), LegacyImageSourceSchema])
        })
        .strict(),
    z
        .object({
            type: z.literal('file_url'),
            file_url: z.union([z.string(), LegacyMediaSourceSchema])
        })
        .strict(),
    z
        .object({
            type: z.literal('audio_url'),
            audio_url: z.union([z.string(), LegacyMediaSourceSchema])
        })
        .strict(),
    z
        .object({
            type: z.literal('video_url'),
            video_url: z.union([z.string(), LegacyMediaSourceSchema])
        })
        .strict()
])

const LegacyMessageContentSchema = z.union([
    z.string(),
    z.array(LegacyContentBlockSchema).min(1)
])

const LegacyAuthorsNoteSchema = z
    .object({
        content: z.string(),
        insertPosition: z.enum(['after_char_defs', 'in_chat']).optional(),
        insertDepth: z.number().optional(),
        insertFrequency: z.number().optional()
    })
    .strict()

const LegacyPresetSchema = z
    .object({
        keywords: z.array(z.string()).min(1),
        prompts: z.array(
            z
                .object({
                    role: z.enum(['system', 'user', 'assistant']),
                    type: z
                        .enum([
                            'description',
                            'personality',
                            'scenario',
                            'first_message',
                            'example_message_first',
                            'example_message_last'
                        ])
                        .optional(),
                    content: LegacyMessageContentSchema
                })
                .strict()
        ),
        format_user_prompt: z.string().optional(),
        world_lores: z.array(LegacyLoreSchema).optional(),
        authors_note: LegacyAuthorsNoteSchema.optional(),
        author_notes: LegacyAuthorsNoteSchema.optional(),
        knowledge: z
            .object({
                knowledge: z.union([z.string(), z.array(z.string())]),
                prompt: z.string().optional()
            })
            .strict()
            .optional(),
        config: z
            .object({
                maxOutputToken: z.number().optional(),
                longMemoryPrompt: z.string().optional(),
                loreBooksPrompt: z.string().optional(),
                longMemoryExtractPrompt: z.string().optional(),
                longMemoryNewQuestionPrompt: z.string().optional(),
                postHandler: z.unknown().optional(),
                reActInstruction: z.string().optional()
            })
            .strict()
            .optional()
    })
    .strict()

export interface PresetV1MigrationInput {
    filePath: string
    raw: string
    id?: string
    displayName?: string
}

export interface PresetV1MigrationPlan {
    definitions: PresetDefinitionV2[]
    references: ReadonlyMap<string, string>
}

interface LegacyLoreDefaults {
    scanDepth?: number
    tokenLimit?: number
    recursiveScan?: boolean
    maxRecursionDepth?: number
    insertPosition?: z.infer<typeof LegacyPositionSchema>
}

interface LegacyLoreEntry extends Omit<LegacyLoreDefaults, 'tokenLimit'> {
    keywords: string | string[]
    content: string
    matchWholeWord?: boolean
    constant?: boolean
    caseSensitive?: boolean
    enabled?: boolean
    order?: number
}

export const PRESET_V1_ID_MAP: Readonly<Record<string, string>> = {
    catgirl: 'catgirl',
    empty: 'empty',
    sakiko: 'sakiko',
    'sakiko(冷漠)': 'sakiko-cold',
    sydney: 'sydney'
}

export const PRESET_V1_CONFLICT_MAP: Readonly<Record<string, string>> = {
    sakiko: 'sakiko',
    saki: 'sakiko',
    祥: 'sakiko',
    小祥: 'sakiko',
    丰川祥子: 'sakiko',
    oblivionis: 'sakiko',
    丰川: 'sakiko'
}

const PRESET_V1_ADDITIONAL_ALIASES: Readonly<
    Record<string, readonly string[]>
> = {
    'sakiko-cold': ['冷漠小祥', '冷漠祥子']
}

function migrateContent(
    content: z.infer<typeof LegacyMessageContentSchema>
): PresetDefinitionV2['messages'][number]['content'] {
    if (typeof content === 'string') {
        return content
    }

    return content.map((part) => {
        if (part.type === 'text') {
            return {
                type: 'text' as const,
                text: part.text
            }
        }

        const field = part.type.replace('_url', '') as
            | 'image'
            | 'file'
            | 'audio'
            | 'video'
        const value = part[part.type]
        if (typeof value === 'string') {
            return { type: field, url: value }
        }
        if (field === 'image') {
            return {
                type: 'image' as const,
                url: value.url,
                detail: value.detail
            }
        }
        return {
            type: field,
            url: value.url,
            mimeType: value.mimeType
        }
    })
}

export function convertPresetV1(
    input: PresetV1MigrationInput
): PresetDefinitionV2 {
    const legacy = LegacyPresetSchema.parse(load(input.raw))
    if (legacy.config?.postHandler != null) {
        throw new Error(
            `Preset V1 postHandler must be moved to the handler registry: ${input.filePath}`
        )
    }
    if (legacy.authors_note != null && legacy.author_notes != null) {
        throw new Error(
            `Preset V1 defines both authors_note and author_notes: ${input.filePath}`
        )
    }

    const stem = basename(input.filePath).replace(/\.(?:ya?ml|txt)$/i, '')
    const id = input.id ?? PRESET_V1_ID_MAP[stem]
    if (id == null) {
        throw new Error(
            `Preset V1 file has no canonical id mapping: ${input.filePath}`
        )
    }

    const position = {
        before_char_defs: 'beforeCharacterDefinitions',
        after_char_defs: 'afterCharacterDefinitions',
        before_scenario: 'beforeScenario',
        after_scenario: 'afterScenario',
        before_example_messages: 'beforeExampleMessages',
        after_example_messages: 'afterExampleMessages'
    } as const
    const purpose = {
        description: 'description',
        personality: 'personality',
        scenario: 'scenario',
        first_message: 'firstMessage',
        example_message_first: 'exampleStart',
        example_message_last: 'exampleEnd'
    } as const
    const lores = legacy.world_lores as
        | (LegacyLoreDefaults | LegacyLoreEntry)[]
        | undefined
    const loreConfigs =
        lores?.filter(
            (item): item is LegacyLoreDefaults => !('keywords' in item)
        ) ?? []
    if (loreConfigs.length > 1) {
        throw new Error(
            `Preset V1 defines multiple world lore defaults: ${input.filePath}`
        )
    }
    const loreConfig = loreConfigs[0]
    const note = legacy.authors_note ?? legacy.author_notes
    const aliases: string[] = []
    const seen = new Set([id.toLowerCase()])
    const migrationAliases = [
        ...legacy.keywords,
        ...(PRESET_V1_ADDITIONAL_ALIASES[id] ?? [])
    ]
    for (const keyword of migrationAliases) {
        const key = keyword.toLowerCase()
        if (seen.has(key)) {
            continue
        }
        seen.add(key)
        aliases.push(keyword)
    }

    return PresetDefinitionV2Schema.parse({
        schemaVersion: 2,
        id,
        displayName: input.displayName ?? stem,
        aliases,
        messages: legacy.prompts.map((message) => ({
            role: message.role,
            purpose: message.type == null ? undefined : purpose[message.type],
            content: migrateContent(message.content)
        })),
        inputFormat: legacy.format_user_prompt ?? null,
        lore: {
            defaults:
                loreConfig == null
                    ? {}
                    : {
                          scanDepth: loreConfig.scanDepth,
                          tokenLimit: loreConfig.tokenLimit,
                          recursiveScan: loreConfig.recursiveScan,
                          maxRecursionDepth: loreConfig.maxRecursionDepth,
                          insertPosition:
                              loreConfig.insertPosition == null
                                  ? undefined
                                  : position[loreConfig.insertPosition]
                      },
            entries:
                lores
                    ?.filter(
                        (item): item is LegacyLoreEntry => 'keywords' in item
                    )
                    .map((item) => ({
                        keywords:
                            typeof item.keywords === 'string'
                                ? [item.keywords]
                                : item.keywords,
                        content: item.content,
                        insertPosition:
                            item.insertPosition == null
                                ? undefined
                                : position[item.insertPosition],
                        scanDepth: item.scanDepth,
                        recursiveScan: item.recursiveScan,
                        maxRecursionDepth: item.maxRecursionDepth,
                        matchWholeWord: item.matchWholeWord,
                        constant: item.constant,
                        caseSensitive: item.caseSensitive,
                        enabled: item.enabled,
                        order: item.order
                    })) ?? []
        },
        authorsNote:
            note == null
                ? null
                : {
                      content: note.content,
                      insertPosition:
                          note.insertPosition === 'after_char_defs'
                              ? 'afterCharacterDefinitions'
                              : note.insertPosition === 'in_chat'
                                ? 'inChat'
                                : undefined,
                      insertDepth: note.insertDepth,
                      insertFrequency: note.insertFrequency
                  },
        knowledge:
            legacy.knowledge == null
                ? null
                : {
                      sources:
                          typeof legacy.knowledge.knowledge === 'string'
                              ? [legacy.knowledge.knowledge]
                              : legacy.knowledge.knowledge,
                      prompt: legacy.knowledge.prompt
                  },
        promptConfig: legacy.config ?? {}
    })
}

export function preflightPresetV1Migration(
    inputs: PresetV1MigrationInput[],
    conflicts: Readonly<Record<string, string>> = PRESET_V1_CONFLICT_MAP
): PresetV1MigrationPlan {
    const definitions = inputs.map(convertPresetV1)
    const paths = new Map<string, string>()
    for (const [index, preset] of definitions.entries()) {
        const existing = paths.get(preset.id)
        if (existing != null) {
            throw new Error(
                `Preset V1 files declare duplicate canonical id ${preset.id}: ${existing}, ${inputs[index].filePath}`
            )
        }
        paths.set(preset.id, inputs[index].filePath)
    }
    const ids = new Set(definitions.map((preset) => preset.id))
    const owners = new Map<string, Set<string>>()

    for (const preset of definitions) {
        for (const name of [preset.id, ...preset.aliases]) {
            const key = name.toLowerCase()
            const values = owners.get(key) ?? new Set<string>()
            values.add(preset.id)
            owners.set(key, values)
        }
    }

    for (const [name, values] of owners) {
        if (values.size < 2) {
            continue
        }
        const owner = conflicts[name]
        if (owner == null || !values.has(owner)) {
            throw new Error(
                `Preset V1 identity is ambiguous without an explicit mapping: ${name} -> ${Array.from(values).join(', ')}`
            )
        }
        for (const preset of definitions) {
            if (preset.id !== owner) {
                preset.aliases = preset.aliases.filter(
                    (alias) => alias.toLowerCase() !== name
                )
            }
        }
    }

    for (const [name, owner] of Object.entries(conflicts)) {
        if (!ids.has(owner)) {
            continue
        }
        const key = name.toLowerCase()
        for (const preset of definitions) {
            if (preset.id === owner) {
                continue
            }
            if (preset.id.toLowerCase() === key) {
                throw new Error(
                    `Preset V1 conflict mapping cannot replace canonical id ${preset.id}`
                )
            }
            preset.aliases = preset.aliases.filter(
                (alias) => alias.toLowerCase() !== key
            )
        }
    }

    const references = new Map<string, string>()
    for (const preset of definitions) {
        references.set(preset.id, preset.id)
        for (const alias of preset.aliases) {
            references.set(alias.toLowerCase(), preset.id)
        }
    }
    for (const [name, id] of Object.entries(conflicts)) {
        if (!ids.has(id)) {
            continue
        }
        references.set(name.toLowerCase(), id)
    }

    return {
        definitions: definitions.map((preset) =>
            PresetDefinitionV2Schema.parse(preset)
        ),
        references
    }
}

export function migratePresetReference(
    value: string,
    plan: PresetV1MigrationPlan
) {
    const id =
        plan.references.get(value) ??
        plan.references.get(value.toLowerCase())
    if (id == null) {
        throw new Error(`Unknown preset reference: ${value}`)
    }
    return id
}

export function migratePresetBindingKey(
    bindingKey: string,
    plan: PresetV1MigrationPlan
) {
    const marker = ':preset:'
    const index = bindingKey.lastIndexOf(marker)
    if (index < 0) {
        return bindingKey
    }
    return (
        bindingKey.slice(0, index + marker.length) +
        migratePresetReference(bindingKey.slice(index + marker.length), plan)
    )
}
