import type { MessageContent, MessageContentComplex } from '@langchain/core/messages'
import { isMessageContentText } from './langchain.js'

type QqbotSpeakerFormatMeta = {
    version?: string
    speakerId?: string
    speakerName?: string
    isDirect?: boolean
    preformatted?: boolean
}

function formatSpeakerName(name: string): string {
    return JSON.stringify(name)
}

export function formatQqbotSpeakerLine(
    speakerId: string,
    speakerName: string,
    text: string
): string {
    const prefix = `[speaker_id=${speakerId} speaker_name=${formatSpeakerName(speakerName)}]`
    return text.length > 0 ? `${prefix} ${text}` : prefix
}

function resolveSpeakerFormat(
    additionalKwargs?: Record<string, any>
): QqbotSpeakerFormatMeta | null {
    const meta = additionalKwargs?.qqbot_speaker_format as
        | QqbotSpeakerFormatMeta
        | undefined

    if (meta?.version !== 'speaker_id_v1') {
        return null
    }

    if (meta.isDirect || meta.preformatted) {
        return null
    }

    const speakerId = meta.speakerId?.trim()
    const speakerName = (meta.speakerName?.trim() || speakerId)?.trim()

    if (!speakerId || !speakerName) {
        return null
    }

    return {
        ...meta,
        speakerId,
        speakerName
    }
}

export function serializeQqbotHumanMessageContent(
    content: MessageContent,
    additionalKwargs?: Record<string, any>
): MessageContent {
    const speakerFormat = resolveSpeakerFormat(additionalKwargs)
    if (speakerFormat == null) {
        return content
    }

    const { speakerId, speakerName } = speakerFormat
    const resolvedSpeakerId = speakerId!
    const resolvedSpeakerName = speakerName!

    if (typeof content === 'string') {
        return formatQqbotSpeakerLine(
            resolvedSpeakerId,
            resolvedSpeakerName,
            content
        )
    }

    if (!Array.isArray(content)) {
        return formatQqbotSpeakerLine(
            resolvedSpeakerId,
            resolvedSpeakerName,
            ''
        )
    }

    const textIndex = content.findIndex((part) =>
        isMessageContentText(part as MessageContentComplex)
    )

    if (textIndex === -1) {
        return [
            {
                type: 'text',
                text: formatQqbotSpeakerLine(
                    resolvedSpeakerId,
                    resolvedSpeakerName,
                    ''
                )
            },
            ...content
        ]
    }

    return content.map((part, index) => {
        if (index !== textIndex || !isMessageContentText(part)) {
            return part
        }

        return {
            ...part,
            text: formatQqbotSpeakerLine(
                resolvedSpeakerId,
                resolvedSpeakerName,
                part.text
            )
        }
    })
}
