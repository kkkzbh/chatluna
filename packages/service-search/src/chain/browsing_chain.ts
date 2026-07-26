/* eslint-disable max-len */
import { Embeddings } from '@langchain/core/embeddings'
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage
} from '@langchain/core/messages'
import { PromptTemplate } from '@langchain/core/prompts'
import { StructuredTool } from '@langchain/core/tools'
import { ChainValues } from '@langchain/core/utils/types'
import {
    callChatLunaChain,
    ChatLunaLLMCallArg,
    ChatLunaLLMChain,
    ChatLunaLLMChainWrapper
} from 'koishi-plugin-chatluna/llm-core/chain/base'
import { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model'
import { BufferMemory } from 'koishi-plugin-chatluna/llm-core/memory/langchain'
import { logger } from '..'
import {
    ChatLunaContextManagerService,
    CompiledPreset
} from 'koishi-plugin-chatluna/llm-core/prompt'
import { ChatLunaChatPrompt } from 'koishi-plugin-chatluna/llm-core/chain/prompt'
import {
    ChatLunaTool,
    ChatLunaToolRunnable
} from 'koishi-plugin-chatluna/llm-core/platform/types'
import { applyToolMask, ToolMask } from 'koishi-plugin-chatluna/llm-core/agent'
import { Session } from 'koishi'
import { SearchAction, SummaryType } from '../types'
import { parseSearchAction } from '../utils/parse'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { getMessageContent } from 'koishi-plugin-chatluna/utils/string'
import type { ChatLunaService } from 'koishi-plugin-chatluna/services/chat'
import { ComputedRef } from 'koishi-plugin-chatluna'
import { BrowserManager } from '../tools/browser/manager'

// github.com/langchain-ai/weblangchain/blob/main/nextjs/app/api/chat/stream_log/route.ts#L81

type ChatLunaPromptRenderService = ChatLunaService['promptRenderer']
type PresetKnowledgeService = ChatLunaService['knowledge']

export interface ChatLunaBrowsingChainInput {
    botName: string
    preset: ComputedRef<CompiledPreset>
    embeddings: Embeddings

    historyMemory: BufferMemory
    summaryType: SummaryType

    thoughtMessage: boolean

    chatluna: ChatLunaService

    searchPrompt: string
    newQuestionPrompt: string
    contextualCompressionPrompt?: string
    searchFailedPrompt: string
    variableService: ChatLunaPromptRenderService
    knowledgeService: PresetKnowledgeService
    browserManager: BrowserManager
}

export class ChatLunaBrowsingChain
    extends ChatLunaLLMChainWrapper
    implements ChatLunaBrowsingChainInput
{
    botName: string

    embeddings: Embeddings

    chain: ChatLunaLLMChain

    historyMemory: BufferMemory

    preset: ComputedRef<CompiledPreset>

    tools: ComputedRef<ChatLunaToolWrapper[]>

    newQuestionPrompt: string

    responsePrompt: PromptTemplate

    summaryType: SummaryType

    contextualCompressionPrompt?: string

    variableService: ChatLunaPromptRenderService

    knowledgeService: PresetKnowledgeService

    thoughtMessage: boolean

    searchPrompt: string

    searchFailedPrompt: string

    browserManager: BrowserManager

    chatluna: ChatLunaService

    private _toolMask?: ToolMask

    constructor({
        botName,
        embeddings,
        historyMemory,
        chain,
        searchFailedPrompt,
        tools,
        summaryType,
        thoughtMessage,
        searchPrompt,
        preset,
        newQuestionPrompt,
        variableService,
        knowledgeService,
        chatluna,
        browserManager,
        contextualCompressionPrompt
    }: ChatLunaBrowsingChainInput & {
        chain: ChatLunaLLMChain
        tools: ComputedRef<ChatLunaToolWrapper[]>
        searchPrompt: string
    }) {
        super()
        this.botName = botName
        this.preset = preset

        this.embeddings = embeddings
        this.summaryType = summaryType

        this.historyMemory = historyMemory
        this.thoughtMessage = thoughtMessage
        this.searchFailedPrompt = searchFailedPrompt
        this.newQuestionPrompt = newQuestionPrompt
        this.variableService = variableService
        this.knowledgeService = knowledgeService
        this.browserManager = browserManager
        this.chatluna = chatluna
        this.searchPrompt = searchPrompt
        this.contextualCompressionPrompt = contextualCompressionPrompt

        this.responsePrompt = PromptTemplate.fromTemplate(searchPrompt)
        this.chain = chain
        this.tools = tools
    }

    static fromLLMAndTools(
        llm: ChatLunaChatModel,
        tools: ComputedRef<ChatLunaToolWrapper[]>,
        {
            botName,
            embeddings,
            historyMemory,
            preset,
            thoughtMessage,
            searchPrompt,
            newQuestionPrompt,
            summaryType,
            searchFailedPrompt,
            variableService,
            knowledgeService,
            chatluna,
            contextManager,
            browserManager,
            contextualCompressionPrompt
        }: ChatLunaBrowsingChainInput & {
            contextManager: ChatLunaContextManagerService
        }
    ): ChatLunaBrowsingChain {
        const prompt = new ChatLunaChatPrompt({
            preset,
            tokenCounter: (text) => llm.getNumTokens(text),
            sendTokenLimit:
                llm.invocationParams().maxTokenLimit ??
                llm.getModelMaxContextSize(),
            promptRenderService: variableService,
            knowledgeService,
            contextManager
        })

        const chain = new ChatLunaLLMChain({ llm, prompt })
        return new ChatLunaBrowsingChain({
            variableService,
            knowledgeService,
            chatluna,
            browserManager,
            botName,
            embeddings,
            historyMemory,
            preset,
            thoughtMessage,
            searchFailedPrompt,
            searchPrompt,
            newQuestionPrompt,
            chain,
            tools,
            summaryType,
            contextualCompressionPrompt
        })
    }

    private async _selectTool<T extends StructuredTool = StructuredTool>(
        name: string
    ): Promise<T> {
        const chatLunaTool = this.tools.value.find(
            (tool) => tool.name === name && applyToolMask(name, this._toolMask)
        )

        if (!chatLunaTool) {
            throw new Error(`Tool not available in current room: ${name}`)
        }

        return chatLunaTool.tool.createTool({
            embeddings: this.embeddings
        }) as T
    }

    async call({
        message,
        stream,
        events,
        conversationId,
        session,
        variables,
        maxToken,
        signal,
        toolMask,
        requestId
    }: ChatLunaLLMCallArg): Promise<ChainValues> {
        this._toolMask = toolMask
        const requests: ChainValues = {
            input: message
        }

        let chatHistory = (
            await this.historyMemory.loadMemoryVariables(requests)
        )[this.historyMemory.memoryKey] as BaseMessage[]

        chatHistory = chatHistory.slice()

        requests['chat_history'] = chatHistory
        requests['id'] = conversationId
        requests['variables'] = Object.assign(variables ?? {}, {
            prompt: getMessageContent(message.content)
        })
        requests['variables_hide'] = requests['variables']

        // recreate questions

        const binding = await this.chatluna.resolveModelBinding({
            workload: 'search.summary',
            session,
            requestId
        })
        let summaryModel: ChatLunaChatModel
        if (binding.mode === 'inheritInvocation') {
            summaryModel = this.model
        } else if (binding.mode === 'dedicated') {
            const ref = await this.chatluna.createChatModel(binding.model)
            if (!ref.value) {
                throw new Error(`Model not found: ${binding.model}`)
            }
            summaryModel = ref.value
        } else {
            throw new Error(`Invalid search.summary mode: ${binding.mode}`)
        }

        const newQuestion = (
            await callChatLunaChain(
                new ChatLunaLLMChain({
                    llm: summaryModel,
                    prompt: PromptTemplate.fromTemplate(this.newQuestionPrompt)
                }),
                {
                    chat_history: formatChatHistoryAsString(
                        chatHistory.slice(-6)
                    ),
                    time: new Date().toISOString(),
                    question: getMessageContent(message.content),
                    temperature: 0,
                    signal
                },
                {
                    'llm-used-token-count': events['llm-used-token-count']
                }
            )
        )['text'] as string

        const searchAction = parseSearchAction(newQuestion)

        logger?.debug(`action: ${JSON.stringify(searchAction)}`)

        // search questions

        if (searchAction != null && searchAction.action !== 'skip') {
            await this._search(
                searchAction,
                message,
                chatHistory,
                session,
                events,
                conversationId,
                summaryModel,
                signal
            )
        }

        // format and call

        const finalResponse = await callChatLunaChain(
            this.chain,
            {
                ...requests,
                stream,
                signal,
                configurable: {
                    session
                },
                maxTokens: maxToken
            },
            events
        )

        logger?.debug(`final response %c`, finalResponse.text)

        // remove to reduce context length
        /* if (responsePrompt.length > 0) {
            await this.historyMemory.chatHistory.addMessage(new SystemMessage(responsePrompt))
            await this.historyMemory.chatHistory.addAIChatMessage(
                "OK. I understand. I will respond to the user's question using the same language as their input. What's the user's question?"
            )
        } */

        const aiMessage =
            (finalResponse?.message as AIMessage) ??
            new AIMessage(finalResponse.text)

        return {
            message: aiMessage
        }
    }

    private async _search(
        action: SearchAction,
        message: HumanMessage,
        chatHistory: BaseMessage[],
        session: Session,
        events: ChatLunaLLMCallArg['events'],
        conversationId: string,
        summaryModel: ChatLunaChatModel,
        signal: AbortSignal
    ) {
        if (!Array.isArray(action.content)) {
            logger?.error(
                `search action content is not an array: ${JSON.stringify(action)}`
            )
            return
        }

        if (this.thoughtMessage) {
            await session.send(
                `Search Action: ${action.action}\nThought: ${action.thought}\nContent: ${action.content.join('\n')}`
            )
        }

        const results =
            action.action === 'url'
                ? await this._browseUrls(
                      action.content,
                      session,
                      conversationId,
                      signal
                  )
                : await this._searchQuestions(
                      action.content,
                      session,
                      conversationId,
                      signal
                  )

        return await this._appendSearchPrompt(
            action,
            message,
            chatHistory,
            results,
            events,
            summaryModel,
            signal
        )
    }

    private async _searchQuestions(
        questions: string[],
        session: Session,
        conversationId: string,
        signal: AbortSignal
    ) {
        const tool = await this._selectTool('web_search')
        const results = await raceAbort(
            Promise.allSettled(
                questions.map(async (question) => {
                    const raw = await tool
                        .invoke(question, {
                            configurable: {
                                model: this.model,
                                session,
                                conversationId
                            }
                        })
                        .then((text) => text as string)
                    const parsed = JSON.parse(raw) as SearchResultLike[]

                    if (this.thoughtMessage) {
                        await session.send(
                            `Find ${parsed.length} search results about ${question}.`
                        )
                    }

                    return parsed
                })
            ),
            signal
        )

        return results.flatMap((result) =>
            result.status === 'fulfilled' ? result.value : []
        )
    }

    private async _browseUrls(
        urls: string[],
        session: Session,
        conversationId: string,
        signal: AbortSignal
    ) {
        const runConfig = {
            configurable: {
                model: this.model,
                session,
                conversationId
            }
        } as ChatLunaToolRunnable

        const results = await raceAbort(
            Promise.allSettled(
                urls.map(async (url) => {
                    const text = await this.browserManager.readText(
                        { url },
                        runConfig
                    )

                    if (this.thoughtMessage) {
                        await session.send(`Open ${url} and read the content.`)
                    }

                    return {
                        title: url,
                        description: text,
                        url
                    }
                })
            ),
            signal
        )

        return results.flatMap((result) =>
            result.status === 'fulfilled' ? [result.value] : []
        )
    }

    private async _appendSearchPrompt(
        action: SearchAction,
        message: HumanMessage,
        chatHistory: BaseMessage[],
        results: SearchResultLike[],
        events: ChatLunaLLMCallArg['events'],
        summaryModel: ChatLunaChatModel,
        signal: AbortSignal
    ) {
        let context = formatSearchResults(results)

        if (context.length < 1) {
            if (this.searchFailedPrompt?.length > 0) {
                chatHistory.push(
                    new SystemMessage(
                        this.searchFailedPrompt.replaceAll(
                            '{question}',
                            getMessageContent(message.content)
                        )
                    )
                )
            }
            return ''
        }

        if (this.contextualCompressionPrompt) {
            try {
                context = (
                    await callChatLunaChain(
                        new ChatLunaLLMChain({
                            llm: summaryModel,
                            prompt: PromptTemplate.fromTemplate(
                                this.contextualCompressionPrompt
                            )
                        }),
                        {
                            action: JSON.stringify(action),
                            context,
                            temperature: 0,
                            signal
                        },
                        {
                            'llm-used-token-count':
                                events['llm-used-token-count']
                        }
                    )
                )['text'] as string
            } catch (e) {
                logger?.error(`contextual compression failed: ${e}`)
            }
        }

        const prompt = await this.responsePrompt.format({
            question: getMessageContent(message.content),
            context
        })

        chatHistory.push(new SystemMessage(prompt))
        chatHistory.push(
            new AIMessage(
                "OK. I understand. I will respond to your question using the same language as your input. What's your question?"
            )
        )

        return prompt
    }

    get model() {
        return this.chain.llm
    }
}

const formatChatHistoryAsString = (history: BaseMessage[]) => {
    return history
        .map((message) => `${message.getType()}: ${message.content}`)
        .join('\n')
}

interface ChatLunaToolWrapper {
    name: string
    tool: ChatLunaTool
}

interface SearchResultLike {
    title: string
    description: string
    url: string
}

function formatSearchResults(results: SearchResultLike[]) {
    return results
        .map((result) =>
            Object.entries(result)
                .map(([key, value]) => `${key}: ${value}`)
                .join(', ')
        )
        .join('\n\n')
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal) {
    if (signal?.aborted) {
        return Promise.reject(new ChatLunaError(ChatLunaErrorCode.ABORTED))
    }

    return new Promise<T>((resolve, reject) => {
        const onAbort = () =>
            reject(new ChatLunaError(ChatLunaErrorCode.ABORTED))

        signal?.addEventListener('abort', onAbort, { once: true })
        promise.then(resolve, reject).finally(() => {
            signal?.removeEventListener('abort', onAbort)
        })
    })
}
