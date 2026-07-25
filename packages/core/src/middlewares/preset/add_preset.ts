import { Context } from 'koishi'
import { Config } from '../../config'
import { ChainMiddlewareRunStatus, ChatChain } from '../../chains/chain'

export function apply(ctx: Context, _: Config, chain: ChatChain) {
    chain
        .middleware('add_preset', async (session, context) => {
            const { command } = context

            if (command !== 'add_preset')
                return ChainMiddlewareRunStatus.SKIPPED

            const presetName = context.options.addPreset

            const preset = ctx.chatluna.preset

            const existsPreset = preset.getPreset(presetName, false)

            if (existsPreset.value != null) {
                await context.send(session.text('.conflict'))

                return ChainMiddlewareRunStatus.STOP
            }

            await context.send(session.text('.prompt'))

            const result = await session.prompt(1000 * 30)

            if (!result) {
                context.message = session.text('.timeout', [presetName])
                return ChainMiddlewareRunStatus.STOP
            }

            await preset.createPreset({
                schemaVersion: 2,
                id: presetName,
                displayName: presetName,
                aliases: [],
                messages: [
                    {
                        role: 'system',
                        content: result
                    }
                ],
                inputFormat: null,
                lore: { defaults: {}, entries: [] },
                authorsNote: null,
                knowledge: null,
                promptConfig: {}
            })

            context.message = session.text('.success', [presetName])

            return ChainMiddlewareRunStatus.STOP
        })
        .after('lifecycle-handle_command')
        .before('lifecycle-request_conversation')
}

declare module '../../chains/chain' {
    interface ChainMiddlewareName {
        add_preset: string
    }

    interface ChainMiddlewareContextOptions {
        addPreset?: string
    }
}
