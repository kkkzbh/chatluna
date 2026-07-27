import { lookup } from 'dns/promises'
import { BlockList, isIP } from 'net'
import { webError } from './error'
import type { WebCapability } from './types'

const blockedV4 = new BlockList()
const blockedV6 = new BlockList()

for (const [address, prefix] of [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['127.0.0.0', 8],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4]
] as const) {
    blockedV4.addSubnet(address, prefix, 'ipv4')
}

for (const [address, prefix] of [
    ['::', 128],
    ['::1', 128],
    ['64:ff9b::', 96],
    ['fc00::', 7],
    ['fe80::', 10],
    ['ff00::', 8],
    ['2001::', 32],
    ['2001:db8::', 32],
    ['2002::', 16]
] as const) {
    blockedV6.addSubnet(address, prefix, 'ipv6')
}

function blockedAddress(address: string) {
    const family = isIP(address)
    if (family === 4) return blockedV4.check(address, 'ipv4')
    if (family !== 6) return true
    if (address.toLowerCase().startsWith('::ffff:')) return true
    return blockedV6.check(address, 'ipv6')
}

export async function validatePublicUrl(
    value: string,
    operation: WebCapability
) {
    return (await resolvePublicUrl(value, operation)).url
}

export async function resolvePublicUrl(
    value: string,
    operation: WebCapability
) {
    let url: URL
    try {
        url = new URL(value)
    } catch {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'invalid_url',
            message: 'The supplied URL is invalid'
        })
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'unsupported_url_scheme',
            message: 'Only HTTP(S) URLs are supported'
        })
    }
    if (url.username || url.password) {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'unsafe_url',
            message: 'URLs containing credentials are blocked'
        })
    }

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
    if (
        host === 'localhost' ||
        host.endsWith('.localhost') ||
        host === 'metadata.google.internal'
    ) {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'unsafe_url',
            message: `The URL targets a blocked host: ${host}`
        })
    }

    const addresses =
        isIP(host) === 0
            ? await lookup(host, { all: true }).catch(() => {
                  throw webError({
                      operation,
                      stage: 'fetch',
                      code: 'dns_failed',
                      message: `DNS lookup failed for ${host}`,
                      retryable: true
                  })
              })
            : [{ address: host, family: isIP(host) }]

    if (addresses.length === 0) {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'dns_failed',
            message: `DNS lookup returned no addresses for ${host}`,
            retryable: true
        })
    }
    if (addresses.some((item) => blockedAddress(item.address))) {
        throw webError({
            operation,
            stage: 'fetch',
            code: 'unsafe_url',
            message: `The URL resolves to a blocked network: ${host}`
        })
    }

    return { url, address: addresses[0] }
}

export function canonicalUrl(value: string) {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new TypeError('Only HTTP(S) URLs can be canonicalized')
    }
    url.username = ''
    url.password = ''
    url.hash = ''
    if (
        (url.protocol === 'http:' && url.port === '80') ||
        (url.protocol === 'https:' && url.port === '443')
    ) {
        url.port = ''
    }
    url.hostname = url.hostname.toLowerCase()
    for (const key of [...url.searchParams.keys()]) {
        if (
            key.toLowerCase().startsWith('utm_') ||
            [
                'access_token',
                'api_key',
                'apikey',
                'auth',
                'authkey',
                'authorization',
                'code',
                'credential',
                'fbclid',
                'gclid',
                'key',
                'mc_cid',
                'mc_eid',
                'password',
                'secret',
                'sig',
                'signature',
                'token'
            ].includes(key.toLowerCase())
        ) {
            url.searchParams.delete(key)
        }
    }
    return url.href
}

export function safeUrlForError(value: string | URL) {
    try {
        return canonicalUrl(String(value))
    } catch {
        return '[invalid URL]'
    }
}
