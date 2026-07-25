/// <reference types="mocha" />

import { assert } from 'chai'
import { HumanMessage } from '@langchain/core/messages'
import { LoreBookMatcher } from '../src/llm-core/memory/lore_book'
import {
    createLoreBooksMiddleware,
    createContextTrace,
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
    const matcher = new LoreBookMatcher(entries, {
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
    const matcher = new LoreBookMatcher(entries, {
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
        tokenCounter: async () => 1,
        promptRenderService: {
            renderMessages: async (messages: unknown[]) => messages
        },
        preset: {
            promptConfig: {
                loreBooksPrompt: '{input}'
            },
            lore: {
                defaults: {
                    tokenLimit: 100,
                    recursiveScan: false
                },
                entries
            }
        },
        trace,
        documentCollections: [],
        systemPrompts: []
    }
    let handled = false

    await createLoreBooksMiddleware()(
        {
            injection: {
                name: 'lore_books',
                value: matched
            },
            runtime,
            handled,
            markHandled: () => {
                handled = true
            },
            appendMessages: () => [],
            insertAtAnchor: () => 0
        } as never,
        async () => undefined
    )

    assert.isTrue(handled)
    assert.deepEqual(
        trace.entries
            .filter((entry) => entry.role === 'document')
            .map((entry) => entry.source.path),
        ['lore.entries.2', 'lore.entries.1']
    )
})
