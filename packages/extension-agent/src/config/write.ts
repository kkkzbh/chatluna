/** @module config/write */

import { Context } from 'koishi'
import { mkdir, writeFile } from 'fs/promises'
import { dirname } from 'path'
import { getConfigPath } from './path'
import { AgentConfig } from '../types'
import { assertPresetAgentId } from '../utils/id'

export async function writeConfig(ctx: Context, cfg: AgentConfig) {
    for (const id of Object.keys(cfg.subAgent.presetAgents)) {
        assertPresetAgentId(id)
    }
    const path = getConfigPath(ctx)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, JSON.stringify(cfg, null, 2) + '\n', 'utf-8')
}
