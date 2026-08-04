/// <reference types="mocha" />

import { assert } from 'chai'
import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import {
    AgentTerminalContractError,
    runAgent
} from '../src/llm-core/agent/legacy-executor'
import { permitInternalContractTools } from '../src/llm-core/agent/creator'

class TerminalTool extends StructuredTool {
    name = 'submit_reply'
    description = 'submit final reply'
    schema = z.object({ text: z.string().min(1) })

    async _call(input: { text: string }) {
        return {
            lc_direct_tool_output: true as const,
            output: `encoded:${input.text}`
        }
    }
}

function terminalContractInput() {
    return {
        input: 'hello',
        qqbot_final_response_contract: {
            schema: null,
            instruction: 'Call submit_reply.',
            terminalTool: 'submit_reply'
        }
    }
}

it('retries a malformed terminal call and returns only a successful direct output', async () => {
    let calls = 0
    const agent = {
        async *stream() {
            calls += 1
            yield {
                tool: 'submit_reply',
                toolInput: calls === 1 ? {} : { text: 'done' },
                log: ''
            }
        }
    }
    const events = []

    for await (const event of runAgent({
        agent: agent as never,
        tools: [new TerminalTool({})],
        input: terminalContractInput(),
        maxIterations: 3
    })) {
        events.push(event)
    }

    assert.equal(calls, 2)
    const done = events.find((event) => event.type === 'done')
    assert.deepInclude(done, {
        type: 'done',
        output: 'encoded:done'
    })
})

it('rejects AgentFinish while a terminal tool contract is active', async () => {
    const agent = {
        async *stream() {
            yield {
                returnValues: { output: 'plain text' },
                log: ''
            }
        }
    }

    let error: unknown
    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [new TerminalTool({})],
            input: terminalContractInput()
        })) {
            assert.property(event, 'type')
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, Error)
    assert.include(
        (error as Error).message,
        'attempted to finish without terminal tool submit_reply'
    )
})

it('fails before planning when the contracted terminal tool is unavailable', async () => {
    const agent = {
        async *stream() {
            throw new Error('planning should not run')
        }
    }

    let error: unknown
    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [],
            input: terminalContractInput()
        })) {
            assert.property(event, 'type')
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, Error)
    assert.include(
        (error as Error).message,
        'terminal tool is unavailable: submit_reply'
    )
})

it('rejects parallel actions before any contracted tool is executed', async () => {
    let executions = 0
    class SideEffectTool extends StructuredTool {
        name = 'side_effect'
        description = 'must not run'
        schema = z.object({})

        async _call() {
            executions += 1
            return 'done'
        }
    }
    const agent = {
        async *stream() {
            yield [
                {
                    tool: 'submit_reply',
                    toolInput: { text: 'done' },
                    log: ''
                },
                {
                    tool: 'side_effect',
                    toolInput: {},
                    log: ''
                }
            ]
        }
    }

    let error: unknown
    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [new TerminalTool({}), new SideEffectTool({})],
            input: terminalContractInput()
        })) {
            assert.property(event, 'type')
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, Error)
    assert.include(
        (error as Error).message,
        'requires one tool action per round'
    )
    assert.equal(executions, 0)
})

it('allows parallel ordinary tools before a later terminal reply', async () => {
    const executions: string[] = []
    class OrdinaryTool extends StructuredTool {
        name: string
        description = 'read-only ordinary tool'
        schema = z.object({})

        constructor(name: string) {
            super({})
            this.name = name
        }

        async _call() {
            executions.push(this.name)
            return `${this.name}:done`
        }
    }
    let rounds = 0
    const agent = {
        async *stream() {
            rounds += 1
            if (rounds === 1) {
                yield [
                    { tool: 'read_a', toolInput: {}, log: '' },
                    { tool: 'read_b', toolInput: {}, log: '' }
                ]
                return
            }
            yield {
                tool: 'submit_reply',
                toolInput: { text: 'after reads' },
                log: ''
            }
        }
    }
    const events = []

    for await (const event of runAgent({
        agent: agent as never,
        tools: [
            new TerminalTool({}),
            new OrdinaryTool('read_a'),
            new OrdinaryTool('read_b')
        ],
        input: terminalContractInput(),
        maxIterations: 3
    })) {
        events.push(event)
    }

    assert.deepEqual(executions.sort(), ['read_a', 'read_b'])
    assert.deepInclude(
        events.find((event) => event.type === 'done'),
        { type: 'done', output: 'encoded:after reads' }
    )
})

it('rejects a terminal action in the last parallel position before any tool runs', async () => {
    let executions = 0
    class SideEffectTool extends StructuredTool {
        name = 'side_effect_last'
        description = 'must not run'
        schema = z.object({})

        async _call() {
            executions += 1
            return 'done'
        }
    }
    const agent = {
        async *stream() {
            yield [
                {
                    tool: 'side_effect_last',
                    toolInput: {},
                    log: ''
                },
                {
                    tool: 'submit_reply',
                    toolInput: { text: 'done' },
                    log: ''
                }
            ]
        }
    }
    let error: unknown

    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [new TerminalTool({}), new SideEffectTool({})],
            input: terminalContractInput()
        })) {
            assert.property(event, 'type')
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, AgentTerminalContractError)
    assert.equal(
        (error as AgentTerminalContractError).code,
        'PARALLEL_ACTIONS_FORBIDDEN'
    )
    assert.equal(executions, 0)
})

it('rejects a non-terminal returnDirect tool before invocation', async () => {
    let calls = 0
    class WrongDirectTool extends StructuredTool {
        name = 'wrong_finish'
        description = 'must not finish the terminal contract'
        schema = z.object({})
        returnDirect = true

        async _call() {
            calls += 1
            return 'wrong'
        }
    }
    const agent = {
        async *stream() {
            yield {
                tool: 'wrong_finish',
                toolInput: {},
                log: ''
            }
        }
    }
    const events = []
    let error: unknown

    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [new TerminalTool({}), new WrongDirectTool({})],
            input: terminalContractInput()
        })) {
            events.push(event)
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, AgentTerminalContractError)
    assert.equal(
        (error as AgentTerminalContractError).code,
        'WRONG_DIRECT_TOOL'
    )
    assert.equal(calls, 0)
    assert.notInclude(
        events.map((event) => event.type),
        'tool-call'
    )
})

it('fails closed at the iteration limit while a terminal contract is active', async () => {
    class OrdinaryTool extends StructuredTool {
        name = 'ordinary'
        description = 'ordinary tool'
        schema = z.object({})

        async _call() {
            return 'continue'
        }
    }
    const agent = {
        async *stream() {
            yield {
                tool: 'ordinary',
                toolInput: {},
                log: ''
            }
        }
    }

    let error: unknown
    try {
        for await (const event of runAgent({
            agent: agent as never,
            tools: [new TerminalTool({}), new OrdinaryTool({})],
            input: terminalContractInput(),
            maxIterations: 1
        })) {
            assert.property(event, 'type')
        }
    } catch (caught) {
        error = caught
    }

    assert.instanceOf(error, Error)
    assert.include(
        (error as Error).message,
        'iteration limit without terminal tool submit_reply'
    )
})

for (const mode of ['allow', 'deny'] as const) {
    it(`keeps the terminal tool executable through an explicit ${mode} mask`, async () => {
        const terminalTool = new TerminalTool({})
        const terminalEntry = {
            name: terminalTool.name,
            selector: () => true,
            createTool: () => terminalTool,
            meta: { internalContract: true }
        }
        const requestedMask = {
            mode,
            tools: ['ordinary', terminalTool.name],
            allow: mode === 'allow' ? ['ordinary'] : [],
            deny: mode === 'deny' ? [terminalTool.name] : [],
            toolCallMask: {
                mode,
                tools: ['ordinary', terminalTool.name],
                allow: mode === 'allow' ? ['ordinary'] : [],
                deny: mode === 'deny' ? [terminalTool.name] : []
            }
        }
        const toolMask = permitInternalContractTools(requestedMask, [
            terminalEntry as never
        ])
        const agent = {
            async *stream() {
                yield {
                    tool: terminalTool.name,
                    toolInput: { text: `${mode}-done` },
                    log: ''
                }
            }
        }
        const events = []

        for await (const event of runAgent({
            agent: agent as never,
            tools: [terminalTool],
            input: terminalContractInput(),
            config: { configurable: { toolMask } },
            maxIterations: 1
        })) {
            events.push(event)
        }

        const done = events.find((event) => event.type === 'done')
        assert.deepInclude(done, {
            type: 'done',
            output: `encoded:${mode}-done`
        })
    })
}
