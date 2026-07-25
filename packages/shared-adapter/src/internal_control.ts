import type { ModelRequestParams } from 'koishi-plugin-chatluna/llm-core/platform/api'

export interface ModelRequestInternalControl {
    canonicalModel?: string
    transportModel?: string
    requestMode?: string
    toolProfile?: string
}

export interface ModelRequestOverrideBoundary {
    /** Typed control data consumed only by ChatLuna requesters/adapters. */
    internalControl: ModelRequestInternalControl

    /** Overrides allowed to enter the serialized HTTP/provider payload. */
    providerPayload: Record<string, unknown>
}

export function splitModelRequestOverrides(
    overrides: ModelRequestParams['overrideRequestParams']
): ModelRequestOverrideBoundary {
    if (
        overrides == null ||
        typeof overrides !== 'object' ||
        Array.isArray(overrides)
    ) {
        return { internalControl: {}, providerPayload: {} }
    }

    const stringValue = (key: string) =>
        typeof overrides[key] === 'string' ? overrides[key] : undefined
    const internalControl: ModelRequestInternalControl = {
        canonicalModel: stringValue('qqbot_canonical_model'),
        transportModel: stringValue('qqbot_transport_model'),
        requestMode: stringValue('qqbot_request_mode'),
        toolProfile: stringValue('qqbot_tool_profile')
    }
    const providerPayload: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(overrides)) {
        if (!key.startsWith('qqbot_')) {
            providerPayload[key] = value
        }
    }

    return { internalControl, providerPayload }
}
