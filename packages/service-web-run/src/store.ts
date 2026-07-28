import { createHash } from 'crypto'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { dirname, isAbsolute, resolve } from 'path'
import type { Context } from 'koishi'
import type { Config } from './config'
import { webError } from './error'
import { canonicalUrl } from './security'
import type {
    SearchExecution,
    StagedArtifact,
    WebArtifact,
    WebArtifactRecord,
    WebCapability,
    WebCitationFailureRecord,
    WebExecutionRecord,
    WebRunRequest
} from './types'

const refNames: Record<WebArtifact['type'], string> = {
    search: 'search',
    image: 'image',
    page: 'view',
    find: 'find',
    screenshot: 'screenshot',
    weather: 'weather'
}

function sameUrl(left: string, right: string) {
    try {
        return canonicalUrl(left) === canonicalUrl(right)
    } catch {
        return false
    }
}

export class SearchSessionStore {
    private readonly dir: string

    constructor(
        private readonly ctx: Context,
        config: Config
    ) {
        this.dir = isAbsolute(config.artifactDir)
            ? config.artifactDir
            : resolve(ctx.baseDir, config.artifactDir)
        ctx.model.extend(
            'chatluna_web_execution',
            {
                requestId: { type: 'char', length: 255 },
                sessionId: { type: 'char', length: 255 },
                turn: 'unsigned',
                status: { type: 'char', length: 20 },
                requestJson: 'text',
                executionJson: 'text',
                createdAt: 'timestamp',
                completedAt: { type: 'timestamp', nullable: true }
            },
            {
                primary: 'requestId',
                indexes: [
                    ['sessionId', 'turn'],
                    ['sessionId', 'createdAt']
                ]
            }
        )
        ctx.model.extend(
            'chatluna_web_artifact',
            {
                refId: { type: 'char', length: 255 },
                requestId: { type: 'char', length: 255 },
                sessionId: { type: 'char', length: 255 },
                turn: 'unsigned',
                artifactType: { type: 'char', length: 20 },
                sourceRefId: {
                    type: 'char',
                    length: 255,
                    nullable: true
                },
                title: { type: 'text', nullable: true },
                url: { type: 'text', nullable: true },
                artifactJson: 'text',
                createdAt: 'timestamp'
            },
            {
                primary: ['sessionId', 'refId'],
                indexes: [
                    ['sessionId', 'turn'],
                    ['sessionId', 'createdAt'],
                    ['requestId']
                ]
            }
        )
        ctx.model.extend(
            'chatluna_web_citation_failure',
            {
                id: 'unsigned',
                sessionId: { type: 'char', length: 255 },
                refId: { type: 'char', length: 255 },
                text: 'text',
                createdAt: 'timestamp'
            },
            {
                autoInc: true,
                primary: 'id',
                indexes: [['sessionId', 'createdAt']]
            }
        )
    }

    async nextTurn(sessionId: string) {
        const [latest] = await this.ctx.database.get(
            'chatluna_web_execution',
            { sessionId },
            { sort: { turn: 'desc' }, limit: 1 }
        )
        return (latest?.turn ?? -1) + 1
    }

    async begin(request: WebRunRequest, execution: SearchExecution) {
        await this.ctx.database.create('chatluna_web_execution', {
            requestId: request.requestId,
            sessionId: request.sessionId,
            turn: execution.turn,
            status: execution.status,
            requestJson: JSON.stringify(request),
            executionJson: JSON.stringify(execution),
            createdAt: new Date(execution.startedAt),
            completedAt: null
        })
    }

    async complete(
        request: WebRunRequest,
        execution: SearchExecution,
        staged: StagedArtifact[]
    ) {
        const counters = new Map<string, number>()
        const createdAt = execution.completedAt ?? new Date().toISOString()
        const written: string[] = []
        const records: WebArtifactRecord[] = []
        let failedOperation: WebCapability = 'open'

        try {
            await this.ctx.database.withTransaction(async (database) => {
                for (const item of staged) {
                    failedOperation =
                        item.operation ??
                        this.artifactOperation(item.artifact.type)
                    const name = refNames[item.artifact.type]
                    const index = counters.get(name) ?? 0
                    counters.set(name, index + 1)
                    const refId = `turn${execution.turn}${name}${index}`
                    const artifact = {
                        ...item.artifact,
                        refId,
                        requestId: request.requestId,
                        sessionId: request.sessionId,
                        createdAt
                    } as WebArtifact

                    if (item.file) {
                        const file = resolve(
                            this.dir,
                            this.sessionDirectory(request.sessionId),
                            `${refId}.${item.file.extension}`
                        )
                        await mkdir(dirname(file), { recursive: true })
                        await writeFile(file, item.file.data)
                        written.push(file)
                        if (
                            artifact.type === 'page' &&
                            artifact.mediaType === 'pdf'
                        ) {
                            artifact.filePath = file
                        }
                        if (artifact.type === 'screenshot') {
                            artifact.filePath = file
                        }
                    }

                    const sourceRefId =
                        'sourceRefId' in artifact
                            ? (artifact.sourceRefId ?? null)
                            : null
                    const title = 'title' in artifact ? artifact.title : null
                    const url = 'url' in artifact ? artifact.url : null
                    const record: WebArtifactRecord = {
                        refId,
                        requestId: request.requestId,
                        sessionId: request.sessionId,
                        turn: execution.turn,
                        artifactType: artifact.type,
                        sourceRefId,
                        title,
                        url,
                        artifactJson: JSON.stringify(artifact),
                        createdAt: new Date(createdAt)
                    }
                    await database.create('chatluna_web_artifact', record)
                    records.push(record)
                }
            })

            return records.map(
                (record) => JSON.parse(record.artifactJson) as WebArtifact
            )
        } catch (err) {
            await Promise.all(written.map((file) => rm(file, { force: true })))
            throw webError({
                operation: failedOperation,
                stage: 'session',
                code: 'artifact_commit_failed',
                message: `Failed to commit web artifacts: ${String(err)}`
            })
        }
    }

    async saveExecution(execution: SearchExecution) {
        await this.ctx.database.set(
            'chatluna_web_execution',
            execution.requestId,
            {
                status: execution.status,
                executionJson: JSON.stringify(execution),
                completedAt: execution.completedAt
                    ? new Date(execution.completedAt)
                    : new Date()
            }
        )
    }

    async getArtifact(sessionId: string, refId: string) {
        const [record] = await this.ctx.database.get('chatluna_web_artifact', {
            sessionId,
            refId
        })
        return record
            ? (JSON.parse(record.artifactJson) as WebArtifact)
            : undefined
    }

    async getArtifacts(sessionId: string, refs: string[]) {
        if (refs.length < 1) return []
        const records = await this.ctx.database.get('chatluna_web_artifact', {
            sessionId,
            refId: { $in: refs }
        })
        const byRef = new Map(
            records.map((record) => [
                record.refId,
                JSON.parse(record.artifactJson) as WebArtifact
            ])
        )
        return refs.flatMap((ref) => {
            const artifact = byRef.get(ref)
            return artifact ? [artifact] : []
        })
    }

    async getExecution(requestId: string) {
        const [record] = await this.ctx.database.get('chatluna_web_execution', {
            requestId
        })
        if (!record) return undefined
        return {
            ...record,
            request: JSON.parse(record.requestJson) as WebRunRequest,
            execution: JSON.parse(record.executionJson) as SearchExecution
        }
    }

    async listArtifacts(sessionId: string) {
        const records = await this.ctx.database.get(
            'chatluna_web_artifact',
            { sessionId },
            { sort: { createdAt: 'asc' } }
        )
        return records.map(
            (record) => JSON.parse(record.artifactJson) as WebArtifact
        )
    }

    async readArtifactFile(artifact: WebArtifact) {
        if (
            (artifact.type !== 'page' && artifact.type !== 'screenshot') ||
            !artifact.filePath
        ) {
            return undefined
        }
        return await readFile(artifact.filePath)
    }

    async assembleCitations(sessionId: string, text: string) {
        text = text.replace(
            /\[[^\]\n]+\]\((turn\d+(?:search|image|view|find|screenshot|weather)\d+)\)/g,
            '[$1]'
        )
        text = text.replace(
            /cite((?:turn\d+(?:search|image|view|find|screenshot|weather)\d+)(?:turn\d+(?:search|image|view|find|screenshot|weather)\d+)*)/g,
            (_match, refs: string) =>
                refs
                    .split('')
                    .map((ref) => `[${ref}]`)
                    .join(' ')
        )
        const refs = [
            ...new Set(
                [
                    ...text.matchAll(
                        /\[(turn\d+(?:search|image|view|find|screenshot|weather)\d+)\]/g
                    )
                ].map((match) => match[1])
            )
        ]
        if (refs.length < 1) return { text, invalidRefs: [] as string[] }

        const artifacts = await this.getArtifacts(sessionId, refs)
        const byRef = new Map(
            artifacts.map((artifact) => [artifact.refId, artifact])
        )
        const invalidRefs: string[] = []
        let result = text

        for (const refId of refs) {
            let artifact = byRef.get(refId)
            const visited = new Set<string>()
            while (
                artifact &&
                (artifact.type === 'find' || artifact.type === 'screenshot') &&
                artifact.sourceRefId &&
                !visited.has(artifact.sourceRefId)
            ) {
                visited.add(artifact.sourceRefId)
                artifact =
                    byRef.get(artifact.sourceRefId) ??
                    (await this.getArtifact(sessionId, artifact.sourceRefId))
            }

            const link =
                artifact?.type === 'search' ||
                artifact?.type === 'page' ||
                artifact?.type === 'find' ||
                artifact?.type === 'screenshot'
                    ? {
                          title: artifact.title,
                          url: artifact.canonicalUrl
                      }
                    : artifact?.type === 'image'
                      ? {
                            title: artifact.title,
                            url: artifact.sourceUrl ?? artifact.imageUrl
                        }
                      : artifact?.type === 'weather'
                        ? {
                              title: `Weather: ${artifact.resolvedLocation}`,
                              url: artifact.url
                          }
                        : undefined

            if (link) {
                const token = `[${refId}]`
                const resolved = `[${link.title.replaceAll('[', '').replaceAll(']', '')}](${link.url})`
                let offset = 0
                while (true) {
                    const idx = result.indexOf(token, offset)
                    if (idx < 0) break

                    const before = result.slice(0, idx)
                    const after = result.slice(idx + token.length)
                    const prior = before.match(
                        /(\[[^\]\n]+\]\((https?:\/\/[^\s)\n]+)\))\s*$/
                    )
                    if (prior && sameUrl(prior[2], link.url)) {
                        const start = before.length - prior[0].length
                        result = before.slice(0, start) + prior[1] + after
                        offset = start + prior[1].length
                        continue
                    }

                    const next = after.match(
                        /^\s*(\[[^\]\n]+\]\((https?:\/\/[^\s)\n]+)\))/
                    )
                    if (next && sameUrl(next[2], link.url)) {
                        result = before + next[1] + after.slice(next[0].length)
                        offset = before.length + next[1].length
                        continue
                    }

                    result = before + resolved + after
                    offset = before.length + resolved.length
                }
                continue
            }

            invalidRefs.push(refId)
            result = result.replaceAll(`[${refId}]`, '')
            await this.ctx.database.create('chatluna_web_citation_failure', {
                sessionId,
                refId,
                text: `[${refId}]`,
                createdAt: new Date()
            })
        }

        if (invalidRefs.length > 0) {
            result = `${result.trim()}\n\n部分引用无法核验。`
        }
        return { text: result, invalidRefs }
    }

    async clear(sessionId: string) {
        const artifacts = await this.listArtifacts(sessionId)
        await Promise.all(
            artifacts.flatMap((artifact) =>
                (artifact.type === 'page' || artifact.type === 'screenshot') &&
                artifact.filePath
                    ? [rm(artifact.filePath, { force: true })]
                    : []
            )
        )
        await this.ctx.database.remove('chatluna_web_artifact', { sessionId })
        await this.ctx.database.remove('chatluna_web_execution', { sessionId })
        await this.ctx.database.remove('chatluna_web_citation_failure', {
            sessionId
        })
        await rm(resolve(this.dir, this.sessionDirectory(sessionId)), {
            recursive: true,
            force: true
        })
    }

    private sessionDirectory(sessionId: string) {
        return createHash('sha256').update(sessionId).digest('hex')
    }

    private artifactOperation(type: WebArtifact['type']): WebCapability {
        const operations: Record<WebArtifact['type'], WebCapability> = {
            search: 'search_query',
            image: 'image_query',
            page: 'open',
            find: 'find',
            screenshot: 'screenshot',
            weather: 'weather'
        }
        return operations[type]
    }
}

declare module 'koishi' {
    interface Tables {
        chatluna_web_execution: WebExecutionRecord
        chatluna_web_artifact: WebArtifactRecord
        chatluna_web_citation_failure: WebCitationFailureRecord
    }
}
