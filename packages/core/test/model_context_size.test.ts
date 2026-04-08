import assert from 'node:assert/strict'
import test from 'node:test'

test('context size resolution follows provider maxTokens first, then actual model family fallback', async () => {
    const {
        resolveDeclaredModelContextSize,
        resolveKnownModelContextSize
    } = await import(
        new URL('../src/llm-core/utils/model_context_size.ts', import.meta.url)
            .href
    )

    assert.equal(
        resolveKnownModelContextSize('openai/gpt-5.4-medium-thinking'),
        400000
    )
    assert.equal(
        resolveKnownModelContextSize('github-copilot/gpt-5.4-mini'),
        400000
    )
    assert.equal(
        resolveKnownModelContextSize('siliconflow/Pro/moonshotai/Kimi-K2.5'),
        128000
    )
    assert.equal(
        resolveKnownModelContextSize('openai/Qwen3-235B-A22B'),
        128000
    )

    assert.equal(
        resolveDeclaredModelContextSize('gpt-5.4-mini', 123456),
        123456
    )
    assert.equal(
        resolveDeclaredModelContextSize(
            'github-copilot/gpt-5.4-mini',
            undefined
        ),
        400000
    )
    assert.equal(
        resolveDeclaredModelContextSize(
            'github-copilot/gpt-5.4-mini',
            140000
        ),
        140000
    )
})
