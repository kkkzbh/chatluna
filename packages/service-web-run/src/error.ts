import type { WebRunFailure } from './types'

export class WebRunError extends Error {
    constructor(public readonly failure: WebRunFailure) {
        super(failure.message)
        this.name = 'WebRunError'
    }
}

export function webError(
    failure: Omit<WebRunFailure, 'retryable'> & { retryable?: boolean }
) {
    return new WebRunError({
        ...failure,
        retryable: failure.retryable ?? false
    })
}
