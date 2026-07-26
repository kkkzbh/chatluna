/// <reference types="mocha" />

import { HumanMessage } from '@langchain/core/messages'
import { assert } from 'chai'
import { gzipDecode } from '../src/utils/string'
import { KoishiChatMessageHistory } from '../src/llm-core/memory/message'
import { ConversationNotFoundError } from '../src/types'
import { createConversation, FakeDatabase } from './helpers'

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
