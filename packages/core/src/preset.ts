import { createHash, randomUUID } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { computed, ComputedRef, shallowRef } from '@vue/reactivity'
import { dump, load } from 'js-yaml'
import { Context, Schema } from 'koishi'
import {
    CompiledPreset,
    CompiledRolePreset,
    compileContextPreset,
    compileRolePreset,
    ContextPresetDefinitionV1,
    ContextPresetDefinitionV1Schema,
    ContextPresetPreview,
    ContextPresetSummary,
    loadContextPreset,
    loadRolePreset,
    PresetPostHandlerRegistry,
    PresetSource,
    previewContextPreset,
    RolePresetDefinitionV1,
    RolePresetDefinitionV1Schema,
    RolePresetSummary,
    RuntimeContextBlockType
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
        options?: ErrorOptions & { referenceIds?: string[] }
    ) {
        super(message, options)
        this.name = 'PresetError'
        this.referenceIds = options?.referenceIds ?? []
    }

    readonly referenceIds: string[]
}

async function readRoleFile(file: string, source: PresetSource) {
    let role: CompiledRolePreset
    try {
        const raw = await fs.readFile(file, 'utf-8')
        role = loadRolePreset(raw, { source, path: file })
    } catch (err) {
        throw new PresetError(
            'validation',
            'load',
            'parse',
            `Failed to parse role preset file: ${file}`,
            undefined,
            file,
            { cause: err }
        )
    }
    if (path.basename(file) !== `${role.id}.yml`) {
        throw new PresetError(
            'validation',
            'load',
            'filename',
            `Role preset file name must match its canonical id: ${role.id}.yml`,
            role.id,
            file
        )
    }
    return role
}

async function readContextFile(
    file: string,
    source: PresetSource,
    roles: ReadonlyMap<string, CompiledRolePreset>,
    handlers: PresetPostHandlerRegistry
) {
    try {
        const raw = await fs.readFile(file, 'utf-8')
        const definition = ContextPresetDefinitionV1Schema.parse(load(raw))
        const role = definition.blocks.find((block) => block.type === 'role')!
        const preset = loadContextPreset(raw, roles.get(role.rolePresetId), {
            source,
            path: file,
            handlers
        })
        if (path.basename(file) !== `${preset.id}.yml`) {
            throw new PresetError(
                'validation',
                'load',
                'filename',
                `Context preset file name must match its canonical id: ${preset.id}.yml`,
                preset.id,
                file
            )
        }
        return preset
    } catch (err) {
        if (err instanceof PresetError) {
            throw err
        }
        throw new PresetError(
            'validation',
            'load',
            'parse',
            `Failed to parse context preset file: ${file}`,
            undefined,
            file,
            { cause: err }
        )
    }
}

function mergeRoles(
    bundled: ReadonlyMap<string, CompiledRolePreset>,
    runtime: ReadonlyMap<string, CompiledRolePreset>
) {
    return new Map([...bundled, ...runtime])
}

function mergeContexts(
    bundled: ReadonlyMap<string, CompiledPreset>,
    runtime: ReadonlyMap<string, CompiledPreset>
) {
    const result = new Map([...bundled, ...runtime])
    const names = new Map<string, string>()
    for (const preset of result.values()) {
        for (const value of [preset.id, ...preset.aliases]) {
            const name = value.toLowerCase()
            const owner = names.get(name)
            if (owner != null && owner !== preset.id) {
                throw new PresetError(
                    'conflict',
                    'load',
                    'identity',
                    `Context preset identity "${value}" belongs to both ${owner} and ${preset.id}.`,
                    preset.id,
                    preset.path
                )
            }
            names.set(name, preset.id)
        }
    }
    return result
}

export class PresetService {
    private readonly _contexts = shallowRef<
        ReadonlyMap<string, CompiledPreset>
    >(new Map())
    private readonly _roles = shallowRef<
        ReadonlyMap<string, CompiledRolePreset>
    >(new Map())
    private readonly _globalDefaultId = shallowRef<string>()
    private readonly _handlers = new Map<string, PostHandler['handler']>()
    private _bundledContexts = new Map<string, CompiledPreset>()
    private _runtimeContexts = new Map<string, CompiledPreset>()
    private _bundledRoles = new Map<string, CompiledRolePreset>()
    private _runtimeRoles = new Map<string, CompiledRolePreset>()
    private readonly _lock = new ObjectLock()
    private readonly _referenceLock = new ObjectLock()

    constructor(
        private readonly ctx: Context,
        private readonly config: Config
    ) {
        for (const value of [
            config.bundledContextPresetDir,
            config.runtimeContextPresetDir,
            config.bundledRolePresetDir,
            config.runtimeRolePresetDir
        ]) {
            if (value.trim().length === 0) {
                throw new PresetError(
                    'validation',
                    'load',
                    'config',
                    'Context and role preset directories must be non-empty paths.'
                )
            }
        }
    }

    get bundledContextDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.bundledContextPresetDir.trim()
        )
    }

    get runtimeContextDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.runtimeContextPresetDir.trim()
        )
    }

    get bundledRoleDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.bundledRolePresetDir.trim()
        )
    }

    get runtimeRoleDir() {
        return path.resolve(
            this.ctx.baseDir,
            this.config.runtimeRolePresetDir.trim()
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
                `Context preset post handler is already registered: ${id}`
            )
        }
        this._handlers.set(id, handler)
        return () => this._handlers.delete(id)
    }

    async init() {
        try {
            await Promise.all([
                fs.access(this.bundledContextDir),
                fs.access(this.bundledRoleDir),
                fs.mkdir(this.runtimeContextDir, { recursive: true }),
                fs.mkdir(this.runtimeRoleDir, { recursive: true })
            ])
        } catch (err) {
            throw new PresetError(
                'write',
                'load',
                'directories',
                'Context or role preset directories are unavailable.',
                undefined,
                this.runtimeContextDir,
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
        if (typeof id !== 'string' || !this._contexts.value.has(id)) {
            throw new PresetError(
                'default_invalid',
                'load',
                'global_default',
                'chatluna_meta.globalDefaultPresetId does not reference a loaded context preset.',
                typeof id === 'string' ? id : undefined
            )
        }
        this._globalDefaultId.value = id
    }

    async loadAllPresets() {
        await this._lock.runLocked(async () => {
            const handlers = this._handlers as PresetPostHandlerRegistry
            try {
                const bundledRoles = new Map<string, CompiledRolePreset>()
                const runtimeRoles = new Map<string, CompiledRolePreset>()
                for (const [dir, source, target] of [
                    [this.bundledRoleDir, 'bundled', bundledRoles] as const,
                    [this.runtimeRoleDir, 'runtime', runtimeRoles] as const
                ]) {
                    const entries = (
                        await fs.readdir(dir, { withFileTypes: true })
                    ).sort((left, right) => left.name.localeCompare(right.name))
                    for (const entry of entries) {
                        if (
                            !entry.isFile() ||
                            path.extname(entry.name) !== '.yml'
                        ) {
                            throw new PresetError(
                                'validation',
                                'load',
                                'directory_entry',
                                `Role preset directory contains an unsupported entry: ${entry.name}`,
                                undefined,
                                path.join(dir, entry.name)
                            )
                        }
                        const role = await readRoleFile(
                            path.join(dir, entry.name),
                            source
                        )
                        if (target.has(role.id)) {
                            throw new PresetError(
                                'conflict',
                                'load',
                                'canonical_id',
                                `Duplicate ${source} role preset id: ${role.id}`,
                                role.id,
                                role.path
                            )
                        }
                        target.set(role.id, role)
                    }
                }
                const roles = mergeRoles(bundledRoles, runtimeRoles)

                const bundledContexts = new Map<string, CompiledPreset>()
                const runtimeContexts = new Map<string, CompiledPreset>()
                for (const [dir, source, target] of [
                    [
                        this.bundledContextDir,
                        'bundled',
                        bundledContexts
                    ] as const,
                    [
                        this.runtimeContextDir,
                        'runtime',
                        runtimeContexts
                    ] as const
                ]) {
                    const entries = (
                        await fs.readdir(dir, { withFileTypes: true })
                    ).sort((left, right) => left.name.localeCompare(right.name))
                    for (const entry of entries) {
                        if (
                            !entry.isFile() ||
                            path.extname(entry.name) !== '.yml'
                        ) {
                            throw new PresetError(
                                'validation',
                                'load',
                                'directory_entry',
                                `Context preset directory contains an unsupported entry: ${entry.name}`,
                                undefined,
                                path.join(dir, entry.name)
                            )
                        }
                        const preset = await readContextFile(
                            path.join(dir, entry.name),
                            source,
                            roles,
                            handlers
                        )
                        if (target.has(preset.id)) {
                            throw new PresetError(
                                'conflict',
                                'load',
                                'canonical_id',
                                `Duplicate ${source} context preset id: ${preset.id}`,
                                preset.id,
                                preset.path
                            )
                        }
                        target.set(preset.id, preset)
                    }
                }
                const contexts = mergeContexts(bundledContexts, runtimeContexts)
                if (
                    this._globalDefaultId.value != null &&
                    !contexts.has(this._globalDefaultId.value)
                ) {
                    throw new PresetError(
                        'default_invalid',
                        'load',
                        'global_default',
                        `Reloaded context presets do not contain the live global default: ${this._globalDefaultId.value}`,
                        this._globalDefaultId.value
                    )
                }
                this._bundledRoles = bundledRoles
                this._runtimeRoles = runtimeRoles
                this._roles.value = roles
                this._bundledContexts = bundledContexts
                this._runtimeContexts = runtimeContexts
                this._contexts.value = contexts
                this.updateSchema()
            } catch (err) {
                if (err instanceof PresetError) {
                    throw err
                }
                throw new PresetError(
                    'reload',
                    'load',
                    'directories',
                    'Failed to load context and role preset directories.',
                    undefined,
                    this.runtimeContextDir,
                    { cause: err }
                )
            }
        })
    }

    getContextPreset(id: string): ComputedRef<CompiledPreset>
    getContextPreset(
        id: string,
        throwError: false
    ): ComputedRef<CompiledPreset | undefined>
    getContextPreset(id: string, throwError = true) {
        return computed(() => {
            const preset = this._contexts.value.get(id)
            if (preset != null || !throwError) {
                return preset
            }
            throw new ChatLunaError(
                ChatLunaErrorCode.PRESET_NOT_FOUND,
                new Error(`No context preset found for canonical id ${id}`)
            )
        })
    }

    findContextPresetInput(value: string) {
        return computed(() => {
            const exact = this._contexts.value.get(value)
            if (exact != null) {
                return exact
            }
            const name = value.toLowerCase()
            return Array.from(this._contexts.value.values()).find((preset) =>
                preset.aliases.some((alias) => alias.toLowerCase() === name)
            )
        })
    }

    getDefaultContextPreset() {
        return computed(() => {
            const id = this._globalDefaultId.value
            const preset = id == null ? undefined : this._contexts.value.get(id)
            if (preset != null) {
                return preset
            }
            throw new PresetError(
                'default_invalid',
                'load',
                'global_default',
                'The live global default context preset is unavailable.',
                id
            )
        })
    }

    getGlobalDefaultContextPresetId() {
        return computed(() => {
            const id = this._globalDefaultId.value
            if (id == null) {
                throw new PresetError(
                    'default_invalid',
                    'load',
                    'global_default',
                    'The live global default context preset is not initialized.'
                )
            }
            return id
        })
    }

    async setGlobalDefaultContextPresetId(id: string) {
        return this._lock.runLocked(async () => {
            if (!this._contexts.value.has(id)) {
                throw new PresetError(
                    'not_found',
                    'set_default',
                    'validate',
                    `Context preset does not exist: ${id}`,
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
                    `Failed to persist the global default context preset: ${id}`,
                    id,
                    undefined,
                    { cause: err }
                )
            }
            this._globalDefaultId.value = id
        })
    }

    listContextPresets(): ComputedRef<ContextPresetSummary[]> {
        return computed(() =>
            Array.from(this._contexts.value.values())
                .map((preset) => ({
                    id: preset.id,
                    displayName: preset.displayName,
                    aliases: [...preset.aliases],
                    source: preset.source as 'bundled' | 'runtime',
                    hasOverride:
                        preset.source === 'runtime' &&
                        this._bundledContexts.has(preset.id),
                    revision: preset.revision,
                    isGlobalDefault: preset.id === this._globalDefaultId.value
                }))
                .sort(
                    (left, right) =>
                        left.displayName.localeCompare(right.displayName) ||
                        left.id.localeCompare(right.id)
                )
        )
    }

    getContextPresetDefinition(id: string) {
        const preset = this._contexts.value.get(id)
        if (preset == null) {
            throw new PresetError(
                'not_found',
                'load',
                'lookup',
                `Context preset does not exist: ${id}`,
                id
            )
        }
        return structuredClone(preset.definition)
    }

    getRolePreset(id: string): ComputedRef<CompiledRolePreset>
    getRolePreset(
        id: string,
        throwError: false
    ): ComputedRef<CompiledRolePreset | undefined>
    getRolePreset(id: string, throwError = true) {
        return computed(() => {
            const role = this._roles.value.get(id)
            if (role != null || !throwError) {
                return role
            }
            throw new PresetError(
                'not_found',
                'load',
                'lookup',
                `Role preset does not exist: ${id}`,
                id
            )
        })
    }

    listRolePresets(): ComputedRef<RolePresetSummary[]> {
        return computed(() =>
            Array.from(this._roles.value.values())
                .map((role) => ({
                    id: role.id,
                    displayName: role.displayName,
                    source: role.source as 'bundled' | 'runtime',
                    hasOverride:
                        role.source === 'runtime' &&
                        this._bundledRoles.has(role.id),
                    revision: role.revision,
                    referenceCount: Array.from(
                        this._contexts.value.values()
                    ).filter((preset) =>
                        preset.definition.blocks.some(
                            (block) =>
                                block.type === 'role' &&
                                block.rolePresetId === role.id
                        )
                    ).length
                }))
                .sort(
                    (left, right) =>
                        left.displayName.localeCompare(right.displayName) ||
                        left.id.localeCompare(right.id)
                )
        )
    }

    getRolePresetDefinition(id: string) {
        const role = this._roles.value.get(id)
        if (role == null) {
            throw new PresetError(
                'not_found',
                'load',
                'lookup',
                `Role preset does not exist: ${id}`,
                id
            )
        }
        return structuredClone(role.definition)
    }

    previewContextPreset(
        definition: ContextPresetDefinitionV1,
        opts: {
            inputTokenLimit?: number
            runtimeBlocks?: RuntimeContextBlockType[]
        } = {}
    ): ContextPresetPreview {
        const role = definition.blocks.find((block) => block.type === 'role')
        return previewContextPreset(
            definition,
            role == null ? undefined : this._roles.value.get(role.rolePresetId),
            {
                ...opts,
                handlers: this._handlers
            }
        )
    }

    async createContextPreset(definition: ContextPresetDefinitionV1) {
        const preset = ContextPresetDefinitionV1Schema.parse(definition)
        return this._lock.runLocked(async () => {
            if (this._contexts.value.has(preset.id)) {
                throw new PresetError(
                    'conflict',
                    'create',
                    'validate',
                    `Context preset already exists: ${preset.id}`,
                    preset.id
                )
            }
            return this.writeContextLocked(preset, 'create')
        })
    }

    async updateContextPreset(
        id: string,
        definition: ContextPresetDefinitionV1,
        expectedRevision: string
    ) {
        const preset = ContextPresetDefinitionV1Schema.parse(definition)
        if (preset.id !== id) {
            throw new PresetError(
                'validation',
                'update',
                'identity',
                'Context preset canonical id is immutable.',
                id
            )
        }
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._contexts.value,
                id,
                expectedRevision,
                'update'
            )
            return this.writeContextLocked(preset, 'update')
        })
    }

    async deleteContextPreset(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._contexts.value,
                id,
                expectedRevision,
                'delete'
            )
            const preset = this._runtimeContexts.get(id)
            if (preset == null || this._bundledContexts.has(id)) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'source',
                    `Only runtime-only context presets can be deleted: ${id}`,
                    id,
                    preset?.path
                )
            }
            if (id === this._globalDefaultId.value) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'global_default',
                    'The global default context preset cannot be deleted.',
                    id,
                    preset.path
                )
            }
            await this.assertContextUnused(id, preset.path)
            await fs.unlink(path.join(this.runtimeContextDir, `${id}.yml`))
            this._runtimeContexts = new Map(this._runtimeContexts)
            this._runtimeContexts.delete(id)
            this._contexts.value = mergeContexts(
                this._bundledContexts,
                this._runtimeContexts
            )
            this.updateSchema()
        })
    }

    async revertContextPreset(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._contexts.value,
                id,
                expectedRevision,
                'revert'
            )
            const bundled = this._bundledContexts.get(id)
            const runtime = this._runtimeContexts.get(id)
            if (bundled == null || runtime == null) {
                throw new PresetError(
                    'operation_invalid',
                    'revert',
                    'source',
                    `Context preset does not have a runtime override: ${id}`,
                    id,
                    runtime?.path
                )
            }
            await fs.unlink(path.join(this.runtimeContextDir, `${id}.yml`))
            this._runtimeContexts = new Map(this._runtimeContexts)
            this._runtimeContexts.delete(id)
            this._contexts.value = mergeContexts(
                this._bundledContexts,
                this._runtimeContexts
            )
            this.updateSchema()
            return bundled
        })
    }

    async createRolePreset(definition: RolePresetDefinitionV1) {
        const role = RolePresetDefinitionV1Schema.parse(definition)
        return this._lock.runLocked(async () => {
            if (this._roles.value.has(role.id)) {
                throw new PresetError(
                    'conflict',
                    'create',
                    'validate',
                    `Role preset already exists: ${role.id}`,
                    role.id
                )
            }
            return this.writeRoleLocked(role, 'create')
        })
    }

    async updateRolePreset(
        id: string,
        definition: RolePresetDefinitionV1,
        expectedRevision: string
    ) {
        const role = RolePresetDefinitionV1Schema.parse(definition)
        if (role.id !== id) {
            throw new PresetError(
                'validation',
                'update',
                'identity',
                'Role preset canonical id is immutable.',
                id
            )
        }
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._roles.value,
                id,
                expectedRevision,
                'update'
            )
            return this.writeRoleLocked(role, 'update')
        })
    }

    async deleteRolePreset(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._roles.value,
                id,
                expectedRevision,
                'delete'
            )
            const role = this._runtimeRoles.get(id)
            if (role == null || this._bundledRoles.has(id)) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'source',
                    `Only runtime-only role presets can be deleted: ${id}`,
                    id,
                    role?.path
                )
            }
            const refs = Array.from(this._contexts.value.values())
                .filter((preset) =>
                    preset.definition.blocks.some(
                        (block) =>
                            block.type === 'role' && block.rolePresetId === id
                    )
                )
                .map((preset) => preset.id)
                .sort()
            if (refs.length > 0) {
                throw new PresetError(
                    'conflict',
                    'delete',
                    'references',
                    `Role preset is referenced by context presets: ${refs.join(', ')}`,
                    id,
                    role.path,
                    { referenceIds: refs }
                )
            }
            await fs.unlink(path.join(this.runtimeRoleDir, `${id}.yml`))
            this._runtimeRoles = new Map(this._runtimeRoles)
            this._runtimeRoles.delete(id)
            this._roles.value = mergeRoles(
                this._bundledRoles,
                this._runtimeRoles
            )
        })
    }

    async revertRolePreset(id: string, expectedRevision: string) {
        return this._lock.runLocked(async () => {
            await this.assertRevision(
                this._roles.value,
                id,
                expectedRevision,
                'revert'
            )
            const bundled = this._bundledRoles.get(id)
            const runtime = this._runtimeRoles.get(id)
            if (bundled == null || runtime == null) {
                throw new PresetError(
                    'operation_invalid',
                    'revert',
                    'source',
                    `Role preset does not have a runtime override: ${id}`,
                    id,
                    runtime?.path
                )
            }
            await fs.unlink(path.join(this.runtimeRoleDir, `${id}.yml`))
            this._runtimeRoles = new Map(this._runtimeRoles)
            this._runtimeRoles.delete(id)
            this._roles.value = mergeRoles(
                this._bundledRoles,
                this._runtimeRoles
            )
            this.recompileContexts()
            return bundled
        })
    }

    private async assertRevision<T extends { revision: string; path?: string }>(
        values: ReadonlyMap<string, T>,
        id: string,
        expectedRevision: string,
        operation: 'update' | 'delete' | 'revert'
    ) {
        const current = values.get(id)
        if (current == null) {
            throw new PresetError(
                'not_found',
                operation,
                'lookup',
                `Preset resource does not exist: ${id}`,
                id
            )
        }
        if (current.revision !== expectedRevision || current.path == null) {
            throw new PresetError(
                'conflict',
                operation,
                'revision',
                `Preset resource revision changed: ${id}`,
                id,
                current.path
            )
        }
        try {
            const raw = await fs.readFile(current.path, 'utf-8')
            if (
                createHash('sha256').update(raw).digest('hex') !==
                current.revision
            ) {
                throw new Error('disk revision differs')
            }
        } catch (err) {
            throw new PresetError(
                'conflict',
                operation,
                'revision',
                `Preset resource file changed outside PresetService: ${id}`,
                id,
                current.path,
                { cause: err }
            )
        }
    }

    private async assertContextUnused(id: string, file?: string) {
        return this._referenceLock.runLocked(async () => {
            let conversations: ConversationRecord[]
            let constraints: ConstraintRecord[]
            let bindings: BindingRecord[]
            try {
                ;[conversations, constraints, bindings] = await Promise.all([
                    this.ctx.database.get(
                        'chatluna_conversation',
                        {}
                    ) as Promise<ConversationRecord[]>,
                    this.ctx.database.get('chatluna_constraint', {}) as Promise<
                        ConstraintRecord[]
                    >,
                    this.ctx.database.get('chatluna_binding', {}) as Promise<
                        BindingRecord[]
                    >
                ])
            } catch (err) {
                throw new PresetError(
                    'write',
                    'delete',
                    'reference_check',
                    `Failed to inspect context preset references: ${id}`,
                    id,
                    file,
                    { cause: err }
                )
            }
            const used =
                conversations.some(
                    (row) =>
                        row.preset === id ||
                        row.bindingKey.endsWith(`:preset:${id}`)
                ) ||
                constraints.some(
                    (row) =>
                        row.activePresetLane === id ||
                        row.defaultPreset === id ||
                        row.fixedPreset === id
                ) ||
                bindings.some((row) => row.bindingKey.endsWith(`:preset:${id}`))
            if (used) {
                throw new PresetError(
                    'operation_invalid',
                    'delete',
                    'references',
                    `Context preset is still referenced by runtime records: ${id}`,
                    id,
                    file
                )
            }
        })
    }

    private async writeContextLocked(
        definition: ContextPresetDefinitionV1,
        operation: 'create' | 'update'
    ) {
        const raw = dump(definition, {
            lineWidth: 100,
            noRefs: true,
            sortKeys: false
        })
        const file = path.join(this.runtimeContextDir, `${definition.id}.yml`)
        const role = definition.blocks.find((block) => block.type === 'role')!
        let compiled: CompiledPreset
        try {
            compiled = compileContextPreset(
                definition,
                this._roles.value.get(role.rolePresetId),
                {
                    source: 'runtime',
                    raw,
                    path: file,
                    handlers: this._handlers
                }
            )
        } catch (err) {
            throw new PresetError(
                'validation',
                operation,
                'compile',
                `Failed to compile context preset: ${definition.id}`,
                definition.id,
                file,
                { cause: err }
            )
        }
        const runtime = new Map(this._runtimeContexts)
        runtime.set(definition.id, compiled)
        const contexts = mergeContexts(this._bundledContexts, runtime)
        await this.writeAtomic(
            file,
            raw,
            this._runtimeContexts.has(definition.id),
            definition.id,
            operation
        )
        this._runtimeContexts = runtime
        this._contexts.value = contexts
        this.updateSchema()
        return compiled
    }

    private async writeRoleLocked(
        definition: RolePresetDefinitionV1,
        operation: 'create' | 'update'
    ) {
        const raw = dump(definition, {
            lineWidth: 100,
            noRefs: true,
            sortKeys: false
        })
        const file = path.join(this.runtimeRoleDir, `${definition.id}.yml`)
        const compiled = compileRolePreset(definition, {
            source: 'runtime',
            raw,
            path: file
        })
        const roles = mergeRoles(
            this._bundledRoles,
            new Map(this._runtimeRoles).set(definition.id, compiled)
        )
        for (const preset of this._contexts.value.values()) {
            const block = preset.definition.blocks.find(
                (candidate) => candidate.type === 'role'
            )!
            compileContextPreset(
                preset.definition,
                roles.get(block.rolePresetId),
                {
                    source: preset.source,
                    raw: dump(preset.definition),
                    path: preset.path,
                    handlers: this._handlers
                }
            )
        }
        await this.writeAtomic(
            file,
            raw,
            this._runtimeRoles.has(definition.id),
            definition.id,
            operation
        )
        this._runtimeRoles = new Map(this._runtimeRoles)
        this._runtimeRoles.set(definition.id, compiled)
        this._roles.value = roles
        this.recompileContexts()
        return compiled
    }

    private async writeAtomic(
        file: string,
        raw: string,
        replace: boolean,
        id: string,
        operation: 'create' | 'update'
    ) {
        const tmp = path.join(path.dirname(file), `.${id}.${randomUUID()}.tmp`)
        let linked = false
        try {
            await fs.writeFile(tmp, raw, { encoding: 'utf-8', flag: 'wx' })
            if (replace) {
                await fs.rename(tmp, file)
                return
            }
            await fs.link(tmp, file)
            linked = true
            await fs.unlink(tmp)
        } catch (err) {
            if (linked) {
                await fs.rm(file, { force: true })
            }
            await fs.rm(tmp, { force: true })
            throw new PresetError(
                (err as NodeJS.ErrnoException).code === 'EEXIST'
                    ? 'conflict'
                    : 'write',
                operation,
                'atomic_write',
                `Failed to write preset resource: ${id}`,
                id,
                file,
                { cause: err }
            )
        }
    }

    private recompileContexts() {
        const bundled = new Map<string, CompiledPreset>()
        const runtime = new Map<string, CompiledPreset>()
        for (const [source, values, target] of [
            ['bundled', this._bundledContexts, bundled] as const,
            ['runtime', this._runtimeContexts, runtime] as const
        ]) {
            for (const preset of values.values()) {
                const role = preset.definition.blocks.find(
                    (block) => block.type === 'role'
                )!
                target.set(preset.id, {
                    ...compileContextPreset(
                        preset.definition,
                        this._roles.value.get(role.rolePresetId),
                        {
                            source,
                            raw: dump(preset.definition),
                            path: preset.path,
                            handlers: this._handlers
                        }
                    ),
                    revision: preset.revision
                })
            }
        }
        this._bundledContexts = bundled
        this._runtimeContexts = runtime
        this._contexts.value = mergeContexts(bundled, runtime)
    }

    private updateSchema() {
        if (!this.ctx.scope.isActive) {
            return
        }
        this.ctx.schema.set(
            'preset',
            Schema.union(
                Array.from(this._contexts.value.keys()).map((id) =>
                    Schema.const(id)
                )
            )
        )
    }
}
