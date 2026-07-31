import { Context } from 'koishi'
import { Config } from 'koishi-plugin-chatluna'

export function apply(ctx: Context, config: Config): void {
    const cache = new Map<string, AuthorsNoteCache>()

    ctx.before(
        'chatluna/chat',
        async (
            conversationId,
            message,
            _promptVariables,
            chatInterface,
            chain
        ) => {
            const preset = chatInterface.preset.value

            const authorsNoteCache = cache.get(conversationId) || {
                chatCount: 1
            }
            cache.set(conversationId, authorsNoteCache)
            for (const block of preset.authorsNoteBlocks) {
                if (
                    !block.enabled ||
                    block.insertFrequency === 0 ||
                    authorsNoteCache.chatCount % block.insertFrequency !== 0
                ) {
                    continue
                }
                ctx.chatluna.contextManager.inject({
                    conversationId,
                    name: 'authors_note',
                    value: {
                        blockId: block.id,
                        content: block.content,
                        maxTokens: block.maxTokens
                    },
                    priority: block.budgetPriority,
                    once: true
                })
            }
        }
    )

    ctx.on('chatluna/after-chat', async (conversationId, chatInterface) => {
        let authorsNoteCache = cache.get(conversationId)
        if (!authorsNoteCache) {
            authorsNoteCache = {
                chatCount: 0
            }
            cache.set(conversationId, authorsNoteCache)
        }

        authorsNoteCache.chatCount++
    })

    const clear = (conversationId: string) => {
        cache.delete(conversationId)
        ctx.chatluna.contextManager.clearConversation(conversationId)
    }

    ctx.on('chatluna/after-conversation-clear-history', async (payload) => {
        clear(payload.conversation.id)
    })
    ctx.on('chatluna/after-conversation-archive', async (payload) => {
        clear(payload.conversation.id)
    })
    ctx.on('chatluna/after-conversation-restore', async (payload) => {
        clear(payload.conversation.id)
    })
    ctx.on('chatluna/after-conversation-delete', async (payload) => {
        clear(payload.conversation.id)
    })
}

interface AuthorsNoteCache {
    chatCount: number
}
