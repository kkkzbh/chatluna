import type {
    SearchExecution,
    WebArtifact,
    WebResponseLength,
    WebRunFailure
} from './types'

function clip(text: string, length: number) {
    return text.length <= length ? text : `${text.slice(0, length)}…`
}

function artifactText(artifact: WebArtifact, length: WebResponseLength) {
    const lines = [`[${artifact.refId}]`]

    if (artifact.type === 'search') {
        lines.push(`Title: ${artifact.title}`)
        lines.push(`URL: ${artifact.canonicalUrl}`)
        if (artifact.publishedAt && length !== 'short')
            lines.push(`Published: ${artifact.publishedAt}`)
        if (length !== 'short') lines.push(`Source: ${artifact.source}`)
        lines.push(
            `Snippet: ${clip(artifact.snippet, length === 'short' ? 240 : length === 'medium' ? 900 : 1800)}`
        )
    } else if (artifact.type === 'image') {
        lines.push(`Title: ${artifact.title}`)
        lines.push(`Image: ${artifact.imageUrl}`)
        if (length !== 'short') lines.push(`Provider: ${artifact.source}`)
        if (artifact.sourceUrl) lines.push(`Source: ${artifact.sourceUrl}`)
        if (artifact.description && length !== 'short') {
            lines.push(`Description: ${clip(artifact.description, 800)}`)
        }
    } else if (artifact.type === 'page') {
        lines.push(`Title: ${artifact.title}`)
        lines.push(`URL: ${artifact.canonicalUrl}`)
        lines.push(`Media: ${artifact.mediaType}`)
        if (artifact.mediaType === 'html') {
            const lineLimit =
                length === 'short' ? 12 : length === 'medium' ? 45 : 120
            const startIndex = Math.max(0, (artifact.startLine ?? 1) - 1)
            lines.push('Content:')
            lines.push(
                ...artifact.lines
                    .slice(startIndex, startIndex + lineLimit)
                    .map((line, index) => `${startIndex + index + 1}: ${line}`)
            )
            if (artifact.links.length > 0) {
                lines.push('Links:')
                lines.push(
                    ...artifact.links
                        .slice(
                            0,
                            length === 'short'
                                ? 12
                                : length === 'medium'
                                  ? 30
                                  : 80
                        )
                        .map((link) => `${link.id}: ${link.text} (${link.url})`)
                )
            }
        }
    } else if (artifact.type === 'find') {
        lines.push(`Title: ${artifact.title}`)
        lines.push(`URL: ${artifact.canonicalUrl}`)
        lines.push(`Pattern: ${artifact.pattern}`)
        lines.push(`Matches: ${artifact.matches.length}`)
        const limit = length === 'short' ? 3 : length === 'medium' ? 10 : 20
        for (const match of artifact.matches.slice(0, limit)) {
            lines.push(`${match.line}: ${match.text}`)
            if (length === 'long') lines.push(...match.context)
        }
    } else if (artifact.type === 'screenshot') {
        lines.push(`Title: ${artifact.title}`)
        lines.push(`URL: ${artifact.canonicalUrl}`)
        lines.push(`PDF page: ${artifact.pageno}`)
        lines.push(`Image: ${artifact.width}x${artifact.height} image/png`)
    } else {
        lines.push(`Location: ${artifact.resolvedLocation}`)
        lines.push(`Timezone: ${artifact.timezone}`)
        lines.push(`Source: ${artifact.url}`)
        if (artifact.current) {
            lines.push(
                `Current: ${artifact.current.temperature}°C, apparent ${
                    artifact.current.apparentTemperature
                }°C, precipitation ${
                    artifact.current.precipitation
                } mm, wind ${artifact.current.windSpeed} km/h, code ${
                    artifact.current.weatherCode
                }`
            )
        }
        const limit =
            length === 'short'
                ? Math.min(3, artifact.daily.length)
                : artifact.daily.length
        for (const day of artifact.daily.slice(0, limit)) {
            lines.push(
                `${day.date}: ${day.temperatureMin}–${day.temperatureMax}°C, precipitation ${day.precipitationProbability}%, code ${day.weatherCode}`
            )
        }
    }

    return lines.join('\n')
}

export function formatWebOutput(
    artifacts: WebArtifact[],
    length: WebResponseLength
) {
    if (artifacts.length < 1) return 'web.run completed with no results.'
    return artifacts
        .map((artifact) => artifactText(artifact, length))
        .join('\n\n')
}

export function formatWebFailure(
    execution: SearchExecution,
    failure: WebRunFailure
) {
    return [
        'web.run failed.',
        `Request: ${execution.requestId}`,
        `Operation: ${failure.operation}`,
        `Stage: ${failure.stage}`,
        `Code: ${failure.code}`,
        `Message: ${failure.message}`,
        ...(failure.provider ? [`Provider: ${failure.provider}`] : []),
        ...(failure.httpStatus != null
            ? [`HTTP status: ${failure.httpStatus}`]
            : []),
        ...(failure.providerCode
            ? [`Provider code: ${failure.providerCode}`]
            : []),
        `Retryable: ${failure.retryable}`
    ].join('\n')
}
