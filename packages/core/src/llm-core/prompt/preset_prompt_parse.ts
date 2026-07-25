import { createHash } from 'crypto'
import {
    AIMessage,
    BaseMessage,
    BaseMessageFields,
    HumanMessage,
    MessageContentComplex,
    SystemMessage
} from '@langchain/core/messages'
import { load } from 'js-yaml'
import {
    CompiledMessageContent,
    CompiledPreset,
    PresetContentBlock,
    PresetDefinitionV2,
    PresetDefinitionV2Schema,
    PresetPostHandlerRegistry,
    PresetSource
} from './type'

function compileContent(
    content: string | PresetContentBlock[]
): CompiledMessageContent {
    if (typeof content === 'string') {
        return content
    }

    return content.map((part): MessageContentComplex => {
        if (part.type === 'text') {
            return { type: 'text', text: part.text }
        }
        if (part.type === 'image') {
            return {
                type: 'image_url',
                image_url: {
                    url: part.url,
                    detail: part.detail
                }
            }
        }
        if (part.type === 'file') {
            return {
                type: 'file_url',
                file_url: {
                    url: part.url,
                    mimeType: part.mimeType
                }
            }
        }
        if (part.type === 'audio') {
            return {
                type: 'audio_url',
                audio_url: {
                    url: part.url,
                    mimeType: part.mimeType
                }
            }
        }
        return {
            type: 'video_url',
            video_url: {
                url: part.url,
                mimeType: part.mimeType
            }
        }
    })
}

function compileMessage(
    role: PresetDefinitionV2['messages'][number]['role'],
    content: PresetDefinitionV2['messages'][number]['content'],
    purpose?: PresetDefinitionV2['messages'][number]['purpose']
): BaseMessage {
    const fields: BaseMessageFields = {
        content: compileContent(content),
        additional_kwargs: purpose == null ? {} : { purpose }
    }

    if (role === 'assistant') {
        return new AIMessage(fields)
    }
    if (role === 'user') {
        return new HumanMessage(fields)
    }
    return new SystemMessage(fields)
}

export function parsePreset(raw: string): PresetDefinitionV2 {
    return PresetDefinitionV2Schema.parse(load(raw))
}

export function compilePreset(
    definition: PresetDefinitionV2,
    opts: {
        source: PresetSource
        raw: string
        path?: string
        handlers?: PresetPostHandlerRegistry
    }
): CompiledPreset {
    const preset = PresetDefinitionV2Schema.parse(definition)
    const post = preset.promptConfig.postHandler
    const handler = post == null ? undefined : opts.handlers?.get(post.id)

    if (post != null && handler == null) {
        throw new Error(`Preset post handler is not registered: ${post.id}`)
    }

    return {
        id: preset.id,
        displayName: preset.displayName,
        aliases: preset.aliases,
        definition: preset,
        messages: preset.messages.map((message) =>
            compileMessage(message.role, message.content, message.purpose)
        ),
        inputFormat: preset.inputFormat,
        lore: preset.lore,
        authorsNote: preset.authorsNote,
        knowledge: preset.knowledge,
        promptConfig: {
            ...preset.promptConfig,
            postHandler:
                post == null
                    ? undefined
                    : {
                          prefix: post.prefix,
                          postfix: post.postfix,
                          censor: post.censor,
                          variables: post.variables,
                          handler
                      }
        },
        source: opts.source,
        revision: createHash('sha256').update(opts.raw).digest('hex'),
        path: opts.path
    }
}

export function loadPreset(
    raw: string,
    opts: {
        source: PresetSource
        path?: string
        handlers?: PresetPostHandlerRegistry
    }
): CompiledPreset {
    return compilePreset(parsePreset(raw), { ...opts, raw })
}

export const EMPTY_PRESET = compilePreset(
    {
        schemaVersion: 2,
        id: 'empty',
        displayName: 'Empty',
        aliases: [],
        messages: [],
        inputFormat: null,
        lore: {
            defaults: {},
            entries: []
        },
        authorsNote: null,
        knowledge: null,
        promptConfig: {}
    },
    {
        source: 'ephemeral',
        raw: ''
    }
)

export * from './type'
