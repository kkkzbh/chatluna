var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/llm-core/platform/api.ts
import {
  ChatLunaError,
  ChatLunaErrorCode
} from "koishi-plugin-chatluna/utils/error";
var ModelRequester = class {
  constructor(ctx, _configPool, _pluginConfig, _plugin) {
    this.ctx = ctx;
    this._configPool = _configPool;
    this._pluginConfig = _pluginConfig;
    this._plugin = _plugin;
  }
  static {
    __name(this, "ModelRequester");
  }
  _errorCounts = {};
  async completion(params) {
    const stream = this.completionStream(params);
    let result;
    for await (const chunk of stream) {
      result = result != null ? result.concat(chunk) : chunk;
    }
    return result;
  }
  async *completionStream(params) {
    this._configPool.getConfig(false);
    const config = this._config;
    try {
      for await (const chunk of this.completionStreamInternal(params)) {
        yield chunk;
      }
    } catch (e) {
      if (e instanceof ChatLunaError && (e.errorCode === ChatLunaErrorCode.NETWORK_ERROR || e.errorCode === ChatLunaErrorCode.API_REQUEST_TIMEOUT || e.errorCode === ChatLunaErrorCode.ABORTED || e.errorCode === ChatLunaErrorCode.API_UNSAFE_CONTENT) || e.name === "AbortError") {
        throw e;
      }
      this._errorCounts[config.md5()] = (this._errorCounts[config.md5()] || 0) + 1;
      if (this._errorCounts[config.md5()] > this._pluginConfig.maxRetries) {
        this._configPool.markConfigStatus(config.value, false);
        delete this._errorCounts[config.md5()];
      }
      throw e;
    }
  }
  async init() {
  }
  async dispose(model, id) {
  }
  post(url, data, params = {}) {
    const requestUrl = this.concatUrl(url);
    for (const key in data) {
      if (data[key] === void 0) {
        delete data[key];
      }
    }
    const body = JSON.stringify(data);
    const { headers: initHeaders, method: _m, ...rest } = params;
    return this._plugin.fetch(requestUrl, {
      ...rest,
      method: "POST",
      headers: {
        ...this.buildHeaders(),
        ...initHeaders
      },
      body
    });
  }
  get(url, headers, params = {}) {
    const requestUrl = this.concatUrl(url);
    const { headers: initHeaders, method: _m, ...rest } = params;
    return this._plugin.fetch(requestUrl, {
      ...rest,
      method: "GET",
      headers: {
        ...this.buildHeaders(),
        ...initHeaders,
        ...headers
      }
    });
  }
  get _config() {
    return this._configPool.getConfig(true);
  }
  buildHeaders() {
    return {
      Authorization: `Bearer ${this._config.value.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/ChatLunaLab/chatluna",
      // Optional. Site URL for rankings on openrouter.ai.
      "X-Title": "ChatLuna"
      // Optional. Site title for rankings on openrouter.ai.
    };
  }
  concatUrl(url) {
    const apiEndPoint = this._config.value.apiEndpoint;
    if (apiEndPoint.endsWith("/")) {
      return apiEndPoint + url;
    }
    return apiEndPoint + "/" + url;
  }
};
export {
  ModelRequester
};
