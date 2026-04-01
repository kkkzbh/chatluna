import path from 'path'

function resolveOptionalPath(baseDir: string, input: string): string {
    return path.isAbsolute(input) ? input : path.resolve(baseDir, input)
}

export function resolvePresetDirectoriesFromEnv(
    baseDir: string,
    env: NodeJS.ProcessEnv = process.env
): string[] {
    const configured = String(env.CHATLUNA_PRESET_DIRS ?? '')
        .split(path.delimiter)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => resolveOptionalPath(baseDir, part))

    if (configured.length > 0) {
        return [...new Set(configured)]
    }

    return [path.resolve(baseDir, 'data/chathub/presets')]
}

export function resolveRuntimePresetDirectoryFromEnv(
    baseDir: string,
    env: NodeJS.ProcessEnv = process.env
): string {
    const explicit = env.CHATLUNA_RUNTIME_PRESET_DIR?.trim()
    if (explicit) {
        return resolveOptionalPath(baseDir, explicit)
    }

    return resolvePresetDirectoriesFromEnv(baseDir, env)[0]
}
