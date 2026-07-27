import { chatLunaFetch } from 'koishi-plugin-chatluna/utils/request'
import type { LookupFunction } from 'net'
import { Agent } from 'undici'
import type { Config } from './config'
import { webError } from './error'
import { resolvePublicUrl, safeUrlForError } from './security'
import type { WebCapability } from './types'

export type WebFetch = typeof chatLunaFetch
export type WebResponse = Awaited<ReturnType<WebFetch>>

export function createWebFetch(config: Config): WebFetch {
    if (config.proxyMode === 'on') {
        return (url, init) => chatLunaFetch(url, init, config.proxyAddress)
    }
    if (config.proxyMode === 'off') {
        return (url, init) => chatLunaFetch(url, init, 'null')
    }
    return (url, init) => chatLunaFetch(url, init)
}

export async function fetchPublic(
    fetcher: WebFetch,
    value: string,
    operation: WebCapability,
    timeout: number
) {
    let target = await resolvePublicUrl(value, operation)
    const signal = AbortSignal.timeout(timeout)

    for (let redirect = 0; redirect < 6; redirect++) {
        const lookup: LookupFunction = (_hostname, options, callback) => {
            if (options.all) {
                callback(null, [target.address])
                return
            }
            callback(null, target.address.address, target.address.family)
        }
        const dispatcher = new Agent({ connect: { lookup } })
        let response: WebResponse
        try {
            response = await fetcher(target.url, {
                dispatcher,
                redirect: 'manual',
                signal,
                headers: {
                    'User-Agent':
                        'Mozilla/5.0 (compatible; ChatLuna-WebRun/1.0)'
                }
            })
        } catch (err) {
            throw webError({
                operation,
                stage: 'fetch',
                code: 'request_failed',
                message: `Failed to fetch ${safeUrlForError(target.url)}: ${
                    err instanceof Error ? err.name : 'request error'
                }`,
                retryable: true
            })
        } finally {
            void dispatcher.close()
        }

        if (
            response.status < 300 ||
            response.status >= 400 ||
            response.status === 304
        ) {
            return { response, url: target.url }
        }

        const location = response.headers.get('location')
        if (!location) {
            throw webError({
                operation,
                stage: 'fetch',
                code: 'invalid_redirect',
                message: `Redirect response did not include a location: ${safeUrlForError(target.url)}`,
                httpStatus: response.status
            })
        }
        await response.body?.cancel()
        target = await resolvePublicUrl(
            new URL(location, target.url).href,
            operation
        )
    }

    throw webError({
        operation,
        stage: 'fetch',
        code: 'too_many_redirects',
        message: `Too many redirects while fetching ${safeUrlForError(value)}`
    })
}

export async function readBounded(
    response: WebResponse,
    maxBytes: number,
    operation: WebCapability
) {
    const declared = Number(response.headers.get('content-length'))
    if (Number.isFinite(declared) && declared > maxBytes) {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'response_too_large',
            message: `Response exceeds the ${maxBytes} byte limit`,
            httpStatus: response.status
        })
    }

    if (!response.body) return Buffer.alloc(0)

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > maxBytes) {
            await reader.cancel()
            throw webError({
                operation,
                stage: 'fetch',
                code: 'response_too_large',
                message: `Response exceeds the ${maxBytes} byte limit`,
                httpStatus: response.status
            })
        }
        chunks.push(value)
    }
    return Buffer.concat(chunks)
}
