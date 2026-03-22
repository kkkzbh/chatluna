import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('build output exposes allow reply resolver API and uses it in allow_reply', async () => {
    const [chatService, allowReply] = await Promise.all([
        readFile(new URL('../lib/services/chat.cjs', import.meta.url), 'utf8'),
        readFile(new URL('../lib/index.cjs', import.meta.url), 'utf8')
    ])

    assert.ok(chatService.includes('registerAllowReplyResolver'))
    assert.ok(chatService.includes('resolveAllowReply'))
    assert.ok(allowReply.includes('resolveAllowReply'))
    assert.ok(!allowReply.includes('chatluna/before-allow-reply'))
})
