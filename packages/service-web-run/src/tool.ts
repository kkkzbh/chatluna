import type { CallbackManagerForToolRun } from '@langchain/core/callbacks/manager'
import { StructuredTool } from '@langchain/core/tools'
import type { MessageContent } from '@langchain/core/messages'
import { z } from 'zod'
import type { ChatLunaToolRunnable } from 'koishi-plugin-chatluna/llm-core/platform/types'
import type { ChatLunaWebService } from './service'
import type { WebCapability, WebCommands } from './types'

const searchQuery = z.object({
    q: z.string().min(1).describe('Search query.'),
    recency: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Filter by recency, in days.'),
    domains: z
        .array(z.string().min(1))
        .max(20)
        .optional()
        .describe('Restrict results to these domains.')
})

export function createWebRunSchema(capabilities: ReadonlySet<WebCapability>) {
    const shape: z.ZodRawShape = {
        response_length: z
            .enum(['short', 'medium', 'long'])
            .optional()
            .describe('Controls only the model-facing text projection length.')
    }
    if (capabilities.has('search_query')) {
        shape.search_query = z
            .array(searchQuery)
            .max(4)
            .optional()
            .describe('Search the internet for one or more queries.')
    }
    if (capabilities.has('image_query')) {
        shape.image_query = z
            .array(searchQuery)
            .max(4)
            .optional()
            .describe('Search for images.')
    }
    if (capabilities.has('open')) {
        shape.open = z
            .array(
                z.object({
                    ref_id: z
                        .string()
                        .min(1)
                        .describe('A prior refId or an HTTP(S) URL.'),
                    lineno: z.number().int().positive().optional()
                })
            )
            .optional()
            .describe('Open pages by refId or URL.')
    }
    if (capabilities.has('click')) {
        shape.click = z
            .array(
                z.object({
                    ref_id: z.string().min(1),
                    id: z.number().int().nonnegative()
                })
            )
            .optional()
            .describe('Open numbered links from a page artifact.')
    }
    if (capabilities.has('find')) {
        shape.find = z
            .array(
                z.object({
                    ref_id: z.string().min(1),
                    pattern: z.string().min(1)
                })
            )
            .optional()
            .describe('Find literal text in an HTML page.')
    }
    if (capabilities.has('screenshot')) {
        shape.screenshot = z
            .array(
                z.object({
                    ref_id: z.string().min(1),
                    pageno: z.number().int().nonnegative()
                })
            )
            .optional()
            .describe('Render zero-indexed PDF pages as screenshots.')
    }
    if (capabilities.has('weather')) {
        shape.weather = z
            .array(
                z.object({
                    location: z.string().min(1),
                    start: z
                        .string()
                        .regex(/^\d{4}-\d{2}-\d{2}$/)
                        .optional(),
                    duration: z.number().int().min(1).max(16).optional()
                })
            )
            .optional()
            .describe('Look up weather forecasts.')
    }
    return z.object(shape).strict()
}

export class WebRunTool extends StructuredTool {
    name = 'web_run'
    description = `Access the internet through one structured tool.

${
    'Commands may be mixed in one call and each command accepts an array. ' +
    'Use prior refIds with open, click, find, and screenshot. ' +
    'Newly returned refIds are available from the next call. ' +
    'Use response_length only to control the text projection. ' +
    'In final answers cite sources with their exact [turnNtypeN] refId; ' +
    'the runtime resolves those markers to verified URLs.'
}`

    schema

    constructor(
        private readonly service: ChatLunaWebService,
        capabilities: ReadonlySet<WebCapability>
    ) {
        super()
        this.schema = createWebRunSchema(capabilities)
    }

    async _call(
        input: WebCommands,
        runManager: CallbackManagerForToolRun,
        config: ChatLunaToolRunnable
    ): Promise<MessageContent> {
        const sessionId = config.configurable.conversationId
        if (!sessionId) {
            throw new Error('web_run requires conversationId')
        }
        if (!runManager?.runId) {
            throw new Error('web_run requires a tool run id')
        }

        const response = await this.service.execute({
            requestId: runManager.runId,
            sessionId,
            commands: input,
            settings: this.service.settings,
            runtime: {
                locale: config.configurable.session.locales[0],
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                currentTime: new Date().toISOString()
            }
        })

        const screenshots = response.results.filter(
            (
                artifact
            ): artifact is Extract<
                (typeof response.results)[number],
                { type: 'screenshot' }
            > => artifact.type === 'screenshot'
        )
        if (screenshots.length < 1) return response.output

        const content: MessageContent = [
            { type: 'text', text: response.output }
        ]
        for (const artifact of screenshots) {
            const data = await this.service.readArtifactFile(artifact)
            if (!data) continue
            content.push({
                type: 'image_url',
                image_url: {
                    url: `data:image/png;base64,${data.toString('base64')}`
                }
            })
        }
        return content
    }
}
