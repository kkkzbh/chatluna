import { expect } from 'chai'
import { getSandboxIdentity } from '../src/computer/identity'

describe('Workspace sandbox identity', () => {
    it('shares one sandbox across users and conversations in a group', () => {
        const first = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot',
            isDirect: false,
            userId: 'user-a',
            guildId: 'group'
        })
        const second = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot',
            isDirect: false,
            userId: 'user-b',
            guildId: 'group'
        })

        expect(first).to.deep.equal(second)
        expect(first.key).to.equal('group:onebot:bot:group')
    })

    it('shares one sandbox across private conversations for one user', () => {
        const identity = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot',
            isDirect: true,
            userId: 'user',
            channelId: 'private-channel'
        })

        expect(identity).to.deep.equal({
            kind: 'private',
            key: 'private:onebot:bot:user',
            subjectId: 'user'
        })
    })

    it('separates group and bot identities', () => {
        const first = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot-a',
            isDirect: false,
            guildId: 'group-a'
        })
        const second = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot-b',
            isDirect: false,
            guildId: 'group-a'
        })
        const third = getSandboxIdentity({
            platform: 'onebot',
            selfId: 'bot-a',
            isDirect: false,
            guildId: 'group-b'
        })

        expect(new Set([first.key, second.key, third.key]).size).to.equal(3)
    })

    it('rejects incomplete routing identity', () => {
        expect(() =>
            getSandboxIdentity({
                platform: 'onebot',
                selfId: 'bot',
                isDirect: false
            })
        ).to.throw('Group Workspace requires a group ID.')
        expect(() =>
            getSandboxIdentity({
                platform: 'onebot',
                selfId: 'bot',
                isDirect: true
            })
        ).to.throw('Private Workspace requires a user ID.')
    })
})
