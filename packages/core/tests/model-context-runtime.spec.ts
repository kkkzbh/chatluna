/// <reference types="mocha" />

import { assert } from 'chai'
import {
    AIMessage,
    AIMessageChunk,
    HumanMessage
} from '@langchain/core/messages'
import { ChatGenerationChunk } from '@langchain/core/outputs'
import type { ModelRequester } from '../src/llm-core/platform/api'
import {
    ChatLunaChatModel,
    type ChatLunaModelInput
} from '../src/llm-core/platform/model'
import { ModelCapabilities, ModelType } from '../src/llm-core/platform/types'
import type {
    ModelContextInput,
    ModelUsageInput,
    ModelUsageReporter
} from '../src/llm-core/platform/usage'
import { setRootLogger } from '../src/utils/logger'
import { Logger } from 'koishi'

it('reports explicit invoke and stream modes through real model entry points', async () => {
    setRootLogger(new Logger('model-context-runtime-test'))
    const requesterCalls: string[] = []
    const contexts: ModelContextInput[] = []
    const usages: ModelUsageInput[] = []
    const reporter = Object.assign(
        async (usage: ModelUsageInput) => {
            usages.push(usage)
        },
        {
            context: async (context: ModelContextInput) => {
                contexts.push(context)
            }
        }
    ) satisfies ModelUsageReporter
    const requester = {
        completion: async () => {
            requesterCalls.push('completion')
            return {
                text: 'invoke reply',
                message: new AIMessage({
                    content: 'invoke reply',
                    usage_metadata: {
                        input_tokens: 8,
                        output_tokens: 2,
                        total_tokens: 10
                    }
                })
            }
        },
        completionStream: async function* () {
            requesterCalls.push('completionStream')
            yield new ChatGenerationChunk({
                text: 'stream reply',
                message: new AIMessageChunk({
                    content: 'stream reply',
                    usage_metadata: {
                        input_tokens: 9,
                        output_tokens: 2,
                        total_tokens: 11
                    }
                })
            })
        },
        dispose: async () => undefined
    } as unknown as ModelRequester
    const model = new ChatLunaChatModel({
        model: 'test-model',
        modelInfo: {
            name: 'test-model',
            type: ModelType.llm,
            maxTokens: 1024,
            capabilities: [ModelCapabilities.TextInput]
        },
        modelMaxContextSize: 1024,
        maxTokenLimit: 512,
        maxRetries: 0,
        timeout: 2_000,
        requester,
        usageReporter: reporter,
        overrideRequestParams: {
            qqbot_request_mode: 'responses'
        }
    } satisfies ChatLunaModelInput)

    await model.invoke([new HumanMessage('invoke input')], {
        variables_hide: {
            built: {
                requestId: 'invoke-request',
                conversationId: 'conversation-1'
            }
        }
    })

    await model.invoke([new HumanMessage('chain stream input')], {
        stream: true,
        variables_hide: {
            built: {
                requestId: 'chain-stream-request',
                conversationId: 'conversation-1'
            }
        }
    })

    const stream = await model.stream([new HumanMessage('stream input')], {
        variables_hide: {
            built: {
                requestId: 'stream-request',
                conversationId: 'conversation-1'
            }
        }
    })
    for await (const _chunk of stream) {
        // Consume the public stream so preparation and usage reporting finish.
    }

    assert.deepEqual(requesterCalls, [
        'completion',
        'completionStream',
        'completionStream'
    ])
    assert.deepEqual(
        contexts.map((context) => ({
            requestId: context.requestId,
            requestMode: context.requestMode,
            stream: context.stream
        })),
        [
            {
                requestId: 'invoke-request',
                requestMode: 'responses',
                stream: false
            },
            {
                requestId: 'chain-stream-request',
                requestMode: 'responses',
                stream: true
            },
            {
                requestId: 'stream-request',
                requestMode: 'responses',
                stream: true
            }
        ]
    )
    assert.lengthOf(usages, 3)
    assert.deepEqual(
        usages.map((usage) => usage.context?.requestId),
        ['invoke-request', 'chain-stream-request', 'stream-request']
    )
})
