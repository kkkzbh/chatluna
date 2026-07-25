import { Context } from 'koishi'
import { Config } from '../../config'
import { ChainMiddlewareRunStatus, ChatChain } from '../../chains/chain'

export function apply(ctx: Context, config: Config, chain: ChatChain) {
    chain
        .middleware('clone_preset', async (session, context) => {
            const { command } = context

            if (command !== 'clone_preset') {
                return ChainMiddlewareRunStatus.SKIPPED
            }

            const { newName, name } = context.options.clonePreset

            const presetService = ctx.chatluna.preset

            const oldPreset = presetService.findPresetInput(name)
            const newPreset = presetService.getPreset(newName, false)

            if (newPreset.value != null) {
                await context.send(session.text('.conflict'))

                return ChainMiddlewareRunStatus.STOP
            }

            if (oldPreset.value == null) {
                await context.send(session.text('.not_found', [name]))
                return ChainMiddlewareRunStatus.STOP
            }

            await context.send(session.text('.confirm', [name]))

            const result = await session.prompt(1000 * 30)

            if (result == null) {
                context.message = session.text('.timeout')
                return ChainMiddlewareRunStatus.STOP
            }
            if (result !== 'Y') {
                context.message = session.text('.cancelled')
                return ChainMiddlewareRunStatus.STOP
            }

            await presetService.createPreset({
                ...presetService.getDefinition(oldPreset.value.id),
                id: newName,
                displayName: newName,
                aliases: []
            })

            context.message = session.text('.success', [newName])

            return ChainMiddlewareRunStatus.STOP
        })
        .after('lifecycle-handle_command')
        .before('lifecycle-request_conversation')
}

declare module '../../chains/chain' {
    interface ChainMiddlewareName {
        clone_preset: string
    }

    interface ChainMiddlewareContextOptions {
        clonePreset?: {
            name: string
            newName: string
        }
    }
}
