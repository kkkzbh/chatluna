import { SandboxIdentity } from '../types'

export interface SandboxIdentityInput {
    platform?: string
    selfId?: string
    isDirect?: boolean
    userId?: string
    guildId?: string
    channelId?: string
}

export function getSandboxIdentity(input: SandboxIdentityInput) {
    if (!input.platform || !input.selfId || input.isDirect == null) {
        throw new Error(
            'Workspace requires platform, bot self ID, and conversation type.'
        )
    }

    if (input.isDirect) {
        if (!input.userId) {
            throw new Error('Private Workspace requires a user ID.')
        }

        return {
            kind: 'private',
            key: `private:${input.platform}:${input.selfId}:${input.userId}`,
            subjectId: input.userId
        } satisfies SandboxIdentity
    }

    const id = input.guildId ?? input.channelId
    if (!id) {
        throw new Error('Group Workspace requires a group ID.')
    }

    return {
        kind: 'group',
        key: `group:${input.platform}:${input.selfId}:${id}`,
        subjectId: id
    } satisfies SandboxIdentity
}
