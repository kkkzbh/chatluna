<template>
    <div class="configuration-panel" :class="{ compact: props.compactMode }">
        <section class="backend-card">
            <div class="backend-head">
                <div class="backend-intro">
                    <div class="backend-title-row">
                        <div class="backend-title">E2B 沙箱</div>
                        <el-tag
                            size="small"
                            effect="plain"
                            :type="tagType(props.status.backends.e2b.state)"
                        >
                            {{ stateLabel(props.status.backends.e2b.state) }}
                        </el-tag>
                        <el-tag
                            v-if="props.config.defaultProvider === 'e2b'"
                            size="small"
                            effect="plain"
                        >
                            默认
                        </el-tag>
                        <el-tag size="small" effect="plain">
                            {{ props.status.backends.e2b.sessionCount }}
                            个活跃会话
                        </el-tag>
                    </div>
                    <div v-if="!props.hideDesc" class="backend-copy">
                        云端隔离环境，适合默认执行后端。需要时可开启桌面能力。
                    </div>
                    <div
                        v-if="props.status.backends.e2b.error"
                        class="backend-error"
                    >
                        {{ props.status.backends.e2b.error }}
                    </div>
                </div>

                <div class="backend-actions">
                    <el-button text @click="openGuide('e2b')">
                        配置指南
                    </el-button>
                    <el-button
                        class="test-link"
                        plain
                        :loading="props.testing.e2b"
                        @click="emit('test', 'e2b')"
                    >
                        测试连接
                    </el-button>
                    <el-button
                        :type="props.config.e2b.enabled ? 'danger' : 'success'"
                        @click="setE2BEnabled(!props.config.e2b.enabled)"
                    >
                        {{ props.config.e2b.enabled ? '禁用' : '启用' }}
                    </el-button>
                </div>
            </div>

            <div class="backend-body">
                <BackendE2B :config="props.config.e2b" @update="updateE2B" />
            </div>
        </section>

        <section class="backend-card">
            <div class="backend-head">
                <div class="backend-intro">
                    <div class="backend-title-row">
                        <div class="backend-title">远程终端</div>
                        <el-tag
                            size="small"
                            effect="plain"
                            :type="
                                tagType(
                                    props.status.backends['open-terminal'].state
                                )
                            "
                        >
                            {{
                                stateLabel(
                                    props.status.backends['open-terminal'].state
                                )
                            }}
                        </el-tag>
                        <el-tag
                            v-if="
                                props.config.defaultProvider === 'open-terminal'
                            "
                            size="small"
                            effect="plain"
                        >
                            默认
                        </el-tag>
                        <el-tag size="small" effect="plain">
                            {{
                                props.status.backends['open-terminal']
                                    .sessionCount
                            }}
                            个活跃会话
                        </el-tag>
                    </div>
                    <div v-if="!props.hideDesc" class="backend-copy">
                        连接已部署的 Open Terminal 服务，用远程机器或容器执行任务。
                    </div>
                    <div
                        v-if="props.status.backends['open-terminal'].error"
                        class="backend-error"
                    >
                        {{ props.status.backends['open-terminal'].error }}
                    </div>
                </div>

                <div class="backend-actions">
                    <el-button text @click="openGuide('open-terminal')">
                        配置指南
                    </el-button>
                    <el-button
                        class="test-link"
                        plain
                        :loading="props.testing['open-terminal']"
                        @click="emit('test', 'open-terminal')"
                    >
                        测试连接
                    </el-button>
                    <el-button
                        :type="
                            props.config.openTerminal.enabled
                                ? 'danger'
                                : 'success'
                        "
                        @click="
                            setOpenTerminalEnabled(
                                !props.config.openTerminal.enabled
                            )
                        "
                    >
                        {{
                            props.config.openTerminal.enabled ? '禁用' : '启用'
                        }}
                    </el-button>
                </div>
            </div>

            <div class="backend-body">
                <BackendOpenTerminal
                    :config="props.config.openTerminal"
                    @update="updateOpenTerminal"
                />
            </div>
        </section>

        <section class="backend-card">
            <div class="backend-head">
                <div class="backend-intro">
                    <div class="backend-title-row">
                        <div class="backend-title">Podman Workspace</div>
                        <el-tag size="small" effect="plain" type="success">
                            隔离
                        </el-tag>
                        <el-tag
                            size="small"
                            effect="plain"
                            :type="tagType(props.status.backends.podman.state)"
                        >
                            {{ stateLabel(props.status.backends.podman.state) }}
                        </el-tag>
                        <el-tag
                            v-if="props.config.defaultProvider === 'podman'"
                            size="small"
                            effect="plain"
                        >
                            默认
                        </el-tag>
                        <el-tag size="small" effect="plain">
                            {{ props.status.backends.podman.sessionCount }}
                            个活跃会话
                        </el-tag>
                    </div>
                    <div v-if="!props.hideDesc" class="backend-copy">
                        每个群聊或私聊用户使用独立容器与 Workspace volume。
                    </div>
                    <div
                        v-if="props.status.backends.podman.error"
                        class="backend-error"
                    >
                        {{ props.status.backends.podman.error }}
                    </div>
                </div>

                <div class="backend-actions">
                    <el-button text @click="openGuide('podman')">
                        配置指南
                    </el-button>
                    <el-button
                        class="test-link"
                        plain
                        :loading="props.testing.podman"
                        @click="emit('test', 'podman')"
                    >
                        测试连接
                    </el-button>
                    <el-button
                        :type="
                            props.config.podman.enabled ? 'danger' : 'success'
                        "
                        @click="setPodmanEnabled(!props.config.podman.enabled)"
                    >
                        {{ props.config.podman.enabled ? '禁用' : '启用' }}
                    </el-button>
                </div>
            </div>

            <div class="backend-body">
                <BackendPodman
                    :config="props.config.podman"
                    @update="updatePodman"
                />
            </div>
        </section>

        <StatusPanel
            :compact-mode="props.compactMode"
            :hide-desc="props.hideDesc"
            :status="props.status"
        />

        <el-dialog
            v-model="guideOpen"
            :title="`${guide.title} 配置指南`"
            width="min(860px, calc(100vw - 32px))"
            destroy-on-close
        >
            <div class="guide-dialog">
                <div class="guide-intro">{{ guide.intro }}</div>

                <div v-if="guide.warn" class="guide-warn">
                    {{ guide.warn }}
                </div>

                <section
                    v-for="section in guide.sections"
                    :key="section.title"
                    class="guide-section"
                >
                    <div class="guide-section-title">
                        {{ section.title }}
                    </div>

                    <ol v-if="section.steps" class="guide-list">
                        <li v-for="item in section.steps" :key="item">
                            {{ item }}
                        </li>
                    </ol>

                    <ul
                        v-if="section.items"
                        class="guide-list guide-list-bullet"
                    >
                        <li v-for="item in section.items" :key="item">
                            {{ item }}
                        </li>
                    </ul>

                    <pre
                        v-if="section.code"
                        class="guide-code"
                    ><code>{{ section.code }}</code></pre>
                </section>

                <section v-if="guide.links.length > 0" class="guide-section">
                    <div class="guide-section-title">参考文档</div>
                    <div class="guide-links">
                        <el-link
                            v-for="link in guide.links"
                            :key="link.href"
                            :href="link.href"
                            target="_blank"
                            rel="noreferrer"
                            type="primary"
                        >
                            {{ link.label }}
                        </el-link>
                    </div>
                </section>
            </div>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import BackendE2B from './config-backends/backend-e2b.vue'
import BackendPodman from './config-backends/backend-podman.vue'
import BackendOpenTerminal from './config-backends/backend-open-terminal.vue'
import StatusPanel from './status-panel.vue'
import type {
    ComputerBackendType,
    ComputerConfig,
    ComputerStatus,
    E2BBackendConfig,
    PodmanBackendConfig,
    OpenTerminalBackendConfig
} from '../../../src/types'

const props = defineProps<{
    config: ComputerConfig
    compactMode?: boolean
    hideDesc?: boolean
    status: ComputerStatus
    testing: Record<ComputerBackendType, boolean>
}>()

const emit = defineEmits<{
    'update:config': [value: ComputerConfig]
    test: [value: ComputerBackendType]
}>()

interface GuideSection {
    title: string
    steps?: string[]
    items?: string[]
    code?: string
}

interface GuideLink {
    label: string
    href: string
}

interface GuideContent {
    title: string
    intro: string
    warn?: string
    sections: GuideSection[]
    links: GuideLink[]
}

const guideOpen = ref(false)
const guideType = ref<ComputerBackendType>('e2b')

const guide = computed<GuideContent>(() => {
    if (guideType.value === 'podman') {
        return {
            title: 'Podman Workspace',
            intro: 'Podman 为每个群聊或私聊用户创建独立的持久 Workspace。',
            sections: [
                {
                    title: '配置顺序',
                    steps: [
                        '安装 Podman，并准备配置中的 Workspace 镜像。',
                        '设置每个容器的内存、进程数量和命令超时。',
                        '保存后点“测试连接”，确认隔离容器可以启动。'
                    ]
                },
                {
                    title: '字段说明',
                    items: [
                        'Workspace 镜像：容器运行时使用的本地镜像。',
                        '内存限制：单个 Workspace 的最大内存。',
                        '进程数量限制：容器内同时存在的最大进程数。',
                        '命令超时：普通 Shell 命令的默认最长运行时间。'
                    ],
                    code: [
                        'podman info',
                        'podman image exists localhost/qqbot-agent-workspace:latest'
                    ].join('\n')
                }
            ],
            links: []
        }
    }

    if (guideType.value === 'open-terminal') {
        return {
            title: 'open-terminal 远程终端',
            intro: 'ChatLuna 通过 HTTP API 连接 Open Terminal。服务可以跑在容器里，也可以跑在远端主机上。',
            warn: '优先用 Docker。裸机模式会直接在远端主机执行命令。',
            sections: [
                {
                    title: 'Docker 快速启动',
                    steps: [
                        '推荐先用 Docker 跑起来。',
                        'ChatLuna 里基础 URL 填 http://host:8000。',
                        'API 密钥填 env:OPEN_TERMINAL_API_KEY 或直接填密钥。'
                    ],
                    code: [
                        'docker run -d --name open-terminal --restart unless-stopped \\',
                        '  -p 8000:8000 \\',
                        '  -v open-terminal:/home/user \\',
                        '  -w /home/user \\',
                        '  -e HOME=/home/user \\',
                        '  -e OPEN_TERMINAL_API_KEY=your-secret-key \\',
                        '  -e OPEN_TERMINAL_BINARY_MIME_PREFIXES=image,audio,video,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.,application/octet-stream \\',
                        '  ghcr.io/open-webui/open-terminal'
                    ].join('\n')
                },
                {
                    title: 'Docker Compose 示例',
                    code: [
                        'services:',
                        '  open-terminal:',
                        '    image: ghcr.io/open-webui/open-terminal',
                        '    restart: unless-stopped',
                        '    ports:',
                        '      - "8000:8000"',
                        '    working_dir: /home/user',
                        '    environment:',
                        '      HOME: /home/user',
                        '      OPEN_TERMINAL_API_KEY: your-secret-key',
                        '      OPEN_TERMINAL_BINARY_MIME_PREFIXES: image,audio,video,application/pdf,application/zip,application/vnd.openxmlformats-officedocument.,application/octet-stream',
                        '    volumes:',
                        '      - open-terminal:/home/user',
                        '',
                        'volumes:',
                        '  open-terminal:'
                    ].join('\n')
                },
                {
                    title: '字段说明',
                    items: [
                        '基础 URL：Open Terminal 对外地址。',
                        'API 密钥：推荐使用 env: 前缀读取环境变量。',
                        '部署模式：用于提示风险，不会改变远端隔离方式。',
                        '用户隔离：只有服务端启用了 multi-user 模式时再打开。',
                        'Docker 建议固定 HOME 和工作目录，避免相对路径落到镜像目录。'
                    ],
                    code: [
                        '基础 URL: http://localhost:8000',
                        'API 密钥: env:OPEN_TERMINAL_API_KEY',
                        '部署模式: docker',
                        '用户隔离: false'
                    ].join('\n')
                },
                {
                    title: '裸机启动示例',
                    steps: [
                        '不用 Docker 时，可以用 uvx 或 pip 启动。',
                        '裸机会直接在远端主机执行命令，只放在受控机器上。',
                        '启动后把部署模式选为“裸机”。'
                    ],
                    code: [
                        'uvx open-terminal run --host 0.0.0.0 --port 8000 --api-key your-secret-key',
                        '',
                        'pip install open-terminal',
                        'open-terminal run --host 0.0.0.0 --port 8000 --api-key your-secret-key'
                    ].join('\n')
                }
            ],
            links: [
                {
                    label: 'open-terminal README',
                    href: 'https://github.com/open-webui/open-terminal'
                },
                {
                    label: 'open-terminal API Docs 说明',
                    href: 'https://github.com/open-webui/open-terminal#api-docs'
                }
            ]
        }
    }

    return {
        title: 'E2B 沙箱',
        intro: 'E2B 提供云端沙箱。普通文件、终端和代码任务直接使用 base 模板即可。',
        warn: '不需要桌面功能时，“桌面模板”留空。',
        sections: [
            {
                title: '配置步骤',
                steps: [
                    '在 E2B 控制台创建 API Key。',
                    'API 密钥推荐填 env:E2B_API_KEY。',
                    '普通任务保持模板为 base。',
                    '需要桌面时再填写桌面模板。',
                    '保存后点“测试连接”。'
                ]
            },
            {
                title: '推荐值',
                code: [
                    'API 密钥: env:E2B_API_KEY',
                    '模板: base',
                    '桌面模板: 留空',
                    '超时时间: 5',
                    '保持连接: true'
                ].join('\n')
            },
            {
                title: '桌面能力',
                items: [
                    '填了“桌面模板”后，才会开启桌面流、截图和桌面操作。',
                    '只跑 bash、读写文件、搜索代码时不需要桌面模板。'
                ],
                code: [
                    'API 密钥: env:E2B_API_KEY',
                    '模板: base',
                    '桌面模板: desktop',
                    '超时时间: 5',
                    '保持连接: true'
                ].join('\n')
            }
        ],
        links: [
            {
                label: 'E2B Quickstart',
                href: 'https://e2b.dev/docs/quickstart'
            },
            {
                label: 'E2B Desktop / Computer Use',
                href: 'https://e2b.dev/docs/use-cases/computer-use'
            },
            {
                label: 'E2B Desktop Template 示例',
                href: 'https://e2b.dev/docs/template/examples/desktop'
            }
        ]
    }
})

function openGuide(type: ComputerBackendType) {
    guideType.value = type
    guideOpen.value = true
}

function updatePodman(value: PodmanBackendConfig) {
    emit('update:config', {
        ...props.config,
        podman: value
    })
}

function setPodmanEnabled(value: boolean) {
    updatePodman({
        ...props.config.podman,
        enabled: value
    })
}

function updateE2B(value: E2BBackendConfig) {
    emit('update:config', {
        ...props.config,
        e2b: value
    })
}

function setE2BEnabled(value: boolean) {
    updateE2B({
        ...props.config.e2b,
        enabled: value
    })
}

function updateOpenTerminal(value: OpenTerminalBackendConfig) {
    emit('update:config', {
        ...props.config,
        openTerminal: value
    })
}

function setOpenTerminalEnabled(value: boolean) {
    updateOpenTerminal({
        ...props.config.openTerminal,
        enabled: value
    })
}

function stateLabel(state: ComputerStatus['backends']['podman']['state']) {
    if (state === 'connected') return '已连接'
    if (state === 'connecting') return '连接中'
    if (state === 'idle') return '就绪'
    if (state === 'error') return '错误'
    return '未支持'
}

function tagType(state: ComputerStatus['backends']['podman']['state']) {
    if (state === 'connected') return 'success'
    if (state === 'idle') return 'info'
    if (state === 'error') return 'danger'
    return 'warning'
}
</script>

<style scoped>
.configuration-panel {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.configuration-panel.compact {
    gap: 16px;
}

.backend-card {
    border: 1px solid var(--k-color-divider);
    border-radius: 8px;
    background: var(--k-card-bg);
    overflow: hidden;
    transition: border-color 0.2s ease;
    box-sizing: border-box;
}

.backend-card:hover {
    border-color: color-mix(
        in srgb,
        var(--k-color-divider),
        var(--k-text-light) 20%
    );
}

.backend-head {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 20px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--k-color-divider);
}

.configuration-panel.compact .backend-head {
    gap: 16px;
    padding: 16px 20px;
}

.backend-title-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-bottom: 8px;
}

.backend-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--k-text-dark);
    letter-spacing: -0.01em;
}

.backend-copy,
.backend-error {
    font-size: 13px;
    line-height: 1.65;
}

.backend-copy {
    color: var(--k-text-light);
}

.backend-error {
    margin-top: 8px;
    padding: 8px 12px;
    background: color-mix(in srgb, var(--el-color-danger), transparent 92%);
    border-left: 2px solid var(--el-color-danger);
    border-radius: 4px;
    color: var(--el-color-danger);
}

.backend-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
}

.backend-actions :deep(.test-link.el-button) {
    --el-button-bg-color: transparent;
    --el-button-border-color: color-mix(
        in srgb,
        var(--k-color-divider),
        transparent 12%
    );
    --el-button-text-color: var(--k-text-dark);
    --el-button-hover-bg-color: color-mix(
        in srgb,
        var(--k-side-bg),
        var(--k-page-bg) 18%
    );
    --el-button-hover-border-color: color-mix(
        in srgb,
        var(--k-color-divider),
        transparent 0%
    );
    --el-button-hover-text-color: var(--k-text-dark);
    --el-button-active-bg-color: color-mix(
        in srgb,
        var(--k-side-bg),
        var(--k-page-bg) 26%
    );
    --el-button-active-border-color: color-mix(
        in srgb,
        var(--k-color-divider),
        transparent 0%
    );
    --el-button-active-text-color: var(--k-text-dark);
    --el-button-disabled-bg-color: color-mix(
        in srgb,
        var(--k-side-bg),
        transparent 10%
    );
    --el-button-disabled-border-color: color-mix(
        in srgb,
        var(--k-color-divider),
        transparent 24%
    );
    --el-button-disabled-text-color: var(--k-text-light);
}

.backend-body {
    padding: 24px;
}

.configuration-panel.compact .backend-body {
    padding: 20px;
}

.guide-dialog {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-height: min(70vh, 720px);
    overflow: auto;
    padding-right: 4px;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--k-color-divider), #71717a 40%)
        transparent;
}

.guide-dialog::-webkit-scrollbar {
    width: 10px;
}

.guide-dialog::-webkit-scrollbar-track {
    background: transparent;
}

.guide-dialog::-webkit-scrollbar-thumb {
    background: color-mix(in srgb, var(--k-color-divider), #71717a 40%);
    border-radius: 10px;
    border: 2px solid transparent;
    background-clip: content-box;
}

.guide-dialog::-webkit-scrollbar-thumb:hover {
    background: color-mix(in srgb, var(--k-color-divider), #52525b 58%);
    background-clip: content-box;
}

.guide-intro,
.guide-warn,
.guide-list {
    font-size: 13px;
    line-height: 1.75;
}

.guide-intro {
    color: var(--k-text-normal);
}

.guide-warn {
    padding: 10px 12px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--el-color-warning), transparent 90%);
    color: color-mix(in srgb, var(--k-text-dark), var(--el-color-warning) 34%);
}

.guide-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.guide-section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--k-text-dark);
}

.guide-list {
    margin: 0;
    padding-left: 20px;
    color: var(--k-text-light);
}

.guide-list-bullet {
    list-style: disc;
}

.guide-code {
    margin: 0;
    padding: 12px 14px;
    border-radius: 10px;
    border: 1px solid
        color-mix(in srgb, var(--k-color-divider), transparent 20%);
    background: color-mix(in srgb, var(--k-side-bg), var(--k-page-bg) 30%);
    color: var(--k-text-dark);
    font-size: 12px;
    line-height: 1.7;
    white-space: pre-wrap;
    word-break: break-word;
    overflow-x: auto;
}

.guide-links {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

:deep(.backend-form) {
    display: flex;
    flex-direction: column;
    gap: 24px;
}

.configuration-panel.compact :deep(.backend-form) {
    gap: 20px;
}

:deep(.backend-form .section) {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.configuration-panel.compact :deep(.backend-form .section) {
    gap: 12px;
}

:deep(.backend-form .form-grid) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: start;
}

:deep(.backend-form .form-cell-full) {
    grid-column: 1 / -1;
}

:deep(.backend-form .section-title) {
    font-size: 14px;
    font-weight: 600;
    color: var(--k-text-dark);
    letter-spacing: -0.01em;
    margin-bottom: 4px;
}

:deep(.backend-form .section-copy) {
    margin-top: -8px;
    font-size: 13px;
    line-height: 1.65;
    color: var(--k-text-light);
}

:deep(.backend-form .el-form-item) {
    margin-bottom: 0;
}

:deep(.backend-form .el-form-item__label) {
    padding-bottom: 6px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.5;
    color: var(--k-text-normal);
}

:deep(.backend-form .el-form-item__content) {
    min-width: 0;
}

:deep(.backend-form .el-input),
:deep(.backend-form .el-select),
:deep(.backend-form .el-input-number) {
    width: 100%;
}

:deep(.backend-form .el-alert) {
    --el-alert-padding: 14px 16px;
    --el-alert-border-radius-base: 6px;
}

@media (max-width: 991px) {
    :deep(.backend-form .form-grid) {
        grid-template-columns: 1fr;
    }

    :deep(.backend-form .form-cell-full) {
        grid-column: auto;
    }
}

@media (max-width: 768px) {
    .backend-head {
        grid-template-columns: 1fr;
        padding: 16px 20px;
    }

    .backend-actions {
        justify-content: flex-start;
    }

    .backend-body {
        padding: 20px;
    }
}
</style>
