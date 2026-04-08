import {
    AIMessage,
    BaseMessage,
    FunctionMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage
} from '@langchain/core/messages'
import type { MessageContent, MessageContentComplex } from '@langchain/core/messages'
import type { Context } from 'koishi'

export interface HistoryAttachmentRef {
    refId: string
    kind: string
    filename?: string | null
    mimeType?: string | null
    storageFileId?: string | null
    storageUrl?: string | null
    byteSize?: number | null
    hash?: string | null
    createdAt?: number | null
    senderId?: string | null
    senderName?: string | null
}

interface HistoryAttachmentArchiverLike {
    archiveMessageAttachments?: (args: {
        conversationId: string
        message: BaseMessage
    }) => Promise<HistoryAttachmentRef[] | { refs?: HistoryAttachmentRef[] } | null>
}

const HISTORY_ATTACHMENT_REF_KEY = 'qqbot_attachment_refs'
const RAW_ATTACHMENT_KWARG_KEYS = ['images', '__file_total_size']

function normalizeText(value: unknown): string {
    return String(value ?? '').trim()
}

function isTextPart(part: unknown): part is MessageContentComplex & { type: 'text'; text: string } {
    return (
        part != null &&
        typeof part === 'object' &&
        (part as { type?: unknown }).type === 'text' &&
        typeof (part as { text?: unknown }).text === 'string'
    )
}

function toContentParts(content: MessageContent | null | undefined): MessageContentComplex[] {
    if (content == null) {
        return []
    }

    if (typeof content === 'string') {
        return content ? [{ type: 'text', text: content }] : []
    }

    return Array.isArray(content) ? content.filter(Boolean) : []
}

function normalizeAttachmentRef(input: unknown): HistoryAttachmentRef | null {
    if (input == null || typeof input !== 'object') {
        return null
    }

    const candidate = input as Record<string, unknown>
    const refId = normalizeText(candidate.refId)
    const kind = normalizeText(candidate.kind)

    if (!refId || !kind) {
        return null
    }

    return {
        refId,
        kind,
        filename: normalizeText(candidate.filename) || null,
        mimeType: normalizeText(candidate.mimeType) || null,
        storageFileId: normalizeText(candidate.storageFileId) || null,
        storageUrl: normalizeText(candidate.storageUrl) || null,
        byteSize:
            typeof candidate.byteSize === 'number' && Number.isFinite(candidate.byteSize)
                ? candidate.byteSize
                : null,
        hash: normalizeText(candidate.hash) || null,
        createdAt:
            typeof candidate.createdAt === 'number' && Number.isFinite(candidate.createdAt)
                ? candidate.createdAt
                : null,
        senderId: normalizeText(candidate.senderId) || null,
        senderName: normalizeText(candidate.senderName) || null
    }
}

function normalizeAttachmentRefs(value: unknown): HistoryAttachmentRef[] {
    if (!Array.isArray(value)) {
        return []
    }

    const seen = new Set<string>()
    const result: HistoryAttachmentRef[] = []

    for (const item of value) {
        const ref = normalizeAttachmentRef(item)
        if (!ref || seen.has(ref.refId)) {
            continue
        }

        seen.add(ref.refId)
        result.push(ref)
    }

    return result
}

function mergeAttachmentRefs(
    base: HistoryAttachmentRef[],
    incoming: HistoryAttachmentRef[]
): HistoryAttachmentRef[] {
    const merged = new Map<string, HistoryAttachmentRef>()

    for (const ref of [...base, ...incoming]) {
        if (!ref?.refId) {
            continue
        }

        merged.set(ref.refId, {
            ...(merged.get(ref.refId) ?? {}),
            ...ref
        })
    }

    return Array.from(merged.values())
}

function formatAttachmentMarker(ref: HistoryAttachmentRef) {
    const fields = [`ref=${ref.refId}`, `kind=${ref.kind}`]
    if (ref.filename) {
        fields.push(`name=${JSON.stringify(ref.filename)}`)
    }
    return `[attachment ${fields.join(' ')}]`
}

function formatFallbackMarker(kind: string) {
    return `[attachment kind=${kind}]`
}

function buildFallbackMarkers(parts: MessageContentComplex[]): string[] {
    const markers = new Set<string>()

    for (const part of parts) {
        if (part == null || typeof part !== 'object' || part.type === 'text') {
            continue
        }

        const type = normalizeText(part.type)
        if (!type) {
            continue
        }

        if (type === 'image_url') {
            markers.add(formatFallbackMarker('image'))
        } else if (type === 'audio_url') {
            markers.add(formatFallbackMarker('audio'))
        } else if (type === 'video_url') {
            markers.add(formatFallbackMarker('video'))
        } else if (type === 'file_url') {
            markers.add(formatFallbackMarker('file'))
        }
    }

    return Array.from(markers)
}

function sanitizeTextContent(text: string, refs: HistoryAttachmentRef[]): string {
    let result = text

    for (const ref of refs) {
        if (ref.storageUrl) {
            result = result.split(ref.storageUrl).join(ref.refId)
        }
    }

    return result.trim()
}

export function sanitizeHistoryContent(
    content: MessageContent | null | undefined,
    refs: HistoryAttachmentRef[]
): MessageContent {
    if (typeof content === 'string') {
        const text = sanitizeTextContent(content, refs)
        if (!text && refs.length > 0) {
            return refs.map(formatAttachmentMarker).join('\n')
        }
        if (
            text &&
            refs.length > 0 &&
            !refs.every((ref) => text.includes(ref.refId))
        ) {
            return `${text}\n${refs.map(formatAttachmentMarker).join('\n')}`
        }
        return text
    }

    const parts = toContentParts(content)
    const textParts = parts.filter(isTextPart).map((part) => part.text)
    const baseText = sanitizeTextContent(textParts.join(''), refs)
    const markers =
        refs.length > 0 ? refs.map(formatAttachmentMarker) : buildFallbackMarkers(parts)

    if (!baseText) {
        return markers.join('\n')
    }

    if (markers.length < 1) {
        return baseText
    }

    const hasAllRefMarkers =
        refs.length > 0 &&
        refs.every((ref) => baseText.includes(ref.refId))

    if (hasAllRefMarkers) {
        return baseText
    }

    return `${baseText}\n${markers.join('\n')}`.trim()
}

export function sanitizeHistoryAdditionalKwargs(
    additionalKwargs: Record<string, unknown> | null | undefined,
    refs: HistoryAttachmentRef[]
) {
    const kwargs = Object.assign({}, additionalKwargs ?? {})

    for (const key of RAW_ATTACHMENT_KWARG_KEYS) {
        delete kwargs[key]
    }

    if (refs.length > 0) {
        kwargs[HISTORY_ATTACHMENT_REF_KEY] = refs
    } else {
        delete kwargs[HISTORY_ATTACHMENT_REF_KEY]
    }

    return kwargs
}

function cloneMessageWithFields(
    message: BaseMessage,
    content: MessageContent,
    additionalKwargs: Record<string, unknown>
) {
    const candidate = message as BaseMessage & {
        response_metadata?: Record<string, unknown>
        usage_metadata?: unknown
    }

    const fields = {
        content,
        id: message.id ?? undefined,
        name: message.name ?? undefined,
        additional_kwargs: additionalKwargs
    } as any

    if (candidate.response_metadata != null) {
        fields.response_metadata = Object.assign({}, candidate.response_metadata)
    }

    if (candidate.usage_metadata != null) {
        fields.usage_metadata = candidate.usage_metadata
    }

    if (message.getType() === 'ai') {
        fields.tool_calls = (message as AIMessage).tool_calls
        return new AIMessage(fields)
    }

    if (message.getType() === 'tool') {
        fields.tool_call_id = (message as ToolMessage).tool_call_id
        return new ToolMessage(fields)
    }

    if (message.getType() === 'function') {
        return new FunctionMessage(fields)
    }

    if (message.getType() === 'system') {
        return new SystemMessage(fields)
    }

    return new HumanMessage(fields)
}

async function collectArchivedRefs(
    ctx: Context,
    conversationId: string,
    message: BaseMessage
) {
    const attachmentArchiver = (ctx as Context & {
        qqbotAttachment?: HistoryAttachmentArchiverLike
    }).qqbotAttachment

    if (attachmentArchiver?.archiveMessageAttachments == null) {
        return [] as HistoryAttachmentRef[]
    }

    try {
        const archived = await attachmentArchiver.archiveMessageAttachments({
            conversationId,
            message
        })

        if (Array.isArray(archived)) {
            return normalizeAttachmentRefs(archived)
        }

        if (archived != null && typeof archived === 'object') {
            return normalizeAttachmentRefs((archived as { refs?: unknown }).refs)
        }
    } catch (error) {
        ctx.logger.warn(
            `Failed to archive message attachments for %s: %s`,
            conversationId,
            (error as Error).message
        )
    }

    return []
}

export async function prepareMessageForHistory(
    ctx: Context,
    conversationId: string,
    message: BaseMessage
) {
    const existingRefs = normalizeAttachmentRefs(
        message.additional_kwargs?.[HISTORY_ATTACHMENT_REF_KEY]
    )
    const archivedRefs = await collectArchivedRefs(ctx, conversationId, message)
    const refs = mergeAttachmentRefs(existingRefs, archivedRefs)
    const content = sanitizeHistoryContent(message.content, refs)
    const additionalKwargs = sanitizeHistoryAdditionalKwargs(
        message.additional_kwargs as Record<string, unknown> | undefined,
        refs
    )

    return cloneMessageWithFields(message, content, additionalKwargs)
}

export function sanitizeLoadedHistoryFields(
    content: MessageContent | null | undefined,
    additionalKwargs: Record<string, unknown> | null | undefined
) {
    const refs = normalizeAttachmentRefs(additionalKwargs?.[HISTORY_ATTACHMENT_REF_KEY])
    return {
        content: sanitizeHistoryContent(content, refs),
        additionalKwargs: sanitizeHistoryAdditionalKwargs(additionalKwargs, refs)
    }
}
