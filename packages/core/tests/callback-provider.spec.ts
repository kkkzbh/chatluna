/// <reference types="mocha" />

import { CallbackManager } from '@langchain/core/callbacks/manager'
import { assert } from 'chai'
import { ChatLunaService } from '../src/services/chat'

it('propagates callback providers into agent child runs', async () => {
    const events: string[] = []
    const service = Object.create(ChatLunaService.prototype) as ChatLunaService
    Object.defineProperty(service, '_callbackProviders', {
        value: new Set()
    })
    service.registerCallbacksProvider(() =>
        CallbackManager.fromHandlers({
            handleCustomEvent: async (name) => {
                events.push(name)
            }
        })
    )

    const callbacks = await service.resolveCallbacks({
        session: {} as never,
        conversation: { id: 'conversation-1' } as never,
        message: { content: 'hello' },
        event: {},
        stream: false,
        variables: {},
        requestId: 'request-1'
    })
    assert.isDefined(callbacks)

    const run = await callbacks!.handleChainStart(
        { name: 'agent' },
        { input: 'hello' }
    )
    await run.handleCustomEvent('chatluna-agent-event', {
        event: { type: 'tool-call' }
    })

    assert.deepEqual(events, ['chatluna-agent-event'])
})
