/// <reference types="mocha" />

import { assert } from 'chai'
import { HumanMessage } from '@langchain/core/messages'
import { LoreBookMatcher } from '../src/llm-core/memory/lore_book'
import {
    ChatLunaContextManagerService,
    createLoreBooksMiddleware,
    createContextTrace,
    prepareLoreBooks,
    type LoreEntry
} from '../src/llm-core/prompt'

it('matches lore keywords in structured text blocks', () => {
    const entries: LoreEntry[] = [
        {
            keywords: ['alpha'],
            content: 'whole-word lore',
            matchWholeWord: true
        },
        {
            keywords: ['beta'],
            content: 'substring lore',
            matchWholeWord: false
        }
    ]
    const matcher = new LoreBookMatcher('lore', entries, {
        recursiveScan: false,
        caseSensitive: true
    })
    const matched = matcher.matchLoreBooks([
        new HumanMessage({
            content: [
                { type: 'text', text: 'alpha appears here' },
                {
                    type: 'image_url',
                    image_url: { url: 'https://example.com/reference.png' }
                },
                { type: 'text', text: 'and beta follows' }
            ]
        })
    ])

    assert.deepEqual(
        matched.map(({ presetEntryIndex }) => presetEntryIndex),
        [0, 1]
    )
})

it('keeps canonical preset entry indexes after lore matching and sorting', async () => {
    const entries: LoreEntry[] = [
        {
            keywords: ['disabled'],
            content: 'disabled content',
            enabled: false,
            order: 0
        },
        {
            keywords: ['alpha'],
            content: 'alpha lore',
            order: 20
        },
        {
            keywords: ['beta'],
            content: 'beta lore',
            order: 10
        },
        {
            keywords: ['unmatched'],
            content: 'unmatched lore',
            order: 5
        }
    ]
    const matcher = new LoreBookMatcher('lore', entries, {
        recursiveScan: false,
        caseSensitive: true
    })
    const matched = matcher.matchLoreBooks([
        new HumanMessage('alpha and beta are present')
    ])

    assert.deepEqual(
        matched.map(({ presetEntryIndex }) => presetEntryIndex),
        [2, 1]
    )

    const trace = createContextTrace({ requestId: 'lore-request' })
    const result = [new HumanMessage('current input')]
    const runtime = {
        result,
        variables: {},
        usedTokens: 0,
        sendTokenLimit: 1_000,
        requiredTailTokens: 0,
        blockBudgets: new Map([['lore', 100]]),
        blockUsage: new Map(),
        tokenCounter: async () => 1,
        promptRenderService: {
            renderMessages: async (messages: unknown[]) => messages
        },
        preset: {
            loreBlocks: [
                {
                    id: 'lore',
                    type: 'lore',
                    enabled: true,
                    budgetPriority: 0,
                    maxTokens: 100,
                    prompt: '{input}',
                    defaults: { recursiveScan: false },
                    entries
                }
            ],
            definition: {
                blocks: [
                    {
                        id: 'role',
                        type: 'role'
                    },
                    {
                        id: 'lore',
                        type: 'lore'
                    }
                ]
            }
        },
        trace,
        documentCollections: [],
        systemPrompts: [],
        blockSegments: new Map(),
        runtimeInjectionSegments: [],
        preparedInjections: new Map()
    }
    const injection = {
        id: 'matched-lore',
        name: 'lore_books',
        value: matched
    }
    runtime.preparedInjections.set(
        injection.id,
        await prepareLoreBooks(matched, runtime as never)
    )
    const manager = new ChatLunaContextManagerService({
        on: () => undefined
    } as never)
    manager.intercept('lore_books', createLoreBooksMiddleware(), 0)
    await manager.applyInjections(
        [
            {
                ...injection,
                stage: 'injections',
                priority: 0,
                createdAt: 0
            }
        ],
        runtime as never
    )

    assert.deepEqual(
        trace.entries
            .filter((entry) => entry.role === 'document')
            .map((entry) => entry.source.path),
        ['blocks.lore.entries.2', 'blocks.lore.entries.1']
    )
    const rendered = trace.entries.filter((entry) => entry.role !== 'document')
    assert.lengthOf(rendered, 1)
    assert.equal(rendered[0].source.kind, 'lore')
    assert.equal(rendered[0].source.path, 'blocks.lore')
})

it('charges lore budgets for the rendered message', async () => {
    const matched = [
        {
            blockId: 'lore',
            presetEntryIndex: 0,
            entry: {
                keywords: ['alpha'],
                content: 'x'
            }
        }
    ]
    const trace = createContextTrace({ requestId: 'rendered-lore-budget' })
    const runtime = {
        result: [new HumanMessage('current input')],
        variables: {},
        usedTokens: 0,
        sendTokenLimit: 100,
        requiredTailTokens: 0,
        blockBudgets: new Map([['lore', 10]]),
        blockUsage: new Map(),
        tokenCounter: async (text: string) =>
            text.includes('LONG WRAPPER') ? 50 : 1,
        promptRenderService: {
            renderMessages: async (messages: HumanMessage[]) => messages
        },
        preset: {
            loreBlocks: [
                {
                    id: 'lore',
                    type: 'lore',
                    enabled: true,
                    budgetPriority: 0,
                    maxTokens: 10,
                    prompt: 'LONG WRAPPER {input}',
                    defaults: {},
                    entries: matched.map(({ entry }) => entry)
                }
            ],
            definition: {
                blocks: [
                    { id: 'role', type: 'role' },
                    { id: 'lore', type: 'lore' }
                ]
            }
        },
        trace,
        documentCollections: [],
        systemPrompts: [],
        blockSegments: new Map(),
        runtimeInjectionSegments: [],
        preparedInjections: new Map()
    }
    const injection = {
        id: 'rendered-lore',
        name: 'lore_books',
        value: matched
    }
    const prepared = await prepareLoreBooks(matched, runtime as never)
    runtime.preparedInjections.set(injection.id, prepared)
    assert.equal(prepared.groups[0].tokenCount, 51)

    await createLoreBooksMiddleware()(
        {
            injection,
            runtime,
            markHandled: () => undefined
        } as never,
        async () => undefined
    )

    assert.equal(runtime.usedTokens, 0)
    assert.lengthOf(runtime.result, 1)
    assert.equal(runtime.blockUsage.get('lore'), undefined)
    assert.equal(
        trace.entries.find((entry) => entry.role === 'document')?.reason,
        'lore_budget'
    )
})
