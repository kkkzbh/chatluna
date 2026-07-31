/// <reference types="mocha" />

import { assert } from 'chai'
import {
    requireSinglePresetMessage,
    SetPresetCommandError
} from '../src/middlewares/preset/set_preset'
import type { PresetMessage } from '../src/preset_schema'

function preset(messages: PresetMessage[]) {
    return {
        id: 'test-preset',
        messages
    }
}

it('rejects an empty preset message list with a typed command error', () => {
    let caught: unknown

    try {
        requireSinglePresetMessage(preset([]))
    } catch (error) {
        caught = error
    }

    assert.instanceOf(caught, SetPresetCommandError)
    assert.equal((caught as SetPresetCommandError).code, 'empty_messages')
    assert.equal((caught as SetPresetCommandError).presetId, 'test-preset')
})

it('only exposes the single-message preset shape to the set command', () => {
    const message: PresetMessage = {
        role: 'system',
        content: 'old content'
    }

    assert.equal(requireSinglePresetMessage(preset([message])), message)
    assert.throws(
        () => requireSinglePresetMessage(preset([message, { ...message }])),
        SetPresetCommandError
    )
})
