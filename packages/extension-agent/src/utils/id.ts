/**
 * @module utils/id
 * @description 稳定短 ID 生成工具。
 */

import { createHash } from 'crypto'

/** sha1(path).slice(0,16) 生成稳定短 ID。 */
export function createHashId(path: string): string {
    return createHash('sha1').update(path).digest('hex').slice(0, 16)
}

export const CANONICAL_AGENT_ID_PATTERN =
    /^[a-z0-9](?:[a-z0-9._:-]*[a-z0-9])?$/

export function assertCanonicalAgentId(id: string): void {
    if (!CANONICAL_AGENT_ID_PATTERN.test(id)) {
        throw new Error(`Invalid canonical agent id: ${id}`)
    }
}

export function assertManualAgentId(id: string): void {
    assertCanonicalAgentId(id)
    if (!id.startsWith('manual:') || id.length === 'manual:'.length) {
        throw new Error(`Invalid manual agent id: ${id}`)
    }
}

export function assertPresetAgentId(id: string): void {
    assertCanonicalAgentId(id)
    if (!id.startsWith('preset:') || id.length === 'preset:'.length) {
        throw new Error(`Invalid preset agent id: ${id}`)
    }
}

export function createPresetAgentId(displayName: string): string {
    const normalized = displayName.normalize('NFKC').trim()
    if (normalized.length === 0) {
        throw new Error('Preset agent display name must not be empty')
    }
    const slug = normalized
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    return `preset:${slug || createHashId(normalized)}`
}
