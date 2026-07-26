/** @module sub-agent/manual */

import { randomUUID } from 'crypto'
import { Context } from 'koishi'
import { createSubAgentItemConfig } from '../config/defaults'
import { ManualSubAgentInput, SubAgentInfo } from '../types'
import { assertManualAgentId } from '../utils/id'

export function createManualAgent(
    ctx: Context,
    input: ManualSubAgentInput
): SubAgentInfo {
    const item = createSubAgentItemConfig({
        enabled: input.enabled,
        dedupeTools: input.dedupeTools,
        name: input.name,
        description: input.description ?? input.name,
        chatluna: input.chatluna,
        character: input.character,
        characterGroup: input.characterGroup,
        characterPrivate: input.characterPrivate,
        characterGroupMode: input.characterGroupMode,
        characterPrivateMode: input.characterPrivateMode,
        characterGroupIds: input.characterGroupIds,
        characterPrivateIds: input.characterPrivateIds,
        authority: input.authority,
        source: 'manual',
        format: input.format ?? 'chatluna',
        maxTurns: input.maxTurns,
        hidden: input.hidden,
        promptMode: input.promptMode ?? (input.preset ? 'preset' : 'markdown'),
        preset: input.preset,
        allowKoishiMessageTransform: input.allowKoishiMessageTransform,
        permissions: input.permissions
    })

    const id = input.id ?? `manual:${randomUUID()}`
    assertManualAgentId(id)

    const base: SubAgentInfo = {
        id,
        name: item.name,
        description: item.description,
        dedupeTools: item.dedupeTools,
        source: 'manual',
        format: item.format,
        state: 'ready',
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
        priority: input.priority ?? -10,
        promptContent: '',
        maxTurns: item.maxTurns,
        permissions: item.permissions,
        allowKoishiMessageTransform: item.allowKoishiMessageTransform,
        diagnostics: [],
        promptMode: item.promptMode,
        preset: item.preset
    }

    if (item.promptMode === 'preset') {
        const preset = item.preset
            ? ctx.chatluna.preset.getContextPreset(item.preset).value
            : undefined

        if (!preset) {
            return {
                ...base,
                state: 'missing',
                diagnostics: ['Referenced preset was not found']
            }
        }

        return {
            ...base,
            promptContent: preset.messages
                .map((message) =>
                    typeof message.content === 'string'
                        ? message.content
                        : JSON.stringify(message.content)
                )
                .join('\n\n')
        }
    }

    const content = input.promptContent ?? ''
    return {
        ...base,
        state: content.trim() ? 'ready' : 'invalid',
        promptContent: content,
        diagnostics: content.trim() ? [] : ['Prompt content is empty']
    }
}
