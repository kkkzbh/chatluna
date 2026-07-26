import { expect } from 'chai'
import type { Context } from 'koishi'
import {
    getAgentDataRootPath,
    getComputerRootPath,
    getConfigPath,
    getSkillsRootPath,
    getSubAgentsRootPath
} from '../src/config/path'

describe('agent persistent data paths', () => {
    const original = process.env.CHATLUNA_AGENT_DATA_DIR

    afterEach(() => {
        if (original == null) {
            delete process.env.CHATLUNA_AGENT_DATA_DIR
        } else {
            process.env.CHATLUNA_AGENT_DATA_DIR = original
        }
    })

    it('derives every path from the default ChatLuna data root', () => {
        delete process.env.CHATLUNA_AGENT_DATA_DIR
        const ctx = { baseDir: '/srv/chatluna' } as Context

        expect(getAgentDataRootPath(ctx)).to.equal(
            '/srv/chatluna/data/chatluna'
        )
        expect(getConfigPath(ctx)).to.equal(
            '/srv/chatluna/data/chatluna/agents/config.json'
        )
        expect(getSubAgentsRootPath(ctx)).to.equal(
            '/srv/chatluna/data/chatluna/agents'
        )
        expect(getSkillsRootPath(ctx)).to.equal(
            '/srv/chatluna/data/chatluna/skills'
        )
        expect(getComputerRootPath(ctx)).to.equal(
            '/srv/chatluna/data/chatluna/computer'
        )
    })

    it('derives every path from CHATLUNA_AGENT_DATA_DIR', () => {
        process.env.CHATLUNA_AGENT_DATA_DIR =
            '/opt/qqbot/data/chatluna-persistent'
        const ctx = { baseDir: '/srv/chatluna' } as Context

        expect(getAgentDataRootPath(ctx)).to.equal(
            '/opt/qqbot/data/chatluna-persistent'
        )
        expect(getConfigPath(ctx)).to.equal(
            '/opt/qqbot/data/chatluna-persistent/agents/config.json'
        )
        expect(getSubAgentsRootPath(ctx)).to.equal(
            '/opt/qqbot/data/chatluna-persistent/agents'
        )
        expect(getSkillsRootPath(ctx)).to.equal(
            '/opt/qqbot/data/chatluna-persistent/skills'
        )
        expect(getComputerRootPath(ctx)).to.equal(
            '/opt/qqbot/data/chatluna-persistent/computer'
        )
    })

    it('rejects an explicitly empty persistent root', () => {
        process.env.CHATLUNA_AGENT_DATA_DIR = ''

        expect(() =>
            getAgentDataRootPath({ baseDir: '/srv/chatluna' } as Context)
        ).to.throw('CHATLUNA_AGENT_DATA_DIR must not be empty')
    })
})
