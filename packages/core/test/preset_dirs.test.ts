import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'
import {
    resolvePresetDirectoriesFromEnv,
    resolveRuntimePresetDirectoryFromEnv
} from '../src/preset_dirs.ts'

test('resolvePresetDirectoriesFromEnv falls back to the bundled preset dir', () => {
    assert.deepEqual(resolvePresetDirectoriesFromEnv('/tmp/chatluna-test', {}), [
        path.resolve('/tmp/chatluna-test', 'data/chathub/presets')
    ])
})

test('resolvePresetDirectoriesFromEnv keeps configured order and deduplicates directories', () => {
    const dirs = resolvePresetDirectoriesFromEnv('/srv/app', {
        CHATLUNA_PRESET_DIRS:
            '/opt/qqbot/shared/presets:/srv/app/data/chathub/presets:/opt/qqbot/shared/presets'
    })

    assert.deepEqual(dirs, [
        '/opt/qqbot/shared/presets',
        '/srv/app/data/chathub/presets'
    ])
})

test('resolveRuntimePresetDirectoryFromEnv prefers the explicit runtime preset dir', () => {
    const runtimeDir = resolveRuntimePresetDirectoryFromEnv('/srv/app', {
        CHATLUNA_RUNTIME_PRESET_DIR: '/opt/qqbot/shared/presets',
        CHATLUNA_PRESET_DIRS:
            '/opt/qqbot/shared/presets:/srv/app/data/chathub/presets'
    })

    assert.equal(runtimeDir, '/opt/qqbot/shared/presets')
})
