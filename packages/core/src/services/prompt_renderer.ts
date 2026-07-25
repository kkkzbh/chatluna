import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    MessageContent,
    MessageContentComplex,
    SystemMessage
} from '@langchain/core/messages'
import { Time } from 'koishi'
import { logger } from 'koishi-plugin-chatluna'
import { CompiledPreset } from 'koishi-plugin-chatluna/llm-core/prompt'
import {
    ChatLunaPromptRenderer,
    FunctionProvider,
    RenderOptions,
    RenderResult,
    VariableProvider
} from '@chatluna/shared-prompt-renderer'
import {
    fetchUrl,
    getTimeDiff,
    rollDice,
    selectFromList
} from 'koishi-plugin-chatluna/utils/string'

export class ChatLunaPromptRenderService {
    private _renderer: ChatLunaPromptRenderer

    constructor() {
        this._renderer = new ChatLunaPromptRenderer()
        this._initBuiltinFunctions()
    }

    private _initBuiltinFunctions() {
        this.registerFunctionProvider('time_UTC', (args) => {
            const date = new Date()
            const utcOffset = args[0] ? parseInt(args[0]) : 0
            if (isNaN(utcOffset)) {
                logger.warn(`Invalid UTC offset: ${args[0]}`)
                return 'Invalid UTC offset'
            }
            const offsetDate = new Date(+date + utcOffset * Time.hour)
            return offsetDate.toISOString().replace('T', ' ').slice(0, -5)
        })

        this.registerFunctionProvider('timeDiff', (args) => {
            return getTimeDiff(args[0], args[1])
        })

        this.registerFunctionProvider('date', () => {
            const date = new Date()
            const offsetDate = new Date(
                +date - date.getTimezoneOffset() * Time.minute
            )
            return offsetDate.toISOString().split('T')[0]
        })

        this.registerFunctionProvider('weekday', () => {
            const date = new Date()
            return [
                'Sunday',
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday'
            ][date.getDay()]
        })

        this.registerFunctionProvider('isotime', () => {
            const date = new Date()
            const offsetDate = new Date(
                +date - date.getTimezoneOffset() * Time.minute
            )
            return offsetDate.toISOString().slice(11, 19)
        })

        this.registerFunctionProvider('isodate', () => {
            const date = new Date()
            const offsetDate = new Date(
                +date - date.getTimezoneOffset() * Time.minute
            )
            return offsetDate.toISOString().split('T')[0]
        })

        this.registerFunctionProvider('random', (args) => {
            if (args.length === 2) {
                const [min, max] = args.map(Number)
                if (!isNaN(min) && !isNaN(max)) {
                    return Math.floor(
                        Math.random() * (max - min + 1) + min
                    ).toString()
                }
            }
            return selectFromList(args.join(','), false)
        })

        this.registerFunctionProvider('pick', (args, _variables, cfg) => {
            return selectFromList(
                args.join(','),
                true,
                cfg?.conversationId ?? ''
            )
        })

        this.registerFunctionProvider('roll', (args) => {
            return rollDice(args[0]).toString()
        })

        this.registerFunctionProvider('url', async (args) => {
            return await fetchUrl(
                args[1],
                args[0],
                args[2],
                parseInt(args[3] ?? '1000')
            )
        })
    }

    registerFunctionProvider(
        name: string,
        handler: FunctionProvider
    ): () => void {
        return this._renderer.registerFunctionProvider(name, handler)
    }

    registerVariableProvider(provider: VariableProvider): () => void {
        return this._renderer.registerVariableProvider(provider)
    }

    setVariable(name: string, value: string): void {
        this._renderer.setStaticVariable(name, value)
    }

    getVariable(name: string): string | undefined {
        return this._renderer.getStaticVariable(name)
    }

    removeVariable(name: string): void {
        this._renderer.removeStaticVariable(name)
    }

    async renderTemplate(
        source: string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables: Record<string, any> = {},
        options?: RenderOptions
    ): Promise<RenderResult> {
        return await this._renderer.render(source, variables, options)
    }

    async renderMessages(
        messages: BaseMessage[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables: Record<string, any> = {},
        options?: RenderOptions
    ): Promise<BaseMessage[]> {
        return await Promise.all(
            messages.map(
                async (message) =>
                    (await this._renderMessage(message, variables, options))
                        .message
            )
        )
    }

    async renderCompiledPreset(
        presetTemplate: CompiledPreset,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        variables: Record<string, any> = {},
        options?: RenderOptions
    ): Promise<Omit<RenderResult, 'text'> & { messages: BaseMessage[] }> {
        const collectedVariables = new Set<string>()

        const formattedMessages = await Promise.all(
            presetTemplate.messages.map(async (message) => {
                const rendered = await this._renderMessage(
                    message,
                    variables,
                    options
                )

                for (const variable of rendered.variables) {
                    collectedVariables.add(variable)
                }

                return rendered.message
            })
        )

        return {
            messages: formattedMessages,
            variables: Array.from(collectedVariables)
        }
    }

    private async _renderMessage(
        message: BaseMessage,
        variables: Record<string, unknown>,
        options?: RenderOptions
    ): Promise<{ message: BaseMessage; variables: string[] }> {
        const rendered = await this._renderContent(
            message.content,
            variables,
            options
        )
        const fields = {
            content: rendered.content,
            name: message.name,
            id: message.id,
            additional_kwargs: message.additional_kwargs,
            response_metadata: message.response_metadata
        }

        let result: BaseMessage
        switch (message.getType()) {
            case 'human':
                result = new HumanMessage(fields)
                break
            case 'ai': {
                const ai = message as AIMessage
                result = new AIMessage({
                    ...fields,
                    tool_calls: ai.tool_calls,
                    invalid_tool_calls: ai.invalid_tool_calls,
                    usage_metadata: ai.usage_metadata
                })
                break
            }
            case 'system':
                result = new SystemMessage(fields)
                break
            default:
                throw new Error(
                    `Prompt renderer does not support message type: ${message.getType()}`
                )
        }

        return { message: result, variables: rendered.variables }
    }

    private async _renderContent(
        content: MessageContent,
        variables: Record<string, unknown>,
        options?: RenderOptions
    ): Promise<{ content: MessageContent; variables: string[] }> {
        if (typeof content === 'string') {
            const rendered = await this.renderTemplate(
                content,
                variables,
                options
            )
            return {
                content: rendered.text,
                variables: rendered.variables
            }
        }

        const collectedVariables = new Set<string>()
        const parts = await Promise.all(
            content.map(async (part): Promise<MessageContentComplex> => {
                if (part.type !== 'text' || typeof part.text !== 'string') {
                    return part
                }

                const rendered = await this.renderTemplate(
                    part.text,
                    variables,
                    options
                )
                for (const variable of rendered.variables) {
                    collectedVariables.add(variable)
                }
                return {
                    ...part,
                    text: rendered.text
                }
            })
        )

        return {
            content: parts,
            variables: Array.from(collectedVariables)
        }
    }
}
