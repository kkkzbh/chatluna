/// <reference types="mocha" />

import { assert } from 'chai'
import { HumanMessage, ToolMessage } from '@langchain/core/messages'
import type { ChatLunaPlugin } from '../src/services/chat'
import type {
    ModelRequester,
    ModelRequestParams
} from '../src/llm-core/platform/api'
import { ChatLunaChatModel } from '../src/llm-core/platform/model'
import {
    ModelCapabilities,
    type ModelInfo,
    ModelType
} from '../src/llm-core/platform/types'
import type { ModelUsageReporter } from '../src/llm-core/platform/usage'
import { OpenAIClient } from '../../adapter-openai-like/src/client'
import type { Config } from '../../adapter-openai-like/src'
import {
    buildChatCompletionParams,
    buildResponseParams
} from '../../shared-adapter/src/requester'

const REQUEST_DEFAULTS = {
    temperature: 0,
    topP: 0.9,
    maxTokens: 2048,
    reasoningEffort: 'high',
    thinkingMode: 'disabled'
} as const

it('wires managed chat-completions defaults into provider fields', async () => {
    const params = managedRequestParams('chatCompletions')
    const body = await buildChatCompletionParams(
        params,
        {} as ChatLunaPlugin,
        false
    )

    assert.equal(body.temperature, REQUEST_DEFAULTS.temperature)
    assert.equal(body.top_p, REQUEST_DEFAULTS.topP)
    assert.equal(body.max_tokens, REQUEST_DEFAULTS.maxTokens)
    assert.equal(body.reasoning_effort, REQUEST_DEFAULTS.reasoningEffort)
    assert.deepEqual(body.thinking, {
        type: REQUEST_DEFAULTS.thinkingMode
    })
    assert.notProperty(body, 'reasoning')
})

it('wires managed Responses defaults into provider fields', async () => {
    const params = managedRequestParams('responses')
    const body = await buildResponseParams(
        params,
        {} as ChatLunaPlugin,
        {},
        false
    )

    assert.equal(body.temperature, REQUEST_DEFAULTS.temperature)
    assert.equal(body.top_p, REQUEST_DEFAULTS.topP)
    assert.equal(body.max_output_tokens, REQUEST_DEFAULTS.maxTokens)
    assert.deepEqual(body.reasoning, {
        effort: REQUEST_DEFAULTS.reasoningEffort
    })
    assert.deepEqual(body.thinking, {
        type: REQUEST_DEFAULTS.thinkingMode
    })
    assert.notProperty(body, 'reasoning_effort')
})

it('preserves a required terminal tool after a forced workflow completes', async () => {
    const workflow = {
        qqbot_required_tool_sequence: ['workflow_finish'],
        qqbot_required_tool_terminal: 'workflow_finish',
        tool_choice: 'required',
        parallel_tool_calls: false
    }
    const input = [
        new HumanMessage({
            content: 'finish the workflow',
            additional_kwargs: { overrideRequestParams: workflow }
        }),
        new ToolMessage({
            content: JSON.stringify({ valid: true }),
            name: 'workflow_finish',
            tool_call_id: 'workflow-call'
        })
    ]
    const params = {
        ...managedRequestParams('responses'),
        input,
        overrideRequestParams: workflow
    }

    const responseBody = await buildResponseParams(
        params,
        {} as ChatLunaPlugin,
        {},
        false
    )
    const chatBody = await buildChatCompletionParams(
        params,
        {} as ChatLunaPlugin,
        false
    )

    assert.equal(responseBody.tool_choice, 'required')
    assert.equal(responseBody.parallel_tool_calls, false)
    assert.equal(chatBody.tool_choice, 'required')
    assert.equal(chatBody.parallel_tool_calls, false)
})

function managedRequestParams(
    requestMode: 'chatCompletions' | 'responses'
): ModelRequestParams {
    const model = createManagedModel(requestMode)
    const invocation = model.invocationParams({
        overrideRequestParams: {
            response_format: { type: 'json_object' }
        }
    })

    assert.deepInclude(invocation.overrideRequestParams, {
        qqbot_canonical_model: 'qqbot-primary/chat',
        qqbot_transport_model: 'provider-model',
        qqbot_request_mode: requestMode,
        response_format: { type: 'json_object' }
    })
    return {
        ...invocation,
        input: []
    }
}

function createManagedModel(
    requestMode: 'chatCompletions' | 'responses'
): ChatLunaChatModel {
    type ClientHarness = {
        platform: string
        _config: Config
        _requester: ModelRequester
        _modelInfos: Record<string, ModelInfo>
        _createModel: (
            model: string,
            report: ModelUsageReporter
        ) => ChatLunaChatModel
    }

    const client = Object.create(
        OpenAIClient.prototype
    ) as unknown as ClientHarness
    client.platform = 'qqbot-primary'
    client._config = {
        additionalModels: [
            {
                model: 'chat',
                transportModel: 'provider-model',
                modelType: 'LLM 大语言模型',
                modelCapabilities: [
                    ModelCapabilities.TextInput,
                    ModelCapabilities.ToolCall
                ],
                contextSize: 128_000,
                requestMode,
                timeoutMs: 30_000,
                requestDefaults: REQUEST_DEFAULTS
            }
        ],
        maxContextRatio: 1,
        frequencyPenalty: 0,
        presencePenalty: 0,
        temperature: 1,
        timeout: 30_000,
        maxRetries: 0
    } as Config
    client._requester = {} as ModelRequester
    client._modelInfos = {
        chat: {
            name: 'chat',
            type: ModelType.llm,
            maxTokens: 128_000,
            capabilities: [
                ModelCapabilities.TextInput,
                ModelCapabilities.ToolCall
            ]
        }
    }

    return client._createModel(
        'chat',
        undefined as unknown as ModelUsageReporter
    )
}
