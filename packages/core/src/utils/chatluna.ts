import { computed, type ComputedRef } from '@vue/reactivity'
import type { Context } from 'koishi'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import type { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import {
    type CompiledPreset,
    compilePreset
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
            return ctx.chatluna.preset.getPreset(info.preset).value
        }
        return compilePreset(
            {
                schemaVersion: 2,
                id: 'prompt',
                displayName: info.name,
                aliases: [],
                messages:
                    rawText.length === 0
                        ? []
                        : [{ role: 'system', content: rawText }],
                inputFormat: null,
                lore: { defaults: {}, entries: [] },
                authorsNote: null,
                knowledge: null,
                promptConfig: {}
            },
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
