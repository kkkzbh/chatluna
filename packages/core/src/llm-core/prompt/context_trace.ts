import {
    BaseMessage,
    mapStoredMessageToChatMessage,
    MessageContent,
    MessageContentComplex,
    MessageType
} from '@langchain/core/messages'
import { createHash, randomUUID } from 'crypto'
import type { PresetResolution } from '../../types'

export type ContextTraceStage =
    | 'system_prompts'
    | 'chat_history'
    | 'long_history'
    | 'injections'
    | 'input'
    | 'scratchpad'
    | 'after_scratchpad'
    | 'tools'

export type ContextTraceStatus = 'candidate' | 'included' | 'dropped'

export type ContextTraceDropReason =
    | 'empty'
    | 'history_budget'
    | 'document_budget'
    | 'lore_budget'
    | 'missing_template'
    | 'model_crop'

export interface ContextBlueprintStage {
    id: ContextTraceStage
    order: number
    title: string
    description: string
    dynamic: boolean
}

export const CONTEXT_BLUEPRINT: readonly ContextBlueprintStage[] = [
    {
        id: 'system_prompts',
        order: 0,
        title: 'Core instructions and preset messages',
        description:
            'Runtime instructions followed by the rendered preset messages.',
        dynamic: false
    },
    {
        id: 'chat_history',
        order: 100,
        title: 'Chat history',
        description:
            'The most recent complete conversation rounds within the prompt budget.',
        dynamic: true
    },
    {
        id: 'long_history',
        order: 200,
        title: 'Long memory, knowledge, and documents',
        description:
            'Retrieved document collections rendered through their collection-specific preset or runtime prompt.',
        dynamic: true
    },
    {
        id: 'injections',
        order: 300,
        title: 'Lore, authors note, and injections',
        description:
            'Anchored persistent, queued, and request-local prompt injections.',
        dynamic: true
    },
    {
        id: 'input',
        order: 400,
        title: 'Current input',
        description: 'The current user message.',
        dynamic: true
    },
    {
        id: 'scratchpad',
        order: 500,
        title: 'Agent scratchpad',
        description: 'Agent reasoning state and tool observations.',
        dynamic: true
    },
    {
        id: 'after_scratchpad',
        order: 600,
        title: 'Runtime fragments and reply protocol',
        description:
            'Messages injected after the scratchpad, including QQBot runtime context.',
        dynamic: true
    },
    {
        id: 'tools',
        order: 700,
        title: 'Tool definitions',
        description:
            'Tool names, descriptions, and input schemas sent alongside messages.',
        dynamic: true
    }
]

export interface ContextTraceSource {
    kind:
        | 'instructions'
        | 'preset'
        | 'history'
        | 'long_memory'
        | 'knowledge'
        | 'document'
        | 'lore'
        | 'authors_note'
        | 'input'
        | 'scratchpad'
        | 'injection'
        | 'runtime'
        | 'model_input'
    name: string
    path?: string
    authority?: string
    trust?: string
    ttl?: string
}

export interface ContextTraceEntry {
    id: string
    messageId?: string
    parentMessageId?: string
    stage: ContextTraceStage
    source: ContextTraceSource
    role: MessageType | 'document'
    purpose?: string
    content: MessageContent
    tokenEstimate: number
    status: ContextTraceStatus
    reason?: ContextTraceDropReason
    assembledOrder?: number
    finalOrder?: number
}

export interface ContextTrace {
    traceId: string
    requestId: string
    conversationId?: string
    presetId?: string
    presetRevision?: string
    presetResolution?: PresetResolution
    createdAt: Date
    entries: ContextTraceEntry[]
    assembledMessageIds: string[]
    onceInjectionLease?: ContextTraceLease
}

export interface ContextTraceLease {
    commit: () => void
    release: () => void
}

export interface ModelCallIdentity {
    callId: string
    callOrdinal: number
}

export interface TraceMessageOptions {
    stage: ContextTraceStage
    source: ContextTraceSource
    purpose?: string
    tokenEstimate: number
    status: ContextTraceStatus
    reason?: ContextTraceDropReason
}

export interface ModelContextMessage {
    id: string
    role: MessageType
    name?: string
    content: MessageContent
    tokenEstimate: number
    stage: ContextTraceStage
    source: ContextTraceSource
    purpose?: string
    qqbotContext?: {
        source?: string
        title?: string
        authority?: string
        trust?: string
        ttl?: string
        payloadKind?: string
    }
    toolCallId?: string
    toolCalls?: {
        id?: string
        name: string
        args?: unknown
    }[]
}

export interface ModelContextTool {
    name: string
    description: string
    schema: unknown
}

export interface ModelContextToolCall {
    id?: string
    name: string
    args?: unknown
}

export interface ModelContextPayload {
    callId: string
    callOrdinal: number
    requestId: string
    conversationId: string
    platform: string
    model: string
    canonicalModel?: string
    transportModel?: string
    requestMode?: string
    stream: boolean
    semanticStage: 'before_provider_serialization'
    contextLimit: number
    modelContextSize: number
    estimatedTokens: number
    assembledCount: number
    finalCount: number
    truncated: boolean
    assembledMessages: ModelContextMessage[]
    finalMessages: ModelContextMessage[]
    trace: ContextTraceEntry[]
    tools: ModelContextTool[]
    presetId?: string
    presetRevision?: string
    presetResolution?: PresetResolution
    createdAt: Date
}

export type ModelContextInput = Omit<
    ModelContextPayload,
    'platform' | 'model' | 'createdAt'
> & {
    platform?: string
    model?: string
}

export interface ModelContextReporter {
    (payload: ModelContextInput): Promise<void> | void
}

const traces = new Map<string, { trace: ContextTrace; timer: NodeJS.Timeout }>()
let modelCallOrdinal = 0

export function createModelCallIdentity(): ModelCallIdentity {
    modelCallOrdinal += 1
    return {
        callId: randomUUID(),
        callOrdinal: modelCallOrdinal
    }
}

export function createContextTrace(meta: {
    requestId?: string
    conversationId?: string
    presetId?: string
    presetRevision?: string
    presetResolution?: PresetResolution
}): ContextTrace {
    return {
        traceId: randomUUID(),
        requestId: meta.requestId ?? randomUUID(),
        conversationId: meta.conversationId,
        presetId: meta.presetId,
        presetRevision: meta.presetRevision,
        presetResolution: meta.presetResolution,
        createdAt: new Date(),
        entries: [],
        assembledMessageIds: []
    }
}

export function registerContextTrace(trace: ContextTrace): void {
    if (traces.has(trace.traceId)) {
        throw new Error(`Context trace ${trace.traceId} is already registered`)
    }

    const timer = setTimeout(() => {
        traces.delete(trace.traceId)
        trace.onceInjectionLease?.release()
    }, 120000)
    timer.unref()
    traces.set(trace.traceId, { trace, timer })
}

export function takeContextTrace(traceId?: string): ContextTrace | undefined {
    if (!traceId) return
    const current = traces.get(traceId)
    if (!current) return
    clearTimeout(current.timer)
    traces.delete(traceId)
    return current.trace
}

export function releaseContextTrace(trace: ContextTrace): void {
    const current = traces.get(trace.traceId)
    if (current) {
        clearTimeout(current.timer)
        traces.delete(trace.traceId)
    }
    trace.onceInjectionLease?.release()
}

export function contextTraceIdFromMessages(
    messages: readonly BaseMessage[]
): string | undefined {
    let traceId: string | undefined
    for (const message of messages) {
        const value =
            message.response_metadata?.chatluna_context_trace ??
            message.additional_kwargs?.chatluna_context_trace
        if (value == null) continue
        if (typeof value !== 'string' || value.length === 0) {
            throw new Error('Invalid context trace carrier')
        }
        if (traceId != null && traceId !== value) {
            throw new Error('Conflicting context trace carriers')
        }
        traceId = value
    }
    return traceId
}

export function applyModelCropTrace(
    trace: ContextTrace,
    finalMessages: readonly BaseMessage[]
): void {
    const finalIds = new Set(finalMessages.map((message) => message.id))
    const finalOrder = new Map(
        finalMessages.map((message, index) => [message.id, index])
    )

    for (const entry of trace.entries) {
        if (!entry.messageId || entry.role === 'document') continue
        if (finalIds.has(entry.messageId)) {
            entry.status = 'included'
            entry.reason = undefined
            entry.finalOrder = finalOrder.get(entry.messageId)
            continue
        }
        if (entry.status === 'included') {
            entry.status = 'dropped'
            entry.reason = 'model_crop'
            entry.finalOrder = undefined
        }
    }

    const statusByMessageId = new Map(
        trace.entries
            .filter((entry) => entry.messageId != null)
            .map((entry) => [entry.messageId as string, entry.status])
    )
    for (const entry of trace.entries) {
        if (entry.role !== 'document' || entry.parentMessageId == null) continue
        if (statusByMessageId.get(entry.parentMessageId) === 'dropped') {
            entry.status = 'dropped'
            entry.reason = 'model_crop'
        }
    }
}

export interface DataUrlSummary {
    mimeType: string
    size: number
    sha256: string
    malformed: boolean
}

const DATA_URL_MIME_TYPE = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu
const DATA_URL_TOKEN = /data:[^\s<>"']*/giu
const BASE64_PAYLOAD =
    /^(?:[a-z0-9+/]{4})*(?:[a-z0-9+/]{2}==|[a-z0-9+/]{3}=)?$/iu

function decodePercentEncodedData(payload: string): Buffer {
    const bytes: number[] = []
    for (let index = 0; index < payload.length; index += 1) {
        if (payload[index] === '%') {
            const encoded = payload.slice(index + 1, index + 3)
            if (!/^[a-f0-9]{2}$/iu.test(encoded)) {
                throw new Error('Invalid percent-encoded data URL payload')
            }
            bytes.push(Number.parseInt(encoded, 16))
            index += 2
            continue
        }

        const codePoint = payload.codePointAt(index)
        if (codePoint == null) continue
        const encoded = Buffer.from(String.fromCodePoint(codePoint), 'utf8')
        bytes.push(...encoded)
        if (codePoint > 0xffff) index += 1
    }
    return Buffer.from(bytes)
}

function decodeBase64Data(payload: string): Buffer {
    const normalized = payload
        .replaceAll(/\s/gu, '')
        .replaceAll('-', '+')
        .replaceAll('_', '/')
    if (!BASE64_PAYLOAD.test(normalized)) {
        throw new Error('Invalid base64 data URL payload')
    }
    return Buffer.from(normalized, 'base64')
}

export function summarizeDataUrl(value: string): DataUrlSummary | null {
    if (!value.toLowerCase().startsWith('data:')) return null

    const separator = value.indexOf(',')
    const metadata = separator < 0 ? value.slice(5) : value.slice(5, separator)
    const payload = separator < 0 ? '' : value.slice(separator + 1)
    const parts = metadata.split(';')
    let mimeType = 'text/plain'
    let base64 = false
    let malformed = separator < 0

    if (parts[0]) {
        if (DATA_URL_MIME_TYPE.test(parts[0])) {
            mimeType = parts.shift() as string
        } else {
            malformed = true
            parts.shift()
        }
    } else {
        parts.shift()
    }

    for (const part of parts) {
        if (part.toLowerCase() === 'base64') {
            if (base64) malformed = true
            base64 = true
            continue
        }
        if (!/^[a-z0-9!#$&^_.+-]+=[^;]*$/iu.test(part)) {
            malformed = true
        }
    }

    let bytes: Buffer
    try {
        bytes = base64
            ? decodeBase64Data(payload)
            : decodePercentEncodedData(payload)
    } catch {
        malformed = true
        bytes = Buffer.from(payload, 'utf8')
    }

    return {
        mimeType,
        size: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        malformed
    }
}

function formatDataUrlSummary(summary: DataUrlSummary): string {
    return (
        `[data omitted: ${summary.mimeType}, ${summary.size} bytes, ` +
        `sha256:${summary.sha256}${summary.malformed ? ', malformed' : ''}]`
    )
}

function binaryDescriptorFromBase64(
    payload: string,
    mimeType: unknown
): Record<string, unknown> {
    let bytes: Buffer
    let malformed = false
    try {
        bytes = decodeBase64Data(payload)
    } catch {
        malformed = true
        bytes = Buffer.from(payload, 'utf8')
    }
    return {
        kind: 'binary',
        mimeType:
            typeof mimeType === 'string' && mimeType.length > 0
                ? mimeType
                : 'application/octet-stream',
        size: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        ...(malformed ? { malformed: true } : {})
    }
}

function dataUrlDescriptor(value: string): Record<string, unknown> | null {
    const summary = summarizeDataUrl(value)
    if (summary == null) return null
    return {
        kind: 'binary',
        mimeType: summary.mimeType,
        size: summary.size,
        sha256: summary.sha256,
        ...(summary.malformed ? { malformed: true } : {})
    }
}

export function redactDataUrls(value: string): string {
    const trimmed = value.trimStart()
    const exact = summarizeDataUrl(trimmed)
    if (exact != null) return formatDataUrlSummary(exact)

    return value.replace(DATA_URL_TOKEN, (candidate) => {
        const summary = summarizeDataUrl(candidate)
        return summary == null
            ? '[data URL omitted: malformed]'
            : formatDataUrlSummary(summary)
    })
}

export function redactContextContent(content: MessageContent): MessageContent {
    if (typeof content === 'string') {
        const redacted = redactSensitiveUrls(redactDataUrls(content))
        try {
            const parsed = JSON.parse(redacted)
            if (parsed != null && typeof parsed === 'object') {
                return JSON.stringify(redactContextValue(parsed))
            }
        } catch {}
        return redacted
    }

    return content.map((part): MessageContentComplex => {
        // LangChain deliberately permits adapter-specific multimodal fields.
        const result: Record<string, unknown> = { ...part }

        if ('image_url' in result) {
            result.image_url = redactMediaUrl(result.image_url)
        }

        for (const key of ['audio_url', 'video_url', 'file_url']) {
            if (key in result) result[key] = redactMediaUrl(result[key])
        }

        const inlineData = result.inline_data
        if (isRecord(inlineData) && typeof inlineData.data === 'string') {
            result.inline_data = binaryDescriptorFromBase64(
                inlineData.data,
                inlineData.mime_type
            )
        }
        if (
            result.source_type === 'base64' &&
            typeof result.data === 'string'
        ) {
            result.data = binaryDescriptorFromBase64(
                result.data,
                result.mime_type
            )
        }

        return redactContextValue(result) as MessageContentComplex
    })
}

const SECRET_CONTEXT_FIELDS = new Set([
    'authorization',
    'proxyauthorization',
    'cookie',
    'cookies',
    'setcookie',
    'header',
    'headers',
    'apikey',
    'apitoken',
    'token',
    'accesstoken',
    'refreshtoken',
    'clientsecret',
    'sessionsecret',
    'password',
    'credential',
    'credentials',
    'toolcredential',
    'toolcredentials',
    'secret'
])

function isRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function isSecretContextField(value: string): boolean {
    const normalized = value.replace(/[^a-z0-9]/giu, '').toLowerCase()
    return (
        SECRET_CONTEXT_FIELDS.has(normalized) ||
        normalized === 'sig' ||
        normalized.includes('credential') ||
        normalized.includes('signature') ||
        normalized.includes('authorization') ||
        normalized.includes('password') ||
        normalized.includes('secret') ||
        normalized.includes('cookie') ||
        normalized.endsWith('token') ||
        /^(?:api|access|private|secret)key/u.test(normalized)
    )
}

const HTTP_URL_TOKEN =
    /\bhttps?:\/\/[^\s<>"'`，。；！？、）》」』】〉〕〗〙〛]+/giu

function splitUrlSuffix(value: string): [url: string, suffix: string] {
    let end = value.length
    while (end > 0) {
        const tail = value[end - 1]
        if (['.', ',', ';', '!'].includes(tail)) {
            end -= 1
            continue
        }
        const opening =
            tail === ')' ? '(' : tail === ']' ? '[' : tail === '}' ? '{' : null
        if (opening == null) break
        const candidate = value.slice(0, end)
        const openingCount = candidate.split(opening).length - 1
        const closingCount = candidate.split(tail).length - 1
        if (closingCount <= openingCount) break
        end -= 1
    }
    return [value.slice(0, end), value.slice(end)]
}

export function redactSensitiveUrls(value: string): string {
    return value.replace(HTTP_URL_TOKEN, (raw) => {
        const [candidate, suffix] = splitUrlSuffix(raw)
        try {
            const url = new URL(candidate)
            url.username = ''
            url.password = ''
            for (const key of [...url.searchParams.keys()]) {
                url.searchParams.set(key, '[redacted]')
            }
            url.hash = ''
            return `${url.toString()}${suffix}`
        } catch {
            return `[invalid URL redacted]${suffix}`
        }
    })
}

function redactMediaUrl(value: unknown): unknown {
    if (typeof value === 'string') {
        return redactSensitiveUrls(redactDataUrls(value))
    }
    if (!isRecord(value) || typeof value.url !== 'string') return value
    return {
        ...value,
        url: redactSensitiveUrls(redactDataUrls(value.url))
    }
}

export function redactContextValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => redactContextValue(item))
    }
    if (typeof value === 'string') {
        return (
            dataUrlDescriptor(value) ??
            redactSensitiveUrls(redactDataUrls(value))
        )
    }
    if (value == null || typeof value !== 'object') return value

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key]) => !isSecretContextField(key))
            .map(([key, item]) => [key, redactContextValue(item)])
    )
}

const SENSITIVE_SCHEMA_ANNOTATION = /^(default|example|examples|const)$/u

function redactContextSchemaValue(
    value: unknown,
    propertyNames: boolean
): unknown {
    if (Array.isArray(value)) {
        return value.map((item) => redactContextSchemaValue(item, false))
    }
    if (typeof value === 'string') {
        return (
            dataUrlDescriptor(value) ??
            redactSensitiveUrls(redactDataUrls(value))
        )
    }
    if (value == null || typeof value !== 'object') return value

    return Object.fromEntries(
        Object.entries(value)
            .filter(
                ([key]) =>
                    !SENSITIVE_SCHEMA_ANNOTATION.test(key) &&
                    (propertyNames || !isSecretContextField(key))
            )
            .map(([key, item]) => [
                key,
                redactContextSchemaValue(
                    item,
                    [
                        'properties',
                        'patternProperties',
                        '$defs',
                        'definitions'
                    ].includes(key)
                )
            ])
    )
}

export function redactContextSchema(value: unknown): unknown {
    return redactContextSchemaValue(value, false)
}

export function redactContextToolCalls<
    T extends {
        id?: string
        name: string
        args?: unknown
    }
>(calls?: readonly T[]): ModelContextToolCall[] | undefined {
    return calls?.map((call) => ({
        id: call.id,
        name: call.name,
        ...(call.args === undefined
            ? {}
            : { args: redactContextValue(call.args) })
    }))
}

export function stripContextMetadata(msg: BaseMessage): BaseMessage {
    const internal =
        Object.keys(msg.additional_kwargs).some((key) =>
            key.startsWith('qqbot_')
        ) ||
        'chatluna_context_trace' in msg.additional_kwargs ||
        'chatluna_context_trace' in msg.response_metadata
    if (!internal) return msg

    const stored = msg.toDict()
    stored.data.additional_kwargs = {
        ...stored.data.additional_kwargs
    }
    stored.data.response_metadata = {
        ...stored.data.response_metadata
    }
    for (const key of Object.keys(stored.data.additional_kwargs)) {
        if (key.startsWith('qqbot_') || key === 'chatluna_context_trace') {
            delete stored.data.additional_kwargs[key]
        }
    }
    delete stored.data.response_metadata.chatluna_context_trace
    return mapStoredMessageToChatMessage(stored)
}

export function traceMessage(
    trace: ContextTrace,
    msg: BaseMessage,
    opts: TraceMessageOptions
): ContextTraceEntry {
    msg.id ??= randomUUID()
    const current = trace.entries.find(
        (entry) => entry.messageId === msg.id && entry.role !== 'document'
    )
    const qqbot = msg.additional_kwargs?.qqbot_context as
        | {
              source?: string
              title?: string
              authority?: string
              trust?: string
              ttl?: string
          }
        | undefined
    const source = qqbot
        ? {
              kind: 'runtime' as const,
              name: qqbot.source ?? opts.source.name,
              path: opts.source.path,
              authority: qqbot.authority,
              trust: qqbot.trust,
              ttl: qqbot.ttl
          }
        : opts.source

    if (current) {
        current.stage = opts.stage
        current.source = source
        current.content = msg.content
        current.purpose =
            opts.purpose ??
            (msg.additional_kwargs.purpose as string | undefined)
        current.tokenEstimate = opts.tokenEstimate
        current.status = opts.status
        current.reason = opts.reason
        return current
    }

    const entry: ContextTraceEntry = {
        id: randomUUID(),
        messageId: msg.id,
        stage: opts.stage,
        source,
        role: msg.getType(),
        purpose:
            opts.purpose ??
            (msg.additional_kwargs.purpose as string | undefined),
        content: msg.content,
        tokenEstimate: opts.tokenEstimate,
        status: opts.status,
        reason: opts.reason
    }
    trace.entries.push(entry)
    return entry
}

export function traceDocument(
    trace: ContextTrace,
    opts: Omit<TraceMessageOptions, 'stage'> & {
        id?: string
        content: string
        stage?: ContextTraceStage
        role?: 'document'
    }
): ContextTraceEntry {
    const entry: ContextTraceEntry = {
        id: randomUUID(),
        messageId: opts.id,
        stage: opts.stage ?? 'long_history',
        source: opts.source,
        role: 'document',
        content: opts.content,
        tokenEstimate: opts.tokenEstimate,
        status: opts.status,
        reason: opts.reason
    }
    trace.entries.push(entry)
    return entry
}

declare module 'koishi' {
    interface Events {
        'chatluna/model-context'(payload: ModelContextPayload): Promise<void>
    }
}
