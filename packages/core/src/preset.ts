import fs from 'fs/promises'
import { watch } from 'fs'
import { Context, Logger, Schema } from 'koishi'
import {
    loadPreset,
    PresetTemplate
} from 'koishi-plugin-chatluna/llm-core/prompt'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { createLogger } from 'koishi-plugin-chatluna/utils/logger'
import { ObjectLock } from 'koishi-plugin-chatluna/utils/lock'
import path from 'path'
import { fileURLToPath } from 'url'
import { Config } from './config'
import { computed, ComputedRef, shallowRef } from '@vue/reactivity'
import {
    resolvePresetDirectoriesFromEnv,
    resolveRuntimePresetDirectoryFromEnv
} from './preset_dirs'

let logger: Logger

export class PresetService {
    private readonly _presets = shallowRef<PresetTemplate[]>([])

    private _aborter: AbortController
    private _lock: ObjectLock

    constructor(
        private readonly ctx: Context,
        private readonly config: Config
    ) {
        logger = createLogger(ctx)
        this._lock = new ObjectLock()

        ctx.on('dispose', () => {
            this._aborter?.abort()
        })
    }

    async loadPreset(file: string) {
        if (!file || !file.length) {
            logger.warn(`Preset file is empty`)
            return
        }

        if (!this.ctx.scope.isActive) {
            return
        }

        if (this._presets.value.some((p) => p.path === file)) {
            logger.warn(`Preset ${file} already exists`)
            return
        }

        const preset = await this._loadPresetFromPath(file)
        if (preset) {
            this._presets.value = [...this._presets.value, preset]
        }
    }

    private async _loadPresetFromPath(
        filePath: string
    ): Promise<PresetTemplate | null> {
        try {
            const rawText = await fs.readFile(filePath, 'utf-8')
            const preset = loadPreset(rawText)
            preset.path = filePath
            return preset
        } catch (e) {
            logger.error(`Error when load preset ${filePath}`, e)
            return null
        }
    }

    private _updatePreset(preset: PresetTemplate) {
        const index = this._presets.value.findIndex(
            (p) => p.path === preset.path
        )
        if (index !== -1) {
            const newPresets = [...this._presets.value]
            newPresets[index] = preset
            this._presets.value = newPresets
        } else {
            this._presets.value = [...this._presets.value, preset]
        }
    }

    private _removePreset(filePath: string) {
        this._presets.value = this._presets.value.filter(
            (p) => p.path !== filePath
        )
    }

    async loadAllPreset() {
        await this._lock.runLocked(async () => {
            await this._checkPresetDir()

            const seenNames = new Set<string>()
            const presets: PresetTemplate[] = []

            for (const presetDir of this.resolvePresetDirs()) {
                let files: string[]
                try {
                    files = await fs.readdir(presetDir)
                } catch (error) {
                    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                        continue
                    }
                    throw error
                }

                for (const file of files) {
                    const extension = path.extname(file)
                    if (extension !== '.txt' && extension !== '.yml') {
                        continue
                    }

                    const presetName = path.basename(file, extension)
                    if (seenNames.has(presetName)) {
                        continue
                    }

                    const presetPath = path.join(presetDir, file)
                    const preset = await this._loadPresetFromPath(presetPath)
                    if (preset) {
                        presets.push(preset)
                        seenNames.add(presetName)
                    }
                }
            }

            this._presets.value = presets
            this._updateSchema()
        })
    }

    watchPreset() {
        if (this._aborter != null) {
            this._aborter.abort()
        }

        this._aborter = new AbortController()

        let reloadTimer: NodeJS.Timeout | null = null
        const scheduleReload = () => {
            if (reloadTimer) {
                clearTimeout(reloadTimer)
            }
            reloadTimer = setTimeout(async () => {
                reloadTimer = null
                await this.loadAllPreset()
                logger.debug(`trigger full reload preset`)
            }, 120)
        }

        for (const presetDir of this.resolvePresetDirs()) {
            try {
                watch(
                    presetDir,
                    {
                        signal: this._aborter.signal
                    },
                    async (_event, _filename) => {
                        try {
                            scheduleReload()
                        } catch (e) {
                            logger.error(`Error when watching preset dir ${presetDir}`, e)
                            await this.loadAllPreset()
                        }
                    }
                )
            } catch (e) {
                logger.warn(`Skip watching missing preset dir ${presetDir}`, e)
            }
        }

        this.ctx.on('dispose', () => {
            if (reloadTimer) {
                clearTimeout(reloadTimer)
            }
        })
    }

    async init() {
        await this.loadAllPreset()
        this.watchPreset()
    }

    getPreset(
        triggerKeyword: string,
        throwError: boolean = true
    ): ComputedRef<PresetTemplate> {
        return computed(() => {
            const preset = this._presets.value.find((preset) =>
                preset.triggerKeyword.includes(triggerKeyword)
            )

            if (preset) {
                return preset
            }

            if (throwError) {
                throw new ChatLunaError(
                    ChatLunaErrorCode.PRESET_NOT_FOUND,
                    new Error(`No preset found for keyword ${triggerKeyword}`)
                )
            }

            return undefined
        })
    }

    getDefaultPreset(): ComputedRef<PresetTemplate> {
        return computed(() => {
            const preset = this._presets.value.find((preset) =>
                preset.triggerKeyword.includes('sydney')
            )

            if (preset) {
                return preset
            }

            if (this._presets.value.length === 0) {
                throw new ChatLunaError(
                    ChatLunaErrorCode.PRESET_NOT_FOUND,
                    new Error('No presets loaded. Please call init() first.')
                )
            }

            return this._presets.value[0]
        })
    }

    getAllPreset(concatKeyword: boolean = true): ComputedRef<string[]> {
        return computed(() =>
            this._presets.value.map((preset) =>
                concatKeyword
                    ? preset.triggerKeyword.join(', ')
                    : preset.triggerKeyword[0]
            )
        )
    }

    addPreset(preset: PresetTemplate) {
        if (
            this._presets.value.some(
                (p) =>
                    p.triggerKeyword.join(',') ===
                    preset.triggerKeyword.join(',')
            ) ||
            this._presets.value.some((p) => p.path === preset.path)
        ) {
            logger.warn(`Preset ${preset.path} already exists`)
            return
        }

        this._presets.value = [...this._presets.value, preset]
        this._updateSchema()
    }

    private _updateSchema() {
        if (!this.ctx.scope.isActive) {
            return
        }

        this.ctx.schema.set(
            'preset',
            Schema.union(
                this._presets.value.map((preset) =>
                    Schema.const(preset.triggerKeyword[0])
                )
            )
        )
    }

    async resetDefaultPreset(): Promise<void> {
        await this._copyDefaultPresets()
    }

    public resolvePresetDir() {
        return resolveRuntimePresetDirectoryFromEnv(this.ctx.baseDir)
    }

    public resolvePresetDirs() {
        return resolvePresetDirectoriesFromEnv(this.ctx.baseDir)
    }

    private async _checkPresetDir() {
        const runtimePresetDir = this.resolvePresetDir()

        await fs.mkdir(runtimePresetDir, { recursive: true })

        if (process.env.CHATLUNA_PRESET_DIRS?.trim()) {
            return
        }

        const files = await fs.readdir(runtimePresetDir).catch(() => [])
        if (files.length === 0) {
            await this._copyDefaultPresets()
        }
    }

    private async _copyDefaultPresets() {
        const currentPresetDir = path.join(this.resolvePresetDir())

        const dirname =
            __dirname?.length > 0 ? __dirname : fileURLToPath(import.meta.url)

        const defaultPresetDir = path.join(dirname, '../resources/presets')

        const files = await fs.readdir(defaultPresetDir)

        for (const file of files) {
            const filePath = path.join(defaultPresetDir, file)
            const fileStat = await fs.stat(filePath)
            if (fileStat.isFile()) {
                await fs.mkdir(currentPresetDir, { recursive: true })
                logger.debug(
                    `copy preset file ${filePath} to ${currentPresetDir}`
                )
                await fs.copyFile(filePath, path.join(currentPresetDir, file))
            }
        }
    }
}
