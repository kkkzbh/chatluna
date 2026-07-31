import { computed, type ComputedRef } from '@vue/reactivity'
import type { Context } from 'koishi'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import {
    compileContextPreset,
    type CompiledPreset,
    compileRolePreset
} from 'koishi-plugin-chatluna/llm-core/prompt'

export interface ComputePresetOptions {
    name: string
    promptMode?: 'markdown' | 'preset'
    preset?: string
}

export function computePreset(
    ctx: Context,
    info: ComputePresetOptions,
    rawText: string
): ComputedRef<CompiledPreset> {
    return computed(() => {
        if (info.promptMode === 'preset' && info.preset) {
            return ctx.chatluna.preset.getContextPreset(info.preset).value
        }
        const role = compileRolePreset(
            {
                schemaVersion: 1,
                id: 'prompt',
                displayName: info.name,
                messages:
                    rawText.length === 0
                        ? []
                        : [{ role: 'system', content: rawText }]
            },
            { source: 'ephemeral', raw: rawText }
        )
        return compileContextPreset(
            {
                schemaVersion: 1,
                id: 'prompt',
                displayName: info.name,
                aliases: [],
                blocks: [
                    {
                        id: 'role',
                        type: 'role',
                        rolePresetId: 'prompt'
                    },
                    {
                        id: 'input',
                        type: 'currentInput',
                        inputFormat: null
                    },
                    {
                        id: 'output',
                        type: 'modelOutput',
                        maxOutputTokens: 1024,
                        postHandler: null
                    }
                ]
            },
            role,
            { source: 'ephemeral', raw: rawText }
        )
    })
}

export function createChatPrompt(
    ctx: Context,
    llm: ChatLunaChatModel,
    preset: ComputedRef<CompiledPreset>
): ChatLunaChatPrompt {
    return new ChatLunaChatPrompt({
        preset,
        tokenCounter: (text) => llm.getNumTokens(text),
        sendTokenLimit:
            llm.invocationParams().maxTokenLimit ??
            llm.getModelMaxContextSize(),
        contextManager: ctx.chatluna.contextManager,
        promptRenderService: ctx.chatluna.promptRenderer,
        knowledgeService: ctx.chatluna.knowledge
    })
}
