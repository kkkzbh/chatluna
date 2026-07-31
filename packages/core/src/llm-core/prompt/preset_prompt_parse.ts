import { createHash } from 'crypto'
import {
    AIMessage,
    BaseMessage,
    BaseMessageFields,
    HumanMessage,
    MessageContentComplex,
    SystemMessage
} from '@langchain/core/messages'
import { load } from 'js-yaml'
import {
    CompiledMessageContent,
    CompiledPreset,
    CompiledRolePreset,
    ContextPresetBlock,
    ContextPresetCompileError,
    ContextPresetDefinitionV1,
    ContextPresetDefinitionV1Schema,
    ContextPresetPreview,
    PresetContentBlock,
    PresetMessage,
    PresetPostHandlerRegistry,
    PresetSource,
    RolePresetDefinitionV1,
    RolePresetDefinitionV1Schema,
    RuntimeContextBlockType
} from './type'

type OptionalContextBlock = Exclude<
    ContextPresetBlock,
    | { type: 'role' }
    | { type: 'currentInput' }
    | { type: 'agentScratchpad' }
    | { type: 'modelOutput' }
>

function compileContent(
    content: string | PresetContentBlock[]
): CompiledMessageContent {
    if (typeof content === 'string') return content
    return content.map((part): MessageContentComplex => {
        if (part.type === 'text') return { type: 'text', text: part.text }
        if (part.type === 'image') {
            return {
                type: 'image_url',
                image_url: { url: part.url, detail: part.detail }
            }
        }
        if (part.type === 'file') {
            return {
                type: 'file_url',
                file_url: { url: part.url, mimeType: part.mimeType }
            }
        }
        if (part.type === 'audio') {
            return {
                type: 'audio_url',
                audio_url: { url: part.url, mimeType: part.mimeType }
            }
        }
        return {
            type: 'video_url',
            video_url: { url: part.url, mimeType: part.mimeType }
        }
    })
}

function compileMessage(message: PresetMessage): BaseMessage {
    const fields: BaseMessageFields = {
        content: compileContent(message.content)
    }
    if (message.role === 'assistant') return new AIMessage(fields)
    if (message.role === 'user') return new HumanMessage(fields)
    return new SystemMessage(fields)
}

export function parseRolePreset(raw: string): RolePresetDefinitionV1 {
    return RolePresetDefinitionV1Schema.parse(load(raw))
}

export function parseContextPreset(raw: string): ContextPresetDefinitionV1 {
    return ContextPresetDefinitionV1Schema.parse(load(raw))
}

export function compileRolePreset(
    definition: RolePresetDefinitionV1,
    opts: { source: PresetSource; raw: string; path?: string }
): CompiledRolePreset {
    const role = RolePresetDefinitionV1Schema.parse(definition)
    return {
        id: role.id,
        displayName: role.displayName,
        definition: role,
        messages: role.messages.map((message) => compileMessage(message)),
        source: opts.source,
        revision: createHash('sha256').update(opts.raw).digest('hex'),
        path: opts.path
    }
}

export function loadRolePreset(
    raw: string,
    opts: { source: PresetSource; path?: string }
) {
    return compileRolePreset(parseRolePreset(raw), { ...opts, raw })
}

export function compileContextPreset(
    definition: ContextPresetDefinitionV1,
    role: CompiledRolePreset | undefined,
    opts: {
        source: PresetSource
        raw: string
        path?: string
        handlers?: PresetPostHandlerRegistry
    }
): CompiledPreset {
    const parsed = ContextPresetDefinitionV1Schema.safeParse(definition)
    if (!parsed.success) {
        const issue = parsed.error.issues[0]
        const index =
            issue.path[0] === 'blocks' && typeof issue.path[1] === 'number'
                ? issue.path[1]
                : undefined
        const block = index == null ? undefined : definition.blocks?.[index]
        throw new ContextPresetCompileError(
            'invalid_schema',
            'schema',
            issue.message,
            block?.id,
            undefined,
            { cause: parsed.error }
        )
    }
    const preset = parsed.data
    const roleBlock = preset.blocks.find((block) => block.type === 'role')!
    if (role == null || role.id !== roleBlock.rolePresetId) {
        throw new ContextPresetCompileError(
            'missing_role',
            'role',
            `Role preset does not exist: ${roleBlock.rolePresetId}`,
            roleBlock.id
        )
    }
    const output = preset.blocks.find((block) => block.type === 'modelOutput')!
    const post = output.postHandler
    const handler = post == null ? undefined : opts.handlers?.get(post.id)
    if (post != null && handler == null) {
        throw new ContextPresetCompileError(
            'unregistered_post_handler',
            'post_handler',
            `Context preset post handler is not registered: ${post.id}`,
            output.id
        )
    }
    const input = preset.blocks.find((block) => block.type === 'currentInput')!
    const memory = preset.blocks.find(
        (block) => block.type === 'longMemory' && block.enabled
    )
    const scratch = preset.blocks.find(
        (block) => block.type === 'agentScratchpad' && block.enabled
    )
    return {
        id: preset.id,
        displayName: preset.displayName,
        aliases: preset.aliases,
        definition: preset,
        role,
        messages: role.messages,
        inputFormat: input.inputFormat,
        loreBlocks: preset.blocks.filter((block) => block.type === 'lore'),
        authorsNoteBlocks: preset.blocks.filter(
            (block) => block.type === 'authorsNote'
        ),
        knowledgeBlocks: preset.blocks.filter(
            (block) => block.type === 'knowledge'
        ),
        promptConfig: {
            maxOutputToken: output.maxOutputTokens,
            longMemoryPrompt:
                memory?.type === 'longMemory'
                    ? (memory.prompt ?? undefined)
                    : undefined,
            longMemoryExtractPrompt:
                memory?.type === 'longMemory'
                    ? (memory.extractPrompt ?? undefined)
                    : undefined,
            longMemoryNewQuestionPrompt:
                memory?.type === 'longMemory'
                    ? (memory.newQuestionPrompt ?? undefined)
                    : undefined,
            reActInstruction:
                scratch?.type === 'agentScratchpad'
                    ? (scratch.reActInstruction ?? undefined)
                    : undefined,
            postHandler:
                post == null
                    ? undefined
                    : {
                          prefix: post.prefix,
                          postfix: post.postfix,
                          censor: post.censor,
                          variables: post.variables,
                          handler: handler!
                      }
        },
        source: opts.source,
        revision: createHash('sha256').update(opts.raw).digest('hex'),
        path: opts.path
    }
}

export function loadContextPreset(
    raw: string,
    role: CompiledRolePreset | undefined,
    opts: {
        source: PresetSource
        path?: string
        handlers?: PresetPostHandlerRegistry
    }
) {
    return compileContextPreset(parseContextPreset(raw), role, {
        ...opts,
        raw
    })
}

export function allocateContextBudgets(
    preset: CompiledPreset,
    inputTokenLimit: number
) {
    const output = preset.promptConfig.maxOutputToken
    const input = inputTokenLimit - output
    if (input < 0) {
        const block = preset.definition.blocks.find(
            (candidate) => candidate.type === 'modelOutput'
        )!
        throw new ContextPresetCompileError(
            'required_block_over_limit',
            'budget',
            `Output reservation ${output} exceeds the model limit ${inputTokenLimit}.`,
            block.id,
            inputTokenLimit
        )
    }
    const role = Math.ceil(
        JSON.stringify(preset.role.definition.messages).length / 4
    )
    if (role > input) {
        const block = preset.definition.blocks.find(
            (candidate) => candidate.type === 'role'
        )!
        throw new ContextPresetCompileError(
            'required_block_over_limit',
            'budget',
            `Role prompt estimate ${role} exceeds the input budget ${input}.`,
            block.id,
            input
        )
    }
    return {
        inputTokens: input,
        outputTokens: output,
        roleTokens: role,
        optionalTokens: input - role
    }
}

export function allocateBlockBudgets(
    definition: ContextPresetDefinitionV1,
    demands: ReadonlyMap<string, number>,
    available: number
) {
    const budgets = new Map<string, number>()
    let remaining = available
    const blocks = (
        definition.blocks.filter(
            (block) =>
                'budgetPriority' in block &&
                block.type !== 'agentScratchpad' &&
                block.enabled
        ) as OptionalContextBlock[]
    ).sort(
        (left, right) =>
            left.budgetPriority - right.budgetPriority ||
            definition.blocks.indexOf(left) - definition.blocks.indexOf(right)
    )
    for (const block of blocks) {
        const demand = demands.get(block.id) ?? 0
        const capacity = Math.min(demand, block.maxTokens ?? demand, remaining)
        budgets.set(block.id, capacity)
        remaining -= capacity
    }
    return { budgets, remaining }
}

export function previewContextPreset(
    definition: ContextPresetDefinitionV1,
    role: CompiledRolePreset | undefined,
    opts: {
        inputTokenLimit?: number
        runtimeBlocks?: RuntimeContextBlockType[]
        handlers?: PresetPostHandlerRegistry
    } = {}
): ContextPresetPreview {
    const compiled = compileContextPreset(definition, role, {
        source: 'ephemeral',
        raw: JSON.stringify(definition),
        handlers: opts.handlers
    })
    if (opts.inputTokenLimit != null) {
        allocateContextBudgets(compiled, opts.inputTokenLimit)
    }
    const input = definition.blocks.findIndex(
        (block) => block.type === 'currentInput'
    )
    let loreEnd = 0
    while (definition.blocks[loreEnd + 1]?.type === 'lore') loreEnd++
    let noteStart = input
    while (definition.blocks[noteStart - 1]?.type === 'authorsNote') noteStart--
    const stored = definition.blocks.map((block) => {
        const locked =
            block.type === 'role' ||
            block.type === 'currentInput' ||
            block.type === 'agentScratchpad' ||
            block.type === 'modelOutput'
        const text =
            block.type === 'role'
                ? JSON.stringify(compiled.role.definition.messages)
                : block.type === 'lore'
                  ? block.entries.map((entry) => entry.content).join('\n')
                  : block.type === 'authorsNote'
                    ? block.content
                    : null
        const range =
            block.type === 'lore'
                ? { minIndex: 1, maxIndex: loreEnd }
                : block.type === 'authorsNote'
                  ? { minIndex: noteStart, maxIndex: input - 1 }
                  : { minIndex: loreEnd + 1, maxIndex: noteStart - 1 }
        const movable = !locked && range.minIndex < range.maxIndex
        return {
            id: block.id,
            type: block.type,
            source: 'stored' as const,
            owner:
                block.type === 'role'
                    ? ('role' as const)
                    : ('context' as const),
            locked,
            movable,
            enabled: 'enabled' in block ? block.enabled : true,
            staticTokens: text == null ? null : Math.ceil(text.length / 4),
            budget:
                'budgetPriority' in block
                    ? {
                          priority: block.budgetPriority,
                          maxTokens: block.maxTokens
                      }
                    : null,
            legalDropRange: movable ? range : null
        }
    })
    const runtime = (opts.runtimeBlocks ?? []).map((type) => ({
        id: `runtime-${type}`,
        type,
        source: 'runtime' as const,
        owner: 'runtime' as const,
        locked: true,
        movable: false,
        enabled: true,
        staticTokens: null,
        budget: null,
        legalDropRange: null
    }))
    return {
        blocks: [...stored.slice(0, input), ...runtime, ...stored.slice(input)],
        inputBudgetTokens:
            opts.inputTokenLimit == null
                ? null
                : opts.inputTokenLimit - compiled.promptConfig.maxOutputToken,
        outputBudgetTokens: compiled.promptConfig.maxOutputToken
    }
}

export const EMPTY_ROLE_PRESET = compileRolePreset(
    {
        schemaVersion: 1,
        id: 'empty',
        displayName: 'Empty',
        messages: []
    },
    { source: 'ephemeral', raw: '' }
)
export const EMPTY_PRESET = compileContextPreset(
    {
        schemaVersion: 1,
        id: 'empty',
        displayName: 'Empty',
        aliases: [],
        blocks: [
            { id: 'role', type: 'role', rolePresetId: 'empty' },
            { id: 'input', type: 'currentInput', inputFormat: null },
            {
                id: 'output',
                type: 'modelOutput',
                maxOutputTokens: 1024,
                postHandler: null
            }
        ]
    },
    EMPTY_ROLE_PRESET,
    { source: 'ephemeral', raw: '' }
)

export * from './type'
