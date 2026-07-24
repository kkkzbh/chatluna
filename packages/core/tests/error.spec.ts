/// <reference types="mocha" />

import { assert } from 'chai'
import {
    ChatLunaError,
    ChatLunaErrorCode,
    ChatLunaHttpError,
    isRetryableHttpStatus,
    isRetryableModelError
} from '../src/utils/error'

it('preserves typed provider HTTP diagnostics and retryability', () => {
    const origin = new ChatLunaHttpError({
        operation: 'Error when calling responses',
        status: 402,
        statusText: 'Payment Required',
        responseBody:
            '{"error":{"message":"You have exceeded your monthly quota","code":"quota_exceeded"}}',
        providerCode: 'quota_exceeded',
        providerMessage: 'You have exceeded your monthly quota'
    })
    const error = new ChatLunaError(
        ChatLunaErrorCode.API_REQUEST_FAILED,
        origin,
        false,
        false
    )

    assert.equal(origin.status, 402)
    assert.equal(origin.providerCode, 'quota_exceeded')
    assert.equal(origin.providerMessage, 'You have exceeded your monthly quota')
    assert.equal(isRetryableModelError(error), false)
    assert.equal(isRetryableHttpStatus(402), false)
    assert.equal(isRetryableHttpStatus(429), true)
    assert.equal(isRetryableHttpStatus(502), true)

    error.setUserMessage(
        'GitHub Copilot 请求失败：HTTP 402，provider_code=quota_exceeded'
    )
    assert.equal(
        error.getUserMessage(),
        'GitHub Copilot 请求失败：HTTP 402，provider_code=quota_exceeded'
    )
})
