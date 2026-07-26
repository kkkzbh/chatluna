/** @module config/path */

import { Context } from 'koishi'
import { resolve } from 'path'

export const DEFAULT_SKILL_DIRS: string[] = []

export function getAgentDataRootPath(ctx: Context): string {
    const configured = process.env.CHATLUNA_AGENT_DATA_DIR
    if (configured === '') {
        throw new Error('CHATLUNA_AGENT_DATA_DIR must not be empty')
    }
    return configured == null
        ? resolve(ctx.baseDir, 'data/chatluna')
        : resolve(configured)
}

export function getConfigPath(ctx: Context): string {
    return resolve(getAgentDataRootPath(ctx), 'agents/config.json')
}

export function getSkillsRootPath(ctx: Context): string {
    return resolve(getAgentDataRootPath(ctx), 'skills')
}

export function getSubAgentsRootPath(ctx: Context): string {
    return resolve(getAgentDataRootPath(ctx), 'agents')
}

export function getComputerRootPath(ctx: Context): string {
    return resolve(getAgentDataRootPath(ctx), 'computer')
}
