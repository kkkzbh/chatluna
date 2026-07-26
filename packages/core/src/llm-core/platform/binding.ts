import type { Awaitable, Session } from 'koishi'
import type { ConversationRecord } from '../../types'

export type ModelBindingWorkload =
    | 'main.chat'
    | 'memory.extract'
    | 'memory.embedding'
    | 'affinity.analysis'
    | 'naturalTrigger.decision'
    | 'search.summary'
    | 'chatluna.defaultEmbedding'
    | 'agent.subagent.default'
    | 'sticker.index'

export interface ModelBindingRequest {
    workload: ModelBindingWorkload
    session?: Session
    conversation?: ConversationRecord
    requestId?: string
    agentId?: string
}

export type ModelBindingMode =
    | 'dedicated'
    | 'disabled'
    | 'inheritMain'
    | 'inheritInvocation'

export type ModelBinding =
    | {
          mode: 'dedicated'
          model: string
          revision: number
      }
    | {
          mode: 'disabled' | 'inheritMain' | 'inheritInvocation'
          revision: number
      }

export type ModelBindingResolver = (
    request: ModelBindingRequest
) => Awaitable<ModelBinding>

export const MODEL_BINDING_ALLOWED_MODES = {
    'main.chat': ['dedicated'],
    'memory.extract': ['dedicated', 'disabled'],
    'memory.embedding': ['dedicated', 'disabled'],
    'affinity.analysis': ['inheritMain', 'dedicated'],
    'naturalTrigger.decision': ['dedicated', 'disabled'],
    'search.summary': ['inheritInvocation', 'dedicated'],
    'chatluna.defaultEmbedding': ['dedicated', 'disabled'],
    'agent.subagent.default': ['inheritInvocation', 'dedicated'],
    'sticker.index': ['dedicated', 'disabled']
} as const satisfies Record<ModelBindingWorkload, readonly ModelBindingMode[]>
