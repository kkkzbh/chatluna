import { createHash, randomUUID } from 'crypto'
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import path from 'node:path'
import mimeTypes from 'mime-types'
import which from 'which'
import {
    ComputerCapability,
    PodmanBackendConfig,
    PodmanWorkspaceInfo,
    SandboxIdentity
} from '../../types'
import {
    ComputerSessionApi,
    ExecuteOptions,
    FileContent,
    OpenAssetResult,
    TerminalHandle
} from '../types'

interface PodmanResult {
    exitCode: number
    stdout: string
    stderr: string
    timedOut: boolean
}

interface BridgeResult {
    text?: string
    files?: string[]
    success?: boolean
    context?: string
    replacements?: number
    data?: string
    size?: number
}

function runPodman(
    bin: string,
    args: string[],
    timeout: number,
    input?: string
): Promise<PodmanResult> {
    return new Promise((resolve, reject) => {
        const stdout: Buffer[] = []
        const stderr: Buffer[] = []
        const child = spawn(bin, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            windowsHide: true
        })
        const timer = setTimeout(() => {
            child.kill('SIGKILL')
            resolve({
                exitCode: 1,
                stdout: Buffer.concat(stdout).toString('utf8'),
                stderr: Buffer.concat(stderr).toString('utf8'),
                timedOut: true
            })
        }, timeout)

        child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
        child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
        child.on('error', reject)
        child.on('close', (code) => {
            clearTimeout(timer)
            resolve({
                exitCode: code ?? 1,
                stdout: Buffer.concat(stdout).toString('utf8'),
                stderr: Buffer.concat(stderr).toString('utf8'),
                timedOut: false
            })
        })
        child.stdin.end(input)
    })
}

function getWorkspacePath(value?: string) {
    const target = path.posix.resolve(
        '/workspace',
        value?.replaceAll('\\', '/') ?? '.'
    )
    if (target !== '/workspace' && !target.startsWith('/workspace/')) {
        throw new Error(`Path "${value}" is outside /workspace.`)
    }
    return target
}

export class PodmanComputerSession implements ComputerSessionApi {
    readonly backend = 'podman' as const
    readonly sessionId = randomUUID()
    readonly capabilities: ComputerCapability[] = [
        'file_read',
        'file_write',
        'file_edit',
        'file_publish',
        'grep',
        'glob',
        'bash',
        'terminal_pty'
    ]

    private _connected = false
    private _cwd = '/workspace'
    private _bin = which.sync('podman', { nothrow: true })
    private _hash: string
    private _container: string
    private _volume: string

    constructor(
        private _cfg: PodmanBackendConfig,
        readonly identity: SandboxIdentity
    ) {
        this._hash = createHash('sha256')
            .update(identity.key)
            .digest('hex')
            .slice(0, 20)
        this._container = `qqbot-agent-${this._hash}`
        this._volume = `qqbot-agent-${this._hash}-workspace`
    }

    get cwd() {
        return this._cwd
    }

    get workspaceId() {
        return this._hash
    }

    async connect() {
        if (!this._bin) {
            throw new Error('Podman backend requires the podman executable.')
        }

        const volume = await runPodman(
            this._bin,
            ['volume', 'inspect', this._volume],
            15000
        )
        if (volume.exitCode !== 0) {
            const created = await runPodman(
                this._bin,
                [
                    'volume',
                    'create',
                    '--label',
                    'io.qqbot.agent-workspace=true',
                    '--label',
                    `io.qqbot.sandbox=${this._hash}`,
                    this._volume
                ],
                15000
            )
            if (created.exitCode !== 0) {
                throw new Error(
                    created.stderr.trim() || 'Failed to create Podman volume.'
                )
            }
        }

        const inspected = await runPodman(
            this._bin,
            ['container', 'inspect', this._container],
            15000
        )
        if (inspected.exitCode === 0) {
            const info = JSON.parse(inspected.stdout)[0]
            if (
                info.Config.Labels['io.qqbot.workspace-image'] !==
                this._cfg.image
            ) {
                const removed = await runPodman(
                    this._bin,
                    ['rm', '-f', this._container],
                    30000
                )
                if (removed.exitCode !== 0) {
                    throw new Error(
                        removed.stderr.trim() ||
                            'Failed to replace stale Podman container.'
                    )
                }
                await this.createContainer()
            }
        } else {
            await this.createContainer()
        }

        const started = await runPodman(
            this._bin,
            ['start', this._container],
            30000
        )
        if (started.exitCode !== 0 && !started.stderr.includes('already')) {
            throw new Error(
                started.stderr.trim() || 'Failed to start Podman container.'
            )
        }

        await this.bridge({ operation: 'health' })
        this._connected = true
    }

    async disconnect() {
        if (!this._bin || !this._connected) return
        const result = await runPodman(
            this._bin,
            ['stop', '--time', '10', this._container],
            30000
        )
        if (result.exitCode !== 0) {
            throw new Error(
                result.stderr.trim() || 'Failed to stop Podman container.'
            )
        }
        this._connected = false
    }

    isConnected() {
        return this._connected
    }

    async destroyWorkspace() {
        if (!this._bin) {
            throw new Error('Podman backend requires the podman executable.')
        }
        await runPodman(this._bin, ['rm', '-f', this._container], 30000)
        const result = await runPodman(
            this._bin,
            ['volume', 'rm', '-f', this._volume],
            30000
        )
        if (result.exitCode !== 0) {
            throw new Error(
                result.stderr.trim() || 'Failed to remove Podman workspace.'
            )
        }
        this._connected = false
    }

    async readFile(filePath: string, offset?: number, limit?: number) {
        const result = await this.bridge({
            operation: 'read',
            path: getWorkspacePath(filePath),
            offset,
            limit
        })
        return result.text ?? ''
    }

    async writeFile(filePath: string, content: FileContent) {
        await this.bridge({
            operation: 'write',
            path: getWorkspacePath(filePath),
            content:
                typeof content === 'string'
                    ? content
                    : Buffer.from(content).toString('base64'),
            encoding: typeof content === 'string' ? 'utf8' : 'base64'
        })
    }

    async editFile(
        filePath: string,
        oldString: string,
        newString: string,
        replaceCount?: number
    ) {
        const result = await this.bridge({
            operation: 'edit',
            path: getWorkspacePath(filePath),
            oldString,
            newString,
            replaceCount
        })
        return {
            success: result.success ?? false,
            context: result.context ?? '',
            replacements: result.replacements ?? 0
        }
    }

    async grep(pattern: string, searchPath?: string, include?: string) {
        const result = await this.bridge({
            operation: 'grep',
            path: getWorkspacePath(searchPath),
            pattern,
            include
        })
        return result.files ?? []
    }

    async glob(pattern: string, searchPath?: string) {
        const result = await this.bridge({
            operation: 'glob',
            path: getWorkspacePath(searchPath),
            pattern
        })
        return result.files ?? []
    }

    async execute(command: string, options: ExecuteOptions = {}) {
        if (!this._bin) {
            throw new Error('Podman backend requires the podman executable.')
        }
        const cwd = getWorkspacePath(options.workdir)
        const env = Object.entries(options.env ?? {}).flatMap(
            ([key, value]) => ['--env', `${key}=${value}`]
        )
        const result = await runPodman(
            this._bin,
            [
                'exec',
                '--workdir',
                cwd,
                ...env,
                this._container,
                'bash',
                '-lc',
                command
            ],
            options.timeout ?? this._cfg.commandTimeoutMs
        )
        this._cwd = cwd
        return result
    }

    async prepareBackgroundCommand(command: string) {
        return `${command}\n`
    }

    async readAsset(filePath: string) {
        const result = await this.bridge({
            operation: 'asset',
            path: getWorkspacePath(filePath)
        })
        return result.data ?? ''
    }

    async openAsset(filePath: string): Promise<OpenAssetResult> {
        const target = getWorkspacePath(filePath)
        const result = await this.bridge({
            operation: 'asset',
            path: target
        })
        return {
            stream: Readable.from(Buffer.from(result.data ?? '', 'base64')),
            size: result.size,
            mimeType: mimeTypes.lookup(target) || undefined
        }
    }

    async getTempDir() {
        await this.bridge({ operation: 'mkdir', path: '/workspace/.tmp' })
        return '/workspace/.tmp'
    }

    isInScope(filePath: string) {
        try {
            getWorkspacePath(filePath)
            return true
        } catch {
            return false
        }
    }

    getScopePath() {
        return '/workspace'
    }

    async createTerminal(
        options: { cwd?: string; cols?: number; rows?: number } = {}
    ): Promise<TerminalHandle> {
        if (!this._bin) {
            throw new Error('Podman backend requires the podman executable.')
        }
        const cwd = getWorkspacePath(options.cwd)
        const child = spawn(
            this._bin,
            ['exec', '-i', '--workdir', cwd, this._container, 'bash'],
            { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true }
        )
        const callbacks = new Set<(data: string) => void>()
        const send = (chunk: Buffer) => {
            for (const callback of callbacks) callback(chunk.toString('utf8'))
        }
        child.stdout.on('data', send)
        child.stderr.on('data', send)
        this._cwd = cwd
        return {
            id: randomUUID(),
            async onData(callback) {
                callbacks.add(callback)
                return () => callbacks.delete(callback)
            },
            async sendInput(data) {
                child.stdin.write(data)
            },
            async resize() {},
            async kill() {
                child.kill('SIGKILL')
            }
        }
    }

    private async createContainer() {
        const result = await runPodman(
            this._bin!,
            [
                'create',
                '--name',
                this._container,
                '--label',
                'io.qqbot.agent-workspace=true',
                '--label',
                `io.qqbot.sandbox=${this._hash}`,
                '--label',
                `io.qqbot.sandbox-kind=${this.identity.kind}`,
                '--label',
                `io.qqbot.sandbox-subject=${this.identity.subjectId}`,
                '--label',
                `io.qqbot.workspace-image=${this._cfg.image}`,
                '--cap-drop=all',
                '--security-opt=no-new-privileges',
                `--memory=${this._cfg.memoryMb}m`,
                `--pids-limit=${this._cfg.pidsLimit}`,
                '--volume',
                `${this._volume}:/workspace:rw`,
                '--workdir',
                '/workspace',
                this._cfg.image,
                'sleep',
                'infinity'
            ],
            60000
        )
        if (result.exitCode !== 0) {
            throw new Error(
                result.stderr.trim() || 'Failed to create Podman container.'
            )
        }
    }

    private async bridge(input: Record<string, unknown>) {
        if (!this._bin) {
            throw new Error('Podman backend requires the podman executable.')
        }
        const result = await runPodman(
            this._bin,
            [
                'exec',
                '-i',
                this._container,
                'node',
                '/usr/local/lib/qqbot-workspace/bridge.mjs'
            ],
            this._cfg.commandTimeoutMs,
            JSON.stringify(input)
        )
        if (result.exitCode !== 0) {
            throw new Error(
                result.stderr.trim() || 'Workspace file operation failed.'
            )
        }
        return JSON.parse(result.stdout) as BridgeResult
    }
}

export async function listPodmanWorkspaces() {
    const bin = which.sync('podman', { nothrow: true })
    if (!bin) throw new Error('Podman backend requires the podman executable.')
    const result = await runPodman(
        bin,
        [
            'ps',
            '-a',
            '--filter',
            'label=io.qqbot.agent-workspace=true',
            '--format',
            '{{json .}}'
        ],
        15000
    )
    if (result.exitCode !== 0) {
        throw new Error(
            result.stderr.trim() || 'Failed to list Podman workspaces.'
        )
    }
    return result.stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
            const item = JSON.parse(line)
            return {
                id: item.Labels['io.qqbot.sandbox'],
                kind: item.Labels['io.qqbot.sandbox-kind'],
                subjectId: item.Labels['io.qqbot.sandbox-subject'],
                state: item.State
            } satisfies PodmanWorkspaceInfo
        })
}

export async function stopPodmanWorkspace(id: string) {
    if (!/^[a-f0-9]{20}$/.test(id)) {
        throw new Error('Invalid Podman workspace ID.')
    }
    const bin = which.sync('podman', { nothrow: true })
    if (!bin) throw new Error('Podman backend requires the podman executable.')
    const result = await runPodman(
        bin,
        ['stop', '--time', '10', `qqbot-agent-${id}`],
        30000
    )
    if (result.exitCode !== 0) {
        throw new Error(
            result.stderr.trim() || 'Failed to stop Podman workspace.'
        )
    }
}

export async function resetPodmanWorkspace(id: string) {
    if (!/^[a-f0-9]{20}$/.test(id)) {
        throw new Error('Invalid Podman workspace ID.')
    }
    const bin = which.sync('podman', { nothrow: true })
    if (!bin) throw new Error('Podman backend requires the podman executable.')
    await runPodman(bin, ['rm', '-f', `qqbot-agent-${id}`], 30000)
    const result = await runPodman(
        bin,
        ['volume', 'rm', '-f', `qqbot-agent-${id}-workspace`],
        30000
    )
    if (result.exitCode !== 0) {
        throw new Error(
            result.stderr.trim() || 'Failed to reset Podman workspace.'
        )
    }
}
