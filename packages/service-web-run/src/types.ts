export type WebCapability =
    | 'search_query'
    | 'image_query'
    | 'open'
    | 'click'
    | 'find'
    | 'screenshot'
    | 'weather'

export type WebResponseLength = 'short' | 'medium' | 'long'

export interface SearchQuery {
    q: string
    recency?: number
    domains?: string[]
}

export interface OpenOperation {
    ref_id: string
    lineno?: number
}

export interface ClickOperation {
    ref_id: string
    id: number
}

export interface FindOperation {
    ref_id: string
    pattern: string
}

export interface ScreenshotOperation {
    ref_id: string
    pageno: number
}

export interface WeatherOperation {
    location: string
    start?: string
    duration?: number
}

export interface WebCommands {
    search_query?: SearchQuery[]
    image_query?: SearchQuery[]
    open?: OpenOperation[]
    click?: ClickOperation[]
    find?: FindOperation[]
    screenshot?: ScreenshotOperation[]
    weather?: WeatherOperation[]
    response_length?: WebResponseLength
}

export interface SearchSettings {
    mode: 'disabled' | 'live'
    topK: number
    perDomainLimit: number
    maxOperationsPerCall: number
    maxConcurrency: number
}

export interface WebRunRequest {
    requestId: string
    sessionId: string
    commands: WebCommands
    settings: SearchSettings
    runtime: {
        locale: string
        timezone: string
        currentTime: string
    }
}

export type WebRunStage =
    | 'provider'
    | 'fetch'
    | 'extract'
    | 'session'
    | 'render'
    | 'ranking'

export interface WebRunFailure {
    operation: WebCapability
    stage: WebRunStage
    code: string
    message: string
    provider?: string
    httpStatus?: number
    providerCode?: string
    retryable: boolean
}

export interface WebCommandExecution {
    operation: WebCapability
    index: number
    status: 'started' | 'completed' | 'failed'
    startedAt: string
    completedAt?: string
    durationMs?: number
    artifactRefs: string[]
    failure?: WebRunFailure
}

export interface SearchExecution {
    requestId: string
    sessionId: string
    turn: number
    status: 'started' | 'completed' | 'failed'
    startedAt: string
    completedAt?: string
    durationMs?: number
    commands: WebCommandExecution[]
    failure?: WebRunFailure
}

interface WebArtifactBase {
    refId: string
    requestId: string
    sessionId: string
    createdAt: string
}

export interface WebSearchArtifact extends WebArtifactBase {
    type: 'search'
    query: string
    title: string
    url: string
    canonicalUrl: string
    snippet: string
    source: string
    score?: number
    publishedAt?: string
}

export interface ImageSearchArtifact extends WebArtifactBase {
    type: 'image'
    query: string
    title: string
    imageUrl: string
    sourceUrl?: string
    description?: string
    source: string
}

export interface PageLink {
    id: number
    text: string
    url: string
}

export interface PageArtifact extends WebArtifactBase {
    type: 'page'
    sourceRefId?: string
    title: string
    url: string
    canonicalUrl: string
    mediaType: 'html' | 'pdf'
    startLine?: number
    text: string
    lines: string[]
    links: PageLink[]
    filePath?: string
}

export interface FindMatch {
    line: number
    text: string
    context: string[]
}

export interface FindArtifact extends WebArtifactBase {
    type: 'find'
    sourceRefId?: string
    title: string
    url: string
    canonicalUrl: string
    pattern: string
    matches: FindMatch[]
}

export interface ScreenshotArtifact extends WebArtifactBase {
    type: 'screenshot'
    sourceRefId?: string
    title: string
    url: string
    canonicalUrl: string
    pageno: number
    width: number
    height: number
    mimeType: 'image/png'
    filePath: string
}

export interface WeatherDay {
    date: string
    weatherCode: number
    temperatureMax: number
    temperatureMin: number
    precipitationProbability: number
}

export interface WeatherArtifact extends WebArtifactBase {
    type: 'weather'
    location: string
    resolvedLocation: string
    latitude: number
    longitude: number
    timezone: string
    url: string
    current?: {
        time: string
        temperature: number
        apparentTemperature: number
        precipitation: number
        weatherCode: number
        windSpeed: number
    }
    daily: WeatherDay[]
}

export type WebArtifact =
    | WebSearchArtifact
    | ImageSearchArtifact
    | PageArtifact
    | FindArtifact
    | ScreenshotArtifact
    | WeatherArtifact

export type WebArtifactDraft =
    | Omit<WebSearchArtifact, keyof WebArtifactBase>
    | Omit<ImageSearchArtifact, keyof WebArtifactBase>
    | Omit<PageArtifact, keyof WebArtifactBase>
    | Omit<FindArtifact, keyof WebArtifactBase>
    | Omit<ScreenshotArtifact, keyof WebArtifactBase>
    | Omit<WeatherArtifact, keyof WebArtifactBase>

export interface StagedArtifact {
    artifact: WebArtifactDraft
    operation?: WebCapability
    file?: {
        extension: 'pdf' | 'png'
        data: Buffer
    }
}

export interface WebRunResponse {
    execution: SearchExecution
    output: string
    results: WebArtifact[]
}

export interface WebExecutionRecord {
    requestId: string
    sessionId: string
    turn: number
    status: SearchExecution['status']
    requestJson: string
    executionJson: string
    createdAt: Date
    completedAt?: Date | null
}

export interface WebArtifactRecord {
    refId: string
    requestId: string
    sessionId: string
    turn: number
    artifactType: WebArtifact['type']
    sourceRefId?: string | null
    title?: string | null
    url?: string | null
    artifactJson: string
    createdAt: Date
}

export interface WebCitationFailureRecord {
    id: number
    sessionId: string
    refId: string
    text: string
    createdAt: Date
}
