import { Context } from 'koishi'
import {
    AIMessage,
    BaseMessage,
    FunctionMessage,
    HumanMessage,
    MessageContent,
    SystemMessage,
    ToolMessage
} from '@langchain/core/messages'
import { BaseChatMessageHistory } from '@langchain/core/chat_history'
import {
    bufferToArrayBuffer,
    gzipDecode,
    gzipEncode
} from 'koishi-plugin-chatluna/utils/string'
import { randomUUID } from 'crypto'
import { observationToMessageContent } from '../../agent/observation'
import type { AgentStep } from '../../agent/types'
import {
    type ChatLunaMessageMeta,
    ConversationNotFoundError,
    type MessageRecord
} from '../../../types'
import type { ChatLunaService } from '../../../services/chat'

function isReplyAgentTailRole(role: string | null | undefined): boolean {
    return role === 'ai' || role === 'tool' || role === 'function'
}

function isConversationBoundaryRole(role: string | null | undefined): boolean {
    return role === 'human' || role === 'system'
}

export interface ResearchReplyHistoryNormalizationResult {
    deletedMessageIds: string[]
    latestId: string | null
    normalizedMessageId: string | null
    normalizedText: string
    requestBoundaryFound: boolean
}

export type ResearchReplyRequestDisposition = 'retain_request' | 'drop_request'

const TRANSIENT_ADDITIONAL_KWARG_KEYS = [
    'qqbot_final_response_contract',
    'qqbot_final_response_schema',
    'qqbot_final_response_instruction',
    'qqbot_input_content_meta',
    'qqbot_override_request_params',
    'qqbot_reply_mode',
    'qqbot_request_budget_policy',
    'overrideRequestParams'
] as const

const TRANSIENT_RESPONSE_METADATA_KEYS = ['chatluna_context_trace'] as const

export class KoishiChatMessageHistory extends BaseChatMessageHistory {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    lc_namespace: string[] = ['llm-core', 'memory', 'message']

    conversationId: string

    private _ctx: Context
    private _latestId: string | null
    private _serializedChatHistory: MessageRecord[]
    private _chatHistory: BaseMessage[]
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _additional_kwargs: Record<string, string>
    private _updatedAt: Date
    constructor(
        ctx: Context,
        conversationId: string,
        private _maxMessagesCount: number,
        private readonly chatluna: ChatLunaService
    ) {
        super()

        this.conversationId = conversationId
        this._ctx = ctx
        this._chatHistory = []
        this._additional_kwargs = {}
        this._updatedAt = new Date(0)
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    get additionalArgs() {
        return this._additional_kwargs
    }

    async getMessages(): Promise<BaseMessage[]> {
        const latestUpdateTime = await this.getLatestUpdateTime()

        if (
            latestUpdateTime > this._updatedAt ||
            this._chatHistory.length === 0
        ) {
            this._chatHistory = await this._loadMessages()
        }

        return this._chatHistory
    }

    async addUserMessage(message: string): Promise<void> {
        const humanMessage = new HumanMessage(message)
        await this.addMessage(humanMessage)
    }

    async addAIChatMessage(message: string): Promise<void> {
        const aiMessage = new AIMessage(message)
        await this.addMessage(aiMessage)
    }

    async addMessage(message: BaseMessage): Promise<void> {
        await this.addMessages([message])
    }

    async addMessages(messages: BaseMessage[]): Promise<void> {
        if (messages.length === 0) {
            return
        }

        await this.loadConversation()

        const serializedMessages: MessageRecord[] = []
        let parentId = this._latestId

        for (const message of messages) {
            const serializedMessage = await serializeMessage(
                message,
                this.conversationId,
                parentId
            )
            serializedMessages.push(serializedMessage)
            parentId = serializedMessage.id
        }

        await this._ctx.database.upsert('chatluna_message', serializedMessages)

        this._serializedChatHistory.push(...serializedMessages)
        this._chatHistory.push(...messages)
        this._latestId = serializedMessages[serializedMessages.length - 1].id

        const updatedAt = new Date()

        await this._trimMessages()

        this._updatedAt = updatedAt

        await this._saveConversation(updatedAt)
    }

    async addAgentToolBatch(steps: AgentStep[]): Promise<void> {
        if (steps.length === 0) {
            return
        }

        await this.addMessages(createAgentToolMessages(steps))
    }

    async normalizeResearchReplyHistory(
        expectedRequestId: string,
        finalVisibleText: string,
        disposition: ResearchReplyRequestDisposition,
        updatedAt: Date = new Date()
    ): Promise<ResearchReplyHistoryNormalizationResult> {
        const requestId = expectedRequestId.trim()
        if (requestId.length < 1) {
            throw new Error(
                'research reply history normalization requires expectedRequestId.'
            )
        }
        if (
            disposition !== 'retain_request' &&
            disposition !== 'drop_request'
        ) {
            throw new Error(
                'research reply history normalization requires a request disposition.'
            )
        }
        await this.loadConversation()

        const latestId = this._latestId
        if (latestId == null) {
            return {
                deletedMessageIds: [],
                latestId: null,
                normalizedMessageId: null,
                normalizedText: '',
                requestBoundaryFound: false
            }
        }

        const messageMap = new Map(
            this._serializedChatHistory.map((message) => [message.id, message])
        )

        let current = messageMap.get(latestId)
        if (!current) {
            throw new Error(
                `research reply history normalization failed: latest message missing (${this.conversationId})`
            )
        }

        const deletedMessageIds: string[] = []
        let boundaryParentId: string | null = null
        let boundaryRequestId: string | null = null
        const latestRole = current.role

        while (current) {
            if (isConversationBoundaryRole(current.role)) {
                boundaryParentId = current.id
                boundaryRequestId = await readRecordRequestId(current)
                break
            }

            if (!isReplyAgentTailRole(current.role)) {
                throw new Error(
                    `research reply history normalization failed: unsupported tail role ${String(current.role ?? '')} (${this.conversationId})`
                )
            }

            deletedMessageIds.push(current.id)

            if (current.parentId == null) {
                current = undefined
                break
            }

            const parent = messageMap.get(current.parentId)
            if (!parent) {
                throw new Error(
                    `research reply history normalization failed: broken parent chain at ${current.id} (${this.conversationId})`
                )
            }

            current = parent
        }

        if (current?.role !== 'human' || boundaryRequestId !== requestId) {
            return {
                deletedMessageIds: [],
                latestId,
                normalizedMessageId: null,
                normalizedText: '',
                requestBoundaryFound: false
            }
        }

        if (
            deletedMessageIds.length === 0 &&
            !isConversationBoundaryRole(latestRole)
        ) {
            throw new Error(
                `research reply history normalization failed: no research tail found (${this.conversationId})`
            )
        }

        const normalizedText = finalVisibleText.trim()
        if (disposition === 'drop_request' && normalizedText.length > 0) {
            throw new Error(
                'research reply history normalization cannot attach visible text to a dropped request.'
            )
        }

        if (disposition === 'drop_request') {
            deletedMessageIds.push(current.id)
            boundaryParentId = current.parentId ?? null
        }

        let normalizedMessageId: string | null = null
        let normalizedMessage: MessageRecord | null = null

        if (normalizedText.length > 0) {
            normalizedMessage = await serializeMessage(
                new AIMessage(normalizedText),
                this.conversationId,
                boundaryParentId
            )

            normalizedMessageId = normalizedMessage.id
        }

        const nextLatestId = normalizedMessageId ?? boundaryParentId
        const hasKwargs =
            this._additional_kwargs &&
            Object.keys(this._additional_kwargs).length > 0

        await this._ctx.database.withTransaction(async (database) => {
            if (normalizedMessage) {
                await database.upsert('chatluna_message', [normalizedMessage])
            }

            await database.upsert('chatluna_conversation', [
                {
                    id: this.conversationId,
                    latestMessageId: nextLatestId,
                    additional_kwargs: hasKwargs
                        ? JSON.stringify(this._additional_kwargs)
                        : null,
                    updatedAt
                }
            ])

            if (deletedMessageIds.length > 0) {
                await database.remove('chatluna_message', {
                    id: deletedMessageIds
                })
            }
        })

        this._latestId = nextLatestId
        this._updatedAt = updatedAt
        this._chatHistory = await this._loadMessages()

        return {
            deletedMessageIds,
            latestId: this._latestId,
            normalizedMessageId,
            normalizedText,
            requestBoundaryFound: true
        }
    }

    async replaceMessages(messages: BaseMessage[]): Promise<void> {
        await this.loadConversation()

        const serializedMessages: MessageRecord[] = []
        let parentId: string | null = null

        for (const message of messages) {
            const serializedMessage = await serializeMessage(
                message,
                this.conversationId,
                parentId
            )
            serializedMessages.push(serializedMessage)
            parentId = serializedMessage.id
        }

        await this._ctx.database.remove('chatluna_message', {
            conversationId: this.conversationId
        })

        if (serializedMessages.length > 0) {
            await this._ctx.database.upsert(
                'chatluna_message',
                serializedMessages
            )
        }

        this._serializedChatHistory = serializedMessages
        this._chatHistory = [...messages]
        this._latestId =
            serializedMessages[serializedMessages.length - 1]?.id ?? null
        const updatedAt = new Date()
        this._updatedAt = updatedAt

        await this._saveConversation(updatedAt)
    }

    async clear(): Promise<void> {
        await this._ctx.database.remove('chatluna_message', {
            conversationId: this.conversationId
        })

        await this._ctx.database.upsert('chatluna_conversation', [
            {
                id: this.conversationId,
                latestMessageId: null,
                updatedAt: new Date()
            }
        ])

        this._serializedChatHistory = []
        this._chatHistory = []
        this._latestId = null
    }

    async delete(): Promise<void> {
        await this._ctx.database.remove('chatluna_conversation', {
            id: this.conversationId
        })
    }

    async updateAdditionalArg(key: string, value: string): Promise<void> {
        await this.loadConversation()
        this._additional_kwargs[key] = value
        await this._saveConversation()
    }

    async getAdditionalArg(key: string): Promise<string> {
        await this.loadConversation()

        return this._additional_kwargs[key]
    }

    async getAdditionalArgs(): Promise<{ [key: string]: string }> {
        await this.loadConversation()
        return this._additional_kwargs
    }

    async deleteAdditionalArg(key: string): Promise<void> {
        await this.loadConversation()
        delete this._additional_kwargs[key]
        await this._saveConversation()
    }

    async removeAllToolAndFunctionMessages(): Promise<BaseMessage[]> {
        const messages = await this.getMessages()
        const filtered = messages.filter((message) => {
            const type = message.getType()
            return type !== 'tool' && type !== 'function'
        })

        if (filtered.length === messages.length) {
            return messages
        }

        await this.replaceMessages(filtered)

        return filtered
    }

    async overrideAdditionalArgs(kwargs: {
        [key: string]: string
    }): Promise<void> {
        await this.loadConversation()
        this._additional_kwargs = Object.assign(this._additional_kwargs, kwargs)
        await this._saveConversation()
    }

    private async getLatestUpdateTime(): Promise<Date> {
        const conversation = (
            await this._ctx.database.get(
                'chatluna_conversation',
                {
                    id: this.conversationId
                },
                ['updatedAt']
            )
        )?.[0]

        return conversation?.updatedAt ?? new Date(0)
    }

    private async _loadMessages(): Promise<BaseMessage[]> {
        const queried = await this._ctx.database.get('chatluna_message', {
            conversationId: this.conversationId
        })

        const sorted: MessageRecord[] = []

        let currentMessageId = this._latestId

        let isBad = false
        const seen = new Set<string>()

        if (currentMessageId == null && queried.length > 0) {
            isBad = true
        }

        while (currentMessageId != null && !isBad) {
            if (seen.has(currentMessageId)) {
                isBad = true
                break
            }

            seen.add(currentMessageId)

            const currentMessage = queried.find(
                (item) => item.id === currentMessageId
            )

            if (!currentMessage) {
                isBad = true
                break
            }

            sorted.unshift(currentMessage)

            currentMessageId = currentMessage.parentId
        }

        if (isBad) {
            this._ctx.logger.warn(
                `Bad conversation detected for %s`,
                this.conversationId
            )

            sorted.length = 0

            await this.clear()
        }

        this._serializedChatHistory = sorted

        const promises = sorted.map(async (item) => {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            const args = JSON.parse(
                item.additional_kwargs_binary
                    ? await gzipDecode(item.additional_kwargs_binary)
                    : '{}'
            )
            const responseMetadata = JSON.parse(
                item.response_metadata_binary
                    ? await gzipDecode(item.response_metadata_binary)
                    : '{}'
            )

            responseMetadata.chatluna = {
                ...(responseMetadata.chatluna ?? {}),
                recordId: item.id,
                createdAt: item.createdAt?.toISOString()
            }

            let content: MessageContent
            try {
                content = JSON.parse(
                    item.content
                        ? await gzipDecode(item.content)
                        : (item.text as string)
                ) as MessageContent
            } catch {
                this._ctx.logger.warn(
                    `Failed to deserialize message content for %s in %s, using fallback text.`,
                    item.id,
                    this.conversationId
                )
                content =
                    typeof item.text === 'string'
                        ? (item.text as MessageContent)
                        : ('' as MessageContent)
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fields = {
                content,
                id: item.rawId ?? undefined,
                name: item.name ?? undefined,
                tool_calls:
                    (item.tool_calls as AIMessage['tool_calls']) ?? undefined,
                tool_call_id: item.tool_call_id ?? undefined,
                response_metadata: responseMetadata,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                additional_kwargs: args as any
            }
            if (item.role === 'system') {
                return new SystemMessage(fields)
            } else if (item.role === 'human') {
                return new HumanMessage(fields)
            } else if (item.role === 'ai') {
                return new AIMessage(fields)
            } else if (item.role === 'function') {
                return new FunctionMessage(fields)
            } else if (item.role === 'tool') {
                return new ToolMessage(fields)
            } else {
                throw new Error('Unknown role')
            }
        })

        return await Promise.all(promises)
    }

    private async _loadConversation() {
        const conversation = (
            await this._ctx.database.get('chatluna_conversation', {
                id: this.conversationId
            })
        )?.[0]

        if (conversation) {
            this._latestId = conversation.latestMessageId ?? null
            this._additional_kwargs =
                conversation.additional_kwargs != null
                    ? JSON.parse(conversation.additional_kwargs)
                    : {}
        } else {
            throw new ConversationNotFoundError()
        }

        if (!this._serializedChatHistory) {
            await this._loadMessages()
            this._updatedAt = conversation.updatedAt
        }
    }

    async loadConversation() {
        if (!this._serializedChatHistory) {
            await this._loadConversation()
        }
    }

    private async _trimMessages() {
        if (this._serializedChatHistory.length > this._maxMessagesCount) {
            const toDeleted = this._serializedChatHistory.splice(
                0,
                this._serializedChatHistory.length - this._maxMessagesCount
            )

            while (
                this._serializedChatHistory[0] != null &&
                ['ai', 'function', 'tool'].includes(
                    this._serializedChatHistory[0].role
                )
            ) {
                const message = this._serializedChatHistory.shift()

                if (message) {
                    toDeleted.push(message)
                }
            }

            await this._ctx.database.remove('chatluna_message', {
                id: toDeleted.map((item) => item.id)
            })

            const firstMessage = this._serializedChatHistory[0]
            this._latestId =
                this._serializedChatHistory[
                    this._serializedChatHistory.length - 1
                ]?.id ?? null

            if (firstMessage) {
                firstMessage.parentId = null

                await this._ctx.database.upsert('chatluna_message', [
                    firstMessage
                ])
            }

            this._chatHistory = await this._loadMessages()
        }
    }

    private async _saveConversation(time: Date = new Date()) {
        const hasKwargs =
            this._additional_kwargs &&
            Object.keys(this._additional_kwargs).length > 0

        await this._ctx.database.upsert('chatluna_conversation', [
            {
                id: this.conversationId,
                latestMessageId: this._latestId,
                additional_kwargs: hasKwargs
                    ? JSON.stringify(this._additional_kwargs)
                    : null,
                updatedAt: time
            }
        ])
    }
}

async function serializeMessage(
    message: BaseMessage,
    conversationId: string,
    parentId?: string | null
): Promise<MessageRecord> {
    const meta = readMessageMeta(message)
    const id = meta.recordId ?? randomUUID()
    const createdAt = meta.createdAt ? new Date(meta.createdAt) : new Date()

    writeMessageMeta(message, {
        recordId: id,
        createdAt: createdAt.toISOString()
    })

    let additionalArgs = Object.assign({}, message.additional_kwargs)

    delete additionalArgs['preset']
    delete additionalArgs['raw_content']
    delete additionalArgs['type']
    for (const key of TRANSIENT_ADDITIONAL_KWARG_KEYS) {
        delete additionalArgs[key]
    }

    if (Object.keys(additionalArgs).length === 0) {
        additionalArgs = null
    }

    let responseMetadata = Object.assign({}, message.response_metadata)
    for (const key of TRANSIENT_RESPONSE_METADATA_KEYS) {
        delete responseMetadata[key]
    }

    if (Object.keys(responseMetadata).length === 0) {
        responseMetadata = null
    }

    return {
        id,
        content: await gzipEncode(JSON.stringify(message.content)).then((buf) =>
            bufferToArrayBuffer(buf)
        ),
        parentId: parentId ?? null,
        role: message.getType(),
        name: message.name,
        tool_calls: message['tool_calls'],
        tool_call_id: message['tool_call_id'],
        additional_kwargs_binary:
            additionalArgs && Object.keys(additionalArgs).length > 0
                ? await gzipEncode(JSON.stringify(additionalArgs)).then((buf) =>
                      bufferToArrayBuffer(buf)
                  )
                : null,
        response_metadata_binary:
            responseMetadata && Object.keys(responseMetadata).length > 0
                ? await gzipEncode(JSON.stringify(responseMetadata)).then(
                      (buf) => bufferToArrayBuffer(buf)
                  )
                : null,
        rawId: message.id ?? null,
        conversationId,
        createdAt
    }
}

async function readRecordRequestId(
    message: MessageRecord
): Promise<string | null> {
    if (message.response_metadata_binary == null) {
        return null
    }
    const metadata = JSON.parse(
        await gzipDecode(message.response_metadata_binary)
    ) as { chatluna?: { requestId?: unknown } }
    const requestId = metadata.chatluna?.requestId
    return typeof requestId === 'string' && requestId.trim().length > 0
        ? requestId.trim()
        : null
}

function createAgentToolMessages(steps: AgentStep[]): BaseMessage[] {
    const reasoning = steps[0]?.action.reasoningContent
    const message = steps[0]?.action.messageLog?.[0]

    return [
        new AIMessage({
            content: '',
            additional_kwargs: {
                ...(message?.additional_kwargs ?? {}),
                ...(reasoning != null ? { reasoning_content: reasoning } : {})
            },
            tool_calls: steps.map((step) => ({
                id: step.action.toolCallId,
                name: step.action.tool,
                args:
                    typeof step.action.toolInput !== 'string'
                        ? step.action.toolInput
                        : { input: step.action.toolInput }
            }))
        }),
        ...steps.map(
            (step) =>
                new ToolMessage({
                    content: observationToMessageContent(step.observation),
                    tool_call_id: step.action.toolCallId,
                    name: step.action.tool
                })
        )
    ]
}

function readMessageMeta(message: BaseMessage) {
    const meta = message.response_metadata?.chatluna as
        | ChatLunaMessageMeta
        | undefined

    return {
        recordId:
            typeof meta?.recordId === 'string' && meta.recordId.length > 0
                ? meta.recordId
                : undefined,
        createdAt:
            typeof meta?.createdAt === 'string' && meta.createdAt.length > 0
                ? meta.createdAt
                : undefined
    }
}

function writeMessageMeta(message: BaseMessage, meta: ChatLunaMessageMeta) {
    message.response_metadata = {
        ...(message.response_metadata ?? {}),
        chatluna: {
            ...((message.response_metadata?.chatluna as ChatLunaMessageMeta) ??
                {}),
            ...meta
        }
    }
}
