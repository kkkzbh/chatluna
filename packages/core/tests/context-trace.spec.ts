/// <reference types="mocha" />

import { assert } from 'chai'
import { Document } from '@langchain/core/documents'
import { AIMessage, HumanMessage } from '@langchain/core/messages'
import { HumanMessagePromptTemplate } from '@langchain/core/prompts'
import type { Context } from 'koishi'
import {
    CONTEXT_BLUEPRINT,
    applyModelCropTrace,
    contextTraceIdFromMessages,
    createContextTrace,
    createModelCallIdentity,
    redactContextContent,
    redactDataUrls,
    redactContextSchema,
    redactContextToolCalls,
    redactContextValue,
    registerContextTrace,
    stripContextMetadata,
    summarizeDataUrl,
    takeContextTrace,
    traceMessage
} from '../src/llm-core/prompt/context_trace'
import { ChatLunaContextManagerService } from '../src/llm-core/prompt/context_manager'
import { createChatHistoryMiddleware } from '../src/llm-core/prompt/chat_history'
import { createLongHistoryMiddleware } from '../src/llm-core/prompt/long_history'
import { splitModelRequestOverrides } from '../../shared-adapter/src/internal_control'
import { mergeBuiltVariables } from '../src/llm-core/chain/variables'

it('keeps concurrent traces for the same outer request isolated', () => {
    const trace = createContextTrace({
        requestId: 'request-1',
        conversationId: 'conversation-1',
        presetId: 'sakiko',
        presetRevision: 'revision-1'
    })
    const concurrentTrace = createContextTrace({
        requestId: 'request-1',
        conversationId: 'conversation-1',
        presetId: 'sakiko',
        presetRevision: 'revision-2'
    })
    const msg = new HumanMessage({
        content: 'hello',
        additional_kwargs: {
            qqbot_context: {
                source: 'qqbot_memory',
                authority: 'reference',
                trust: 'trusted',
                ttl: 'turn'
            },
            purpose: 'personality'
        }
    })

    const entry = traceMessage(trace, msg, {
        stage: 'after_scratchpad',
        source: { kind: 'injection', name: 'prompt envelope' },
        tokenEstimate: 2,
        status: 'included'
    })
    registerContextTrace(trace)
    registerContextTrace(concurrentTrace)

    assert.equal(entry.messageId, msg.id)
    assert.equal(entry.source.kind, 'runtime')
    assert.equal(entry.source.name, 'qqbot_memory')
    assert.equal(entry.source.authority, 'reference')
    assert.equal(entry.purpose, 'personality')
    assert.equal(takeContextTrace(concurrentTrace.traceId), concurrentTrace)
    assert.equal(takeContextTrace(trace.traceId), trace)
    assert.equal(takeContextTrace(trace.traceId), undefined)
    const firstCall = createModelCallIdentity()
    const secondCall = createModelCallIdentity()
    assert.notEqual(firstCall.callId, secondCall.callId)
    assert.isAbove(secondCall.callOrdinal, firstCall.callOrdinal)
    assert.deepEqual(
        CONTEXT_BLUEPRINT.map((stage) => stage.id),
        [
            'system_prompts',
            'chat_history',
            'long_history',
            'injections',
            'input',
            'scratchpad',
            'after_scratchpad',
            'tools'
        ]
    )
})

it('preserves built prompt fields while carrying preset resolution', () => {
    const variables = {
        built: {
            preset: 'sakiko',
            platform: 'onebot'
        }
    }
    const presetResolution = {
        source: 'conversation' as const,
        presetId: 'sakiko',
        bindingKey: 'shared:onebot:bot:group'
    }
    mergeBuiltVariables(variables, {
        requestId: 'request-1',
        conversationId: 'conversation-1',
        presetResolution
    })
    const trace = createContextTrace({
        requestId: 'request-1',
        conversationId: 'conversation-1',
        presetId: 'sakiko',
        presetRevision: 'revision-1',
        presetResolution
    })

    assert.deepEqual(variables.built, {
        preset: 'sakiko',
        platform: 'onebot',
        requestId: 'request-1',
        conversationId: 'conversation-1',
        presetResolution
    })
    assert.deepEqual(trace.presetResolution, presetResolution)
})

it('removes internal metadata and redacts inline data for model context', () => {
    const msg = new HumanMessage({
        content: 'hello',
        additional_kwargs: {
            qqbot_context: { source: 'qqbot_memory' },
            qqbot_reply_mode: 'agent',
            chatluna_context_trace: { requestId: 'request-1' },
            retained: true
        },
        response_metadata: {
            chatluna_context_trace: { messageId: 'message-1' },
            retained: true
        }
    })
    const clean = stripContextMetadata(msg)

    assert.equal(clean.additional_kwargs.qqbot_context, undefined)
    assert.equal(clean.additional_kwargs.qqbot_reply_mode, undefined)
    assert.equal(clean.additional_kwargs.chatluna_context_trace, undefined)
    assert.equal(clean.additional_kwargs.retained, true)
    assert.equal(clean.response_metadata.chatluna_context_trace, undefined)
    assert.equal(clean.response_metadata.retained, true)
    assert.equal(
        redactContextContent('data:image/png;base64,YWJj'),
        '[data omitted: image/png, 3 bytes, ' +
            'sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb' +
            '410ff61f20015ad]'
    )
    assert.deepEqual(
        redactContextValue({
            safe: 'visible',
            url:
                'https://user:pass@example.com/file?token=secret&view=1' +
                '#fragment-secret',
            nested: {
                apiKey: 'secret',
                authorization: 'Bearer secret',
                cookie: 'session=secret',
                xAmzCredential: 'signed-secret',
                signature: 'signature-secret'
            }
        }),
        {
            safe: 'visible',
            url:
                'https://example.com/file?token=%5Bredacted%5D' +
                '&view=%5Bredacted%5D',
            nested: {}
        }
    )
    const signedUrl = redactContextContent(
        'inspect https://s3.example.com/object?' +
            'X-Amz-Credential=credential-secret&' +
            'X-Amz-Signature=signature-secret#fragment-secret now'
    ) as string
    assert.notInclude(signedUrl, 'credential-secret')
    assert.notInclude(signedUrl, 'signature-secret')
    assert.notInclude(signedUrl, 'fragment-secret')
    const chineseUrl = redactContextContent(
        '请查看（https://s3.example.com/object?sig=chinese-secret）然后总结'
    ) as string
    assert.include(chineseUrl, '）然后总结')
    assert.notInclude(chineseUrl, 'chinese-secret')
    const markdownUrl = redactContextContent(
        '[link](https://s3.example.com/object?sig=markdown-secret#fragment)，然后总结'
    ) as string
    assert.include(markdownUrl, ')，然后总结')
    assert.notInclude(markdownUrl, 'markdown-secret')
    const malformedUrl = redactContextContent(
        'before https://example.com:bad/?sig=malformed-secret after'
    ) as string
    assert.equal(malformedUrl, 'before [invalid URL redacted] after')
    assert.notInclude(malformedUrl, 'malformed-secret')
    assert.deepEqual(
        redactContextToolCalls([
            {
                id: 'call-1',
                name: 'lookup',
                args: { apiKey: 'secret' }
            }
        ]),
        [{ id: 'call-1', name: 'lookup' }]
    )
    assert.deepEqual(
        redactContextSchema({
            type: 'object',
            headers: { authorization: 'Bearer secret' },
            properties: {
                apiKey: {
                    type: 'string',
                    description: 'Credential supplied by the caller',
                    default: 'secret'
                }
            },
            required: ['apiKey'],
            examples: [{ apiKey: 'secret' }]
        }),
        {
            type: 'object',
            properties: {
                apiKey: {
                    type: 'string',
                    description: 'Credential supplied by the caller'
                }
            },
            required: ['apiKey']
        }
    )
})

it('fully redacts parameterized, percent-encoded, and malformed data URLs', () => {
    const parameterized = redactDataUrls(
        'data:image/png;charset=utf-8;base64,YWJj'
    )
    assert.include(parameterized, 'image/png, 3 bytes')
    assert.notInclude(parameterized, 'YWJj')

    const percentEncoded = summarizeDataUrl(
        'data:text/plain;charset=utf-8,hello%20secret'
    )
    assert.deepInclude(percentEncoded, {
        mimeType: 'text/plain',
        size: 12,
        malformed: false
    })
    const embedded = redactContextContent(
        'before data:text/plain,hello%20secret after'
    ) as string
    assert.include(embedded, 'before [data omitted: text/plain, 12 bytes')
    assert.include(embedded, '] after')
    assert.notInclude(embedded, 'hello')
    assert.notInclude(embedded, '%20secret')

    const malformed = redactDataUrls('data:text/plain,hello%2Gsecret')
    assert.include(malformed, 'malformed')
    assert.notInclude(malformed, 'hello')
    assert.notInclude(malformed, 'secret')

    const multimodal = redactContextContent([
        {
            type: 'image_url',
            image_url: {
                url: 'data:image/png;charset=utf-8;base64,YWJj'
            }
        },
        {
            type: 'file_url',
            file_url: 'data:application/pdf,private%20document'
        },
        {
            type: 'audio_url',
            audio_url: {
                url: 'data:audio/ogg;base64,YXVkaW8='
            }
        },
        {
            type: 'video_url',
            video_url: {
                url: 'data:video/mp4;base64,dmlkZW8='
            }
        },
        {
            type: 'image',
            source_type: 'base64',
            data: 'c3RhbmRhcmQtc2VjcmV0',
            mime_type: 'image/png'
        },
        {
            type: 'file',
            file_data:
                'data:application/octet-stream;base64,bmVzdGVkLXNlY3JldA=='
        }
    ])
    const serialized = JSON.stringify(multimodal)
    for (const secret of [
        'YWJj',
        'private',
        'document',
        'YXVkaW8',
        'dmlkZW8',
        'c3RhbmRhcmQtc2VjcmV0',
        'bmVzdGVkLXNlY3JldA'
    ]) {
        assert.notInclude(serialized, secret)
    }
    for (const mime of [
        'image/png',
        'application/pdf',
        'audio/ogg',
        'video/mp4'
    ]) {
        assert.include(serialized, mime)
    }
    const standardBase64 = (multimodal as unknown[])[4] as Record<
        string,
        Record<string, unknown>
    >
    assert.deepInclude(standardBase64.data, {
        kind: 'binary',
        mimeType: 'image/png',
        size: 15
    })
    assert.include(serialized, 'application/octet-stream')
})

it('leases once injections until model preparation commits them', () => {
    const manager = new ChatLunaContextManagerService({
        on: () => undefined
    } as unknown as Context)
    manager.inject({
        conversationId: 'conversation-1',
        name: 'runtime',
        value: 'once',
        once: true
    })

    const first = manager.collectInjections({
        traceId: 'trace-1',
        configurable: { conversationId: 'conversation-1' },
        currentMessages: []
    })
    const concurrent = manager.collectInjections({
        traceId: 'trace-2',
        configurable: { conversationId: 'conversation-1' },
        currentMessages: []
    })

    assert.lengthOf(first.beforeScratchpad, 1)
    assert.lengthOf(concurrent.beforeScratchpad, 0)

    first.onceInjectionLease?.release()
    const retried = manager.collectInjections({
        traceId: 'trace-2',
        configurable: { conversationId: 'conversation-1' },
        currentMessages: []
    })
    assert.lengthOf(retried.beforeScratchpad, 1)
    retried.onceInjectionLease?.commit()

    const consumed = manager.collectInjections({
        traceId: 'trace-3',
        configurable: { conversationId: 'conversation-1' },
        currentMessages: []
    })
    assert.lengthOf(consumed.beforeScratchpad, 0)
})

it('records history, document, and model budget exclusions', async () => {
    const historyTrace = createContextTrace({ requestId: 'history-request' })
    const oldHuman = new HumanMessage('old human')
    const oldAi = new AIMessage('old assistant')
    const recentHuman = new HumanMessage('recent human')
    const recentAi = new AIMessage('recent assistant')
    const historyRuntime = {
        chatHistory: [oldHuman, oldAi, recentHuman, recentAi],
        documentCollections: [],
        input: new HumanMessage('input'),
        result: [],
        usedTokens: 0,
        sendTokenLimit: 85,
        requiredTailTokens: 0,
        blockBudgets: new Map([['history', 4]]),
        blockSegments: new Map(),
        blockUsage: new Map(),
        preset: {
            definition: {
                blocks: [
                    {
                        id: 'history',
                        type: 'chatHistory',
                        enabled: true
                    }
                ]
            }
        },
        tokenCounter: async () => 1,
        trace: historyTrace
    }
    await createChatHistoryMiddleware()(
        historyRuntime as never,
        async () => undefined
    )

    assert.equal(
        historyTrace.entries.find((entry) => entry.messageId === oldHuman.id)
            ?.reason,
        'history_budget'
    )
    assert.equal(
        historyTrace.entries.find((entry) => entry.messageId === recentHuman.id)
            ?.status,
        'included'
    )
    const oversized = new HumanMessage('oversized')
    const oversizedTrace = createContextTrace({
        requestId: 'oversized-history-request'
    })
    const oversizedRuntime = {
        chatHistory: [oversized],
        result: [],
        usedTokens: 0,
        sendTokenLimit: 85,
        requiredTailTokens: 0,
        blockBudgets: new Map([['history', 1]]),
        blockSegments: new Map(),
        blockUsage: new Map(),
        preset: historyRuntime.preset,
        tokenCounter: async () => 10,
        trace: oversizedTrace
    }
    await createChatHistoryMiddleware()(
        oversizedRuntime as never,
        async () => undefined
    )
    assert.lengthOf(oversizedRuntime.result, 0)
    assert.equal(oversizedTrace.entries[0]?.reason, 'history_budget')

    const documentTrace = createContextTrace({ requestId: 'document-request' })
    const documentRuntime = {
        documentCollections: [
            {
                blockId: 'long-memory',
                documents: [
                    new Document({ pageContent: 'first document' }),
                    new Document({ pageContent: 'second document' })
                ],
                source: 'long_memory',
                prompt: HumanMessagePromptTemplate.fromTemplate(
                    '{long_history}'
                ),
                promptVariable: 'long_history',
                promptPath: 'promptConfig.longMemoryPrompt'
            }
        ],
        chatHistory: [],
        result: [],
        usedTokens: 0,
        sendTokenLimit: 85,
        requiredTailTokens: 0,
        blockBudgets: new Map([['long-memory', 5]]),
        blockSegments: new Map(),
        blockUsage: new Map(),
        tokenCounter: async () => 3,
        trace: documentTrace
    }
    await createLongHistoryMiddleware()(
        documentRuntime as never,
        async () => undefined
    )

    const documentEntries = documentTrace.entries.filter(
        (entry) => entry.role === 'document'
    )
    assert.equal(documentEntries[0]?.status, 'dropped')
    assert.equal(documentEntries[0]?.reason, 'document_budget')
    assert.equal(documentEntries[1]?.reason, 'document_budget')
    applyModelCropTrace(documentTrace, [])
    assert.equal(documentEntries[0]?.reason, 'document_budget')

    const first = new HumanMessage('first')
    const final = new HumanMessage('final')
    traceMessage(documentTrace, first, {
        stage: 'chat_history',
        source: { kind: 'history', name: 'history' },
        tokenEstimate: 1,
        status: 'included'
    })
    traceMessage(documentTrace, final, {
        stage: 'input',
        source: { kind: 'input', name: 'input' },
        tokenEstimate: 1,
        status: 'included'
    })
    applyModelCropTrace(documentTrace, [final])

    assert.equal(
        documentTrace.entries.find((entry) => entry.messageId === first.id)
            ?.reason,
        'model_crop'
    )
    assert.equal(
        documentTrace.entries.find((entry) => entry.messageId === final.id)
            ?.finalOrder,
        0
    )
})

it('rejects conflicting trace carriers before model crop', () => {
    const first = new HumanMessage({
        content: 'first',
        response_metadata: { chatluna_context_trace: 'trace-1' }
    })
    const second = new HumanMessage({
        content: 'second',
        response_metadata: { chatluna_context_trace: 'trace-2' }
    })

    assert.equal(contextTraceIdFromMessages([first]), 'trace-1')
    assert.throws(
        () => contextTraceIdFromMessages([first, second]),
        'Conflicting context trace carriers'
    )
})

it('separates OpenAI adapter control from its provider payload', () => {
    const boundary = splitModelRequestOverrides({
        qqbot_request_mode: 'responses',
        qqbot_canonical_model: 'openai/gpt-5.5',
        reasoning: { effort: 'high' }
    })

    assert.deepEqual(boundary.internalControl, {
        canonicalModel: 'openai/gpt-5.5',
        transportModel: undefined,
        requestMode: 'responses',
        toolProfile: undefined
    })
    assert.deepEqual(boundary.providerPayload, {
        reasoning: { effort: 'high' }
    })
})

it('keeps Claude and Gemini provider overrides free of QQBot fields', () => {
    const boundary = splitModelRequestOverrides({
        qqbot_tool_profile: 'main-chat',
        qqbot_required_tool_sequence: ['search', 'finish'],
        qqbot_required_tool_terminal: 'finish',
        temperature: 0.2,
        response_format: { type: 'json_schema' }
    })

    assert.deepEqual(boundary.providerPayload, {
        temperature: 0.2,
        response_format: { type: 'json_schema' }
    })
    assert.equal(boundary.internalControl.toolProfile, 'main-chat')
    assert.notProperty(boundary.providerPayload, 'qqbot_tool_profile')
    assert.notProperty(boundary.providerPayload, 'qqbot_required_tool_sequence')
})
