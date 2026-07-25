/// <reference types="mocha" />

import fs from 'node:fs/promises'
import { assert } from 'chai'
import { dump } from 'js-yaml'
import {
    compilePreset,
    parsePreset,
    PresetDefinitionV2
} from '../src/llm-core/prompt'
import {
    migratePresetBindingKey,
    migratePresetReference,
    preflightPresetV1Migration
} from '../src/migration/preset_v2'
import { PresetError, type PresetOperation } from '../src/preset'
import {
    createConversation,
    createMemoryService,
    expectRejected
} from './helpers'

function definition(id: string, displayName: string = id): PresetDefinitionV2 {
    return {
        schemaVersion: 2,
        id,
        displayName,
        aliases: [],
        messages: [],
        inputFormat: null,
        lore: { defaults: {}, entries: [] },
        authorsNote: null,
        knowledge: null,
        promptConfig: {}
    }
}

async function expectRevisionConflict(
    promise: Promise<unknown>,
    operation: PresetOperation
) {
    let caught: unknown
    try {
        await promise
    } catch (err) {
        caught = err
    }

    assert.instanceOf(caught, PresetError)
    const error = caught as PresetError
    assert.equal(error.code, 'conflict')
    assert.equal(error.operation, operation)
    assert.equal(error.stage, 'revision')
    assert.isTrue(error.runtimeUnchanged)
    return error
}

it('Preset V2 parser rejects legacy documents', () => {
    assert.throws(() =>
        parsePreset(`
keywords: [legacy]
prompts: []
`)
    )
})

it('Preset V2 compiler separates persisted messages from runtime messages', () => {
    const preset = compilePreset(
        {
            ...definition('writer'),
            messages: [
                {
                    role: 'system',
                    purpose: 'personality',
                    content: [
                        { type: 'text', text: 'Be precise.' },
                        {
                            type: 'image',
                            url: 'https://example.com/reference.png',
                            detail: 'high'
                        }
                    ]
                }
            ]
        },
        { source: 'bundled', raw: 'writer' }
    )

    assert.equal(preset.id, 'writer')
    assert.equal(preset.messages[0].additional_kwargs.purpose, 'personality')
    assert.deepEqual(preset.messages[0].content, [
        { type: 'text', text: 'Be precise.' },
        {
            type: 'image_url',
            image_url: {
                url: 'https://example.com/reference.png',
                detail: 'high'
            }
        }
    ])
})

it('Preset V2 round-trips every structured field without trimming prompt text', () => {
    const full: PresetDefinitionV2 = {
        schemaVersion: 2,
        id: 'full-preset',
        displayName: 'Full Preset',
        aliases: ['完整预设'],
        messages: [
            {
                role: 'system',
                purpose: 'description',
                content: '  preserve surrounding whitespace  '
            },
            {
                role: 'user',
                purpose: 'exampleStart',
                content: [
                    { type: 'text', text: ' example input ' },
                    {
                        type: 'image',
                        url: 'https://example.com/image.png',
                        detail: 'high'
                    },
                    {
                        type: 'file',
                        url: 'https://example.com/file.pdf',
                        mimeType: 'application/pdf'
                    },
                    {
                        type: 'audio',
                        url: 'https://example.com/audio.ogg',
                        mimeType: 'audio/ogg'
                    },
                    {
                        type: 'video',
                        url: 'https://example.com/video.mp4',
                        mimeType: 'video/mp4'
                    }
                ]
            },
            {
                role: 'assistant',
                purpose: 'exampleEnd',
                content: 'Example response'
            }
        ],
        inputFormat: '  {{ input }}  ',
        lore: {
            defaults: {
                scanDepth: 4,
                tokenLimit: 1024,
                recursiveScan: true,
                maxRecursionDepth: 2,
                insertPosition: 'afterScenario'
            },
            entries: [
                {
                    keywords: ['academy'],
                    content: '  lore content  ',
                    insertPosition: 'beforeExampleMessages',
                    scanDepth: 2,
                    recursiveScan: false,
                    maxRecursionDepth: 1,
                    matchWholeWord: true,
                    constant: false,
                    caseSensitive: true,
                    enabled: true,
                    order: 7
                }
            ]
        },
        authorsNote: {
            content: '  author note  ',
            insertPosition: 'inChat',
            insertDepth: 3,
            insertFrequency: 2
        },
        knowledge: {
            sources: ['knowledge/main.md'],
            prompt: '  knowledge prompt  '
        },
        promptConfig: {
            maxOutputToken: 2048,
            longMemoryPrompt: '  long memory  ',
            loreBooksPrompt: '  lore template  ',
            longMemoryExtractPrompt: '  extract template  ',
            longMemoryNewQuestionPrompt: '  question template  ',
            reActInstruction: '  ReAct template  ',
            postHandler: {
                id: 'runtime-handler',
                prefix: '<prefix>',
                postfix: '<postfix>',
                censor: true,
                variables: { mode: 'strict' }
            }
        }
    }

    const parsed = parsePreset(dump(full, { noRefs: true }))
    assert.deepEqual(parsed, full)
    const compiled = compilePreset(parsed, {
        source: 'runtime',
        raw: dump(full),
        handlers: new Map([
            [
                'runtime-handler',
                async (_session, data) => ({
                    displayContent: data,
                    content: data,
                    variables: {}
                })
            ]
        ])
    })
    assert.equal(
        compiled.definition.messages[0].content,
        '  preserve surrounding whitespace  '
    )
    assert.isFunction(compiled.promptConfig.postHandler?.handler)
})

it('Preset V1 preflight resolves declared identity conflicts', () => {
    const plan = preflightPresetV1Migration([
        {
            filePath: 'sakiko.yml',
            raw: `
keywords: [sakiko, saki, 祥, 小祥]
prompts: []
`
        },
        {
            filePath: 'sakiko(冷漠).yml',
            raw: `
keywords: [sakiko, 小祥, 丰川祥子, Oblivionis, saki, 祥, 丰川]
prompts: []
`
        }
    ])

    assert.equal(migratePresetReference('小祥', plan), 'sakiko')
    assert.equal(migratePresetReference('丰川祥子', plan), 'sakiko')
    assert.equal(migratePresetReference('Oblivionis', plan), 'sakiko')
    assert.equal(migratePresetReference('丰川', plan), 'sakiko')
    assert.equal(
        migratePresetBindingKey('shared:onebot:bot:group:preset:saki', plan),
        'shared:onebot:bot:group:preset:sakiko'
    )
    assert.deepEqual(
        plan.definitions.find((preset) => preset.id === 'sakiko-cold')?.aliases,
        ['冷漠小祥', '冷漠祥子']
    )
    assert.throws(() => migratePresetReference('unknown', plan))
})

it('Preset V1 conversion removes case-insensitive duplicate aliases', () => {
    const plan = preflightPresetV1Migration([
        {
            filePath: 'sakiko.yml',
            raw: `
keywords: [sakiko, Oblivionis, oblivionis, SAKI, saki]
prompts: []
`
        }
    ])

    assert.deepEqual(plan.definitions[0].aliases, ['Oblivionis', 'SAKI'])
})

it('Preset V1 preflight rejects duplicate canonical IDs and unresolved aliases', () => {
    assert.throws(
        () =>
            preflightPresetV1Migration([
                {
                    filePath: 'first.yml',
                    id: 'same',
                    raw: 'keywords: [first]\nprompts: []'
                },
                {
                    filePath: 'second.yml',
                    id: 'same',
                    raw: 'keywords: [second]\nprompts: []'
                }
            ]),
        /duplicate canonical id same: first\.yml, second\.yml/
    )
    assert.throws(
        () =>
            preflightPresetV1Migration(
                [
                    {
                        filePath: 'first.yml',
                        id: 'first',
                        raw: 'keywords: [shared]\nprompts: []'
                    },
                    {
                        filePath: 'second.yml',
                        id: 'second',
                        raw: 'keywords: [shared]\nprompts: []'
                    }
                ],
                {}
            ),
        /identity is ambiguous.*shared -> first, second/
    )
})

it('Preset V1 migration rejects unknown fields and incomplete content blocks', () => {
    const invalidDocuments = [
        `
keywords: [legacy]
prompts: []
unknownTopLevel: silently-lost
`,
        `
keywords: [legacy]
prompts:
  - role: system
    content: text
    unknownMessageField: silently-lost
`,
        `
keywords: [legacy]
prompts:
  - role: system
    content:
      - type: text
`,
        `
keywords: [legacy]
prompts:
  - role: system
    content: text
world_lores:
  - scanDepth: 3
    unknownLoreDefault: silently-lost
`,
        `
keywords: [legacy]
prompts:
  - role: system
    content:
      - type: image_url
        image_url:
          url: https://example.com/image.png
          unknownImageField: silently-lost
`
    ]

    for (const [index, raw] of invalidDocuments.entries()) {
        assert.throws(
            () =>
                preflightPresetV1Migration([
                    {
                        filePath: `invalid-${index}.yml`,
                        id: `invalid-${index}`,
                        raw
                    }
                ])
        )
    }
})

it('Preset V1 migration rejects ambiguous duplicate legacy sections', () => {
    assert.throws(
        () =>
            preflightPresetV1Migration([
                {
                    filePath: 'duplicate-note.yml',
                    id: 'duplicate-note',
                    raw: `
keywords: [legacy]
prompts: []
authors_note:
  content: first
author_notes:
  content: second
`
                }
            ]),
        /both authors_note and author_notes/
    )
    assert.throws(
        () =>
            preflightPresetV1Migration([
                {
                    filePath: 'duplicate-lore-default.yml',
                    id: 'duplicate-lore-default',
                    raw: `
keywords: [legacy]
prompts: []
world_lores:
  - scanDepth: 2
  - scanDepth: 3
`
                }
            ]),
        /multiple world lore defaults/
    )
})

it('PresetService applies runtime overrides and preserves live revisions on validation failure', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        assert.equal(preset.getGlobalDefaultPresetId().value, 'default-preset')

        const bundled = preset.getPreset('default-preset').value
        const updated = await preset.updatePreset(
            bundled.id,
            {
                ...preset.getDefinition(bundled.id),
                displayName: 'Updated Default'
            },
            bundled.revision
        )
        assert.notEqual(updated.revision, bundled.revision)
        assert.isTrue(
            preset.listPresets().value.find((item) => item.id === updated.id)
                ?.hasOverride
        )

        await expectRejected(
            preset.updatePreset(
                updated.id,
                {
                    ...preset.getDefinition(updated.id),
                    displayName: ''
                },
                updated.revision
            ),
            /Preset definition/
        )
        assert.equal(
            preset.getPreset(updated.id).value.revision,
            updated.revision
        )
        await expectRejected(
            preset.updatePreset(
                updated.id,
                {
                    ...preset.getDefinition(updated.id),
                    displayName: 'Stale update'
                },
                bundled.revision
            ),
            /revision changed/
        )

        const reverted = await preset.revertOverride(
            updated.id,
            updated.revision
        )
        assert.equal(reverted.revision, bundled.revision)
        assert.equal(
            preset.getPreset(updated.id).value.revision,
            bundled.revision
        )

        await preset.createPreset(definition('zeta', 'Same'))
        const alpha = await preset.createPreset(definition('alpha', 'Same'))
        assert.deepEqual(
            preset
                .listPresets()
                .value.filter((item) => item.displayName === 'Same')
                .map((item) => item.id),
            ['alpha', 'zeta']
        )

        await preset.setGlobalDefaultPresetId('alpha')
        await expectRejected(
            preset.deletePreset('alpha', alpha.revision),
            /cannot be deleted/
        )
        await preset.setGlobalDefaultPresetId('default-preset')
        await preset.deletePreset('alpha', alpha.revision)
        assert.isUndefined(preset.getPreset('alpha', false).value)

        const concurrent = await Promise.allSettled([
            preset.createPreset(definition('concurrent', 'First')),
            preset.createPreset(definition('concurrent', 'Second'))
        ])
        assert.equal(
            concurrent.filter((result) => result.status === 'fulfilled').length,
            1
        )
        assert.equal(
            concurrent.filter((result) => result.status === 'rejected').length,
            1
        )
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService keeps an override unchanged when revert uses a stale revision', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        const bundled = preset.getPreset('default-preset').value
        const updated = await preset.updatePreset(
            bundled.id,
            {
                ...preset.getDefinition(bundled.id),
                displayName: 'Updated Default'
            },
            bundled.revision
        )
        assert.isString(updated.path)
        const overridePath = updated.path as string
        const fileBefore = await fs.readFile(overridePath)
        const loadedBefore = preset.getPreset(updated.id).value

        const error = await expectRevisionConflict(
            preset.revertOverride(updated.id, bundled.revision),
            'revert'
        )

        assert.equal(error.presetId, updated.id)
        assert.equal(error.filePath, overridePath)
        assert.deepEqual(await fs.readFile(overridePath), fileBefore)
        assert.strictEqual(preset.getPreset(updated.id).value, loadedBefore)
        assert.equal(
            preset.getPreset(updated.id).value.revision,
            updated.revision
        )
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService keeps a runtime preset unchanged when delete uses a stale revision', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        const created = await preset.createPreset(
            definition('stale-delete', 'Stale Delete')
        )
        assert.isString(created.path)
        const runtimePath = created.path as string
        const fileBefore = await fs.readFile(runtimePath)
        const loadedBefore = preset.getPreset(created.id).value

        const error = await expectRevisionConflict(
            preset.deletePreset(created.id, 'stale-revision'),
            'delete'
        )

        assert.equal(error.presetId, created.id)
        assert.equal(error.filePath, runtimePath)
        assert.deepEqual(await fs.readFile(runtimePath), fileBefore)
        assert.strictEqual(preset.getPreset(created.id).value, loadedBefore)
        assert.equal(
            preset.getPreset(created.id).value.revision,
            created.revision
        )
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService serializes reference creation against preset deletion', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        const created = await preset.createPreset(
            definition('referenced-during-delete', 'Referenced During Delete')
        )
        let releaseReference!: () => void
        let signalReferenceEntered!: () => void
        const referenceGate = new Promise<void>((resolve) => {
            releaseReference = resolve
        })
        const referenceEntered = new Promise<void>((resolve) => {
            signalReferenceEntered = resolve
        })
        const referenceWrite = preset.runReferenceMutation(async () => {
            signalReferenceEntered()
            await referenceGate
            await app.database.create(
                'chatluna_conversation',
                createConversation({
                    id: 'conversation-reference-race',
                    preset: 'default-preset',
                    bindingKey:
                        `shared:discord:bot:guild:preset:${created.id}`
                })
            )
        })

        await referenceEntered
        const deletion = preset.deletePreset(created.id, created.revision)
        releaseReference()
        await referenceWrite
        await expectRejected(deletion, /still referenced/)

        assert.equal(
            preset.getPreset(created.id).value.revision,
            created.revision
        )
        await fs.access(created.path as string)
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService rejects runtime files changed outside its mutation boundary', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        const created = await preset.createPreset(
            definition('external-change', 'Loaded Definition')
        )
        assert.isString(created.path)
        const runtimePath = created.path as string
        const loadedBefore = preset.getPreset(created.id).value
        const externalRaw = dump(
            definition(created.id, 'External File Change'),
            {
                lineWidth: 100,
                noRefs: true,
                sortKeys: false
            }
        )
        await fs.writeFile(runtimePath, externalRaw, 'utf-8')

        await expectRevisionConflict(
            preset.updatePreset(
                created.id,
                definition(created.id, 'Admin Update'),
                created.revision
            ),
            'update'
        )
        await expectRevisionConflict(
            preset.deletePreset(created.id, created.revision),
            'delete'
        )
        assert.strictEqual(preset.getPreset(created.id).value, loadedBefore)
        assert.equal(await fs.readFile(runtimePath, 'utf-8'), externalRaw)

        const bundled = preset.getPreset('default-preset').value
        const override = await preset.updatePreset(
            bundled.id,
            {
                ...preset.getDefinition(bundled.id),
                displayName: 'Loaded Override'
            },
            bundled.revision
        )
        assert.isString(override.path)
        const overridePath = override.path as string
        const loadedOverride = preset.getPreset(override.id).value
        const externalOverrideRaw = dump(
            {
                ...preset.getDefinition(override.id),
                displayName: 'External Override Change'
            },
            {
                lineWidth: 100,
                noRefs: true,
                sortKeys: false
            }
        )
        await fs.writeFile(overridePath, externalOverrideRaw, 'utf-8')

        await expectRevisionConflict(
            preset.revertOverride(override.id, override.revision),
            'revert'
        )
        assert.strictEqual(preset.getPreset(override.id).value, loadedOverride)
        assert.equal(
            await fs.readFile(overridePath, 'utf-8'),
            externalOverrideRaw
        )
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService never overwrites an unowned runtime preset file', async () => {
    const { app } = await createMemoryService()

    try {
        const preset = app.chatluna.preset
        const unownedCreate = definition(
            'unowned-create',
            'External Create'
        )
        const unownedCreateRaw = dump(unownedCreate, {
            lineWidth: 100,
            noRefs: true,
            sortKeys: false
        })
        const unownedCreatePath = `${preset.runtimeDir}/unowned-create.yml`
        await fs.writeFile(unownedCreatePath, unownedCreateRaw, 'utf-8')

        await expectRevisionConflict(
            preset.createPreset(
                definition('unowned-create', 'Admin Create')
            ),
            'create'
        )
        assert.equal(
            await fs.readFile(unownedCreatePath, 'utf-8'),
            unownedCreateRaw
        )
        assert.isUndefined(preset.getPreset('unowned-create', false).value)

        const bundled = preset.getPreset('default-preset').value
        const unownedOverrideRaw = dump(
            {
                ...preset.getDefinition(bundled.id),
                displayName: 'External Override'
            },
            {
                lineWidth: 100,
                noRefs: true,
                sortKeys: false
            }
        )
        const unownedOverridePath = `${preset.runtimeDir}/${bundled.id}.yml`
        await fs.writeFile(
            unownedOverridePath,
            unownedOverrideRaw,
            'utf-8'
        )

        await expectRevisionConflict(
            preset.updatePreset(
                bundled.id,
                {
                    ...preset.getDefinition(bundled.id),
                    displayName: 'Admin Override'
                },
                bundled.revision
            ),
            'update'
        )
        assert.equal(
            await fs.readFile(unownedOverridePath, 'utf-8'),
            unownedOverrideRaw
        )
        assert.strictEqual(preset.getPreset(bundled.id).value, bundled)
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})

it('PresetService rejects legacy and unsupported runtime directory entries', async () => {
    const { app } = await createMemoryService()

    try {
        const currentRevision =
            app.chatluna.preset.getPreset('default-preset').value.revision
        await fs.writeFile(
            `${app.baseDir}/presets/runtime/legacy.txt`,
            'keywords: [legacy]\nprompts: []\n'
        )

        await expectRejected(
            app.chatluna.preset.loadAllPresets(),
            /unsupported entry: legacy\.txt/
        )
        assert.equal(
            app.chatluna.preset.getPreset('default-preset').value.revision,
            currentRevision
        )
    } finally {
        await app.stop()
        await fs.rm(app.baseDir, { recursive: true, force: true })
    }
})
