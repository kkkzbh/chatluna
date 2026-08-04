/// <reference types="mocha" />

import { assert } from 'chai'
import {
    processResponse,
    PROVIDER_RESPONSE_DIAGNOSTIC_KEY,
    responseToChatGeneration,
    type ProviderResponseDiagnostic
} from '../../shared-adapter/src/requester'

it('attaches Chat Completions tool diagnostics to the assistant message', async () => {
    const warnings: string[] = []
    const result = await processResponse(
        {
            modelRequester: {
                logger: {
                    warn: (message: string) => warnings.push(message)
                }
            }
        } as never,
        new Response(
            JSON.stringify({
                choices: [
                    {
                        finish_reason: 'tool_calls',
                        message: {
                            role: 'assistant',
                            content: null,
                            tool_calls: [
                                {
                                    id: 'call-1',
                                    type: 'function',
                                    function: {
                                        name: 'lookup',
                                        arguments: '{"id":1}'
                                    }
                                }
                            ]
                        }
                    }
                ],
                usage: {
                    prompt_tokens: 10,
                    completion_tokens: 4,
                    total_tokens: 14
                }
            }),
            { status: 200 }
        )
    )
    const diagnostic = result.message.additional_kwargs?.[
        PROVIDER_RESPONSE_DIAGNOSTIC_KEY
    ] as ProviderResponseDiagnostic

    assert.equal(diagnostic.requestMode, 'chat_completions')
    assert.equal(diagnostic.providerToolCallCount, 1)
    assert.equal(diagnostic.messageToolCallCount, 1)
    assert.equal(diagnostic.toolCallChunkCount, 1)
    assert.equal(diagnostic.unparseableToolCallCount, 0)
    assert.equal(diagnostic.providerOutputTokens, 4)
    assert.deepEqual(warnings, [])
})

it('attaches Responses API tool diagnostics to the assistant message', async () => {
    const result = await responseToChatGeneration({
        id: 'resp-1',
        object: 'response',
        status: 'completed',
        output: [
            {
                type: 'function_call',
                id: 'item-1',
                call_id: 'call-1',
                name: 'lookup',
                arguments: '{"id":1}'
            }
        ],
        usage: {
            input_tokens: 10,
            output_tokens: 4,
            total_tokens: 14
        }
    } as never)
    const diagnostic = result.message.additional_kwargs?.[
        PROVIDER_RESPONSE_DIAGNOSTIC_KEY
    ] as ProviderResponseDiagnostic

    assert.equal(diagnostic.requestMode, 'responses')
    assert.equal(diagnostic.providerToolCallCount, 1)
    assert.equal(diagnostic.messageToolCallCount, 1)
    assert.equal(diagnostic.toolCallChunkCount, 1)
    assert.equal(diagnostic.providerOutputTokens, 4)
})
