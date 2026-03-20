import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('build output does not inject pseudo system prompt as after_user_message', async () => {
    const content = await readFile(new URL('../lib/index.cjs', import.meta.url), 'utf8')

    assert.ok(!content.includes('requests["after_user_message"]'))
    assert.ok(!content.includes('AGENT_AFTER_USER_PROMPT'))
    assert.ok(!content.includes('Respond naturally according to your system prompt'))
})
