/// <reference types="mocha" />

import { assert } from 'chai'
import { HumanMessage } from '@langchain/core/messages'
import { apply as applyLongMemoryChatMiddleware } from '../../extension-long-memory/src/plugins/chat_middleware'
import { apply as applyLongMemoryPromptVariable } from '../../extension-long-memory/src/plugins/prompt_varaiable'

it('skips every long-memory side effect when its context block is disabled', async () => {
    const handlers = new Map<string, (...args: unknown[]) => Promise<unknown>>()
    let layerInitializations = 0
    let memoryAdds = 0
    let historyReads = 0
    const ctx = {
        chatluna: {
            createChatModel: async () => ({ value: {} })
        },
        chatluna_long_memory: {
            defaultLayerTypes: ['user'],
            initMemoryLayers: async () => {
                layerInitializations++
                return [
                    {
                        retrieveMemory: async () => []
                    }
                ]
            },
            addMemories: async () => {
                memoryAdds++
            }
        },
        on: (
            event: string,
            handler: (...args: unknown[]) => Promise<unknown>
        ) => {
            handlers.set(event, handler)
        }
    }
    await applyLongMemoryChatMiddleware(
        ctx as never,
        {
            longMemoryExtractModel: 'test/model',
            longMemoryQueryRewrite: true,
            longMemoryExtractInterval: 1
        } as never
    )
    const chatInterface = {
        preset: {
            value: {
                id: 'disabled-memory',
                definition: {
                    blocks: [
                        {
                            id: 'memory',
                            type: 'longMemory',
                            enabled: false
                        }
                    ]
                },
                promptConfig: {}
            }
        },
        chatHistory: {
            getMessages: async () => {
                historyReads++
                return []
            }
        }
    }
    const session = {
        userId: 'user',
        guildId: 'guild',
        channelId: 'channel'
    }

    await handlers.get('chatluna/before-chat')!(
        'conversation',
        new HumanMessage({
            content: 'hello',
            id: 'user',
            additional_kwargs: { preset: 'disabled-memory' }
        }),
        {},
        chatInterface,
        session
    )
    await handlers.get('chatluna/after-chat')!(
        'conversation',
        new HumanMessage('hello'),
        undefined,
        { chatCount: 1 },
        chatInterface,
        session
    )

    assert.equal(layerInitializations, 0)
    assert.equal(memoryAdds, 0)
    assert.equal(historyReads, 0)
})

it('skips the long_memory function provider when its block is disabled', async () => {
    let provider:
        | ((
              args: string[],
              variables: Record<string, unknown>,
              configurable: Record<string, unknown>
          ) => Promise<string> | string)
        | undefined
    let layerInitializations = 0
    const ctx = {
        effect: (callback: () => unknown) => callback(),
        chatluna: {
            promptRenderer: {
                registerFunctionProvider: (
                    _name: string,
                    handler: typeof provider
                ) => {
                    provider = handler
                    return () => undefined
                }
            }
        },
        chatluna_long_memory: {
            initMemoryLayers: async () => {
                layerInitializations++
                return []
            }
        }
    }
    await applyLongMemoryPromptVariable(ctx as never, {
        enabledLayers: ['User']
    } as never)

    const output = await provider!(
        [],
        {},
        {
            contextPreset: {
                definition: {
                    blocks: [
                        {
                            id: 'memory',
                            type: 'longMemory',
                            enabled: false
                        }
                    ]
                }
            }
        }
    )
    const outputWithoutBlock = await provider!(
        [],
        {},
        {
            contextPreset: {
                definition: {
                    blocks: []
                }
            }
        }
    )

    assert.equal(output, '')
    assert.equal(outputWithoutBlock, '')
    assert.equal(layerInitializations, 0)
})
