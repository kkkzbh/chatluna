import { expect } from 'chai'
import { HumanMessage } from '@langchain/core/messages'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { Context } from 'koishi'
import {
    createSubAgentItemConfig,
    getDefaultConfig
} from '../src/config/defaults'
import { readConfig } from '../src/config/read'
import { writeConfig } from '../src/config/write'
import { createManualAgent } from '../src/sub-agent/manual'
import { getPresetAgents } from '../src/sub-agent/preset'
import {
    CANONICAL_AGENT_ID_PATTERN,
    createPresetAgentId
} from '../src/utils/id'

describe('canonical sub-agent ids', () => {
    const originalRoot = process.env.CHATLUNA_AGENT_DATA_DIR

    afterEach(() => {
        if (originalRoot == null) {
            delete process.env.CHATLUNA_AGENT_DATA_DIR
        } else {
            process.env.CHATLUNA_AGENT_DATA_DIR = originalRoot
        }
    })

    it('creates stable lowercase ids independently from display names', () => {
        expect(createPresetAgentId('Research Agent')).to.equal(
            'preset:research-agent'
        )
        const chinese = createPresetAgentId('研究助手')
        expect(chinese).to.equal(createPresetAgentId('研究助手'))
        expect(chinese).to.match(/^preset:[a-f0-9]{16}$/)
        expect(chinese).to.match(CANONICAL_AGENT_ID_PATTERN)
    })

    it('rejects invalid manual ids at the creation boundary', () => {
        const ctx = {} as Context
        for (const id of [
            'manual:Researcher',
            'manual:研究员',
            'researcher',
            'manual:contains space',
            ' manual:researcher ',
            ''
        ]) {
            expect(() =>
                createManualAgent(ctx, {
                    id,
                    name: 'Researcher',
                    promptContent: 'Research carefully'
                })
            ).to.throw()
        }
    })

    it('keeps canonical preset ids through config and catalog round trips', async () => {
        const root = await fs.mkdtemp(
            path.join(os.tmpdir(), 'chatluna-agent-id-')
        )
        process.env.CHATLUNA_AGENT_DATA_DIR = root
        const config = getDefaultConfig()
        const id = createPresetAgentId('研究助手')
        config.subAgent.presetAgents[id] = createSubAgentItemConfig({
            name: '研究助手',
            description: '中文显示名称',
            source: 'preset',
            format: 'chatluna',
            promptMode: 'preset',
            preset: 'research-context'
        })
        const ctx = {
            baseDir: '/unused',
            chatluna: {
                preset: {
                    getContextPreset: () => ({
                        value: {
                            messages: [new HumanMessage('Research carefully')]
                        }
                    })
                }
            }
        } as unknown as Context

        await writeConfig(ctx, config)
        const loaded = await readConfig(ctx)
        const agents = getPresetAgents(ctx, loaded.subAgent)

        expect(Object.keys(loaded.subAgent.presetAgents)).to.deep.equal([id])
        expect(loaded.subAgent.presetAgents[id].name).to.equal('研究助手')
        expect(agents).to.have.length(1)
        expect(agents[0].id).to.equal(id)
        expect(agents[0].name).to.equal('研究助手')
    })
})
