import type { Context } from 'koishi'
import type { Config } from './config'
import { WebRunError, webError } from './error'
import { formatWebFailure, formatWebOutput } from './format'
import { PageFetcher } from './page'
import { PdfRenderer } from './pdf'
import { TavilySearchProvider } from './providers/tavily'
import { OpenMeteoWeatherProvider } from './providers/weather'
import type { WebFetch } from './request'
import { validatePublicUrl } from './security'
import { SearchSessionStore } from './store'
import type {
    ClickOperation,
    FindOperation,
    OpenOperation,
    ScreenshotOperation,
    SearchExecution,
    SearchQuery,
    StagedArtifact,
    WeatherOperation,
    WebArtifact,
    WebCapability,
    WebCommandExecution,
    WebRunFailure,
    WebRunRequest,
    WebRunResponse
} from './types'

type CommandItem =
    | {
          operation: 'search_query'
          index: number
          input: SearchQuery
      }
    | {
          operation: 'image_query'
          index: number
          input: SearchQuery
      }
    | {
          operation: 'open'
          index: number
          input: OpenOperation
      }
    | {
          operation: 'click'
          index: number
          input: ClickOperation
      }
    | {
          operation: 'find'
          index: number
          input: FindOperation
      }
    | {
          operation: 'screenshot'
          index: number
          input: ScreenshotOperation
      }
    | {
          operation: 'weather'
          index: number
          input: WeatherOperation
      }

interface WebLifecyclePayload {
    requestId: string
    sessionId: string
    turn: number
    command?: WebCommandExecution
    execution?: SearchExecution
}

export class SearchOrchestrator {
    private readonly page: PageFetcher
    private readonly pdf = new PdfRenderer()
    private readonly tavily: TavilySearchProvider
    private readonly weather: OpenMeteoWeatherProvider
    private readonly locks = new Map<string, Promise<void>>()

    constructor(
        private readonly ctx: Context,
        private readonly config: Config,
        private readonly fetcher: WebFetch,
        private readonly store: SearchSessionStore,
        public readonly capabilities: ReadonlySet<WebCapability>
    ) {
        this.page = new PageFetcher(ctx, config, fetcher)
        this.tavily = new TavilySearchProvider(config, fetcher)
        this.weather = new OpenMeteoWeatherProvider(config, fetcher)
    }

    async execute(request: WebRunRequest): Promise<WebRunResponse> {
        const turn = await this.lock(request.sessionId, async () => {
            const turn = await this.store.nextTurn(request.sessionId)
            const execution = this.execution(request, turn)
            await this.store.begin(request, execution)
            return turn
        })
        const execution = this.execution(request, turn)
        const started = Date.now()
        const commands = this.commands(request)
        execution.commands = commands.map((command) => ({
            operation: command.operation,
            index: command.index,
            status: 'started',
            startedAt: new Date().toISOString(),
            artifactRefs: []
        }))
        await this.ctx.parallel('web.started', {
            requestId: request.requestId,
            sessionId: request.sessionId,
            turn
        } satisfies WebLifecyclePayload)
        for (const command of execution.commands) {
            await this.ctx.parallel('command.started', {
                requestId: request.requestId,
                sessionId: request.sessionId,
                turn,
                command
            } satisfies WebLifecyclePayload)
        }

        if (request.settings.mode === 'disabled') {
            return await this.failed(
                request,
                execution,
                {
                    operation: 'search_query',
                    stage: 'session',
                    code: 'search_disabled',
                    message: 'Web search is disabled',
                    retryable: false
                },
                started
            )
        }

        try {
            await this.validate(request, commands)
            const staged: StagedArtifact[][] = new Array(commands.length)
            const failures: (WebRunError | undefined)[] = new Array(
                commands.length
            )
            const unknownFailures: unknown[] = new Array(commands.length)
            let cursor = 0
            await Promise.all(
                Array.from(
                    {
                        length: Math.min(
                            request.settings.maxConcurrency,
                            commands.length
                        )
                    },
                    async () => {
                        while (cursor < commands.length) {
                            const current = cursor++
                            const command = commands[current]
                            const state = execution.commands[current]
                            try {
                                staged[current] = (
                                    await this.run(request, command)
                                ).map((item) => ({
                                    ...item,
                                    operation: command.operation
                                }))
                            } catch (err) {
                                if (err instanceof WebRunError) {
                                    failures[current] = err
                                } else {
                                    unknownFailures[current] = err
                                }
                            }
                        }
                    }
                )
            )

            const unknownFailure = unknownFailures.find(
                (failure) => failure != null
            )
            if (unknownFailure != null) throw unknownFailure

            const failedIndex = failures.findIndex(Boolean)
            if (failedIndex >= 0) {
                const failure = failures[failedIndex]!.failure
                for (const [index, state] of execution.commands.entries()) {
                    const commandFailure =
                        failures[index]?.failure ??
                        webError({
                            operation: state.operation,
                            stage: 'session',
                            code: 'batch_aborted',
                            message:
                                'Atomic web.run batch discarded because another command failed'
                        }).failure
                    this.finishCommand(state, [], commandFailure)
                    await this.ctx.parallel('command.completed', {
                        requestId: request.requestId,
                        sessionId: request.sessionId,
                        turn,
                        command: state
                    } satisfies WebLifecyclePayload)
                }
                return await this.failed(request, execution, failure, started)
            }

            const flat = staged.flat()
            const artifacts = await this.lock(request.sessionId, () =>
                this.store.complete(request, execution, flat)
            )
            let offset = 0
            for (let i = 0; i < commands.length; i++) {
                const count = staged[i].length
                const refs = artifacts
                    .slice(offset, offset + count)
                    .map((artifact) => artifact.refId)
                offset += count
                this.finishCommand(execution.commands[i], refs)
                await this.ctx.parallel('command.completed', {
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                    turn,
                    command: execution.commands[i]
                } satisfies WebLifecyclePayload)
            }

            execution.status = 'completed'
            execution.completedAt = new Date().toISOString()
            execution.durationMs = Date.now() - started
            await this.store.saveExecution(execution)
            await this.ctx.parallel('web.completed', {
                requestId: request.requestId,
                sessionId: request.sessionId,
                turn,
                execution
            } satisfies WebLifecyclePayload)
            return {
                execution,
                output: formatWebOutput(
                    artifacts,
                    request.commands.response_length ?? 'short'
                ),
                results: artifacts
            }
        } catch (err) {
            if (!(err instanceof WebRunError)) {
                execution.status = 'failed'
                execution.completedAt = new Date().toISOString()
                execution.durationMs = Date.now() - started
                execution.failure = {
                    operation: commands[0]?.operation ?? 'search_query',
                    stage: 'session',
                    code: 'internal_error',
                    message: String(err),
                    retryable: false
                }
                for (const command of execution.commands) {
                    if (command.status !== 'started') continue
                    this.finishCommand(command, [], execution.failure)
                    await this.ctx.parallel('command.completed', {
                        requestId: request.requestId,
                        sessionId: request.sessionId,
                        turn,
                        command
                    } satisfies WebLifecyclePayload)
                }
                await this.store.saveExecution(execution)
                await this.ctx.parallel('web.failed', {
                    requestId: request.requestId,
                    sessionId: request.sessionId,
                    turn,
                    execution
                } satisfies WebLifecyclePayload)
                throw err
            }
            return await this.failed(request, execution, err.failure, started)
        }
    }

    private execution(request: WebRunRequest, turn: number): SearchExecution {
        return {
            requestId: request.requestId,
            sessionId: request.sessionId,
            turn,
            status: 'started',
            startedAt: new Date().toISOString(),
            commands: []
        }
    }

    private commands(request: WebRunRequest) {
        const commands = [
            ...(request.commands.search_query ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'search_query',
                    index,
                    input
                })
            ),
            ...(request.commands.image_query ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'image_query',
                    index,
                    input
                })
            ),
            ...(request.commands.open ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'open',
                    index,
                    input
                })
            ),
            ...(request.commands.click ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'click',
                    index,
                    input
                })
            ),
            ...(request.commands.find ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'find',
                    index,
                    input
                })
            ),
            ...(request.commands.screenshot ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'screenshot',
                    index,
                    input
                })
            ),
            ...(request.commands.weather ?? []).map(
                (input, index): CommandItem => ({
                    operation: 'weather',
                    index,
                    input
                })
            )
        ]
        return commands.map(
            (command, index) => ({ ...command, index }) as CommandItem
        )
    }

    private async validate(request: WebRunRequest, commands: CommandItem[]) {
        if (commands.length < 1) {
            throw webError({
                operation: 'search_query',
                stage: 'session',
                code: 'empty_command',
                message: 'web.run requires at least one command'
            })
        }
        if (commands.length > request.settings.maxOperationsPerCall) {
            throw webError({
                operation: commands[0].operation,
                stage: 'session',
                code: 'too_many_operations',
                message: `web.run accepts at most ${request.settings.maxOperationsPerCall} operations`
            })
        }
        if (
            (request.commands.search_query?.length ?? 0) > 3 &&
            (request.commands.response_length == null ||
                request.commands.response_length === 'short')
        ) {
            throw webError({
                operation: 'search_query',
                stage: 'session',
                code: 'response_length_required',
                message:
                    'Four search queries require response_length medium or long'
            })
        }
        if ((request.commands.search_query?.length ?? 0) > 4) {
            throw webError({
                operation: 'search_query',
                stage: 'session',
                code: 'too_many_search_queries',
                message: 'web.run accepts at most four search queries'
            })
        }

        for (const command of commands) {
            if (!this.capabilities.has(command.operation)) {
                throw webError({
                    operation: command.operation,
                    stage: 'session',
                    code: 'capability_unavailable',
                    message: `Capability is unavailable: ${command.operation}`
                })
            }
            if (
                command.operation === 'search_query' ||
                command.operation === 'image_query'
            ) {
                if (command.input.q.trim().length < 1) {
                    throw webError({
                        operation: command.operation,
                        stage: 'session',
                        code: 'invalid_query',
                        message: 'Search query cannot be empty'
                    })
                }
                if (
                    command.input.recency != null &&
                    (!Number.isInteger(command.input.recency) ||
                        command.input.recency < 1)
                ) {
                    throw webError({
                        operation: command.operation,
                        stage: 'session',
                        code: 'invalid_recency',
                        message: 'Search recency must be a positive integer'
                    })
                }
                if ((command.input.domains?.length ?? 0) > 20) {
                    throw webError({
                        operation: command.operation,
                        stage: 'session',
                        code: 'too_many_domains',
                        message: 'Search accepts at most 20 domains'
                    })
                }
                continue
            }
            if (command.operation === 'weather') {
                if (command.input.location.trim().length < 1) {
                    throw webError({
                        operation: 'weather',
                        stage: 'session',
                        code: 'invalid_location',
                        message: 'Weather location cannot be empty'
                    })
                }
                if (
                    command.input.duration != null &&
                    (command.input.duration < 1 || command.input.duration > 16)
                ) {
                    throw webError({
                        operation: 'weather',
                        stage: 'session',
                        code: 'invalid_duration',
                        message:
                            'Weather duration must be between 1 and 16 days'
                    })
                }
                if (
                    command.input.start != null &&
                    !this.validDate(command.input.start)
                ) {
                    throw webError({
                        operation: 'weather',
                        stage: 'session',
                        code: 'invalid_start_date',
                        message:
                            'Weather start date must be a valid YYYY-MM-DD date'
                    })
                }
                continue
            }

            const ref = command.input.ref_id
            if (/^https?:\/\//i.test(ref)) {
                if (command.operation !== 'open') {
                    throw webError({
                        operation: command.operation,
                        stage: 'session',
                        code: 'invalid_ref_type',
                        message: `${command.operation} requires a persisted page reference`
                    })
                }
                await validatePublicUrl(ref, command.operation)
                this.validateOperationParameters(command)
                continue
            }
            const artifact = await this.store.getArtifact(
                request.sessionId,
                ref
            )
            if (!artifact) {
                throw webError({
                    operation: command.operation,
                    stage: 'session',
                    code: 'invalid_ref',
                    message: `Reference does not exist in this session: ${ref}`
                })
            }
            if (command.operation === 'click') {
                if (
                    artifact.type !== 'page' ||
                    artifact.mediaType !== 'html' ||
                    !artifact.links.some((link) => link.id === command.input.id)
                ) {
                    throw webError({
                        operation: 'click',
                        stage: 'session',
                        code: 'invalid_link',
                        message: `Link ${command.input.id} does not exist in ${ref}`
                    })
                }
            }
            if (
                command.operation === 'find' &&
                (artifact.type !== 'page' || artifact.mediaType !== 'html')
            ) {
                throw webError({
                    operation: 'find',
                    stage: 'session',
                    code: 'invalid_ref_type',
                    message: `find requires an HTML page reference: ${ref}`
                })
            }
            if (
                command.operation === 'screenshot' &&
                (artifact.type !== 'page' || artifact.mediaType !== 'pdf')
            ) {
                throw webError({
                    operation: 'screenshot',
                    stage: 'session',
                    code: 'invalid_ref_type',
                    message: `screenshot requires a PDF page reference: ${ref}`
                })
            }
            this.validateOperationParameters(command)
        }
    }

    private validateOperationParameters(command: CommandItem) {
        if (
            command.operation === 'open' &&
            command.input.lineno != null &&
            (!Number.isInteger(command.input.lineno) ||
                command.input.lineno < 1)
        ) {
            throw webError({
                operation: 'open',
                stage: 'session',
                code: 'invalid_line_number',
                message: 'open lineno must be a positive integer'
            })
        }
        if (
            command.operation === 'click' &&
            (!Number.isInteger(command.input.id) || command.input.id < 0)
        ) {
            throw webError({
                operation: 'click',
                stage: 'session',
                code: 'invalid_link',
                message: 'click id must be a non-negative integer'
            })
        }
        if (command.operation === 'find' && command.input.pattern.length < 1) {
            throw webError({
                operation: 'find',
                stage: 'session',
                code: 'invalid_pattern',
                message: 'find pattern cannot be empty'
            })
        }
        if (
            command.operation === 'screenshot' &&
            (!Number.isInteger(command.input.pageno) ||
                command.input.pageno < 0)
        ) {
            throw webError({
                operation: 'screenshot',
                stage: 'session',
                code: 'invalid_page_number',
                message: 'screenshot pageno must be a non-negative integer'
            })
        }
    }

    private validDate(value: string) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
        const date = new Date(`${value}T00:00:00Z`)
        return (
            !Number.isNaN(date.valueOf()) &&
            date.toISOString().slice(0, 10) === value
        )
    }

    private async run(
        request: WebRunRequest,
        command: CommandItem
    ): Promise<StagedArtifact[]> {
        if (command.operation === 'search_query') {
            return (
                await this.tavily.search(
                    command.input,
                    request.runtime.currentTime
                )
            ).map((artifact) => ({
                artifact
            }))
        }
        if (command.operation === 'image_query') {
            return (await this.tavily.images(command.input)).map(
                (artifact) => ({
                    artifact
                })
            )
        }
        if (command.operation === 'weather') {
            return [
                {
                    artifact: await this.weather.weather(
                        command.input,
                        request.runtime.locale
                    )
                }
            ]
        }
        if (command.operation === 'open') {
            const source = await this.source(
                request.sessionId,
                command.input.ref_id
            )
            return [
                await this.page.open(
                    source.url,
                    'open',
                    source.sourceRefId,
                    command.input.lineno
                )
            ]
        }
        if (command.operation === 'click') {
            const artifact = (await this.store.getArtifact(
                request.sessionId,
                command.input.ref_id
            ))!
            if (artifact.type !== 'page') {
                throw new Error('Validated click reference changed type')
            }
            const link = artifact.links.find(
                (item) => item.id === command.input.id
            )!
            return [await this.page.open(link.url, 'click', artifact.refId)]
        }
        if (command.operation === 'find') {
            const artifact = (await this.store.getArtifact(
                request.sessionId,
                command.input.ref_id
            )) as Extract<WebArtifact, { type: 'page' }>
            return [
                {
                    artifact: this.page.find(artifact, command.input.pattern)
                }
            ]
        }

        const artifact = (await this.store.getArtifact(
            request.sessionId,
            command.input.ref_id
        )) as Extract<WebArtifact, { type: 'page' }>
        const pdf = await this.store.readArtifactFile(artifact)
        if (!pdf) {
            throw webError({
                operation: 'screenshot',
                stage: 'session',
                code: 'artifact_file_missing',
                message: `PDF data is missing for ${artifact.refId}`
            })
        }
        return [
            await this.pdf.render(pdf, command.input.pageno, {
                sourceRefId: artifact.refId,
                title: artifact.title,
                url: artifact.url,
                canonicalUrl: artifact.canonicalUrl
            })
        ]
    }

    private async source(sessionId: string, ref: string) {
        if (/^https?:\/\//i.test(ref)) {
            return { url: ref, sourceRefId: undefined }
        }
        const artifact = (await this.store.getArtifact(sessionId, ref))!
        if (artifact.type === 'image') {
            return {
                url: artifact.sourceUrl ?? artifact.imageUrl,
                sourceRefId: artifact.refId
            }
        }
        if ('url' in artifact) {
            return { url: artifact.url, sourceRefId: artifact.refId }
        }
        throw webError({
            operation: 'open',
            stage: 'session',
            code: 'invalid_ref_type',
            message: `Reference cannot be opened: ${ref}`
        })
    }

    private finishCommand(
        command: WebCommandExecution,
        artifactRefs: string[],
        failure?: WebRunFailure
    ) {
        command.status = failure ? 'failed' : 'completed'
        command.completedAt = new Date().toISOString()
        command.durationMs =
            new Date(command.completedAt).valueOf() -
            new Date(command.startedAt).valueOf()
        command.artifactRefs = artifactRefs
        command.failure = failure
    }

    private async failed(
        request: WebRunRequest,
        execution: SearchExecution,
        failure: WebRunFailure,
        started: number
    ): Promise<WebRunResponse> {
        execution.status = 'failed'
        execution.completedAt = new Date().toISOString()
        execution.durationMs = Date.now() - started
        execution.failure = failure
        let assignedFailure = false
        for (const command of execution.commands) {
            if (command.status !== 'started') continue
            const commandFailure =
                !assignedFailure && command.operation === failure.operation
                    ? failure
                    : webError({
                          operation: command.operation,
                          stage: 'session',
                          code: 'batch_aborted',
                          message:
                              'Atomic web.run batch discarded because another command failed'
                      }).failure
            if (commandFailure === failure) assignedFailure = true
            this.finishCommand(command, [], commandFailure)
            await this.ctx.parallel('command.completed', {
                requestId: request.requestId,
                sessionId: request.sessionId,
                turn: execution.turn,
                command
            } satisfies WebLifecyclePayload)
        }
        await this.store.saveExecution(execution)
        await this.ctx.parallel('web.failed', {
            requestId: request.requestId,
            sessionId: request.sessionId,
            turn: execution.turn,
            execution
        } satisfies WebLifecyclePayload)
        return {
            execution,
            output: formatWebFailure(execution, failure),
            results: []
        }
    }

    private async lock<T>(sessionId: string, task: () => Promise<T>) {
        const previous = this.locks.get(sessionId) ?? Promise.resolve()
        let release: () => void = () => undefined
        const current = new Promise<void>((done) => {
            release = done
        })
        const tail = previous.then(() => current)
        this.locks.set(sessionId, tail)
        await previous
        try {
            return await task()
        } finally {
            release()
            if (this.locks.get(sessionId) === tail) {
                this.locks.delete(sessionId)
            }
        }
    }
}

declare module 'koishi' {
    interface Events {
        'web.started'(payload: WebLifecyclePayload): Promise<void>
        'command.started'(payload: WebLifecyclePayload): Promise<void>
        'command.completed'(payload: WebLifecyclePayload): Promise<void>
        'web.completed'(payload: WebLifecyclePayload): Promise<void>
        'web.failed'(payload: WebLifecyclePayload): Promise<void>
    }
}
