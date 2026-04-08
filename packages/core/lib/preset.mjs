var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/preset.ts
import fs from "fs/promises";
import { watch } from "fs";
import { Schema } from "koishi";
import {
  loadPreset
} from "koishi-plugin-chatluna/llm-core/prompt";
import {
  ChatLunaError,
  ChatLunaErrorCode
} from "koishi-plugin-chatluna/utils/error";
import { createLogger } from "koishi-plugin-chatluna/utils/logger";
import { ObjectLock } from "koishi-plugin-chatluna/utils/lock";
import path2 from "path";
import { fileURLToPath } from "url";
import { computed, shallowRef } from "@vue/reactivity";

// src/preset_dirs.ts
import path from "path";
function resolveOptionalPath(baseDir, input) {
  return path.isAbsolute(input) ? input : path.resolve(baseDir, input);
}
__name(resolveOptionalPath, "resolveOptionalPath");
function resolvePresetDirectoriesFromEnv(baseDir, env = process.env) {
  const configured = String(env.CHATLUNA_PRESET_DIRS ?? "").split(path.delimiter).map((part) => part.trim()).filter(Boolean).map((part) => resolveOptionalPath(baseDir, part));
  if (configured.length > 0) {
    return [...new Set(configured)];
  }
  return [path.resolve(baseDir, "data/chathub/presets")];
}
__name(resolvePresetDirectoriesFromEnv, "resolvePresetDirectoriesFromEnv");
function resolveRuntimePresetDirectoryFromEnv(baseDir, env = process.env) {
  const explicit = env.CHATLUNA_RUNTIME_PRESET_DIR?.trim();
  if (explicit) {
    return resolveOptionalPath(baseDir, explicit);
  }
  return resolvePresetDirectoriesFromEnv(baseDir, env)[0];
}
__name(resolveRuntimePresetDirectoryFromEnv, "resolveRuntimePresetDirectoryFromEnv");

// src/preset.ts
var logger;
var PresetService = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    logger = createLogger(ctx);
    this._lock = new ObjectLock();
    ctx.on("dispose", () => {
      this._aborter?.abort();
    });
  }
  static {
    __name(this, "PresetService");
  }
  _presets = shallowRef([]);
  _aborter;
  _lock;
  async loadPreset(file) {
    if (!file || !file.length) {
      logger.warn(`Preset file is empty`);
      return;
    }
    if (!this.ctx.scope.isActive) {
      return;
    }
    if (this._presets.value.some((p) => p.path === file)) {
      logger.warn(`Preset ${file} already exists`);
      return;
    }
    const preset = await this._loadPresetFromPath(file);
    if (preset) {
      this._presets.value = [...this._presets.value, preset];
    }
  }
  async _loadPresetFromPath(filePath) {
    try {
      const rawText = await fs.readFile(filePath, "utf-8");
      const preset = loadPreset(rawText);
      preset.path = filePath;
      return preset;
    } catch (e) {
      logger.error(`Error when load preset ${filePath}`, e);
      return null;
    }
  }
  _updatePreset(preset) {
    const index = this._presets.value.findIndex(
      (p) => p.path === preset.path
    );
    if (index !== -1) {
      const newPresets = [...this._presets.value];
      newPresets[index] = preset;
      this._presets.value = newPresets;
    } else {
      this._presets.value = [...this._presets.value, preset];
    }
  }
  _removePreset(filePath) {
    this._presets.value = this._presets.value.filter(
      (p) => p.path !== filePath
    );
  }
  async loadAllPreset() {
    await this._lock.runLocked(async () => {
      await this._checkPresetDir();
      const seenNames = /* @__PURE__ */ new Set();
      const presets = [];
      for (const presetDir of this.resolvePresetDirs()) {
        let files;
        try {
          files = await fs.readdir(presetDir);
        } catch (error) {
          if (error.code === "ENOENT") {
            continue;
          }
          throw error;
        }
        for (const file of files) {
          const extension = path2.extname(file);
          if (extension !== ".txt" && extension !== ".yml") {
            continue;
          }
          const presetName = path2.basename(file, extension);
          if (seenNames.has(presetName)) {
            continue;
          }
          const presetPath = path2.join(presetDir, file);
          const preset = await this._loadPresetFromPath(presetPath);
          if (preset) {
            presets.push(preset);
            seenNames.add(presetName);
          }
        }
      }
      this._presets.value = presets;
      this._updateSchema();
    });
  }
  watchPreset() {
    if (this._aborter != null) {
      this._aborter.abort();
    }
    this._aborter = new AbortController();
    let reloadTimer = null;
    const scheduleReload = /* @__PURE__ */ __name(() => {
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
      reloadTimer = setTimeout(async () => {
        reloadTimer = null;
        await this.loadAllPreset();
        logger.debug(`trigger full reload preset`);
      }, 120);
    }, "scheduleReload");
    for (const presetDir of this.resolvePresetDirs()) {
      try {
        watch(
          presetDir,
          {
            signal: this._aborter.signal
          },
          async (_event, _filename) => {
            try {
              scheduleReload();
            } catch (e) {
              logger.error(`Error when watching preset dir ${presetDir}`, e);
              await this.loadAllPreset();
            }
          }
        );
      } catch (e) {
        logger.warn(`Skip watching missing preset dir ${presetDir}`, e);
      }
    }
    this.ctx.on("dispose", () => {
      if (reloadTimer) {
        clearTimeout(reloadTimer);
      }
    });
  }
  async init() {
    await this.loadAllPreset();
    this.watchPreset();
  }
  getPreset(triggerKeyword, throwError = true) {
    return computed(() => {
      const preset = this._presets.value.find(
        (preset2) => preset2.triggerKeyword.includes(triggerKeyword)
      );
      if (preset) {
        return preset;
      }
      if (throwError) {
        throw new ChatLunaError(
          ChatLunaErrorCode.PRESET_NOT_FOUND,
          new Error(`No preset found for keyword ${triggerKeyword}`)
        );
      }
      return void 0;
    });
  }
  getDefaultPreset() {
    return computed(() => {
      const preset = this._presets.value.find(
        (preset2) => preset2.triggerKeyword.includes("sydney")
      );
      if (preset) {
        return preset;
      }
      if (this._presets.value.length === 0) {
        throw new ChatLunaError(
          ChatLunaErrorCode.PRESET_NOT_FOUND,
          new Error("No presets loaded. Please call init() first.")
        );
      }
      return this._presets.value[0];
    });
  }
  getAllPreset(concatKeyword = true) {
    return computed(
      () => this._presets.value.map(
        (preset) => concatKeyword ? preset.triggerKeyword.join(", ") : preset.triggerKeyword[0]
      )
    );
  }
  addPreset(preset) {
    if (this._presets.value.some(
      (p) => p.triggerKeyword.join(",") === preset.triggerKeyword.join(",")
    ) || this._presets.value.some((p) => p.path === preset.path)) {
      logger.warn(`Preset ${preset.path} already exists`);
      return;
    }
    this._presets.value = [...this._presets.value, preset];
    this._updateSchema();
  }
  _updateSchema() {
    if (!this.ctx.scope.isActive) {
      return;
    }
    this.ctx.schema.set(
      "preset",
      Schema.union(
        this._presets.value.map(
          (preset) => Schema.const(preset.triggerKeyword[0])
        )
      )
    );
  }
  async resetDefaultPreset() {
    await this._copyDefaultPresets();
  }
  resolvePresetDir() {
    return resolveRuntimePresetDirectoryFromEnv(this.ctx.baseDir);
  }
  resolvePresetDirs() {
    return resolvePresetDirectoriesFromEnv(this.ctx.baseDir);
  }
  async _checkPresetDir() {
    const runtimePresetDir = this.resolvePresetDir();
    await fs.mkdir(runtimePresetDir, { recursive: true });
    if (process.env.CHATLUNA_PRESET_DIRS?.trim()) {
      return;
    }
    const files = await fs.readdir(runtimePresetDir).catch(() => []);
    if (files.length === 0) {
      await this._copyDefaultPresets();
    }
  }
  async _copyDefaultPresets() {
    const currentPresetDir = path2.join(this.resolvePresetDir());
    const dirname = __dirname?.length > 0 ? __dirname : fileURLToPath(import.meta.url);
    const defaultPresetDir = path2.join(dirname, "../resources/presets");
    const files = await fs.readdir(defaultPresetDir);
    for (const file of files) {
      const filePath = path2.join(defaultPresetDir, file);
      const fileStat = await fs.stat(filePath);
      if (fileStat.isFile()) {
        await fs.mkdir(currentPresetDir, { recursive: true });
        logger.debug(
          `copy preset file ${filePath} to ${currentPresetDir}`
        );
        await fs.copyFile(filePath, path2.join(currentPresetDir, file));
      }
    }
  }
};
export {
  PresetService
};
