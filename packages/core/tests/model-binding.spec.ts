/// <reference types="mocha" />

import { assert } from 'chai'
import { Context } from 'koishi'
import { PlatformService } from '../src/llm-core/platform/service'
import { expectRejected } from './helpers'

it('PlatformService owns one model binding resolver and disposes it', async () => {
    const service = new PlatformService(new Context())
    const request = {
        workload: 'main.chat' as const,
        requestId: 'request-1'
    }
    let received: unknown
    const dispose = service.registerModelBindingResolver((input) => {
        received = input
        return {
            mode: 'dedicated',
            model: 'qqbot-primary/chat',
            revision: 3
        }
    })

    assert.deepEqual(await service.resolveModelBinding(request), {
        mode: 'dedicated',
        model: 'qqbot-primary/chat',
        revision: 3
    })
    assert.equal(received, request)
    assert.throws(
        () =>
            service.registerModelBindingResolver(() => ({
                mode: 'disabled',
                revision: 3
            })),
        /already registered/
    )

    dispose()
    await expectRejected(
        service.resolveModelBinding(request),
        /resolver is not registered/
    )
})

it('PlatformService rejects invalid binding snapshots', async () => {
    const service = new PlatformService(new Context())
    const invalidRevision = service.registerModelBindingResolver(() => ({
        mode: 'disabled',
        revision: 0
    }))

    await expectRejected(
        service.resolveModelBinding({
            workload: 'memory.embedding'
        }),
        /Invalid model binding revision/
    )
    invalidRevision()

    service.registerModelBindingResolver(() => ({
        mode: 'dedicated',
        model: ' ',
        revision: 1
    }))
    await expectRejected(
        service.resolveModelBinding({
            workload: 'main.chat'
        }),
        /Dedicated model binding is empty/
    )
})

it('PlatformService enforces workload binding modes', async () => {
    const service = new PlatformService(new Context())
    service.registerModelBindingResolver(() => ({
        mode: 'disabled',
        revision: 1
    }))

    await expectRejected(
        service.resolveModelBinding({
            workload: 'main.chat'
        }),
        /Invalid model binding mode disabled for main.chat/
    )
})
