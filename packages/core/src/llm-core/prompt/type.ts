import type {
    BaseMessage,
    MessageContentComplex
} from '@langchain/core/messages'
import { z } from 'zod'
import type { PostHandler } from '../../utils/types'

export const PresetIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
export const ContextPresetBlockIdSchema = PresetIdSchema
export const PresetMessageRoleSchema = z.enum(['system', 'user', 'assistant'])

const PromptTextSchema = z.string().refine((value) => value.trim().length > 0, {
    message: 'Prompt text must contain at least one non-whitespace character.'
})

export const PresetContentBlockSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), text: PromptTextSchema }).strict(),
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
        content: z.union([
            PromptTextSchema,
            z.array(PresetContentBlockSchema).min(1)
        ])
    })
    .strict() as z.ZodType<PresetMessage>
export const LoreDefaultsSchema = z
    .object({
        scanDepth: z.number().int().nonnegative().optional(),
        recursiveScan: z.boolean().optional(),
        maxRecursionDepth: z.number().int().nonnegative().optional()
    })
    .strict() as z.ZodType<LoreDefaults>
export const LoreEntrySchema = z
    .object({
        keywords: z.array(z.string().trim().min(1)).min(1),
        content: PromptTextSchema,
        scanDepth: z.number().int().nonnegative().optional(),
        recursiveScan: z.boolean().optional(),
        maxRecursionDepth: z.number().int().nonnegative().optional(),
        matchWholeWord: z.boolean().optional(),
        constant: z.boolean().optional(),
        caseSensitive: z.boolean().optional(),
        enabled: z.boolean().optional(),
        order: z.number().int().optional()
    })
    .strict() as z.ZodType<LoreEntry>
export const PresetPostHandlerSchema = z
    .object({
        id: z.string().trim().min(1),
        prefix: z.string(),
        postfix: z.string(),
        censor: z.boolean().optional(),
        variables: z.record(z.string())
    })
    .strict() as z.ZodType<PresetPostHandlerConfig>
const BudgetSchema = {
    enabled: z.boolean(),
    budgetPriority: z.number().int().nonnegative(),
    maxTokens: z.number().int().positive().nullable()
}

export const ContextPresetBlockSchema = z.discriminatedUnion('type', [
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('role'),
            rolePresetId: PresetIdSchema
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('chatHistory'),
            ...BudgetSchema
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('longMemory'),
            ...BudgetSchema,
            prompt: PromptTextSchema.nullable(),
            extractPrompt: PromptTextSchema.nullable(),
            newQuestionPrompt: PromptTextSchema.nullable()
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('requestDocuments'),
            ...BudgetSchema
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('lore'),
            ...BudgetSchema,
            prompt: PromptTextSchema.nullable(),
            defaults: LoreDefaultsSchema,
            entries: z.array(LoreEntrySchema)
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('authorsNote'),
            ...BudgetSchema,
            content: PromptTextSchema,
            insertFrequency: z.number().int().nonnegative()
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('knowledge'),
            ...BudgetSchema,
            sources: z.array(z.string().trim().min(1)),
            prompt: PromptTextSchema.nullable()
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('currentInput'),
            inputFormat: PromptTextSchema.nullable()
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('agentScratchpad'),
            ...BudgetSchema,
            reActInstruction: PromptTextSchema.nullable()
        })
        .strict(),
    z
        .object({
            id: ContextPresetBlockIdSchema,
            type: z.literal('modelOutput'),
            maxOutputTokens: z.number().int().positive(),
            postHandler: PresetPostHandlerSchema.nullable()
        })
        .strict()
]) as z.ZodType<ContextPresetBlock>

export const RolePresetDefinitionV1Schema = z
    .object({
        schemaVersion: z.literal(1),
        id: PresetIdSchema,
        displayName: z.string().trim().min(1),
        messages: z.array(PresetMessageSchema)
    })
    .strict() as z.ZodType<RolePresetDefinitionV1>

export const ContextPresetDefinitionV1Schema = z
    .object({
        schemaVersion: z.literal(1),
        id: PresetIdSchema,
        displayName: z.string().trim().min(1),
        aliases: z.array(z.string().trim().min(1)),
        blocks: z.array(ContextPresetBlockSchema).min(3)
    })
    .strict()
    .superRefine((preset, ctx) => {
        const aliases = new Set<string>()
        for (const [index, alias] of preset.aliases.entries()) {
            const key = alias.toLowerCase()
            if (key === preset.id || aliases.has(key)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate context preset identity: ${alias}`,
                    path: ['aliases', index]
                })
            }
            aliases.add(key)
        }
        const ids = new Set<string>()
        for (const [index, block] of preset.blocks.entries()) {
            if (ids.has(block.id)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Duplicate context block id: ${block.id}`,
                    path: ['blocks', index, 'id']
                })
            }
            ids.add(block.id)
            if (block.type === 'knowledge') {
                const sources = new Set<string>()
                for (const [sourceIndex, source] of block.sources.entries()) {
                    if (sources.has(source)) {
                        ctx.addIssue({
                            code: z.ZodIssueCode.custom,
                            message: `Duplicate knowledge source: ${source}`,
                            path: ['blocks', index, 'sources', sourceIndex]
                        })
                    }
                    sources.add(source)
                }
            }
        }
        for (const type of ['role', 'currentInput', 'modelOutput'] as const) {
            if (
                preset.blocks.filter((block) => block.type === type).length !==
                1
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Context preset requires exactly one ${type} block.`,
                    path: ['blocks']
                })
            }
        }
        for (const type of [
            'chatHistory',
            'longMemory',
            'requestDocuments',
            'agentScratchpad'
        ] as const) {
            if (
                preset.blocks.filter((block) => block.type === type).length > 1
            ) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Context preset allows at most one ${type} block.`,
                    path: ['blocks']
                })
            }
        }
        if (preset.blocks[0]?.type !== 'role') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'The role block must be first.',
                path: ['blocks', 0]
            })
        }
        const output = preset.blocks.length - 1
        if (preset.blocks[output]?.type !== 'modelOutput') {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'The modelOutput block must be last.',
                path: ['blocks', output]
            })
        }
        const scratch = preset.blocks.findIndex(
            (block) => block.type === 'agentScratchpad'
        )
        const input = preset.blocks.findIndex(
            (block) => block.type === 'currentInput'
        )
        if (input !== (scratch < 0 ? output - 1 : output - 2)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'The currentInput block must immediately precede the agent/output boundary.',
                path: ['blocks', input]
            })
        }
        if (scratch >= 0 && scratch !== output - 1) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message:
                    'The agentScratchpad block must immediately precede modelOutput.',
                path: ['blocks', scratch]
            })
        }
        let roleBoundaryEnded = false
        let authorsNoteBoundaryStarted = false
        for (let index = 1; index < input; index++) {
            const block = preset.blocks[index]
            if (block.type === 'lore') {
                if (roleBoundaryEnded) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message:
                            'Lore blocks must immediately follow the role block.',
                        path: ['blocks', index]
                    })
                }
                continue
            }
            roleBoundaryEnded = true
            if (block.type === 'authorsNote') {
                authorsNoteBoundaryStarted = true
                continue
            }
            if (authorsNoteBoundaryStarted) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message:
                        'AuthorsNote blocks must immediately precede the currentInput block.',
                    path: ['blocks', index]
                })
            }
        }
    }) as z.ZodType<ContextPresetDefinitionV1>

export type PresetMessageRole = 'system' | 'user' | 'assistant'
export type PresetContentBlock =
    | { type: 'text'; text: string }
    | { type: 'image'; url: string; detail?: 'auto' | 'low' | 'high' }
    | {
          type: 'file' | 'audio' | 'video'
          url: string
          mimeType?: string
      }
export interface PresetMessage {
    role: PresetMessageRole
    content: string | PresetContentBlock[]
}
export interface LoreDefaults {
    scanDepth?: number
    recursiveScan?: boolean
    maxRecursionDepth?: number
}
export interface LoreEntry {
    keywords: string[]
    content: string
    scanDepth?: number
    recursiveScan?: boolean
    maxRecursionDepth?: number
    matchWholeWord?: boolean
    constant?: boolean
    caseSensitive?: boolean
    enabled?: boolean
    order?: number
}
export interface ContextBudgetBlock {
    id: string
    enabled: boolean
    budgetPriority: number
    maxTokens: number | null
}
export type ContextPresetBlock =
    | { id: string; type: 'role'; rolePresetId: string }
    | (ContextBudgetBlock & { type: 'chatHistory' })
    | (ContextBudgetBlock & {
          type: 'longMemory'
          prompt: string | null
          extractPrompt: string | null
          newQuestionPrompt: string | null
      })
    | (ContextBudgetBlock & { type: 'requestDocuments' })
    | (ContextBudgetBlock & {
          type: 'lore'
          prompt: string | null
          defaults: LoreDefaults
          entries: LoreEntry[]
      })
    | (ContextBudgetBlock & {
          type: 'authorsNote'
          content: string
          insertFrequency: number
      })
    | (ContextBudgetBlock & {
          type: 'knowledge'
          sources: string[]
          prompt: string | null
      })
    | { id: string; type: 'currentInput'; inputFormat: string | null }
    | (ContextBudgetBlock & {
          type: 'agentScratchpad'
          reActInstruction: string | null
      })
    | {
          id: string
          type: 'modelOutput'
          maxOutputTokens: number
          postHandler: PresetPostHandlerConfig | null
      }
export interface RolePresetDefinitionV1 {
    schemaVersion: 1
    id: string
    displayName: string
    messages: PresetMessage[]
}
export interface ContextPresetDefinitionV1 {
    schemaVersion: 1
    id: string
    displayName: string
    aliases: string[]
    blocks: ContextPresetBlock[]
}
export interface PresetPostHandlerConfig {
    id: string
    prefix: string
    postfix: string
    censor?: boolean
    variables: Record<string, string>
}

export interface MatchedLoreEntry {
    entry: LoreEntry
    presetEntryIndex: number
    blockId: string
}
export interface AuthorsNote {
    blockId: string
    content: string
    maxTokens: number | null
}
export interface PresetKnowledgeMetadata {
    blockId: string
}
export type PresetSource = 'bundled' | 'runtime' | 'ephemeral'
export interface CompiledRolePreset {
    id: string
    displayName: string
    definition: RolePresetDefinitionV1
    messages: BaseMessage[]
    source: PresetSource
    revision: string
    path?: string
}
export type CompiledLoreBlock = Extract<ContextPresetBlock, { type: 'lore' }>
export type CompiledAuthorsNoteBlock = Extract<
    ContextPresetBlock,
    { type: 'authorsNote' }
>
export type CompiledKnowledgeBlock = Extract<
    ContextPresetBlock,
    { type: 'knowledge' }
>
export interface CompiledPreset {
    id: string
    displayName: string
    aliases: string[]
    definition: ContextPresetDefinitionV1
    role: CompiledRolePreset
    messages: BaseMessage[]
    inputFormat: string | null
    loreBlocks: CompiledLoreBlock[]
    authorsNoteBlocks: CompiledAuthorsNoteBlock[]
    knowledgeBlocks: CompiledKnowledgeBlock[]
    promptConfig: {
        maxOutputToken: number
        longMemoryPrompt?: string
        longMemoryExtractPrompt?: string
        longMemoryNewQuestionPrompt?: string
        reActInstruction?: string
        postHandler?: PostHandler
    }
    source: PresetSource
    revision: string
    path?: string
}
export interface ContextPresetSummary {
    id: string
    displayName: string
    aliases: string[]
    source: Exclude<PresetSource, 'ephemeral'>
    hasOverride: boolean
    revision: string
    isGlobalDefault: boolean
}
export interface RolePresetSummary {
    id: string
    displayName: string
    source: Exclude<PresetSource, 'ephemeral'>
    hasOverride: boolean
    revision: string
    referenceCount: number
}
export type RuntimeContextBlockType = 'qqbotFragments' | 'toolDefinitions'
export interface ResolvedContextBlock {
    id: string
    type: ContextPresetBlock['type'] | RuntimeContextBlockType
    source: 'stored' | 'runtime'
    owner: 'context' | 'role' | 'runtime'
    locked: boolean
    movable: boolean
    enabled: boolean
    staticTokens: number | null
    budget: { priority: number; maxTokens: number | null } | null
    legalDropRange: { minIndex: number; maxIndex: number } | null
}
export interface ContextPresetPreview {
    blocks: ResolvedContextBlock[]
    inputBudgetTokens: number | null
    outputBudgetTokens: number
}
export type ContextPresetCompileStage =
    | 'schema'
    | 'role'
    | 'budget'
    | 'structure'
    | 'post_handler'
export class ContextPresetCompileError extends Error {
    constructor(
        public readonly code:
            | 'invalid_schema'
            | 'missing_role'
            | 'required_block_over_limit'
            | 'unregistered_post_handler',
        public readonly stage: ContextPresetCompileStage,
        message: string,
        public readonly blockId?: string,
        public readonly limit?: number,
        options?: ErrorOptions
    ) {
        super(message, options)
        this.name = 'ContextPresetCompileError'
    }
}
export type PresetPostHandlerRegistry = ReadonlyMap<
    string,
    PostHandler['handler']
>
export type CompiledMessageContent = string | MessageContentComplex[]
