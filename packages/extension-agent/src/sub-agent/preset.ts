/** @module sub-agent/preset */

import { Context } from 'koishi'
import { AgentConfig, SubAgentInfo } from '../types'
import { assertPresetAgentId } from '../utils/id'

export function getPresetAgents(
    ctx: Context,
    cfg: AgentConfig['subAgent']
): SubAgentInfo[] {
    return Object.entries(cfg.presetAgents).map(([id, item], idx) => {
        assertPresetAgentId(id)
        const base = {
            id,
            name: item.name,
            description: item.description,
            dedupeTools: item.dedupeTools,
            source: 'preset' as const,
            format: 'chatluna' as const,
            enabled: item.enabled,
            chatlunaEnabled: item.chatluna,
            characterEnabled: item.character,
            characterGroupEnabled: item.characterGroup,
            characterPrivateEnabled: item.characterPrivate,
            characterGroupMode: item.characterGroupMode,
            characterPrivateMode: item.characterPrivateMode,
            characterGroupIds: item.characterGroupIds,
            characterPrivateIds: item.characterPrivateIds,
            authority: item.authority,
            hidden: item.hidden ?? false,
            priority: 20 + idx,
            maxTurns: item.maxTurns,
            permissions: item.permissions,
            allowKoishiMessageTransform: item.allowKoishiMessageTransform,
            promptMode: 'preset' as const,
            preset: item.preset
        }

        try {
            const preset = item.preset
                ? ctx.chatluna.preset.getContextPreset(item.preset).value
                : undefined

            if (!preset) {
                return {
                    ...base,
                    state: 'missing' as const,
                    promptContent: '',
                    diagnostics: ['Referenced preset was not found']
                }
            }

            return {
                ...base,
                state: 'ready' as const,
                promptContent: preset.messages
                    .map((message) =>
                        typeof message.content === 'string'
                            ? message.content
                            : JSON.stringify(message.content)
                    )
                    .join('\n\n'),
                diagnostics: []
            }
        } catch (err) {
            return {
                ...base,
                state: 'missing' as const,
                promptContent: '',
                diagnostics: [err instanceof Error ? err.message : String(err)]
            }
        }
    })
}
