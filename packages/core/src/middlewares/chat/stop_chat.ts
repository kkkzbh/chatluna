import { Context } from 'koishi'
import { Config } from '../../config'
import {
    ChainMiddlewareContext,
    ChainMiddlewareRunStatus,
    ChatChain
} from '../../chains/chain'
import { checkAdmin } from 'koishi-plugin-chatluna/utils/koishi'
import type { ConversationResolution } from '../../types'

function getTargetConversation(context: ChainMiddlewareContext) {
    return (
        context.options.conversation_manage?.targetConversation ??
        context.options.targetConversation
    )
}

function isCompleteResolution(
    resolved: ChainMiddlewareContext['options']['conversation']
): resolved is ConversationResolution {
    return resolved?.conversation != null && resolved.constraint != null
}

async function resolveStopTarget(
    ctx: Context,
    session,
    context: ChainMiddlewareContext
) {
    const targetConversation = getTargetConversation(context)
    const current = context.options.conversation

    if (targetConversation == null && isCompleteResolution(current)) {
        return current
    }

    return ctx.chatluna.conversation.resolveConversation(session, {
        conversationId:
            targetConversation == null
                ? (current?.conversationId ??
                  current?.conversation?.id ??
                  undefined)
                : undefined,
        targetConversation,
        presetLane: context.options.presetLane,
        allPresetLanes: context.options.allPresetLanes,
        permission: 'manage',
        useRoutePresetLane: context.options.presetLane == null,
        mode: 'target'
    })
}

export function apply(ctx: Context, config: Config, chain: ChatChain) {
    chain
        .middleware('stop_chat', async (session, context) => {
            const { command } = context

            if (command !== 'stop_chat') return ChainMiddlewareRunStatus.SKIPPED

            const resolved = await resolveStopTarget(ctx, session, context)
            const conversation = resolved.conversation

            if (conversation == null) {
                context.message = session.text('.no_active_chat')
                return ChainMiddlewareRunStatus.STOP
            }

            if (
                resolved.constraint.manageMode === 'admin' &&
                !(await checkAdmin(session))
            ) {
                context.message = session.text('.stop_failed')
                return ChainMiddlewareRunStatus.STOP
            }

            if (resolved.constraint.lockConversation) {
                context.message = session.text('.stop_failed')
                return ChainMiddlewareRunStatus.STOP
            }

            const status =
                ctx.chatluna.conversationRuntime.stopConversationRequest(
                    conversation.id
                )

            if (!status) {
                context.message = session.text('.no_active_chat')
                return ChainMiddlewareRunStatus.STOP
            }

            await ctx.parallel('chatluna/chat-stopped', {
                conversationId: conversation.id,
                session
            })

            return ChainMiddlewareRunStatus.STOP
        })
        .after('lifecycle-handle_command')
        .after('resolve_conversation')
        .before('lifecycle-request_conversation')
}

declare module '../../chains/chain' {
    interface ChainMiddlewareName {
        stop_chat: never
    }
}
