import type { ChainValues } from '@langchain/core/utils/types'

export function mergeBuiltVariables(
    variables: ChainValues,
    values: Record<string, unknown>
): void {
    const current = variables['built']
    if (
        current != null &&
        (typeof current !== 'object' || Array.isArray(current))
    ) {
        throw new Error('variables.built must be an object')
    }
    variables['built'] = {
        ...(current ?? {}),
        ...values
    }
}
