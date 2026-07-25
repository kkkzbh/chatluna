/// <reference types="mocha" />

import { Document } from '@langchain/core/documents'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { computed } from '@vue/reactivity'
import { assert } from 'chai'
import type { Context } from 'koishi'
import type { ChatLunaPlugin } from '../src/services/chat'
import { ChatLunaChatPrompt } from '../src/llm-core/chain/prompt'
import {
    attachLongMemoryQueryTrace,
    ChatLunaContextManagerService
} from '../src/llm-core/prompt'
import {
    compilePreset,
    PresetDefinitionV2
} from '../src/llm-core/prompt/preset_prompt_parse'
import {
    contextTraceIdFromMessages,
    takeContextTrace
} from '../src/llm-core/prompt/context_trace'
import {
    PresetKnowledgeError,
    PresetKnowledgeService
} from '../src/services/knowledge'
import { ChatLunaPromptRenderService } from '../src/services/prompt_renderer'
import {
    generateNewQuestion,
    renderLongMemoryNewQuestionPrompt
} from '../../extension-long-memory/src/utils/chat-history'
import { langchainMessageToOpenAIMessage } from '../../shared-adapter/src/utils'

function definition(
    overrides: Partial<PresetDefinitionV2> = {}
): PresetDefinitionV2 {
    return {
        schemaVersion: 2,
        id: 'runtime-fields',
        displayName: 'Runtime Fields',
        aliases: [],
        messages: [],
        inputFormat: null,
        lore: { defaults: {}, entries: [] },
        authorsNote: null,
        knowledge: null,
        promptConfig: {},
        ...overrides
    }
}

function compile(definitionValue: PresetDefinitionV2) {
    return compilePreset(definitionValue, {
        source: 'runtime',
        raw: JSON.stringify(definitionValue)
    })
}

function createPrompt(
    preset: ReturnType<typeof compile>,
    knowledgeService = new PresetKnowledgeService()
) {
    return new ChatLunaChatPrompt({
        preset: computed(() => preset),
        tokenCounter: async (text) => text.length,
        sendTokenLimit: 100_000,
        promptRenderService: new ChatLunaPromptRenderService(),
        knowledgeService,
        contextManager: new ChatLunaContextManagerService({
            on: () => undefined
        } as unknown as Context)
    })
}

it('preserves every structured preset block through prompt assembly and provider serialization', async () => {
    const preset = compile(
        definition({
            messages: [
                {
                    role: 'user',
                    purpose: 'exampleStart',
                    content: [
                        { type: 'text', text: 'Hello {name}' },
                        {
                            type: 'image',
                            url: 'data:image/png;base64,YQ==',
                            detail: 'low'
                        },
                        {
                            type: 'file',
                            url: 'data:application/pdf;base64,Yg==',
                            mimeType: 'application/pdf'
                        },
                        {
                            type: 'audio',
                            url: 'data:audio/ogg;base64,Yw==',
                            mimeType: 'audio/ogg'
                        },
                        {
                            type: 'video',
                            url: 'data:video/mp4;base64,ZA==',
                            mimeType: 'video/mp4'
                        },
                        { type: 'text', text: 'Bye {name}' }
                    ]
                }
            ]
        })
    )
    const messages = await createPrompt(preset).formatMessages({
        input: new HumanMessage('question'),
        chat_history: [],
        variables: {
            name: 'Ada',
            built: { requestId: 'structured-request' }
        }
    })
    const structured = messages.find((message) =>
        Array.isArray(message.content)
    )

    assert.exists(structured)
    assert.deepEqual(
        (structured!.content as Array<{ type: string }>).map(
            (part) => part.type
        ),
        [
            'text',
            'image_url',
            'file_url',
            'audio_url',
            'video_url',
            'text'
        ]
    )
    assert.equal(
        (structured!.content[0] as { text: string }).text,
        'Hello Ada'
    )
    assert.equal(
        (structured!.content[5] as { text: string }).text,
        'Bye Ada'
    )
    assert.equal(
        structured!.additional_kwargs.purpose,
        'exampleStart'
    )

    const payload = await langchainMessageToOpenAIMessage(
        [structured!],
        {
            fetch: () => {
                throw new Error('Data URLs must not use network fetch.')
            }
        } as unknown as ChatLunaPlugin,
        'mimo-v2.5'
    )
    const providerContent = payload[0].content
    assert.isArray(providerContent)
    assert.deepEqual(
        (providerContent as Array<{ type: string }>).map((part) => part.type),
        [
            'text',
            'image_url',
            'file_url',
            'input_audio',
            'video_url',
            'text'
        ]
    )
    assert.equal(
        (
            providerContent![1] as {
                image_url: { detail?: string }
            }
        ).image_url.detail,
        'low'
    )
})

it('resolves preset knowledge deterministically and traces source and prompt ownership', async () => {
    const preset = compile(
        definition({
            knowledge: {
                sources: ['manual', 'policy'],
                prompt: '<knowledge>{knowledge}</knowledge>'
            }
        })
    )
    const knowledge = new PresetKnowledgeService()
    knowledge.registerSource('manual', async (request) => {
        assert.equal(request.query, 'question')
        assert.equal(request.conversationId, 'conversation-1')
        return [new Document({ id: 'manual-1', pageContent: 'Manual A' })]
    })
    knowledge.registerSource('policy', async () => [
        new Document({ id: 'policy-1', pageContent: 'Policy B' })
    ])

    const messages = await createPrompt(preset, knowledge).formatMessages({
        input: new HumanMessage('question'),
        chat_history: [],
        variables: {
            built: {
                requestId: 'knowledge-request',
                conversationId: 'conversation-1'
            }
        },
        configurable: {
            conversationId: 'conversation-1',
            session: {} as never
        }
    })
    const traceId = contextTraceIdFromMessages(messages)
    const trace = takeContextTrace(traceId)

    assert.exists(trace)
    const rendered = trace!.entries.find(
        (entry) =>
            entry.source.kind === 'knowledge' &&
            entry.source.path === 'knowledge.prompt'
    )
    assert.include(rendered?.content as string, 'Manual A')
    assert.include(rendered?.content as string, 'Policy B')
    assert.notInclude(
        rendered?.content as string,
        'chatlunaPresetKnowledge'
    )
    const sourceEntries = trace!.entries.filter(
        (entry) => entry.role === 'document' && entry.source.kind === 'knowledge'
    )
    assert.deepEqual(
        sourceEntries.map((entry) => [
            entry.source.name,
            entry.source.path
        ]),
        [
            ['manual', 'knowledge.sources.0'],
            ['policy', 'knowledge.sources.1']
        ]
    )
    assert.isTrue(
        sourceEntries.every(
            (entry) => entry.parentMessageId === rendered?.messageId
        )
    )
})

it('fails directly when a preset knowledge source has no registered owner', async () => {
    const preset = compile(
        definition({
            knowledge: { sources: ['missing'] }
        })
    )

    try {
        await new PresetKnowledgeService().resolve(preset, {
            conversationId: 'conversation-1',
            query: 'question',
            session: {} as never
        })
        assert.fail('Expected missing knowledge source to reject.')
    } catch (error) {
        assert.instanceOf(error, PresetKnowledgeError)
        assert.equal(
            (error as PresetKnowledgeError).stage,
            'source_lookup'
        )
        assert.equal((error as PresetKnowledgeError).source, 'missing')
    }
})

it('uses the preset long-memory new-question prompt as the rewrite request', async () => {
    let request: unknown
    const model = computed(
        () =>
            ({
                invoke: async (input: unknown) => {
                    request = input
                    return new AIMessage('rewritten query')
                }
            }) as never
    )

    const result = await generateNewQuestion(
        model,
        'previous turn',
        'current question',
        'History={history}\nQuestion={question}'
    )

    assert.equal(
        request,
        'History=previous turn\nQuestion=current question'
    )
    assert.equal(result, 'rewritten query')
    assert.equal(
        renderLongMemoryNewQuestionPrompt(
            '{question} // {history}',
            'history',
            'question'
        ),
        'question // history'
    )

    const preset = compile(
        definition({
            promptConfig: {
                longMemoryNewQuestionPrompt:
                    'History={history}\nQuestion={question}'
            }
        })
    )
    const variables = {
        built: { requestId: 'rewrite-trace-request' }
    }
    attachLongMemoryQueryTrace(variables, {
        query: 'rewritten query',
        promptPath: 'promptConfig.longMemoryNewQuestionPrompt'
    })
    const messages = await createPrompt(preset).formatMessages({
        input: new HumanMessage('current question'),
        chat_history: [],
        variables
    })
    const trace = takeContextTrace(contextTraceIdFromMessages(messages))
    const queryEntry = trace?.entries.find(
        (entry) => entry.source.name === 'long memory retrieval query'
    )
    assert.equal(
        queryEntry?.source.path,
        'promptConfig.longMemoryNewQuestionPrompt'
    )
    assert.equal(queryEntry?.content, 'rewritten query')
    assert.equal(queryEntry?.status, 'candidate')
})
