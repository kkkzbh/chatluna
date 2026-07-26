import { isDirectToolOutput } from '@langchain/core/messages/tool'
import type { AgentObservation } from './types'

export function observationToMessageContent(observation: AgentObservation) {
    return isDirectToolOutput(observation) ? '' : observation
}
