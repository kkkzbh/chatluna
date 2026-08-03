<template>
    <el-form class="backend-form" label-position="top">
        <div class="form-grid">
            <div class="form-cell form-cell-full">
                <el-form-item label="Workspace 镜像">
                    <el-input
                        :model-value="config.image"
                        placeholder="localhost/qqbot-agent-workspace:latest"
                        @update:model-value="set('image', $event)"
                    />
                </el-form-item>
            </div>
            <div class="form-cell">
                <el-form-item label="内存限制（MB）">
                    <el-input-number
                        :model-value="config.memoryMb"
                        :min="256"
                        :max="8192"
                        :step="256"
                        controls-position="right"
                        @update:model-value="setNumber('memoryMb', $event)"
                    />
                </el-form-item>
            </div>
            <div class="form-cell">
                <el-form-item label="进程数量限制">
                    <el-input-number
                        :model-value="config.pidsLimit"
                        :min="32"
                        :max="2048"
                        :step="32"
                        controls-position="right"
                        @update:model-value="setNumber('pidsLimit', $event)"
                    />
                </el-form-item>
            </div>
            <div class="form-cell">
                <el-form-item label="命令超时（秒）">
                    <el-input-number
                        :model-value="config.commandTimeoutMs / 1000"
                        :min="5"
                        :max="300"
                        :step="5"
                        controls-position="right"
                        @update:model-value="setTimeout($event)"
                    />
                </el-form-item>
            </div>
        </div>
    </el-form>
</template>

<script setup lang="ts">
import type { PodmanBackendConfig } from '../../../../src/types'

const props = defineProps<{ config: PodmanBackendConfig }>()
const emit = defineEmits<{ update: [value: PodmanBackendConfig] }>()

function set<K extends keyof PodmanBackendConfig>(
    key: K,
    value: PodmanBackendConfig[K]
) {
    emit('update', { ...props.config, [key]: value })
}

function setNumber(
    key: 'memoryMb' | 'pidsLimit',
    value: number | undefined
) {
    if (value != null) set(key, value)
}

function setTimeout(value: number | undefined) {
    if (value != null) set('commandTimeoutMs', value * 1000)
}
</script>

<style scoped>
.backend-form { width: 100%; }
.form-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 14px; }
.form-cell-full { grid-column: 1/-1; }
@media(max-width:760px) { .form-grid { grid-template-columns: 1fr; } }
</style>
