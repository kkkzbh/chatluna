/// <reference types="mocha" />

import { assert } from 'chai'
import { computed } from '@vue/reactivity'
import { HumanMessage } from '@langchain/core/messages'
import { Document } from '@langchain/core/documents'
import type { Context } from 'koishi'
import { ChatLunaChatPrompt } from '../src/llm-core/chain/prompt'
import {
    ChatLunaContextManagerService,
    compileContextPreset,
    compileRolePreset,
    ContextPresetCompileError,
    contextTraceIdFromMessages,
    createContextTrace,
    type ContextPresetDefinitionV1
} from '../src/llm-core/prompt'

function createPrompt(roleContent: string, maxOutputTokens: number) {
    const role = compileRolePreset(
        {
            schemaVersion: 1,
            id: 'runtime-role',
            displayName: 'Runtime Role',
            messages: [{ role: 'system', content: roleContent }]
        },
        { source: 'ephemeral', raw: roleContent }
    )
    const definition: ContextPresetDefinitionV1 = {
        schemaVersion: 1,
        id: 'runtime-context',
        displayName: 'Runtime Context',
        aliases: [],
        blocks: [
            {
                id: 'role',
                type: 'role',
                rolePresetId: role.id
            },
            {
                id: 'input',
                type: 'currentInput',
                inputFormat: null
            },
            {
                id: 'output',
                type: 'modelOutput',
                maxOutputTokens,
                postHandler: null
            }
        ]
    }
    const preset = compileContextPreset(definition, role, {
        source: 'ephemeral',
        raw: JSON.stringify(definition)
    })
    const manager = new ChatLunaContextManagerService({
        on: () => undefined
    } as unknown as Context)
    const prompt = new ChatLunaChatPrompt({
        preset: computed(() => preset),
        tokenCounter: async (text) => text.length,
        sendTokenLimit: 100,
        contextManager: manager,
        promptRenderService: {
            renderCompiledPreset: async (compiled) => ({
                messages: compiled.messages,
                variables: []
            }),
            renderTemplate: async (source) => ({
                text: source,
                variables: []
            }),
            renderMessages: async (messages) => messages
        } as never,
        knowledgeService: {
            resolve: async () => []
        } as never
    })
    return { manager, preset, prompt }
}

function createPromptWithHistory(roleContent: string, maxOutputTokens: number) {
    const role = compileRolePreset(
        {
            schemaVersion: 1,
            id: 'history-role',
            displayName: 'History Role',
            messages: [{ role: 'system', content: roleContent }]
        },
        { source: 'ephemeral', raw: roleContent }
    )
    const definition: ContextPresetDefinitionV1 = {
        schemaVersion: 1,
        id: 'history-context',
        displayName: 'History Context',
        aliases: [],
        blocks: [
            {
                id: 'role',
                type: 'role',
                rolePresetId: role.id
            },
            {
                id: 'history',
                type: 'chatHistory',
                enabled: true,
                budgetPriority: 0,
                maxTokens: null
            },
            {
                id: 'input',
                type: 'currentInput',
                inputFormat: null
            },
            {
                id: 'output',
                type: 'modelOutput',
                maxOutputTokens,
                postHandler: null
            }
        ]
    }
    const preset = compileContextPreset(definition, role, {
        source: 'ephemeral',
        raw: JSON.stringify(definition)
    })
    const prompt = new ChatLunaChatPrompt({
        preset: computed(() => preset),
        tokenCounter: async (text) => text.length,
        sendTokenLimit: 100,
        contextManager: new ChatLunaContextManagerService({
            on: () => undefined
        } as unknown as Context),
        promptRenderService: {
            renderCompiledPreset: async (compiled) => ({
                messages: compiled.messages,
                variables: []
            }),
            renderTemplate: async (source) => ({
                text: source,
                variables: []
            }),
            renderMessages: async (messages) => messages
        } as never,
        knowledgeService: {
            resolve: async () => []
        } as never
    })
    return { prompt }
}

it('places role messages before agent instructions', async () => {
    const { prompt } = createPrompt('ROLE', 20)
    const messages = await prompt.formatMessages({
        chat_history: [],
        input: new HumanMessage('INPUT'),
        instructions: 'AGENT',
        variables: {},
        configurable: { conversationId: 'role-order' }
    })

    assert.deepEqual(
        messages.slice(0, 2).map((message) => message.content),
        ['ROLE', 'AGENT']
    )
})

it('does not write context trace carriers to source chat history messages', async () => {
    const { prompt } = createPromptWithHistory('ROLE', 20)
    const historyMessage = new HumanMessage('HISTORY')
    const messages = await prompt.formatMessages({
        chat_history: [historyMessage],
        input: new HumanMessage('INPUT'),
        variables: {},
        configurable: { conversationId: 'history-trace-carrier' }
    })

    assert.isUndefined(
        historyMessage.response_metadata?.chatluna_context_trace
    )
    assert.isDefined(contextTraceIdFromMessages(messages))
    assert.isFalse(messages.includes(historyMessage))
})

it('reconciles runtime injection tokens against output-reserved input', async () => {
    const { manager, prompt } = createPrompt('R'.repeat(56), 20)
    manager.inject({
        conversationId: 'runtime-overflow',
        name: 'read_files_context',
        value: new HumanMessage('X'.repeat(16)),
        once: true
    })

    try {
        await prompt.formatMessages({
            chat_history: [],
            input: new HumanMessage('I'.repeat(4)),
            variables: {},
            configurable: { conversationId: 'runtime-overflow' }
        })
        assert.fail('Expected runtime injection budget failure.')
    } catch (err) {
        assert.instanceOf(err, ContextPresetCompileError)
        assert.equal(
            (err as ContextPresetCompileError).code,
            'required_block_over_limit'
        )
        assert.equal((err as ContextPresetCompileError).stage, 'budget')
        assert.equal(
            (err as ContextPresetCompileError).blockId,
            'runtime-read_files_context'
        )
        assert.equal((err as ContextPresetCompileError).limit, 10)
    }
})

it('adds accepted runtime injection tokens to exact runtime usage', async () => {
    const { manager, preset } = createPrompt('ROLE', 20)
    const runtime = {
        result: [],
        variables: {},
        usedTokens: 60,
        sendTokenLimit: 100,
        requiredTailTokens: 10,
        blockBudgets: new Map(),
        blockUsage: new Map(),
        preparedSystemPrompts: [],
        injections: {
            beforeScratchpad: [],
            afterScratchpad: []
        },
        tokenCounter: async (text: string) => text.length,
        promptRenderService: {},
        preset,
        trace: createContextTrace({ requestId: 'runtime-accounting' }),
        systemPrompts: [],
        blockSegments: new Map(),
        runtimeInjectionSegments: [],
        preparedInjections: new Map()
    }

    await manager.applyInjections(
        [
            {
                id: 'runtime-generic',
                name: 'generic',
                value: new HumanMessage('X'.repeat(16)),
                stage: 'injections',
                priority: 0,
                createdAt: 0
            }
        ],
        runtime as never
    )

    assert.equal(runtime.usedTokens, 80)
    assert.lengthOf(runtime.runtimeInjectionSegments, 1)
})

it('allocates document blocks from their rendered message demand', async () => {
    const role = compileRolePreset(
        {
            schemaVersion: 1,
            id: 'document-role',
            displayName: 'Document Role',
            messages: [{ role: 'system', content: 'ROLE' }]
        },
        { source: 'ephemeral', raw: 'ROLE' }
    )
    const definition: ContextPresetDefinitionV1 = {
        schemaVersion: 1,
        id: 'document-context',
        displayName: 'Document Context',
        aliases: [],
        blocks: [
            {
                id: 'role',
                type: 'role',
                rolePresetId: role.id
            },
            {
                id: 'documents',
                type: 'requestDocuments',
                enabled: true,
                budgetPriority: 0,
                maxTokens: null
            },
            {
                id: 'input',
                type: 'currentInput',
                inputFormat: null
            },
            {
                id: 'output',
                type: 'modelOutput',
                maxOutputTokens: 20,
                postHandler: null
            }
        ]
    }
    const preset = compileContextPreset(definition, role, {
        source: 'ephemeral',
        raw: JSON.stringify(definition)
    })
    const prompt = new ChatLunaChatPrompt({
        preset: computed(() => preset),
        tokenCounter: async (text) => text.length,
        sendTokenLimit: 1_000,
        contextManager: new ChatLunaContextManagerService({
            on: () => undefined
        } as unknown as Context),
        promptRenderService: {
            renderCompiledPreset: async (compiled) => ({
                messages: compiled.messages,
                variables: []
            }),
            renderTemplate: async (source) => ({
                text: source,
                variables: []
            }),
            renderMessages: async (messages) => messages
        } as never,
        knowledgeService: {
            resolve: async () => []
        } as never
    })

    const messages = await prompt.formatMessages({
        chat_history: [],
        input: new HumanMessage('INPUT'),
        variables: {
            documents: [
                [
                    new Document({
                        id: 'doc-1',
                        pageContent: 'DOCUMENT-CONTENT',
                        metadata: { source: 'test' }
                    })
                ]
            ]
        },
        configurable: { conversationId: 'document-budget' }
    })

    assert.isTrue(
        messages.some(
            (message) =>
                typeof message.content === 'string' &&
                message.content.includes('DOCUMENT-CONTENT')
        )
    )
})
