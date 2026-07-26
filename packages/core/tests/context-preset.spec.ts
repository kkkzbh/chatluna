/// <reference types="mocha" />

import { assert } from 'chai'
import { HumanMessage, SystemMessage } from '@langchain/core/messages'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
    allocateBlockBudgets,
    assembleContextMessages,
    compileContextPreset,
    compileRolePreset,
    ContextPresetCompileError,
    ContextPresetDefinitionV1,
    ContextPresetDefinitionV1Schema,
    previewContextPreset
} from '../src/llm-core/prompt'
import { PresetError } from '../src/preset'
import { createMemoryService } from './helpers'

const role = compileRolePreset(
    {
        schemaVersion: 1,
        id: 'shared-role',
        displayName: 'Shared Role',
        messages: [{ role: 'system', content: 'Stay concise.' }]
    },
    { source: 'ephemeral', raw: 'role' }
)

function definition(): ContextPresetDefinitionV1 {
    return {
        schemaVersion: 1,
        id: 'workbench',
        displayName: 'Workbench',
        aliases: ['wb'],
        blocks: [
            {
                id: 'role',
                type: 'role',
                rolePresetId: 'shared-role'
            },
            {
                id: 'documents',
                type: 'requestDocuments',
                enabled: true,
                budgetPriority: 0,
                maxTokens: null
            },
            {
                id: 'history',
                type: 'chatHistory',
                enabled: true,
                budgetPriority: 10,
                maxTokens: null
            },
            {
                id: 'lore-one',
                type: 'lore',
                enabled: true,
                budgetPriority: 20,
                maxTokens: 100,
                anchor: {
                    type: 'role',
                    position: 'afterCharacterDefinitions'
                },
                prompt: null,
                defaults: {},
                entries: [
                    {
                        keywords: ['one'],
                        content: 'Lore one'
                    }
                ]
            },
            {
                id: 'lore-two',
                type: 'lore',
                enabled: true,
                budgetPriority: 20,
                maxTokens: 100,
                anchor: {
                    type: 'block',
                    blockId: 'history',
                    position: 'after'
                },
                prompt: null,
                defaults: {},
                entries: [
                    {
                        keywords: ['two'],
                        content: 'Lore two'
                    }
                ]
            },
            {
                id: 'input',
                type: 'currentInput',
                inputFormat: null
            },
            {
                id: 'output',
                type: 'modelOutput',
                maxOutputTokens: 512,
                postHandler: null
            }
        ]
    }
}

it('validates required boundaries and permits repeatable lore blocks', () => {
    const parsed = ContextPresetDefinitionV1Schema.parse(definition())
    assert.equal(parsed.blocks[0].type, 'role')
    assert.equal(parsed.blocks.at(-1)?.type, 'modelOutput')
    assert.equal(
        parsed.blocks.filter((block) => block.type === 'lore').length,
        2
    )
})

it('fails missing role and invalid anchors with typed compile errors', () => {
    assert.throws(
        () =>
            compileContextPreset(definition(), undefined, {
                source: 'ephemeral',
                raw: 'context'
            }),
        ContextPresetCompileError
    )
    const invalid = definition()
    const lore = invalid.blocks.find((block) => block.id === 'lore-two')!
    if (lore.type === 'lore') {
        lore.anchor = {
            type: 'block',
            blockId: 'missing',
            position: 'after'
        }
    }
    try {
        compileContextPreset(invalid, role, {
            source: 'ephemeral',
            raw: 'context'
        })
        assert.fail('Expected an invalid anchor error.')
    } catch (err) {
        assert.instanceOf(err, ContextPresetCompileError)
        assert.equal((err as ContextPresetCompileError).code, 'invalid_anchor')
        assert.equal((err as ContextPresetCompileError).blockId, 'lore-two')
    }
})

it('rejects anchor cycles and anchors that require disabled history', () => {
    const cyclic = definition()
    const first = cyclic.blocks.find((block) => block.id === 'lore-one')!
    const second = cyclic.blocks.find((block) => block.id === 'lore-two')!
    if (first.type === 'lore' && second.type === 'lore') {
        first.anchor = {
            type: 'block',
            blockId: second.id,
            position: 'after'
        }
        second.anchor = {
            type: 'block',
            blockId: first.id,
            position: 'after'
        }
    }
    try {
        compileContextPreset(cyclic, role, {
            source: 'ephemeral',
            raw: 'cyclic'
        })
        assert.fail('Expected an anchor cycle error.')
    } catch (err) {
        assert.instanceOf(err, ContextPresetCompileError)
        assert.equal((err as ContextPresetCompileError).code, 'invalid_anchor')
        assert.equal((err as ContextPresetCompileError).stage, 'anchor')
        assert.equal((err as ContextPresetCompileError).blockId, 'lore-one')
    }

    const disabledHistory = definition()
    const history = disabledHistory.blocks.find(
        (block) => block.id === 'history'
    )!
    const lore = disabledHistory.blocks.find(
        (block) => block.id === 'lore-two'
    )!
    if (history.type === 'chatHistory' && lore.type === 'lore') {
        history.enabled = false
        lore.anchor = { type: 'chatHistory', depth: 0 }
    }
    try {
        compileContextPreset(disabledHistory, role, {
            source: 'ephemeral',
            raw: 'disabled-history'
        })
        assert.fail('Expected a disabled history anchor error.')
    } catch (err) {
        assert.instanceOf(err, ContextPresetCompileError)
        assert.equal((err as ContextPresetCompileError).code, 'invalid_anchor')
        assert.equal((err as ContextPresetCompileError).blockId, 'lore-two')
    }
})

it('assembles block segments in structural and explicit anchor order', () => {
    const ordered = definition()
    const first = ordered.blocks.find((block) => block.id === 'lore-one')!
    const second = ordered.blocks.find((block) => block.id === 'lore-two')!
    if (first.type === 'lore' && second.type === 'lore') {
        first.anchor = {
            type: 'block',
            blockId: 'history',
            position: 'before'
        }
        second.anchor = {
            type: 'block',
            blockId: 'history',
            position: 'before'
        }
    }
    const input = ordered.blocks.findIndex(
        (block) => block.type === 'currentInput'
    )
    ordered.blocks.splice(
        input,
        0,
        {
            id: 'author',
            type: 'authorsNote',
            enabled: true,
            budgetPriority: 30,
            maxTokens: 100,
            anchor: {
                type: 'block',
                blockId: 'history',
                position: 'after'
            },
            content: 'Author note',
            insertFrequency: 1
        },
        {
            id: 'knowledge',
            type: 'knowledge',
            enabled: true,
            budgetPriority: 40,
            maxTokens: 100,
            sources: ['manual'],
            prompt: null
        }
    )
    const preset = compileContextPreset(ordered, role, {
        source: 'ephemeral',
        raw: 'ordered'
    })
    const runtime = {
        preset,
        result: [],
        blockSegments: new Map([
            ['role', [new SystemMessage('ROLE')]],
            ['documents', [new HumanMessage('A')]],
            ['history', [new HumanMessage('B')]],
            ['knowledge', [new HumanMessage('C')]],
            ['lore-one', [new HumanMessage('L1')]],
            ['lore-two', [new HumanMessage('L2')]],
            ['author', [new HumanMessage('AFTER')]],
            ['input', [new HumanMessage('INPUT')]]
        ]),
        runtimeInjectionSegments: []
    }

    assembleContextMessages(runtime as never)

    assert.deepEqual(
        runtime.result.map((message) => message.content),
        ['ROLE', 'A', 'L1', 'L2', 'B', 'AFTER', 'C', 'INPUT']
    )
})

it('places chat-history depth zero after the latest history message', () => {
    const anchored = definition()
    const lore = anchored.blocks.find((block) => block.id === 'lore-one')!
    if (lore.type === 'lore') {
        lore.anchor = { type: 'chatHistory', depth: 0 }
    }
    const preset = compileContextPreset(anchored, role, {
        source: 'ephemeral',
        raw: 'history-depth-zero'
    })
    const runtime = {
        preset,
        result: [],
        blockSegments: new Map([
            ['role', [new SystemMessage('ROLE')]],
            [
                'history',
                [new HumanMessage('OLDER'), new HumanMessage('LATEST')]
            ],
            ['lore-one', [new HumanMessage('DEPTH ZERO')]],
            ['input', [new HumanMessage('INPUT')]]
        ]),
        runtimeInjectionSegments: []
    }

    assembleContextMessages(runtime as never)

    assert.isBelow(
        runtime.result.findIndex((message) => message.content === 'LATEST'),
        runtime.result.findIndex(
            (message) => message.content === 'DEPTH ZERO'
        )
    )
})

it('allocates actual demand by priority without reserving empty elastic blocks', () => {
    const emptyDocuments = allocateBlockBudgets(
        definition(),
        new Map([
            ['documents', 0],
            ['history', 80]
        ]),
        100
    )
    assert.equal(emptyDocuments.budgets.get('documents'), 0)
    assert.equal(emptyDocuments.budgets.get('history'), 80)
    assert.equal(emptyDocuments.remaining, 20)

    const oversizedDocuments = allocateBlockBudgets(
        definition(),
        new Map([
            ['documents', 200],
            ['history', 80]
        ]),
        100
    )
    assert.equal(oversizedDocuments.budgets.get('documents'), 100)
    assert.equal(oversizedDocuments.budgets.get('history'), 0)

    const capped = definition()
    const documents = capped.blocks.find(
        (block) => block.type === 'requestDocuments'
    )!
    if (documents.type === 'requestDocuments') {
        documents.maxTokens = 30
    }
    const cappedDocuments = allocateBlockBudgets(
        capped,
        new Map([
            ['documents', 200],
            ['history', 80]
        ]),
        100
    )
    assert.equal(cappedDocuments.budgets.get('documents'), 30)
    assert.equal(cappedDocuments.budgets.get('history'), 70)
})

it('returns locked boundaries and runtime-only blocks in draft preview', () => {
    const preview = previewContextPreset(definition(), role, {
        inputTokenLimit: 4096,
        runtimeBlocks: ['qqbotFragments', 'toolDefinitions']
    })
    assert.equal(preview.outputBudgetTokens, 512)
    assert.equal(preview.inputBudgetTokens, 3584)
    assert.isTrue(preview.blocks.find((block) => block.id === 'role')!.locked)
    assert.isFalse(
        preview.blocks.find((block) => block.id === 'history')!.locked
    )
    assert.deepEqual(
        preview.blocks
            .filter((block) => block.source === 'runtime')
            .map((block) => block.type),
        ['qqbotFragments', 'toolDefinitions']
    )
})

it('keeps context revisions stable on shared role saves and rejects partial writes', async () => {
    const { app } = await createMemoryService()
    try {
        const preset = app.chatluna.preset
        const before = preset.getContextPreset('default-preset').value
        const role = preset.getRolePreset('default-preset').value
        await preset.updateRolePreset(
            role.id,
            {
                ...preset.getRolePresetDefinition(role.id),
                messages: [
                    {
                        role: 'system',
                        content: 'Updated shared role'
                    }
                ]
            },
            role.revision
        )
        const after = preset.getContextPreset('default-preset').value
        assert.equal(after.revision, before.revision)
        assert.equal(after.role.messages[0].content, 'Updated shared role')

        const conflict = {
            ...definition(),
            id: 'conflicting-context',
            aliases: ['helper']
        }
        const conflictRole = conflict.blocks.find(
            (block) => block.type === 'role'
        )!
        if (conflictRole.type === 'role') {
            conflictRole.rolePresetId = 'default-preset'
        }
        try {
            await preset.createContextPreset(conflict)
            assert.fail('Expected an alias conflict.')
        } catch (err) {
            assert.instanceOf(err, PresetError)
            assert.equal((err as PresetError).code, 'conflict')
        }
        assert.isUndefined(
            preset.getContextPreset('conflicting-context', false).value
        )
        try {
            await fs.access(
                path.join(
                    app.baseDir,
                    'presets/context/runtime/conflicting-context.yml'
                )
            )
            assert.fail('Conflicting context file should not exist.')
        } catch (err) {
            assert.equal((err as NodeJS.ErrnoException).code, 'ENOENT')
        }
    } finally {
        await app.stop()
    }
})

it('reports every context reference when deleting a shared role', async () => {
    const { app } = await createMemoryService()
    try {
        const preset = app.chatluna.preset
        const role = await preset.createRolePreset({
            schemaVersion: 1,
            id: 'runtime-role',
            displayName: 'Runtime Role',
            messages: []
        })
        const context = definition()
        context.id = 'runtime-context'
        context.aliases = []
        const roleBlock = context.blocks.find((block) => block.type === 'role')!
        if (roleBlock.type === 'role') {
            roleBlock.rolePresetId = role.id
        }
        await preset.createContextPreset(context)
        try {
            await preset.deleteRolePreset(role.id, role.revision)
            assert.fail('Expected a shared role conflict.')
        } catch (err) {
            assert.instanceOf(err, PresetError)
            assert.deepEqual((err as PresetError).referenceIds, [
                'runtime-context'
            ])
        }
    } finally {
        await app.stop()
    }
})
