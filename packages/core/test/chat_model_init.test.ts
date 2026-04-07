import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('build output exposes request-mode-aware model init helpers and diagnostics', async () => {
    const [helperTypes, appBuild] = await Promise.all([
        readFile(new URL('../lib/llm-core/chat/helper.d.ts', import.meta.url), 'utf8'),
        readFile(new URL('../lib/llm-core/chat/app.cjs', import.meta.url), 'utf8')
    ])

    assert.ok(helperTypes.includes('export type ChatLunaRequestMode'))
    assert.ok(helperTypes.includes('export interface ChatModelInitDescriptor'))
    assert.ok(helperTypes.includes('resolveChatModelInitDescriptor'))
    assert.ok(helperTypes.includes('buildChatModelInitCacheKey'))
    assert.ok(helperTypes.includes('transportModel: string'))
    assert.ok(helperTypes.includes("requestMode: ChatLunaRequestMode"))

    assert.ok(appBuild.includes('provider client unavailable'))
    assert.ok(appBuild.includes('target model not found in provider list'))
    assert.ok(appBuild.includes('createChatModel returned empty value'))
    assert.ok(appBuild.includes('createChatModel returned a non-chat model value'))
    assert.ok(appBuild.includes('buildChatModelInitCacheKey'))
    assert.ok(appBuild.includes('resolveChatModelInitDescriptor'))
    assert.ok(appBuild.includes('arg?.message?.additional_kwargs'))
})
