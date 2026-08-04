/// <reference types="mocha" />

import { assert } from 'chai'
import { ChatChain } from '../src/chains/chain'
import { ChatLunaError, ChatLunaErrorCode } from '../src/utils/error'
import {
    createConfig,
    createMemoryService,
    createSession
} from './helpers'

it('suppresses ChatLuna error notices owned by the QQBot reply transport', async () => {
    const { app, ctx } = await createMemoryService()

    try {
        const sent: unknown[] = []
        const session = createSession() as any
        session.content = 'hello'
        session.state = {
            qqReplyTransport: { suppressErrorNotice: true }
        }
        session.text = (key: string) => key
        session.sendQueued = async (message: unknown) => {
            sent.push(message)
        }

        const chain = new ChatChain(
            ctx,
            createConfig({
                isForwardMsg: false,
                isReplyWithAt: false,
                forwardMsgMinLength: 99999
            })
        )
        chain.middleware('qqbot_error_policy_test' as never, async () => {
            throw new ChatLunaError(
                ChatLunaErrorCode.API_REQUEST_FAILED,
                new Error('provider failure')
            )
        })

        assert.equal(await chain.receiveMessage(session), false)
        assert.deepEqual(sent, [])
    } finally {
        await app.stop()
    }
})
