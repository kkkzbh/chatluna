/// <reference types="mocha" />

import { HumanMessage } from '@langchain/core/messages'
import { computed } from '@vue/reactivity'
import { assert } from 'chai'
import { ChatLunaPluginChain } from '../src/llm-core/chain/agent_chat_chain'
import { applyToolMask, type ToolMask } from '../src/llm-core/agent/types'

for (const mode of ['all', 'allow', 'deny'] as const) {
    it(`normalizes an explicit ${mode} mask at the main chat Agent boundary`, async () => {
        let selectedMask: ToolMask | undefined
        let invokedMask: ToolMask | undefined
        const chain = Object.create(
            ChatLunaPluginChain.prototype
        ) as ChatLunaPluginChain & Record<string, unknown>

        chain.historyMemory = {
            chatHistory: {
                getMessages: async () => [],
                removeAllToolAndFunctionMessages: async () => []
            }
        } as never
        chain.agentMode = 'tool-calling'
        chain.preset = computed(
            () =>
                ({
                    id: 'preset',
                    displayName: 'Preset'
                }) as never
        )
        chain.tools = computed(
            () =>
                [
                    {
                        name: 'ordinary',
                        selector: () => true,
                        createTool: () => null
                    },
                    {
                        name: 'submit_reply',
                        selector: () => true,
                        createTool: () => null,
                        meta: { internalContract: true }
                    }
                ] as never
        )
        chain.llm = {} as never
        chain['_toolsRef'] = {
            update: (_session: unknown, _messages: unknown, mask: ToolMask) => {
                selectedMask = mask
            }
        } as never
        chain.runner = {
            value: {
                withConfig: () => ({
                    invoke: async (
                        _input: unknown,
                        config: { configurable?: { toolMask?: ToolMask } }
                    ) => {
                        invokedMask = config.configurable?.toolMask
                        return { message: new HumanMessage('done') }
                    }
                })
            }
        } as never

        const requestedMask: ToolMask = {
            mode,
            tools: ['ordinary', 'submit_reply'],
            allow: mode === 'allow' ? ['ordinary'] : [],
            deny: mode === 'deny' ? ['submit_reply'] : [],
            toolCallMask: {
                mode: mode === 'all' ? 'deny' : mode,
                tools: ['ordinary', 'submit_reply'],
                allow: mode === 'allow' ? ['ordinary'] : [],
                deny: mode === 'deny' || mode === 'all' ? ['submit_reply'] : []
            }
        }

        await chain.call({
            message: new HumanMessage('hello'),
            session: {
                userId: 'user',
                guildId: 'group',
                channelId: 'group',
                platform: 'onebot'
            } as never,
            conversationId: 'conversation',
            variables: {},
            toolMask: requestedMask,
            events: {}
        } as never)

        for (const mask of [selectedMask, invokedMask]) {
            assert.isDefined(mask)
            assert.isTrue(applyToolMask('submit_reply', mask))
            assert.isTrue(applyToolMask('submit_reply', mask?.toolCallMask))
        }
    })
}
