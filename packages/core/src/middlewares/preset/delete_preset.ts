import { Context } from 'koishi'
import { Config } from '../../config'
import { ChainMiddlewareRunStatus, ChatChain } from '../../chains/chain'

export function apply(ctx: Context, _: Config, chain: ChatChain) {
    chain
        .middleware('delete_preset', async (session, context) => {
            if (context.command !== 'delete_preset') {
                return ChainMiddlewareRunStatus.SKIPPED
            }

            const input = context.options.deletePreset
            const preset =
                ctx.chatluna.preset.findContextPresetInput(input).value
            if (preset == null) {
                await context.send(session.text('.not_found'))
                return ChainMiddlewareRunStatus.STOP
            }

            await context.send(session.text('.confirm_delete', [preset.id]))
            const result = await session.prompt(1000 * 30)

            if (result == null) {
                context.message = session.text('.timeout', [preset.id])
                return ChainMiddlewareRunStatus.STOP
            }
            if (result !== 'Y') {
                context.message = session.text('.cancelled', [preset.id])
                return ChainMiddlewareRunStatus.STOP
            }

            await ctx.chatluna.preset.deleteContextPreset(
                preset.id,
                preset.revision
            )
            context.message = session.text('.success', [preset.id])
            return ChainMiddlewareRunStatus.STOP
        })
        .after('lifecycle-handle_command')
        .before('lifecycle-request_conversation')
}

declare module '../../chains/chain' {
    interface ChainMiddlewareName {
        delete_preset: string
    }

    interface ChainMiddlewareContextOptions {
        deletePreset?: string
    }
}
