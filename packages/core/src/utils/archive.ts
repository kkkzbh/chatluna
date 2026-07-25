import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import type { Context } from 'koishi'
import type { BindingRecord, ConversationRecord, MessageRecord } from '../types'
import type {
    ArchiveManifest,
    ConversationArchivePayload,
    SerializedMessageRecord
} from '../services/types'
import { bufferToArrayBuffer, gzipDecode } from './compression'

export async function purgeArchivedConversation(
    ctx: Context,
    root: string,
    conversation: {
        id: string
        archiveId?: string | null
    }
) {
    await removeArchive(ctx, root, conversation.archiveId)

    await unbindConversation(ctx, conversation.id)
    await ctx.database.remove('chatluna_message', {
        conversationId: conversation.id
    })
    await ctx.database.remove('chatluna_acl', {
        conversationId: conversation.id
    })
    await ctx.database.remove('chatluna_conversation', {
        id: conversation.id
    })
}

export async function removeArchive(
    ctx: Context,
    root: string,
    archiveId?: string | null
) {
    if (archiveId == null) {
        return
    }

    const archive = await ctx.chatluna.conversation.getArchive(archiveId)

    if (archive?.path) {
        await fs.rm(await assertArchivePath(root, archive.path), {
            recursive: true,
            force: true
        })
    }

    await ctx.database.remove('chatluna_archive', {
        id: archiveId
    })
}

export async function unbindConversation(ctx: Context, conversationId: string) {
    const [active, last] = await Promise.all([
        ctx.database.get('chatluna_binding', {
            activeConversationId: conversationId
        }),
        ctx.database.get('chatluna_binding', {
            lastConversationId: conversationId
        })
    ])
    const bindings = Array.from(
        new Map(
            [...(active as BindingRecord[]), ...(last as BindingRecord[])].map(
                (item) => [item.bindingKey, item]
            )
        ).values()
    )

    for (const binding of bindings) {
        await ctx.database.upsert('chatluna_binding', [
            {
                bindingKey: binding.bindingKey,
                activeConversationId:
                    binding.activeConversationId === conversationId
                        ? null
                        : binding.activeConversationId,
                lastConversationId:
                    binding.lastConversationId === conversationId
                        ? null
                        : binding.lastConversationId,
                updatedAt: new Date()
            }
        ])
    }
}

export async function assertArchivePath(root: string, target: string) {
    const base = path.resolve(root)
    const file = path.resolve(target)
    const relative = path.relative(base, file)
    if (
        relative.length === 0 ||
        relative === '..' ||
        relative.startsWith(`..${path.sep}`) ||
        path.isAbsolute(relative)
    ) {
        throw new Error(`Archive path escapes configured archive root: ${file}`)
    }

    const rootStat = await fs.lstat(base)
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
        throw new Error(
            `Configured archive root must be a real directory: ${base}`
        )
    }
    const fileStat = await fs.lstat(file)
    if (fileStat.isSymbolicLink()) {
        throw new Error(`Archive path must not contain symlinks: ${file}`)
    }
    if (
        (await fs.realpath(base)) !== base ||
        (await fs.realpath(file)) !== file
    ) {
        throw new Error(`Archive path must not contain symlinks: ${file}`)
    }
    return file
}

export async function readArchivePayload(root: string, archivePath: string) {
    const file = await assertArchivePath(root, archivePath)
    const stat = await fs.lstat(file)

    if (stat.isDirectory()) {
        const manifestPath = await assertArchivePath(
            root,
            path.join(file, 'manifest.json')
        )
        const conversationPath = await assertArchivePath(
            root,
            path.join(file, 'conversation.json')
        )
        const messagesPath = await assertArchivePath(
            root,
            path.join(file, 'messages.jsonl.gz')
        )
        const manifest = JSON.parse(
            await fs.readFile(manifestPath, 'utf8')
        ) as ArchiveManifest
        const conversation = JSON.parse(
            await fs.readFile(conversationPath, 'utf8')
        ) as ConversationArchivePayload['conversation']
        const messageBuffer = await fs.readFile(messagesPath)

        if (manifest.size !== messageBuffer.byteLength) {
            throw new Error('Archive payload size mismatch.')
        }

        if (manifest.checksum != null && manifest.checksum.length > 0) {
            const checksum = createHash('sha256')
                .update(messageBuffer)
                .digest('hex')

            if (checksum !== manifest.checksum) {
                throw new Error('Archive payload checksum mismatch.')
            }
        }

        const messages = (await gzipDecode(messageBuffer))
            .split('\n')
            .filter((line) => line.length > 0)
            .map((line) => JSON.parse(line) as SerializedMessageRecord)

        return {
            formatVersion: manifest.formatVersion,
            exportedAt: manifest.createdAt,
            conversation,
            messages
        }
    }

    return JSON.parse(
        await gzipDecode(await fs.readFile(file))
    ) as ConversationArchivePayload
}

export function serializeConversation(
    conversation: ConversationRecord
): ConversationArchivePayload['conversation'] {
    return {
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        lastChatAt: conversation.lastChatAt
            ? conversation.lastChatAt.toISOString()
            : null,
        archivedAt: conversation.archivedAt
            ? conversation.archivedAt.toISOString()
            : null
    }
}

export function deserializeConversation(
    conversation: ConversationArchivePayload['conversation']
): ConversationRecord {
    return {
        ...conversation,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        lastChatAt: conversation.lastChatAt
            ? new Date(conversation.lastChatAt)
            : null,
        archivedAt: conversation.archivedAt
            ? new Date(conversation.archivedAt)
            : null
    }
}

export function serializeMessage(
    message: MessageRecord
): SerializedMessageRecord {
    return {
        ...message,
        content: serializeBinary(message.content),
        additional_kwargs_binary: serializeBinary(
            message.additional_kwargs_binary
        ),
        response_metadata_binary: serializeBinary(
            message.response_metadata_binary
        ),
        createdAt: message.createdAt?.toISOString() ?? null
    }
}

export function deserializeMessage(
    message: SerializedMessageRecord
): MessageRecord {
    return {
        ...message,
        content: deserializeBinary(message.content),
        additional_kwargs_binary: deserializeBinary(
            message.additional_kwargs_binary
        ),
        response_metadata_binary: deserializeBinary(
            message.response_metadata_binary
        ),
        createdAt: message.createdAt ? new Date(message.createdAt) : null
    }
}

function serializeBinary(value?: ArrayBuffer | null) {
    if (value == null) {
        return null
    }

    return Buffer.from(value).toString('base64')
}

function deserializeBinary(value?: string | null) {
    if (value == null || value.length === 0) {
        return null
    }

    return bufferToArrayBuffer(Buffer.from(value, 'base64'))
}
