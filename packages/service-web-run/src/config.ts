import { Schema } from 'koishi'
import { ChatLunaPlugin } from 'koishi-plugin-chatluna/services/chat'
import type { WebCapability } from './types'

export interface Config extends ChatLunaPlugin.Config {
    mode: 'disabled' | 'live'
    requiredCapabilities: WebCapability[]
    tavilyApiKey: string
    topK: number
    perDomainLimit: number
    maxOperationsPerCall: number
    maxConcurrency: number
    fetchTimeout: number
    maxHtmlBytes: number
    maxPdfBytes: number
    maxPageCharacters: number
    artifactDir: string
}

const capability = Schema.union([
    Schema.const('search_query'),
    Schema.const('image_query'),
    Schema.const('open'),
    Schema.const('click'),
    Schema.const('find'),
    Schema.const('screenshot'),
    Schema.const('weather')
])

export const Config: Schema<Config> = Schema.intersect([
    ChatLunaPlugin.Config,
    Schema.object({
        mode: Schema.union([
            Schema.const('disabled'),
            Schema.const('live')
        ]).default('live'),
        requiredCapabilities: Schema.array(capability)
            .role('checkbox')
            .default(['search_query', 'open', 'click', 'find']),
        tavilyApiKey: Schema.string().role('secret'),
        topK: Schema.number().min(1).max(20).step(1).default(5),
        perDomainLimit: Schema.number().min(1).max(10).step(1).default(2),
        maxOperationsPerCall: Schema.number().min(1).max(32).step(1).default(8),
        maxConcurrency: Schema.number().min(1).max(8).step(1).default(4),
        fetchTimeout: Schema.number().min(1000).default(30000),
        maxHtmlBytes: Schema.number()
            .min(1024)
            .default(8 * 1024 * 1024),
        maxPdfBytes: Schema.number()
            .min(1024)
            .default(32 * 1024 * 1024),
        maxPageCharacters: Schema.number().min(1000).default(100000),
        artifactDir: Schema.string().default('data/chatluna/web-artifacts')
    })
])
