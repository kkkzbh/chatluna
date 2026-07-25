import { createHash, randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { computed, ComputedRef, shallowRef } from '@vue/reactivity'
import { dump } from 'js-yaml'
import { Context, Schema } from 'koishi'
import {
    CompiledPreset,
    compilePreset,
    loadPreset,
    PresetDefinitionV2,
    PresetDefinitionV2Schema,
    PresetPostHandlerRegistry,
    PresetSource,
    PresetSummary
} from 'koishi-plugin-chatluna/llm-core/prompt'
import {
    ChatLunaError,
    ChatLunaErrorCode
} from 'koishi-plugin-chatluna/utils/error'
import { ObjectLock } from 'koishi-plugin-chatluna/utils/lock'
import type { PostHandler } from 'koishi-plugin-chatluna/utils/types'
import { Config } from './config'
import type {
    BindingRecord,
    ConstraintRecord,
    ConversationRecord
} from './types'

export type PresetOperation =
    | 'load'
    | 'create'
    | 'update'
    | 'delete'
    | 'revert'
    | 'set_default'

export type PresetErrorCode =
    | 'not_found'
    | 'conflict'
    | 'validation'
    | 'write'
    | 'reload'
    | 'default_invalid'
    | 'operation_invalid'

export class PresetError extends Error {
    readonly runtimeUnchanged = true

    constructor(
        public readonly code: PresetErrorCode,
        public readonly operation: PresetOperation,
        public readonly stage: string,
        message: string,
        public readonly presetId?: string,
        public readonly filePath?: string,
        options?: ErrorOptions
    ) {
        super(message, options)
        this.name = 'PresetError'
    }
}

async function readPresetFile(
    file: string,
    source: PresetSource,
    handlers: PresetPostHandlerRegistry
) {
    let preset: CompiledPreset
    try {
        const raw = await fs.readFile(file, 'utf-8')
        preset = loadPreset(raw, {
            source,
            path: file,
            handlers
        })
    } catch (err) {
        if (err instanceof PresetError) {
            throw err
        }
        throw new PresetError(
            'validation',
            'load',
            'parse',
            `Failed to parse Preset V2 file: ${file}`,
            undefined,
            file,
            { cause: err }
        )
    }

    if (path.basename(file) !== `${preset.id}.yml`) {
        throw new PresetError(
            'validation',
            'load',
            'filename',
            `Preset file name must match its canonical id: ${preset.id}.yml`,
            preset.id,
            file
        )
    }

    return preset
}

function mergePresets(
    bundled: ReadonlyMap<string, CompiledPreset>,
    runtime: ReadonlyMap<string, CompiledPreset>
) {
    const result = new Map(bundled)
    for (const [id, preset] of runtime) {
        result.set(id, preset)
    }

    const names = new Map<string, string>()
    for (const preset of result.values()) {
        const values = [preset.id, ...preset.aliases]
        for (const value of values) {
            const name = value.toLowerCase()
            const owner = names.get(name)
            if (owner != null && owner !== preset.id) {
                throw new PresetError(
                    'conflict',
                    'load',
                    'identity',
                    `Preset identity "${value}" belongs to both ${owner} and ${preset.id}.`,
                    preset.id,
                    preset.path
                )
            }
            names.set(name, preset.id)
        }
    }
    return result
}

function parseDefinition(
    definition: PresetDefinitionV2,
    operation: 'create' | 'update'
) {
    try {
        return PresetDefinitionV2Schema.parse(definition)
    } catch (err) {
        throw new PresetError(
            'validation',
            operation,
            'schema',
            'Preset definition does not satisfy the V2 schema.',
            definition.id,
            undefined,
            { cause: err }
        )
    }
}

export class PresetService {
    private readonly _presets = shallowRef<ReadonlyMap<string, CompiledPreset>>(
        new Map()
    )

    private readonly _globalDefaultId = shallowRef<string>()
    private readonly _handlers = new Map<string, PostHandler['handler']>()
    private _bundled = new Map<string, CompiledPreset>()
    private _runtime = new Map<string, CompiledPreset>()
    private readonly _lock = new ObjectLock()
    private readonly _referenceLock = new ObjectLock()

    constructor(
        private readonly ctx: Context,
        private readonly config: Config
    ) {
        if (
            config.bundledPresetDir.trim().length === 0 ||
            config.runtimePresetDir.trim().length === 0
        ) {
            throw new PresetError(
                'validation',
                'load',
                'config',
                'bundledPresetDir and runtimePresetDir must be non-empty paths.'
            )
        }
    }

    get bundledDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.bundledPresetDir.trim()
        )
    }

    get runtimeDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.runtimePresetDir.trim()
        )
    }

    runReferenceMutation<T>(mutation: () => Promise<T>): Promise<T> {
        return this._referenceLock.runLocked(mutation)
    }

    registerPostHandler(id: string, handler: PostHandler['handler']) {
        if (this._handlers.has(id)) {
            throw new PresetError(
                'conflict',
                'load',
                'handler_registry',
                `Preset post handler is already registered: ${id}`
            )
        }
        this._handlers.set(id, handler)
        return () => this._handlers.delete(id)
    }

    async init() {
        try {
            await fs.access(this.bundledDir)
            await fs.mkdir(this.runtimeDir, { recursive: true })
        } catch (err) {
            throw new PresetError(
                'write',
                'load',
                'directories',
                'Preset directories are unavailable.',
                undefined,
                this.runtimeDir,
                { cause: err }
            )
        }
        await this.loadAllPresets()

        let id: unknown
        try {
            const rows = (await this.ctx.database.get('chatluna_meta', {
                key: 'globalDefaultPresetId'
            })) as { value?: string | null }[]
            id = rows[0]?.value == null ? undefined : JSON.parse(rows[0].value)
        } catch (err) {
            throw new PresetError(
                'default_invalid',
                'load',
                'global_default',
                'Failed to read chatluna_meta.globalDefaultPresetId.',
                undefined,
                undefined,
                { cause: err }
            )
        }

        if (typeof id !== 'string' || !this._presets.value.has(id)) {
            throw new PresetError(
                'default_invalid',
                'load',
                'global_default',
                'chatluna_meta.globalDefaultPresetId is missing or does not reference a loaded preset.',
                typeof id === 'string' ? id : undefined
            )
        }

        this._globalDefaultId.value = id
    }

    async loadAllPresets() {
        await this._lock.runLocked(async () => {
            try {
                const handlers = this._handlers as PresetPostHandlerRegistry
                const bundled = new Map<string, CompiledPreset>()
                const runtime = new Map<string, CompiledPreset>()

                const bundledEntries = (
                    await fs.readdir(this.bundledDir, {
                        withFileTypes: true
                    })
                ).sort((left, right) => left.name.localeCompare(right.name))
                for (const entry of bundledEntries) {
                    if (
                        !entry.isFile() ||
                        path.extname(entry.name) !== '.yml'
                    ) {
                        throw new PresetError(
                            'validation',
                            'load',
                            'directory_entry',
                            `Bundled preset directory contains an unsupported entry: ${entry.name}`,
                            undefined,
                            path.join(this.bundledDir, entry.name)
                        )
                    }
                    const preset = await readPresetFile(
                        path.join(this.bundledDir, entry.name),
                        'bundled',
                        handlers
                    )
                    if (bundled.has(preset.id)) {
                        throw new PresetError(
                            'conflict',
                            'load',
                            'canonical_id',
                            `Duplicate bundled preset id: ${preset.id}`,
                            preset.id,
                            preset.path
                        )
                    }
                    bundled.set(preset.id, preset)
                }

                const runtimeEntries = (
                    await fs.readdir(this.runtimeDir, {
                        withFileTypes: true
                    })
                ).sort((left, right) => left.name.localeCompare(right.name))
                for (const entry of runtimeEntries) {
                    if (
                        !entry.isFile() ||
                        path.extname(entry.name) !== '.yml'
                    ) {
                        throw new PresetError(
                            'validation',
                            'load',
                            'directory_entry',
                            `Runtime preset directory contains an unsupported entry: ${entry.name}`,
                            undefined,
                            path.join(this.runtimeDir, entry.name)
                        )
                    }
                    const preset = await readPresetFile(
                        path.join(this.runtimeDir, entry.name),
                        'runtime',
                        handlers
                    )
                    if (runtime.has(preset.id)) {
                        throw new PresetError(
                            'conflict',
                            'load',
                            'canonical_id',
                            `Duplicate runtime preset id: ${preset.id}`,
                            preset.id,
                            preset.path
                        )
                    }
                    runtime.set(preset.id, preset)
                }

                const presets = mergePresets(bundled, runtime)
                const globalDefaultId = this._globalDefaultId.value
                if (globalDefaultId != null && !presets.has(globalDefaultId)) {
                    throw new PresetError(
                        'default_invalid',
                        'load',
                        'global_default',
                        `Reloaded presets do not contain the live global default: ${globalDefaultId}`,
                        globalDefaultId
                    )
                }
                this._bundled = bundled
                this._runtime = runtime
                this._presets.value = presets
                this.updateSchema()
            } catch (err) {
                if (err instanceof PresetError) {
                    throw err
                }
                throw new PresetError(
                    'reload',
                    'load',
                    'directories',
                    'Failed to load preset directories.',
                    undefined,
                    this.runtimeDir,
                    { cause: err }
                )
            }
        })
    }

    getPreset(id: string): ComputedRef<CompiledPreset>
    getPreset(
        id: string,
        throwError: false
    ): ComputedRef<CompiledPreset | undefined>

    getPreset(id: string, throwError = true) {
        return computed(() => {
            const preset = this._presets.value.get(id)
            if (preset != null || !throwError) {
                return preset
            }
            throw new ChatLunaError(
                ChatLunaErrorCode.PRESET_NOT_FOUND,
                new Error(`No preset found for canonical id ${id}`)
            )
        })
    }

    findPresetInput(value: string) {
        return computed(() => {
            const exact = this._presets.value.get(value)
            if (exact != null) {
                return exact
            }
            const name = value.toLowerCase()
            return Array.from(this._presets.value.values()).find((preset) =>
                preset.aliases.some((alias) => alias.toLowerCase() === name)
            )
        })
    }

    getDefaultPreset() {
        return computed(() => {
            const id = this._globalDefaultId.value
            const preset = id == null ? undefined : this._presets.value.get(id)
            if (preset != null) {
                return preset
            }
            throw new PresetError(
                'default_invalid',
                'load',
                'global_default',
                'The live global default preset is unavailable.',
                id
            )
        })
    }

    getGlobalDefaultPresetId() {
        return computed(() => {
            const id = this._globalDefaultId.value
            if (id == null) {
                throw new PresetError(
                    'default_invalid',
                    'load',
                    'global_default',
                    'The live global default preset has not been initialized.'
                )
            }
            return id
        })
    }

    async setGlobalDefaultPresetId(id: string) {
        return this._lock.runLocked(async () => {
            if (!this._presets.value.has(id)) {
                throw new PresetError(
                    'not_found',
                    'set_default',
                    'validate',
                    `Preset does not exist: ${id}`,
                    id
                )
            }

            try {
                await this.ctx.database.upsert('chatluna_meta', [
                    {
                        key: 'globalDefaultPresetId',
                        value: JSON.stringify(id),
                        updatedAt: new Date()
                    }
                ])
            } catch (err) {
                throw new PresetError(
                    'write',
                    'set_default',
                    'database',
                    `Failed to persist the global default preset: ${id}`,
                    id,
                    undefined,
                    { cause: err }
                )
            }
            this._globalDefaultId.value = id
        })
    }

    listPresets(): ComputedRef<PresetSummary[]> {
        return computed(() =>
            Array.from(this._presets.value.values())
                .map((preset) => ({
                    id: preset.id,
                    displayName: preset.displayName,
                    aliases: [...preset.aliases],
                    source: preset.source as 'bundled' | 'runtime',
                    hasOverride:
                        preset.source === 'runtime' &&
                        this._bundled.has(preset.id),
                    revision: preset.revision,
                    isGlobalDefault: preset.id === this._globalDefaultId.value
                }))
                .sort(
                    (a, b) =>
                        a.displayName.localeCompare(b.displayName) ||
                        a.id.localeCompare(b.id)
                )
        )
    }

    getDefinition(id: string) {
        const preset = this._presets.value.get(id)
        if (preset == null) {
            throw new PresetError(
                'not_found',
                'load',
                'lookup',
                `Preset does not exist: ${id}`,
                id
            )
        }
        return structuredClone(preset.definition)
    }

    private async assertExpectedRevisionLocked(
        id: string,
        expectedRevision: string,
        operation: 'update' | 'delete' | 'revert'
    ) {
        const current = this._presets.value.get(id)
        if (current == null) {
            throw new PresetError(
                'not_found',
                operation,
                'lookup',
                `Preset does not exist: ${id}`,
                id
            )
        }
        if (current.revision !== expectedRevision) {
            throw new PresetError(
                'conflict',
                operation,
                'revision',
                `Preset revision changed: ${id}`,
                id,
                current.path
            )
        }
        if (current.path == null) {
            throw new PresetError(
                'operation_invalid',
                operation,
                'path',
                `Preset does not have a persistent source path: ${id}`,
                id
            )
        }

        let diskRevision: string
        try {
            const raw = await fs.readFile(current.path, 'utf-8')
            diskRevision = createHash('sha256').update(raw).digest('hex')
        } catch (err) {
            throw new PresetError(
                'conflict',
                operation,
                'revision',
                `Preset file no longer matches the loaded revision: ${id}`,
                id,
                current.path,
                { cause: err }
            )
        }
        if (diskRevision !== current.revision) {
            throw new PresetError(
                'conflict',
                operation,
                'revision',
                `Preset file changed outside PresetService: ${id}`,
                id,
                current.path
            )
        }
        return current
    }

    async createPreset(definition: PresetDefinitionV2) {
        const preset = parseDefinition(definition, 'create')
        return this._lock.runLocked(async () => {
            if (this._presets.value.has(preset.id)) {
                throw new PresetError(
                    'conflict',
                    'create',
                    'validate',
                    `Preset already exists: ${preset.id}`,
                    preset.id
                )
            }
            return this.writeRuntimePresetLocked(preset, 'create')
        })
    }

    async updatePreset(
        id: string,
        definition: PresetDefinitionV2,
        expectedRevision: string
    ) {
        const preset = parseDefinition(definition, 'update')
        if (preset.id !== id) {
            throw new PresetError(
                'validation',
                'update',
                'identity',
                'Preset canonical id is immutable.',
                id
            )
        }
        return this._lock.runLocked(async () => {
            await this.assertExpectedRevisionLocked(
                id,
                expectedRevision,
                'update'
            )
            return this.writeRuntimePresetLocked(preset, 'update')
        })
    }

    async deletePreset(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertExpectedRevisionLocked(
                id,
                expectedRevision,
                'delete'
            )
            const preset = this._runtime.get(id)
            if (preset == null || this._bundled.has(id)) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'source',
                    `Only runtime-only presets can be deleted: ${id}`,
                    id,
                    preset?.path
                )
            }
            if (id === this._globalDefaultId.value) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'global_default',
                    'The global default preset cannot be deleted.',
                    id,
                    preset.path
                )
            }

            return this._referenceLock.runLocked(async () => {
                let conversations: ConversationRecord[]
                let constraints: ConstraintRecord[]
                let bindings: BindingRecord[]
                try {
                    ;[conversations, constraints, bindings] = await Promise.all(
                        [
                            this.ctx.database.get(
                                'chatluna_conversation',
                                {}
                            ) as Promise<ConversationRecord[]>,
                            this.ctx.database.get(
                                'chatluna_constraint',
                                {}
                            ) as Promise<ConstraintRecord[]>,
                            this.ctx.database.get(
                                'chatluna_binding',
                                {}
                            ) as Promise<BindingRecord[]>
                        ]
                    )
                } catch (err) {
                    throw new PresetError(
                        'write',
                        'delete',
                        'reference_check',
                        `Failed to inspect preset references: ${id}`,
                        id,
                        preset.path,
                        { cause: err }
                    )
                }
                const used =
                    conversations.some(
                        (conversation) =>
                            conversation.preset === id ||
                            conversation.bindingKey.endsWith(`:preset:${id}`)
                    ) ||
                    constraints.some(
                        (constraint) =>
                            constraint.activePresetLane === id ||
                            constraint.defaultPreset === id ||
                            constraint.fixedPreset === id
                    ) ||
                    bindings.some((binding) =>
                        binding.bindingKey.endsWith(`:preset:${id}`)
                    )

                if (used) {
                    throw new PresetError(
                        'operation_invalid',
                        'delete',
                        'references',
                        `Preset is still referenced by runtime records: ${id}`,
                        id,
                        preset.path
                    )
                }

                const runtime = new Map(this._runtime)
                runtime.delete(id)
                const presets = mergePresets(this._bundled, runtime)
                try {
                    await fs.unlink(path.join(this.runtimeDir, `${id}.yml`))
                } catch (err) {
                    throw new PresetError(
                        'write',
                        'delete',
                        'unlink',
                        `Failed to delete runtime preset: ${id}`,
                        id,
                        preset.path,
                        { cause: err }
                    )
                }
                this._runtime = runtime
                this._presets.value = presets
                this.updateSchema()
            })
        })
    }

    async revertOverride(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertExpectedRevisionLocked(
                id,
                expectedRevision,
                'revert'
            )
            const bundled = this._bundled.get(id)
            const runtime = this._runtime.get(id)
            if (bundled == null || runtime == null) {
                throw new PresetError(
                    'operation_invalid',
                    'revert',
                    'source',
                    `Preset does not have a runtime override: ${id}`,
                    id,
                    runtime?.path
                )
            }
            const next = new Map(this._runtime)
            next.delete(id)
            const presets = mergePresets(this._bundled, next)
            try {
                await fs.unlink(path.join(this.runtimeDir, `${id}.yml`))
            } catch (err) {
                throw new PresetError(
                    'write',
                    'revert',
                    'unlink',
                    `Failed to remove runtime preset override: ${id}`,
                    id,
                    runtime.path,
                    { cause: err }
                )
            }
            this._runtime = next
            this._presets.value = presets
            this.updateSchema()
            return bundled
        })
    }

    private async writeRuntimePresetLocked(
        definition: PresetDefinitionV2,
        operation: 'create' | 'update'
    ) {
        const raw = dump(definition, {
            lineWidth: 100,
            noRefs: true,
            sortKeys: false
        })
        const file = path.join(this.runtimeDir, `${definition.id}.yml`)
        const replacesRuntimePreset = this._runtime.has(definition.id)
        let compiled: CompiledPreset
        try {
            compiled = compilePreset(definition, {
                source: 'runtime',
                raw,
                path: file,
                handlers: this._handlers
            })
        } catch (err) {
            throw new PresetError(
                'validation',
                operation,
                'compile',
                `Failed to compile preset: ${definition.id}`,
                definition.id,
                file,
                { cause: err }
            )
        }
        const runtime = new Map(this._runtime)
        runtime.set(definition.id, compiled)
        const presets = mergePresets(this._bundled, runtime)
        const tmp = path.join(
            this.runtimeDir,
            `.${definition.id}.${randomUUID()}.tmp`
        )

        let linkedNewFile = false
        try {
            await fs.writeFile(tmp, raw, {
                encoding: 'utf-8',
                flag: 'wx'
            })
            if (replacesRuntimePreset) {
                await fs.rename(tmp, file)
            } else {
                await fs.link(tmp, file)
                linkedNewFile = true
                await fs.unlink(tmp)
            }
        } catch (err) {
            const cleanupErrors: unknown[] = []
            if (linkedNewFile) {
                try {
                    await fs.unlink(file)
                } catch (cleanupError) {
                    cleanupErrors.push(cleanupError)
                }
            }
            try {
                await fs.rm(tmp, { force: true })
            } catch (cleanupError) {
                cleanupErrors.push(cleanupError)
            }
            const cause =
                cleanupErrors.length === 0
                    ? err
                    : new AggregateError(
                          [err, ...cleanupErrors],
                          `Failed to roll back preset write: ${definition.id}`
                      )
            const destinationExists =
                !replacesRuntimePreset &&
                (err as NodeJS.ErrnoException).code === 'EEXIST'
            throw new PresetError(
                destinationExists ? 'conflict' : 'write',
                operation,
                destinationExists ? 'revision' : 'atomic_write',
                destinationExists
                    ? `Runtime preset file already exists outside PresetService: ${definition.id}`
                    : `Failed to write preset: ${definition.id}`,
                definition.id,
                file,
                { cause }
            )
        }

        this._runtime = runtime
        this._presets.value = presets
        this.updateSchema()
        return compiled
    }

    private updateSchema() {
        if (!this.ctx.scope.isActive) {
            return
        }
        this.ctx.schema.set(
            'preset',
            Schema.union(
                Array.from(this._presets.value.keys()).map((id) =>
                    Schema.const(id)
                )
            )
        )
    }
}
