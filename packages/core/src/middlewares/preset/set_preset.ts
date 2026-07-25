import { Context } from 'koishi'
import { Config } from '../../config'
import { ChainMiddlewareRunStatus, ChatChain } from '../../chains/chain'
import type { PresetDefinitionV2, PresetMessage } from '../../preset_schema'

export type SetPresetCommandRejection = 'empty_messages' | 'multiple_messages'

export class SetPresetCommandError extends Error {
    constructor(
        readonly code: SetPresetCommandRejection,
        readonly presetId: string
    ) {
        super(
            code === 'empty_messages'
                ? `Preset ${presetId} has no message to update`
                : `Preset ${presetId} has multiple messages`
        )
        this.name = 'SetPresetCommandError'
    }
}

export function requireSinglePresetMessage(
    preset: Pick<PresetDefinitionV2, 'id' | 'messages'>
): PresetMessage {
    if (preset.messages.length === 0) {
        throw new SetPresetCommandError('empty_messages', preset.id)
    }
    if (preset.messages.length > 1) {
        throw new SetPresetCommandError('multiple_messages', preset.id)
    }

    return preset.messages[0]
}

export function apply(ctx: Context, config: Config, chain: ChatChain) {
    chain
        .middleware('set_preset', async (session, context) => {
            const { command } = context

            if (command !== 'set_preset') {
                return ChainMiddlewareRunStatus.SKIPPED
            }

            const presetName = context.options.setPreset

            const presetService = ctx.chatluna.preset

            const preset = presetService.findPresetInput(presetName).value

            if (!preset) {
                await context.send(session.text('.not_found'))
                return ChainMiddlewareRunStatus.STOP
            }

            const definition = presetService.getDefinition(preset.id)
            let message: PresetMessage
            try {
                message = requireSinglePresetMessage(definition)
            } catch (error) {
                if (!(error instanceof SetPresetCommandError)) {
                    throw error
                }
                const localeKey =
                    error.code === 'empty_messages'
                        ? '.empty_not_support'
                        : '.not_support'
                await context.send(session.text(localeKey, [presetName]))

                return ChainMiddlewareRunStatus.STOP
            }

            await context.send(session.text('.enter_content'))

            const result = await session.prompt(1000 * 30)

            if (!result) {
                await context.send(session.text('.timeout'))
                return ChainMiddlewareRunStatus.STOP
            }

            message.content = result
            await presetService.updatePreset(
                preset.id,
                definition,
                preset.revision
            )

            await context.send(session.text('.success', [presetName]))

            return ChainMiddlewareRunStatus.STOP
        })
        .after('lifecycle-handle_command')
        .before('lifecycle-request_conversation')
}

declare module '../../chains/chain' {
    interface ChainMiddlewareName {
        set_preset: string
    }

    interface ChainMiddlewareContextOptions {
        setPreset?: string
    }
}
