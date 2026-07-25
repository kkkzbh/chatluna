import type {
    BaseMessage,
    MessageContentComplex
} from '@langchain/core/messages'
import { z } from 'zod'
import type { PostHandler } from '../../utils/types'

export const PresetIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export const PresetMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

export const PresetMessagePurposeSchema = z.enum([
    'description',
    'personality',
    'scenario',
    'firstMessage',
    'exampleStart',
    'exampleEnd'
])

const PromptTextSchema = z.string().refine((value) => value.trim().length > 0, {
    message: 'Prompt text must contain at least one non-whitespace character.'
})

export const PresetContentBlockSchema = z.discriminatedUnion('type', [
    z
        .object({
            type: z.literal('text'),
            text: PromptTextSchema
        })
        .strict(),
    z
        .object({
            type: z.literal('image'),
            url: z.string().trim().min(1),
            detail: z.enum(['auto', 'low', 'high']).optional()
        })
        .strict(),
    z
        .object({
            type: z.literal('file'),
            url: z.string().trim().min(1),
            mimeType: z.string().trim().min(1).optional()
        })
        .strict(),
    z
        .object({
            type: z.literal('audio'),
            url: z.string().trim().min(1),
            mimeType: z.string().trim().min(1).optional()
        })
        .strict(),
    z
        .object({
            type: z.literal('video'),
            url: z.string().trim().min(1),
            mimeType: z.string().trim().min(1).optional()
        })
        .strict()
])

export const PresetMessageSchema = z
    .object({
        role: PresetMessageRoleSchema,
        purpose: PresetMessagePurposeSchema.optional(),
        content: z.union([
            PromptTextSchema,
            z.array(PresetContentBlockSchema).min(1)
        ])
    })
    .strict()

export const LoreInsertPositionSchema = z.enum([
    'beforeCharacterDefinitions',
    'afterCharacterDefinitions',
    'beforeScenario',
    'afterScenario',
    'beforeExampleMessages',
    'afterExampleMessages'
])

export const LoreDefaultsSchema = z
    .object({
        scanDepth: z.number().int().nonnegative().optional(),
        tokenLimit: z.number().int().positive().optional(),
        recursiveScan: z.boolean().optional(),
        maxRecursionDepth: z.number().int().nonnegative().optional(),
        insertPosition: LoreInsertPositionSchema.optional()
    })
    .strict()

export const LoreEntrySchema = z
    .object({
        keywords: z.array(z.string().trim().min(1)).min(1),
        content: PromptTextSchema,
        insertPosition: LoreInsertPositionSchema.optional(),
        scanDepth: z.number().int().nonnegative().optional(),
        recursiveScan: z.boolean().optional(),
        maxRecursionDepth: z.number().int().nonnegative().optional(),
        matchWholeWord: z.boolean().optional(),
        constant: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        enabled: z.boolean().optional(),
        order: z.number().int().optional()
    })
    .strict()

export const AuthorsNoteSchema = z
    .object({
        content: PromptTextSchema,
        insertPosition: z
            .enum(['afterCharacterDefinitions', 'inChat'])
            .optional(),
        insertDepth: z.number().int().nonnegative().optional(),
        insertFrequency: z.number().int().nonnegative().optional()
    })
    .strict()

export const KnowledgeConfigSchema = z
    .object({
        sources: z.array(z.string().trim().min(1)),
        prompt: PromptTextSchema.optional()
    })
    .strict()
    .superRefine((config, ctx) => {
        const sources = new Set<string>()
        for (const [index, source] of config.sources.entries()) {
            if (sources.has(source)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate knowledge source: ${source}`,
                    path: ['sources', index]
                })
            }
            sources.add(source)
        }
    })

export const PresetPostHandlerSchema = z
    .object({
        id: z.string().trim().min(1),
        prefix: z.string(),
        postfix: z.string(),
        censor: z.boolean().optional(),
        variables: z.record(z.string())
    })
    .strict()

export const PresetPromptConfigSchema = z
    .object({
        maxOutputToken: z.number().int().positive().optional(),
        longMemoryPrompt: PromptTextSchema.optional(),
        loreBooksPrompt: PromptTextSchema.optional(),
        longMemoryExtractPrompt: PromptTextSchema.optional(),
        longMemoryNewQuestionPrompt: PromptTextSchema.optional(),
        postHandler: PresetPostHandlerSchema.optional(),
        reActInstruction: PromptTextSchema.optional()
    })
    .strict()

export const PresetDefinitionV2Schema = z
    .object({
        schemaVersion: z.literal(2),
        id: PresetIdSchema,
        displayName: z.string().trim().min(1),
        aliases: z.array(z.string().trim().min(1)),
        messages: z.array(PresetMessageSchema),
        inputFormat: PromptTextSchema.nullable(),
        lore: z
            .object({
                defaults: LoreDefaultsSchema,
                entries: z.array(LoreEntrySchema)
            })
            .strict(),
        authorsNote: AuthorsNoteSchema.nullable(),
        knowledge: KnowledgeConfigSchema.nullable(),
        promptConfig: PresetPromptConfigSchema
    })
    .strict()
    .superRefine((preset, ctx) => {
        const aliases = new Set<string>()
        for (const alias of preset.aliases) {
            const key = alias.toLowerCase()
            if (key === preset.id) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'Preset aliases must not repeat the canonical id.',
                    path: ['aliases']
                })
            }
            if (aliases.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate preset alias: ${alias}`,
                    path: ['aliases']
                })
            }
            aliases.add(key)
        }
    }) as z.ZodType<PresetDefinitionV2>

export type PresetMessageRole = 'system' | 'user' | 'assistant'
export type PresetMessagePurpose =
    | 'description'
    | 'personality'
    | 'scenario'
    | 'firstMessage'
    | 'exampleStart'
    | 'exampleEnd'

export type PresetContentBlock =
    | { type: 'text'; text: string }
    | {
          type: 'image'
          url: string
          detail?: 'auto' | 'low' | 'high'
      }
    | {
          type: 'file' | 'audio' | 'video'
          url: string
          mimeType?: string
      }

export interface PresetMessage {
    role: PresetMessageRole
    purpose?: PresetMessagePurpose
    content: string | PresetContentBlock[]
}

export type LoreInsertPosition =
    | 'beforeCharacterDefinitions'
    | 'afterCharacterDefinitions'
    | 'beforeScenario'
    | 'afterScenario'
    | 'beforeExampleMessages'
    | 'afterExampleMessages'

export interface LoreDefaults {
    scanDepth?: number
    tokenLimit?: number
    recursiveScan?: boolean
    maxRecursionDepth?: number
    insertPosition?: LoreInsertPosition
}

export interface LoreEntry {
    keywords: string[]
    content: string
    insertPosition?: LoreInsertPosition
    scanDepth?: number
    recursiveScan?: boolean
    maxRecursionDepth?: number
    matchWholeWord?: boolean
    constant?: boolean
    caseSensitive?: boolean
    enabled?: boolean
    order?: number
}

export interface MatchedLoreEntry {
    entry: LoreEntry
    presetEntryIndex: number
}

export interface AuthorsNote {
    content: string
    insertPosition?: 'afterCharacterDefinitions' | 'inChat'
    insertDepth?: number
    insertFrequency?: number
}

export interface KnowledgeConfig {
    sources: string[]
    prompt?: string
}

export interface PresetPostHandlerConfig {
    id: string
    prefix: string
    postfix: string
    censor?: boolean
    variables: Record<string, string>
}

export interface PresetPromptConfig {
    maxOutputToken?: number
    longMemoryPrompt?: string
    loreBooksPrompt?: string
    longMemoryExtractPrompt?: string
    longMemoryNewQuestionPrompt?: string
    postHandler?: PresetPostHandlerConfig
    reActInstruction?: string
}

export interface PresetDefinitionV2 {
    schemaVersion: 2
    id: string
    displayName: string
    aliases: string[]
    messages: PresetMessage[]
    inputFormat: string | null
    lore: {
        defaults: LoreDefaults
        entries: LoreEntry[]
    }
    authorsNote: AuthorsNote | null
    knowledge: KnowledgeConfig | null
    promptConfig: PresetPromptConfig
}

export type PresetSource = 'bundled' | 'runtime' | 'ephemeral'

export interface CompiledPreset {
    id: string
    displayName: string
    aliases: string[]
    definition: PresetDefinitionV2
    messages: BaseMessage[]
    inputFormat: string | null
    lore: {
        defaults: LoreDefaults
        entries: LoreEntry[]
    }
    authorsNote: AuthorsNote | null
    knowledge: KnowledgeConfig | null
    promptConfig: Omit<PresetPromptConfig, 'postHandler'> & {
        postHandler?: PostHandler
    }
    source: PresetSource
    revision: string
    path?: string
}

export interface PresetSummary {
    id: string
    displayName: string
    aliases: string[]
    source: Exclude<PresetSource, 'ephemeral'>
    hasOverride: boolean
    revision: string
    isGlobalDefault: boolean
}

export type PresetPostHandlerRegistry = ReadonlyMap<
    string,
    PostHandler['handler']
>

export type CompiledMessageContent = string | MessageContentComplex[]
