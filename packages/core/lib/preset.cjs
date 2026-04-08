var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/preset.ts
var preset_exports = {};
__export(preset_exports, {
  PresetService: () => PresetService
});
module.exports = __toCommonJS(preset_exports);
var import_promises = __toESM(require("fs/promises"), 1);
var import_fs = require("fs");
var import_koishi = require("koishi");
var import_prompt = require("koishi-plugin-chatluna/llm-core/prompt");
var import_error = require("koishi-plugin-chatluna/utils/error");
var import_logger = require("koishi-plugin-chatluna/utils/logger");
var import_lock = require("koishi-plugin-chatluna/utils/lock");
var import_path2 = __toESM(require("path"), 1);
var import_url = require("url");
var import_reactivity = require("@vue/reactivity");

// src/preset_dirs.ts
var import_path = __toESM(require("path"), 1);
function resolveOptionalPath(baseDir, input) {
  return import_path.default.isAbsolute(input) ? input : import_path.default.resolve(baseDir, input);
}
__name(resolveOptionalPath, "resolveOptionalPath");
function resolvePresetDirectoriesFromEnv(baseDir, env = process.env) {
  const configured = String(env.CHATLUNA_PRESET_DIRS ?? "").split(import_path.default.delimiter).map((part) => part.trim()).filter(Boolean).map((part) => resolveOptionalPath(baseDir, part));
  if (configured.length > 0) {
    return [...new Set(configured)];
  }
  return [import_path.default.resolve(baseDir, "data/chathub/presets")];
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
var import_meta = {};
var logger;
var PresetService = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    logger = (0, import_logger.createLogger)(ctx);
    this._lock = new import_lock.ObjectLock();
    ctx.on("dispose", () => {
      this._aborter?.abort();
    });
  }
  static {
    __name(this, "PresetService");
  }
  _presets = (0, import_reactivity.shallowRef)([]);
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
      const rawText = await import_promises.default.readFile(filePath, "utf-8");
      const preset = (0, import_prompt.loadPreset)(rawText);
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
          files = await import_promises.default.readdir(presetDir);
        } catch (error) {
          if (error.code === "ENOENT") {
            continue;
          }
          throw error;
        }
        for (const file of files) {
          const extension = import_path2.default.extname(file);
          if (extension !== ".txt" && extension !== ".yml") {
            continue;
          }
          const presetName = import_path2.default.basename(file, extension);
          if (seenNames.has(presetName)) {
            continue;
          }
          const presetPath = import_path2.default.join(presetDir, file);
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
        (0, import_fs.watch)(
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
    return (0, import_reactivity.computed)(() => {
      const preset = this._presets.value.find(
        (preset2) => preset2.triggerKeyword.includes(triggerKeyword)
      );
      if (preset) {
        return preset;
      }
      if (throwError) {
        throw new import_error.ChatLunaError(
          import_error.ChatLunaErrorCode.PRESET_NOT_FOUND,
          new Error(`No preset found for keyword ${triggerKeyword}`)
        );
      }
      return void 0;
    });
  }
  getDefaultPreset() {
    return (0, import_reactivity.computed)(() => {
      const preset = this._presets.value.find(
        (preset2) => preset2.triggerKeyword.includes("sydney")
      );
      if (preset) {
        return preset;
      }
      if (this._presets.value.length === 0) {
        throw new import_error.ChatLunaError(
          import_error.ChatLunaErrorCode.PRESET_NOT_FOUND,
          new Error("No presets loaded. Please call init() first.")
        );
      }
      return this._presets.value[0];
    });
  }
  getAllPreset(concatKeyword = true) {
    return (0, import_reactivity.computed)(
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
      import_koishi.Schema.union(
        this._presets.value.map(
          (preset) => import_koishi.Schema.const(preset.triggerKeyword[0])
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
    await import_promises.default.mkdir(runtimePresetDir, { recursive: true });
    if (process.env.CHATLUNA_PRESET_DIRS?.trim()) {
      return;
    }
    const files = await import_promises.default.readdir(runtimePresetDir).catch(() => []);
    if (files.length === 0) {
      await this._copyDefaultPresets();
    }
  }
  async _copyDefaultPresets() {
    const currentPresetDir = import_path2.default.join(this.resolvePresetDir());
    const dirname = __dirname?.length > 0 ? __dirname : (0, import_url.fileURLToPath)(import_meta.url);
    const defaultPresetDir = import_path2.default.join(dirname, "../resources/presets");
    const files = await import_promises.default.readdir(defaultPresetDir);
    for (const file of files) {
      const filePath = import_path2.default.join(defaultPresetDir, file);
      const fileStat = await import_promises.default.stat(filePath);
      if (fileStat.isFile()) {
        await import_promises.default.mkdir(currentPresetDir, { recursive: true });
        logger.debug(
          `copy preset file ${filePath} to ${currentPresetDir}`
        );
        await import_promises.default.copyFile(filePath, import_path2.default.join(currentPresetDir, file));
      }
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PresetService
});
