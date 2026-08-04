/// <reference types="mocha" />

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { assert } from 'chai'
import { gzipDecode } from '../src/utils/string'
import { KoishiChatMessageHistory } from '../src/llm-core/memory/message'
import { ConversationNotFoundError } from '../src/types'
import { createConversation, expectRejected, FakeDatabase } from './helpers'

it('KoishiChatMessageHistory does not persist transient qqbot request metadata', async () => {
    const database = new FakeDatabase()
    const conversation = createConversation({
        id: 'history-transient-metadata',
        latestMessageId: null
    })
    database.tables.chatluna_conversation.push(conversation as never)
    const history = new KoishiChatMessageHistory(
        { database } as never,
        conversation.id,
        100,
        {
            config: {
                defaultPreset: 'default',
                defaultChatMode: 'plugin'
            }
        } as never
    )

    await history.addMessage(
        new HumanMessage({
            content: '[speaker_id=u1 speaker_name="Alice"] hello',
            name: 'Alice',
            response_metadata: {
                chatluna_context_trace: 'stale-trace-id',
                chatluna: {
                    createdAt: '2026-07-26T00:00:00.000Z'
                }
            },
            additional_kwargs: {
                preset: 'default',
                raw_content: 'raw',
                type: 'text',
                qqbot_final_response_contract: { name: 'contract' },
                qqbot_final_response_schema: { type: 'object' },
                qqbot_final_response_instruction: 'finish as json',
                qqbot_input_content_meta: { hasImageInput: false, imageCount: 0 },
                qqbot_override_request_params: { temperature: 0 },
                qqbot_reply_mode: 'agent',
                qqbot_request_budget_policy: { imageDetail: 'low' },
                overrideRequestParams: { response_format: { type: 'json_schema' } },
                qqbot_speaker_format: {
                    version: 'speaker_id_v1',
                    speakerId: 'u1',
                    speakerName: 'Alice',
                    isDirect: false,
                    preformatted: true
                },
                qqbot_attachment_refs: [{ refId: 'att_1', kind: 'image' }]
            }
        })
    )

    const [row] = database.tables.chatluna_message
    assert.exists(row)
    assert.exists(row.additional_kwargs_binary)
    const persisted = JSON.parse(
        await gzipDecode(row.additional_kwargs_binary as ArrayBuffer)
    )

    assert.deepEqual(persisted, {
        qqbot_speaker_format: {
            version: 'speaker_id_v1',
            speakerId: 'u1',
            speakerName: 'Alice',
            isDirect: false,
            preformatted: true
        },
        qqbot_attachment_refs: [{ refId: 'att_1', kind: 'image' }]
    })

    assert.exists(row.response_metadata_binary)
    const responseMetadata = JSON.parse(
        await gzipDecode(row.response_metadata_binary as ArrayBuffer)
    )
    assert.notProperty(responseMetadata, 'chatluna_context_trace')
    assert.property(responseMetadata, 'chatluna')
})

it('KoishiChatMessageHistory rejects a missing conversation without creating one', async () => {
    const database = new FakeDatabase()
    const history = new KoishiChatMessageHistory(
        { database } as never,
        'missing-conversation',
        100,
        {} as never
    )

    try {
        await history.loadConversation()
        assert.fail('Expected a missing conversation to reject.')
    } catch (error) {
        assert.instanceOf(error, ConversationNotFoundError)
    }
    assert.deepEqual(database.tables.chatluna_conversation, [])
})

it('request-scoped normalization preserves the previous turn when the new request was never saved', async () => {
    const database = new FakeDatabase()
    const conversation = createConversation({
        id: 'history-pre-abort',
        latestMessageId: null
    })
    database.tables.chatluna_conversation.push(conversation as never)
    const history = new KoishiChatMessageHistory(
        { database } as never,
        conversation.id,
        100,
        {} as never
    )
    await history.addMessages([
        new HumanMessage({
            content: '上一轮问题',
            response_metadata: {
                chatluna: { requestId: 'request-previous' }
            }
        }),
        new AIMessage('上一轮正常回答')
    ])

    const result = await history.normalizeResearchReplyHistory(
        'request-cancelled-before-save',
        '',
        'drop_request'
    )

    assert.isFalse(result.requestBoundaryFound)
    assert.deepEqual(result.deletedMessageIds, [])
    assert.deepEqual(
        (await history.getMessages()).map((message) => [
            message.getType(),
            message.content
        ]),
        [
            ['human', '上一轮问题'],
            ['ai', '上一轮正常回答']
        ]
    )
})

it('request-scoped normalization removes only the matching tool tail', async () => {
    const database = new FakeDatabase()
    const conversation = createConversation({
        id: 'history-current-tool-tail',
        latestMessageId: null
    })
    database.tables.chatluna_conversation.push(conversation as never)
    const history = new KoishiChatMessageHistory(
        { database } as never,
        conversation.id,
        100,
        {} as never
    )
    await history.addMessages([
        new HumanMessage({
            content: '上一轮问题',
            response_metadata: {
                chatluna: { requestId: 'request-previous' }
            }
        }),
        new AIMessage('上一轮正常回答'),
        new HumanMessage({
            content: '当前问题',
            response_metadata: {
                chatluna: { requestId: 'request-current' }
            }
        }),
        new AIMessage({
            content: '',
            tool_calls: [
                { id: 'tool-call-1', name: 'web_run', args: {} }
            ]
        }),
        new ToolMessage({
            content: '内部搜索结果',
            tool_call_id: 'tool-call-1',
            name: 'web_run'
        })
    ])

    const result = await history.normalizeResearchReplyHistory(
        'request-current',
        '当前可见回答',
        'retain_request'
    )

    assert.isTrue(result.requestBoundaryFound)
    assert.lengthOf(result.deletedMessageIds, 2)
    assert.deepEqual(
        (await history.getMessages()).map((message) => [
            message.getType(),
            message.content
        ]),
        [
            ['human', '上一轮问题'],
            ['ai', '上一轮正常回答'],
            ['human', '当前问题'],
            ['ai', '当前可见回答']
        ]
    )
})

it('request-scoped normalization is idempotent after history commits before an external checkpoint clears', async () => {
    const database = new FakeDatabase()
    const conversation = createConversation({
        id: 'history-delivery-checkpoint-retry',
        latestMessageId: null
    })
    database.tables.chatluna_conversation.push(conversation as never)
    const createHistory = () =>
        new KoishiChatMessageHistory(
            { database } as never,
            conversation.id,
            100,
            {} as never
        )
    const firstProcess = createHistory()
    await firstProcess.addMessages([
        new HumanMessage({
            content: '当前问题',
            response_metadata: {
                chatluna: { requestId: 'request-delivery' }
            }
        }),
        new AIMessage({
            content: '',
            tool_calls: [{ id: 'tool-call-1', name: 'web_run', args: {} }]
        }),
        new ToolMessage({
            content: '内部搜索结果',
            tool_call_id: 'tool-call-1',
            name: 'web_run'
        })
    ])

    const first = await firstProcess.normalizeResearchReplyHistory(
        'request-delivery',
        '已确认送达的回答',
        'retain_request'
    )
    assert.isTrue(first.requestBoundaryFound)

    // Simulate a process stop after the history transaction commits while the
    // QQ delivery checkpoint still exists, then retry from a fresh history instance.
    const restartedProcess = createHistory()
    const second = await restartedProcess.normalizeResearchReplyHistory(
        'request-delivery',
        '已确认送达的回答',
        'retain_request'
    )
    assert.isTrue(second.requestBoundaryFound)
    assert.deepEqual(
        (await restartedProcess.getMessages()).map((message) => [
            message.getType(),
            message.content
        ]),
        [
            ['human', '当前问题'],
            ['ai', '已确认送达的回答']
        ]
    )
    assert.lengthOf(
        database.tables.chatluna_message.filter(
            (message) => message.role === 'ai'
        ),
        1
    )
})

it('request-scoped cancellation removes the matching human boundary for successor aggregation', async () => {
    const database = new FakeDatabase()
    const conversation = createConversation({
        id: 'history-drop-current-request',
        latestMessageId: null
    })
    database.tables.chatluna_conversation.push(conversation as never)
    const history = new KoishiChatMessageHistory(
        { database } as never,
        conversation.id,
        100,
        {} as never
    )
    await history.addMessages([
        new HumanMessage({
            content: '上一轮问题',
            response_metadata: {
                chatluna: { requestId: 'request-previous' }
            }
        }),
        new AIMessage('上一轮回答'),
        new HumanMessage({
            content: 'A1',
            response_metadata: {
                chatluna: { requestId: 'request-interrupted' }
            }
        })
    ])

    const result = await history.normalizeResearchReplyHistory(
        'request-interrupted',
        '',
        'drop_request'
    )

    assert.isTrue(result.requestBoundaryFound)
    assert.lengthOf(result.deletedMessageIds, 1)
    assert.deepEqual(
        (await history.getMessages()).map((message) => [
            message.getType(),
            message.content
        ]),
        [
            ['human', '上一轮问题'],
            ['ai', '上一轮回答']
        ]
    )
})

for (const failureStage of [
    'normalized-message-upsert',
    'conversation-pointer-upsert',
    'old-tail-remove'
] as const) {
    it(`request-scoped normalization rolls back atomically when ${failureStage} fails`, async () => {
        const database = new FakeDatabase()
        const conversation = createConversation({
            id: `history-atomic-${failureStage}`,
            latestMessageId: null
        })
        database.tables.chatluna_conversation.push(conversation as never)
        const history = new KoishiChatMessageHistory(
            { database } as never,
            conversation.id,
            100,
            {} as never
        )
        await history.addMessages([
            new HumanMessage({
                content: '当前问题',
                response_metadata: {
                    chatluna: { requestId: 'request-current' }
                }
            }),
            new AIMessage({
                content: '',
                tool_calls: [
                    { id: 'tool-call-1', name: 'web_run', args: {} }
                ]
            }),
            new ToolMessage({
                content: '内部搜索结果',
                tool_call_id: 'tool-call-1',
                name: 'web_run'
            })
        ])

        const originalUpsert = database.upsert.bind(database)
        const originalRemove = database.remove.bind(database)
        database.upsert = async (table, rows) => {
            if (
                failureStage === 'normalized-message-upsert' &&
                table === 'chatluna_message'
            ) {
                throw new Error(`injected ${failureStage}`)
            }
            if (
                failureStage === 'conversation-pointer-upsert' &&
                table === 'chatluna_conversation'
            ) {
                throw new Error(`injected ${failureStage}`)
            }
            await originalUpsert(table, rows)
        }
        database.remove = async (table, query) => {
            if (
                failureStage === 'old-tail-remove' &&
                table === 'chatluna_message'
            ) {
                throw new Error(`injected ${failureStage}`)
            }
            await originalRemove(table, query)
        }

        await expectRejected(
            history.normalizeResearchReplyHistory(
                'request-current',
                '当前可见回答',
                'retain_request'
            ),
            new RegExp(`injected ${failureStage}`)
        )

        const [persistedConversation] =
            database.tables.chatluna_conversation
        assert.exists(
            database.tables.chatluna_message.find(
                (message) => message.id === persistedConversation.latestMessageId
            )
        )
        const reloaded = new KoishiChatMessageHistory(
            { database } as never,
            conversation.id,
            100,
            {} as never
        )
        await reloaded.loadConversation()
        assert.deepEqual(
            (await reloaded.getMessages()).map((message) => message.getType()),
            ['human', 'ai', 'tool']
        )
    })
}
