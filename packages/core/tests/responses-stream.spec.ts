/// <reference types="mocha" />

import { assert } from 'chai'
import {
    processResponseApiStream,
    PROVIDER_RESPONSE_DIAGNOSTIC_KEY,
    responseApiCompletionStream
} from '../../shared-adapter/src/requester'
import type { SSEEvent } from '../src/utils/sse'

async function* sseEvents(
    chunks: string[]
): AsyncGenerator<SSEEvent, string, unknown> {
    for (const chunk of chunks) {
        yield { data: chunk }
    }
    return ''
}

it('emits final Responses API output text from completed events', async () => {
    const completed = {
        type: 'response.completed',
        response: {
            id: 'resp_test',
            object: 'response',
            status: 'completed',
            output: [
                {
                    type: 'message',
                    role: 'assistant',
                    content: [
                        {
                            type: 'output_text',
                            text: '{"decision":"reply","outbound_messages":[{"type":"message","content":"你好"}]}'
                        }
                    ]
                }
            ],
            usage: {
                input_tokens: 10,
                output_tokens: 4,
                total_tokens: 14
            },
            conversation: { id: 'conv_test' }
        }
    }

    const chunks = []
    for await (const chunk of processResponseApiStream(
        {} as never,
        sseEvents([JSON.stringify(completed), '[DONE]'])
    )) {
        chunks.push(chunk)
    }

    assert.include(
        chunks.map((chunk) => chunk.text).join(''),
        '"decision":"reply"'
    )
    assert.isTrue(
        chunks.some(
            (chunk) =>
                chunk.message.content ===
                '{"decision":"reply","outbound_messages":[{"type":"message","content":"你好"}]}'
        )
    )
    assert.isTrue(
        chunks.some(
            (chunk) =>
                chunk.message.additional_kwargs?.conversation?.id === 'conv_test'
        )
    )
    assert.isTrue(
        chunks.some(
            (chunk) =>
                chunk.message.additional_kwargs?.[
                    PROVIDER_RESPONSE_DIAGNOSTIC_KEY
                ]?.requestMode === 'responses'
        )
    )
})

it('streams JSON Responses API bodies returned by managed bridges', async () => {
    const responseBody = {
        id: 'resp_bridge',
        object: 'response',
        status: 'completed',
        output: [
            {
                type: 'message',
                role: 'assistant',
                content: [
                    {
                        type: 'output_text',
                        text: '{"decision":"reply","outbound_messages":[{"type":"message","content":"桥接成功"}]}'
                    }
                ]
            }
        ],
        usage: {
            input_tokens: 12,
            output_tokens: 5,
            total_tokens: 17
        },
        conversation: { id: 'conv_bridge' }
    }
    const posts: unknown[] = []
    const requestContext = {
        plugin: {},
        modelRequester: {
            post: async (_url: string, body: unknown) => {
                posts.push(body)
                return new Response(JSON.stringify(responseBody), {
                    status: 200,
                    headers: {
                        'content-type': 'application/json; charset=utf-8'
                    }
                })
            }
        }
    } as never

    const chunks = []
    for await (const chunk of responseApiCompletionStream(requestContext, {
        model: 'gpt-test',
        input: []
    })) {
        chunks.push(chunk)
    }

    assert.lengthOf(posts, 1)
    assert.include(JSON.stringify(posts[0]), '"stream":true')
    assert.include(
        chunks.map((chunk) => chunk.text).join(''),
        '"decision":"reply"'
    )
    assert.isTrue(
        chunks.some(
            (chunk) =>
                chunk.message.additional_kwargs?.conversation?.id ===
                'conv_bridge'
        )
    )
})
