import { StructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import type { ChatLunaTool } from '../platform/types'
import type { ToolMask } from './types'

export const REPLY_AGENT_CHAT_MODE = 'reply-agent'
export const REPLY_AGENT_FINISH_TOOL = 'submit_reply_plan'

const replyTextSegmentSchema = z.object({
    kind: z.enum(['text', 'multiline', 'voice', 'sticker']),
    content: z.string().min(1)
})

const replyImageSegmentSchema = z.object({
    kind: z.literal('image'),
    asset_ref: z.string().min(1),
    alt: z.string().optional()
})

export const replyPlanSegmentSchema = z.discriminatedUnion('kind', [
    replyTextSegmentSchema,
    replyImageSegmentSchema
])

export const replyPlanSchema = z.object({
    segments: z.array(replyPlanSegmentSchema).min(1)
})

export type ReplyPlanSubmitArgs = z.infer<typeof replyPlanSchema>

export interface AgentFinishContract {
    toolName: string
    retryMessage: string
    maxRetries?: number
    errorMessage?: string
}

export const REPLY_AGENT_FINISH_CONTRACT: AgentFinishContract = {
    toolName: REPLY_AGENT_FINISH_TOOL,
    maxRetries: 1,
    retryMessage: [
        'Protocol violation: reply-agent must finish by calling submit_reply_plan.',
        'You may continue thinking, searching, and using tools, but do not answer with plain text or raw JSON.',
        'Call submit_reply_plan({ segments: [...] }) now.',
        'segments support: text, multiline, voice, sticker, image.',
        'text / multiline / voice / sticker require content.',
        'image requires asset_ref and may include alt. Do not invent image assets.'
    ].join('\n'),
    errorMessage:
        'reply-agent protocol violation: the agent finished without calling submit_reply_plan.'
}

const REPLY_AGENT_DENY_TOOLS = [
    'bash',
    'cron',
    'file_edit',
    'file_publish',
    'file_read',
    'file_write',
    'glob',
    'grep',
    'group_mute',
    'koishi_command_execute',
    'memory_add',
    'memory_delete',
    'memory_update',
    'question',
    'skill',
    'task',
    'todos',
    'user_confirm',
    'web_post'
]

export const REPLY_AGENT_DEFAULT_TOOL_MASK: ToolMask = {
    mode: 'deny',
    allow: [],
    deny: REPLY_AGENT_DENY_TOOLS,
    toolCallMask: {
        mode: 'deny',
        allow: [],
        deny: REPLY_AGENT_DENY_TOOLS
    }
}

export class SubmitReplyPlanTool extends StructuredTool {
    name = REPLY_AGENT_FINISH_TOOL

    description =
        'Submit the final structured reply plan for the user. This is the only valid way to finish reply-agent mode.'

    returnDirect = true

    schema = replyPlanSchema as any

    async _call(_: ReplyPlanSubmitArgs): Promise<string> {
        return ''
    }
}

export function createSubmitReplyPlanTool(): ChatLunaTool {
    return {
        id: REPLY_AGENT_FINISH_TOOL,
        name: REPLY_AGENT_FINISH_TOOL,
        description:
            'Submit the final structured reply plan. Use this exactly once as the final step.',
        selector() {
            return true
        },
        createTool() {
            return new SubmitReplyPlanTool()
        }
    }
}

export function isReplyAgentChatMode(chatMode?: string) {
    return chatMode === REPLY_AGENT_CHAT_MODE
}
