var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/llm-core/platform/client.ts
import { ObjectLock } from "koishi-plugin-chatluna/utils/lock";
import {
  ChatLunaError,
  ChatLunaErrorCode
} from "koishi-plugin-chatluna/utils/error";
var BasePlatformClient = class {
  constructor(ctx, configPool) {
    this.ctx = ctx;
    this.configPool = configPool;
  }
  static {
    __name(this, "BasePlatformClient");
  }
  _modelPool = {};
  _modelInfos = {};
  _lock = new ObjectLock();
  async isAvailable(config) {
    if (Object.values(this._modelInfos).length > 0) {
      return true;
    }
    const unlock = await this._lock.lock();
    let retryCount = 0;
    const maxRetries = this.config?.maxRetries ?? 1;
    while (retryCount < (maxRetries ?? 1)) {
      try {
        await this.init(config);
        unlock();
        return true;
      } catch (e) {
        if (e instanceof ChatLunaError && e.errorCode === ChatLunaErrorCode.ABORTED) {
          unlock();
          throw e;
        }
        if (retryCount === maxRetries - 1) {
          const oldConfig = this.configPool.getConfig(true);
          this.configPool.getConfig(false);
          this.configPool.markConfigStatus(oldConfig.value, false);
          this.ctx.logger.error(e);
          if (this.configPool.findAvailableConfig() !== null) {
            retryCount = 0;
            continue;
          }
          unlock();
          return false;
        }
      }
      retryCount++;
    }
    unlock();
    return false;
  }
  get config() {
    return this.configPool.getConfig(true).value;
  }
  async getModels(config) {
    let models = Object.values(this._modelInfos);
    if (models.length > 0) {
      return models;
    }
    try {
      models = await this.refreshModels(config);
      this._modelInfos = {};
      for (const model of models) {
        this._modelInfos[model.name] = model;
      }
    } catch (e) {
      if (e instanceof ChatLunaError && e.errorCode === ChatLunaErrorCode.ABORTED) {
        throw e;
      }
      this.ctx.logger.error(e);
      this._modelInfos = {};
      throw e;
    }
  }
  async init(config) {
    await this.getModels(config);
  }
  /**
   * Returns file handling configuration for this platform, or `null` if the
   * platform does not support inline file uploads beyond basic image input.
   *
   * Override in subclasses to provide platform-specific MIME types, size
   * limits, and inline data support.
   */
  getFileHandlingConfig() {
    return null;
  }
  createModel(model) {
    if (!this._modelPool[model]) {
      this._modelPool[model] = this._createModel(model);
    }
    return this._modelPool[model];
  }
};
var PlatformModelClient = class extends BasePlatformClient {
  static {
    __name(this, "PlatformModelClient");
  }
  async clearContext() {
  }
};
var PlatformEmbeddingsClient = class extends BasePlatformClient {
  static {
    __name(this, "PlatformEmbeddingsClient");
  }
};
var PlatformModelAndEmbeddingsClient = class extends BasePlatformClient {
  static {
    __name(this, "PlatformModelAndEmbeddingsClient");
  }
};
export {
  BasePlatformClient,
  PlatformEmbeddingsClient,
  PlatformModelAndEmbeddingsClient,
  PlatformModelClient
};
