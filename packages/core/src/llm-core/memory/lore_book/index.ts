import { Context } from 'koishi'
import { Config, logger } from 'koishi-plugin-chatluna'
import { AIMessage, BaseMessage } from '@langchain/core/messages'
import {
    CompiledPreset,
    LoreEntry,
    MatchedLoreEntry
} from 'koishi-plugin-chatluna/llm-core/prompt'
import { getMessageContent } from 'koishi-plugin-chatluna/utils/string'

export function apply(ctx: Context, config: Config): void {
    const cache = new Map<CompiledPreset, LoreBookMatcher>()

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

            if (preset.lore.entries.length === 0) {
                return
            }

            let matcher = cache.get(preset)
            if (!matcher) {
                const loreBooks = preset.lore.entries
                matcher = new LoreBookMatcher(loreBooks, {
                    scanDepth: preset.lore.defaults.scanDepth,
                    recursiveScan: preset.lore.defaults.recursiveScan,
                    maxRecursionDepth: preset.lore.defaults.maxRecursionDepth
                })
                cache.set(preset, matcher)
            }

            const messages = [
                ...(await chatInterface.chatHistory.getMessages())
            ]

            messages.push(message)

            const matchedLores = matcher.matchLoreBooks(messages)

            if (matchedLores.length > 0) {
                logger.debug(
                    `Found ${matchedLores.length} matched lore books: ${JSON.stringify(
                        matchedLores.map((lore) => lore.entry.keywords)
                    )}`
                )

                ctx.chatluna.contextManager.inject({
                    conversationId,
                    name: 'lore_books',
                    value: matchedLores,
                    once: true
                })
            }
        }
    )

    const clear = (conversationId: string) => {
        cache.clear()
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

export class LoreBookMatcher {
    private loreBooks: MatchedLoreEntry[]
    private defaultConfig: LoreBookConfig
    private regexCache: Map<string, RegExp>

    constructor(
        loreBooks: LoreEntry[],
        defaultConfig: Partial<LoreBookConfig> = {}
    ) {
        this.loreBooks = loreBooks.map((entry, presetEntryIndex) => ({
            entry,
            presetEntryIndex
        }))
        this.defaultConfig = {
            scanDepth: defaultConfig.scanDepth ?? 2,
            recursiveScan: defaultConfig.recursiveScan ?? true,
            maxRecursionDepth: defaultConfig.maxRecursionDepth ?? 3,
            matchWholeWord: defaultConfig.matchWholeWord ?? false,
            caseSensitive: defaultConfig.caseSensitive ?? true
        }
        this.regexCache = new Map()
    }

    matchLoreBooks(messages: BaseMessage[]): MatchedLoreEntry[] {
        const matchedLores = new Map<number, MatchedLoreEntry>()

        const recentMessages = messages.slice().reverse()

        this.stackMatch(recentMessages, matchedLores)

        return Array.from(matchedLores.values()).sort(
            (a, b) =>
                (a.entry.order ?? 0) - (b.entry.order ?? 0) ||
                a.presetEntryIndex - b.presetEntryIndex
        )
    }

    private stackMatch(
        messages: BaseMessage[],
        matchedLores: Map<number, MatchedLoreEntry>
    ): void {
        const stack: [BaseMessage[], number][] = [[messages, 0]]

        while (stack.length > 0) {
            const [currentMessages, depth] = stack.pop()!

            for (const matchedLore of this.loreBooks) {
                const loreBook = matchedLore.entry
                if (
                    loreBook.enabled === false ||
                    matchedLores.has(matchedLore.presetEntryIndex)
                ) {
                    continue
                }

                const config = this.getConfig(loreBook)
                if (depth >= config.maxRecursionDepth) {
                    continue
                }

                // 根据 loreBook 的 scanDepth 裁剪消息
                const relevantMessages = currentMessages.slice(
                    0,
                    config.scanDepth
                )

                for (const message of relevantMessages) {
                    const content = getMessageContent(message.content)

                    const contentParts = this.splitContent(config, content)

                    for (const part of contentParts) {
                        if (
                            !this.matchKeywords(part, loreBook) &&
                            !loreBook.constant
                        ) {
                            continue
                        }

                        matchedLores.set(
                            matchedLore.presetEntryIndex,
                            matchedLore
                        )

                        if (config.recursiveScan) {
                            stack.push([
                                this.splitContent(config, loreBook.content).map(
                                    (c) => new AIMessage(c)
                                ),
                                depth + 1
                            ])
                        }

                        break
                    }
                }
            }
        }
    }

    private matchKeywords(content: string, loreBook: LoreEntry): boolean {
        return loreBook.keywords.some((keyword) => {
            const regex = this.getRegexFromKeyword(keyword, loreBook)
            return regex.test(content)
        })
    }

    private getRegexFromKeyword(keyword: string, loreBook: LoreEntry): RegExp {
        const cacheKey = `${keyword}:${loreBook.caseSensitive}:${loreBook.matchWholeWord}`
        let regex = this.regexCache.get(cacheKey)

        if (!regex) {
            regex = this.createRegexFromKeyword(keyword, loreBook)
            this.regexCache.set(cacheKey, regex)
        }

        return regex
    }

    private splitContent(config: LoreBookConfig, content: string): string[] {
        if (config.matchWholeWord) {
            // 按照中英文标点符号和空格分割
            return content
                .split(/[。！？；；.!?;,，。！？、；：\s]+/g)
                .filter(Boolean)
        }

        return [content]
    }

    private createRegexFromKeyword(
        keyword: string,
        loreBook: LoreEntry
    ): RegExp {
        let flags = ''
        if (!loreBook.caseSensitive) {
            flags += 'i'
        }

        const pattern = loreBook.matchWholeWord ? `\\b${keyword}\\b` : keyword
        return new RegExp(pattern, flags)
    }

    private getConfig(loreBook: LoreEntry): LoreBookConfig {
        return {
            scanDepth: loreBook.scanDepth ?? this.defaultConfig.scanDepth,
            recursiveScan:
                loreBook.recursiveScan ?? this.defaultConfig.recursiveScan,
            maxRecursionDepth:
                loreBook.maxRecursionDepth ??
                this.defaultConfig.maxRecursionDepth,
            matchWholeWord:
                loreBook.matchWholeWord ?? this.defaultConfig.matchWholeWord,
            caseSensitive:
                loreBook.caseSensitive ?? this.defaultConfig.caseSensitive
        }
    }
}

interface LoreBookConfig {
    scanDepth: number
    recursiveScan: boolean
    maxRecursionDepth: number
    matchWholeWord: boolean
    caseSensitive: boolean
}
