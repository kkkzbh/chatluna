import { expect } from 'chai'
import type { Context } from 'koishi'
import {
    createPermissionRule,
    createToolItemConfig,
    getDefaultConfig
} from '../src/config/defaults'
import { ChatLunaAgentPermissionService } from '../src/service/permissions'

it('excludes internal contract tools from configurable agent tools', async () => {
    const config = getDefaultConfig()
    config.tool.items.submit_reply = createToolItemConfig({ enabled: false })
    const registry = {
        ordinary: {
            name: 'ordinary',
            description: 'visible tool'
        },
        submit_reply: {
            name: 'submit_reply',
            description: 'internal terminal tool',
            meta: { internalContract: true }
        }
    }
    const ctx = {
        chatluna: {
            platform: {
                getToolRegistry: () => registry
            }
        }
    } as unknown as Context
    const service = new ChatLunaAgentPermissionService(ctx, config)
    const info = {
        id: 'helper',
        name: 'helper',
        permissions: {
            skills: createPermissionRule('all'),
            mcp: createPermissionRule('all'),
            tools: createPermissionRule('all'),
            computer: createPermissionRule('all')
        }
    } as never

    expect(service.listTools().map((item) => item.name)).to.deep.equal([
        'ordinary'
    ])
    expect(service.getStatus().catalog).not.to.have.property('submit_reply')
    expect(service.canUseTool(info, 'submit_reply')).to.equal(false)
    expect(
        Object.keys(registry).filter((name) => service.canUseTool(info, name))
    ).to.deep.equal(['ordinary'])

    const mask = await service.createSubAgentToolMask(info)

    expect(mask.tools).to.deep.equal(['ordinary'])
    expect(mask.toolCallMask?.tools).to.deep.equal(['ordinary'])
})
