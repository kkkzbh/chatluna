var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/locales/zh-CN.schema.plugin.yml
var require_zh_CN_schema_plugin = __commonJS({
  "src/locales/zh-CN.schema.plugin.yml"(exports2, module2) {
    module2.exports = { $inner: [{ $desc: "全局配置", $inner: { chatConcurrentMaxSize: "当前适配器支持的模型最大并发聊天数。", chatTimeLimit: "每小时的 API 调用次数限制。", maxRetries: "模型请求失败后的最大重试次数。", timeout: "模型请求的超时时间（毫秒）。", configMode: { $desc: "请求配置模式。", $inner: ["顺序配置模式（当前配置无效时，自动切换至下一个可用配置）。", "负载均衡模式（轮询使用所有可用配置）。"] }, proxyMode: { $desc: "当前插件的代理设置模式。", $inner: ["遵循全局代理设置", "禁用代理", "使用自定义代理设置"] } } }, [{ $desc: "代理配置", $inner: { proxyAddress: "当前插件的自定义代理地址。若指定，所有网络请求将使用此代理。若未指定，则尝试使用主插件的全局代理设置。" } }]] };
  }
});

// src/locales/en-US.schema.plugin.yml
var require_en_US_schema_plugin = __commonJS({
  "src/locales/en-US.schema.plugin.yml"(exports2, module2) {
    module2.exports = { $inner: [{ $desc: "Global Configuration", $inner: { chatConcurrentMaxSize: "Max concurrent chats for current adapter models.", chatTimeLimit: "API calls per hour limit (calls/hour).", maxRetries: "Max retries on model request failure.", timeout: "Model request timeout (ms).", configMode: { $desc: "Request config mode.", $inner: ["Sequential (auto-switch to next valid config on failure).", "Load balancing (rotate through all available configs)."] }, proxyMode: { $desc: "Plugin proxy mode.", $inner: ["Use global proxy", "Disable proxy", "Use custom proxy"] } } }, [{ $desc: "Proxy Configuration", $inner: { proxyAddress: 'Custom proxy for plugin. Overrides global proxy if set. (e.g., "http://127.0.0.1:7890" or "socks5://proxy.example.com:1080")' } }]] };
  }
});

// src/services/chat.ts
var chat_exports = {};
__export(chat_exports, {
  ChatLunaContextManagerService: () => ChatLunaContextManagerService,
  ChatLunaPlugin: () => ChatLunaPlugin,
  ChatLunaPromptRenderService: () => ChatLunaPromptRenderService,
  ChatLunaService: () => ChatLunaService,
  MessageTransformer: () => MessageTransformer,
  STAGE_ORDER: () => STAGE_ORDER,
  toMessages: () => toMessages
});
module.exports = __toCommonJS(chat_exports);
var import_messages3 = require("@langchain/core/messages");
var import_fs = __toESM(require("fs"), 1);
var import_koishi4 = require("koishi");
var import_app = require("koishi-plugin-chatluna/llm-core/chat/app");
var import_path = __toESM(require("path"), 1);
var import_lru_cache = require("lru-cache");

// src/cache.ts
var import_koishi = require("koishi");
var Cache = class {
  constructor(ctx, config, tableName) {
    this.config = config;
    this.tableName = tableName;
    this._cache = new DatabaseCache(ctx);
    ctx.on("ready", async () => {
      await this._cache.clear("chathub/keys");
      await this._cache.clear("chathub/chat_limit");
    });
  }
  static {
    __name(this, "Cache");
  }
  _cache;
  get(tableNameOrId, id) {
    if (typeof id === "string") {
      return this._cache.get(tableNameOrId, id);
    }
    return this._cache.get(this.tableName, tableNameOrId);
  }
  set(tableNameOrId, idOrValue, value) {
    if (value != null) {
      return this._cache.set(tableNameOrId, idOrValue, value);
    }
    return this._cache.set(this.tableName, tableNameOrId, idOrValue);
  }
  delete(tableNameOrId, id) {
    if (typeof id === "string") {
      return this._cache.delete(tableNameOrId, id);
    }
    return this._cache.delete(this.tableName, tableNameOrId);
  }
  async clear(tableName) {
    if (tableName) {
      await this._cache.clear(tableName);
    } else {
      await this._cache.clear(this.tableName);
    }
  }
};
var DatabaseCache = class {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.model.extend(
      "cache",
      {
        table: "string(63)",
        key: "string(63)",
        value: "text",
        expire: "timestamp"
      },
      {
        primary: ["table", "key"]
      }
    );
    ctx.setInterval(async () => {
      await ctx.database.remove("cache", { expire: { $lt: /* @__PURE__ */ new Date() } });
    }, 10 * import_koishi.Time.minute);
  }
  static {
    __name(this, "DatabaseCache");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encode(data) {
    return JSON.stringify(data);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  decode(record) {
    return JSON.parse(record);
  }
  async clear(table) {
    await this.ctx.database.remove("cache", { table });
  }
  async get(table, key) {
    const [entry] = await this.ctx.database.get("cache", { table, key }, [
      "expire",
      "value"
    ]);
    if (!entry) return;
    if (entry.expire && +entry.expire < Date.now()) return;
    return this.decode(entry.value);
  }
  async set(table, key, value, maxAge = 1e3 * 60 * 60 * 24) {
    const expire = maxAge ? new Date(Date.now() + maxAge) : null;
    await this.ctx.database.upsert("cache", [
      {
        table,
        key,
        value: this.encode(value),
        expire
      }
    ]);
  }
  async delete(table, key) {
    await this.ctx.database.remove("cache", { table, key });
  }
  async *keys(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "key"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => entry.key);
  }
  async *values(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "value"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => this.decode(entry.value));
  }
  async *entries(table) {
    const entries = await this.ctx.database.get("cache", { table }, [
      "expire",
      "key",
      "value"
    ]);
    yield* entries.filter((entry) => !entry.expire || +entry.expire > Date.now()).map((entry) => [entry.key, this.decode(entry.value)]);
  }
};

// src/chains/chain.ts
var import_events = require("events");
var import_koishi2 = require("koishi");
var import_error = require("koishi-plugin-chatluna/utils/error");
var import_logger = require("koishi-plugin-chatluna/utils/logger");

// src/middlewares/system/lifecycle.ts
var lifecycleNames = [
  "lifecycle-check",
  "lifecycle-prepare",
  "lifecycle-handle_command",
  "lifecycle-request_model",
  "lifecycle-send"
];

// src/utils/time.ts
function formatDuration(ms) {
  if (ms < 1e3) {
    return `${ms}ms`;
  }
  const totalSeconds = Math.floor(ms / 1e3);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds % 3600 / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  const decimal = (ms / 1e3).toFixed(2);
  return `${decimal}s`;
}
__name(formatDuration, "formatDuration");

// src/chains/chain.ts
var logger;
var ChatChain = class {
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    logger = (0, import_logger.createLogger)(ctx);
    this._graph = new ChatChainDependencyGraph();
    this._senders = [];
    const defaultChatChainSender = new DefaultChatChainSender(config);
    this._senders.push(
      (session, messages, context) => defaultChatChainSender.send(session, messages, context)
    );
  }
  static {
    __name(this, "ChatChain");
  }
  _graph;
  _senders;
  isSetErrorMessage = false;
  _createRecallThinkingMessage(context) {
    return async () => {
      if (!context.options?.thinkingTimeoutObject) return;
      const timeoutObj = context.options.thinkingTimeoutObject;
      clearTimeout(timeoutObj.timeout);
      timeoutObj.autoRecallTimeout && clearTimeout(timeoutObj.autoRecallTimeout);
      timeoutObj.recallFunc && await timeoutObj.recallFunc();
      timeoutObj.timeout = null;
      context.options.thinkingTimeoutObject = void 0;
    };
  }
  async receiveMessage(session, ctx) {
    const context = {
      config: this.config,
      message: session.content,
      ctx: ctx ?? this.ctx,
      session,
      options: {
        startedAt: Date.now()
      },
      send: /* @__PURE__ */ __name((message) => this.sendMessage(session, message, context), "send"),
      recallThinkingMessage: this._createRecallThinkingMessage(
        {}
      )
    };
    context.recallThinkingMessage = this._createRecallThinkingMessage(context);
    const result = await this._runMiddleware(session, context);
    await context.recallThinkingMessage();
    return result;
  }
  async receiveCommand(session, command, options = {}, ctx = this.ctx) {
    const context = {
      config: this.config,
      message: options?.message ?? session.content,
      ctx,
      session,
      command,
      send: /* @__PURE__ */ __name((message) => this.sendMessage(session, message, context), "send"),
      recallThinkingMessage: this._createRecallThinkingMessage(
        {}
      ),
      options: {
        ...options,
        startedAt: Date.now()
      }
    };
    context.recallThinkingMessage = this._createRecallThinkingMessage(context);
    const result = await this._runMiddleware(session, context);
    await context.recallThinkingMessage();
    return result;
  }
  middleware(name, middleware, ctx = this.ctx) {
    const result = new ChainMiddleware(name, middleware, this._graph);
    this._graph.addNode(result);
    const dispose = /* @__PURE__ */ __name(() => this._graph.removeNode(name), "dispose");
    ctx.effect(() => dispose);
    return result;
  }
  sender(sender) {
    this._senders.push(sender);
  }
  async _runMiddleware(session, context) {
    if (!this.isSetErrorMessage) {
      (0, import_error.setErrorFormatTemplate)(session.text("chatluna.error_message"));
      this.isSetErrorMessage = true;
    }
    const originMessage = context.message;
    const runLevels = this._graph.build();
    if (runLevels.length === 0) {
      return false;
    }
    let isOutputLog = false;
    for (const level of runLevels) {
      const results = await this._executeLevel(level, session, context);
      for (const result of results) {
        if (result.status === "stop") {
          await this._handleStopStatus(
            session,
            context,
            originMessage,
            isOutputLog
          );
          return false;
        }
        if (result.status === "error") {
          await this._handleMiddlewareError(
            session,
            result.middlewareName,
            result.error
          );
          return false;
        }
        if (result.output instanceof Array || typeof result.output === "string") {
          context.message = result.output;
        }
        if (result.shouldLog) {
          isOutputLog = true;
        }
      }
    }
    if (isOutputLog) {
      logger.debug("-".repeat(40) + "\n");
    }
    if (context.message != null && context.message !== originMessage) {
      await this.sendMessage(session, context.message, context);
    }
    return true;
  }
  async _executeLevel(middlewares, session, context) {
    const abortController = new AbortController();
    const results = [];
    let hasStopRequest = false;
    let hasError = false;
    const promises = middlewares.map(async (middleware, index) => {
      try {
        if (abortController.signal.aborted) {
          return {
            status: "success",
            output: 0 /* SKIPPED */,
            middlewareName: middleware.name,
            shouldLog: false
          };
        }
        const result = await this._executeMiddleware(
          middleware,
          session,
          context,
          abortController.signal
        );
        if (result.status === "stop" && !hasStopRequest) {
          hasStopRequest = true;
          abortController.abort();
        }
        if (result.status === "error" && !hasError) {
          hasError = true;
          abortController.abort();
        }
        results[index] = result;
        return result;
      } catch (error) {
        const errorResult = {
          status: "error",
          error,
          middlewareName: middleware.name,
          shouldLog: false
        };
        if (!hasError) {
          hasError = true;
          abortController.abort();
        }
        results[index] = errorResult;
        return errorResult;
      }
    });
    await Promise.all(promises);
    return results.filter((result) => result !== void 0);
  }
  async _executeMiddleware(middleware, session, context, abortSignal) {
    const startTime = Date.now();
    try {
      if (abortSignal?.aborted) {
        return {
          status: "success",
          output: 0 /* SKIPPED */,
          middlewareName: middleware.name,
          shouldLog: false
        };
      }
      const result = await middleware.run(session, context);
      const executionTime = Date.now() - startTime;
      const shouldLogTime = !middleware.name.startsWith("lifecycle-") && result !== 0 /* SKIPPED */ && middleware.name !== "allow_reply" && executionTime > 100;
      if (shouldLogTime) {
        logger.debug(
          `middleware %c executed in %s`,
          middleware.name,
          formatDuration(executionTime)
        );
      }
      if (result === 1 /* STOP */) {
        return {
          status: "stop",
          middlewareName: middleware.name,
          shouldLog: shouldLogTime
        };
      }
      return {
        status: "success",
        output: result,
        middlewareName: middleware.name,
        shouldLog: shouldLogTime
      };
    } catch (error) {
      return {
        status: "error",
        error,
        middlewareName: middleware.name,
        shouldLog: false
      };
    }
  }
  async sendMessage(session, message, context) {
    const messages = message instanceof Array ? message : [message];
    for (const sender of this._senders) {
      await sender(session, messages, context);
    }
  }
  async _handleStopStatus(session, context, originMessage, isOutputLog) {
    if (context.message != null && context.message !== originMessage) {
      await this.sendMessage(session, context.message, context);
    }
    if (isOutputLog) {
      logger.debug("-".repeat(40) + "\n");
    }
  }
  async _handleMiddlewareError(session, middlewareName, error) {
    if (error instanceof import_error.ChatLunaError) {
      const state = session.state;
      if (error.errorCode === import_error.ChatLunaErrorCode.ABORTED && (state?.chatluna?.suppressAbortNotice === true || state?.qqReplyTransport?.suppressAbortNotice === true)) {
        return;
      }
      const message = error.errorCode === import_error.ChatLunaErrorCode.ABORTED ? session.text("chatluna.aborted") : error.message;
      await this.sendMessage(session, message, void 0);
      return;
    }
    logger.error(`chat-chain: ${middlewareName} error ${error}`);
    logger.error(error);
    error.cause && logger.error(error.cause);
    logger.debug("-".repeat(40) + "\n");
    await this.sendMessage(
      session,
      session.text("chatluna.middleware_error", [
        middlewareName,
        error.message
      ]),
      void 0
    );
  }
};
var ChatChainDependencyGraph = class {
  static {
    __name(this, "ChatChainDependencyGraph");
  }
  _tasks = /* @__PURE__ */ new Map();
  _dependencies = /* @__PURE__ */ new Map();
  _eventEmitter = new import_events.EventEmitter();
  _listeners = /* @__PURE__ */ new Map();
  _cachedOrder = null;
  constructor() {
    this._eventEmitter.on("build_node", () => {
      for (const [, listeners] of this._listeners) {
        for (const listener of listeners) {
          listener();
        }
        listeners.clear();
      }
    });
  }
  addNode(middleware) {
    this._tasks.set(middleware.name, {
      name: middleware.name,
      middleware
    });
    this._cachedOrder = null;
  }
  removeNode(name) {
    this._tasks.delete(name);
    this._dependencies.delete(name);
    for (const deps of this._dependencies.values()) {
      deps.delete(name);
    }
    this._cachedOrder = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once(name, listener) {
    const listeners = this._listeners.get(name) ?? /* @__PURE__ */ new Set();
    listeners.add(listener);
    this._listeners.set(name, listeners);
  }
  before(taskA, taskB) {
    if (taskA instanceof ChainMiddleware) {
      taskA = taskA.name;
    }
    if (taskB instanceof ChainMiddleware) {
      taskB = taskB.name;
    }
    if (taskA && taskB) {
      const dependencies = this._dependencies.get(taskA) ?? /* @__PURE__ */ new Set();
      dependencies.add(taskB);
      this._dependencies.set(taskA, dependencies);
    } else {
      throw new Error("Invalid tasks");
    }
  }
  after(taskA, taskB) {
    if (taskA instanceof ChainMiddleware) {
      taskA = taskA.name;
    }
    if (taskB instanceof ChainMiddleware) {
      taskB = taskB.name;
    }
    if (taskA && taskB) {
      const dependencies = this._dependencies.get(taskB) ?? /* @__PURE__ */ new Set();
      dependencies.add(taskA);
      this._dependencies.set(taskB, dependencies);
    } else {
      throw new Error("Invalid tasks");
    }
  }
  getDependencies(task) {
    return this._dependencies.get(task);
  }
  getDependents(task) {
    const dependents = [];
    for (const [key, value] of this._dependencies.entries()) {
      if ([...value].includes(task)) {
        dependents.push(key);
      }
    }
    return dependents;
  }
  build() {
    if (this._cachedOrder) {
      return this._cachedOrder;
    }
    this._eventEmitter.emit("build_node");
    const indegree = /* @__PURE__ */ new Map();
    const tempGraph = /* @__PURE__ */ new Map();
    for (const taskName of this._tasks.keys()) {
      indegree.set(taskName, 0);
      tempGraph.set(taskName, /* @__PURE__ */ new Set());
    }
    for (const [from, deps] of this._dependencies.entries()) {
      const depsSet = tempGraph.get(from) || /* @__PURE__ */ new Set();
      for (const to of deps) {
        depsSet.add(to);
        indegree.set(to, (indegree.get(to) || 0) + 1);
      }
      tempGraph.set(from, depsSet);
    }
    const levels = [];
    const visited = /* @__PURE__ */ new Set();
    let currentLevel = [];
    for (const [task, degree] of indegree.entries()) {
      if (degree === 0) {
        currentLevel.push(task);
      }
    }
    while (currentLevel.length > 0) {
      const levelMiddlewares = [];
      const nextLevel = [];
      for (const current of currentLevel) {
        if (visited.has(current)) continue;
        visited.add(current);
        const node = this._tasks.get(current);
        if (node?.middleware) {
          levelMiddlewares.push(node.middleware);
        }
        const successors = tempGraph.get(current) || /* @__PURE__ */ new Set();
        for (const next of successors) {
          const newDegree = indegree.get(next) - 1;
          indegree.set(next, newDegree);
          if (newDegree === 0) {
            nextLevel.push(next);
          }
        }
      }
      if (levelMiddlewares.length > 0) {
        levels.push(levelMiddlewares);
      }
      currentLevel = nextLevel;
    }
    for (const [node, degree] of indegree.entries()) {
      if (degree > 0) {
        const cycles = this._findAllCycles();
        const relevantCycle = cycles.find(
          (cycle) => cycle.includes(node)
        );
        throw new Error(
          `Circular dependency detected involving nodes: ${relevantCycle?.join(" -> ") || node}`
        );
      }
    }
    if (visited.size !== this._tasks.size) {
      throw new Error(
        "Some nodes are unreachable in the dependency graph"
      );
    }
    this._cachedOrder = levels;
    return levels;
  }
  _canRunInParallel(a, b) {
    const aDeps = this._dependencies.get(a.name) || /* @__PURE__ */ new Set();
    const bDeps = this._dependencies.get(b.name) || /* @__PURE__ */ new Set();
    return !aDeps.has(b.name) && !bDeps.has(a.name) && !this._hasTransitiveDependency(a.name, b.name) && !this._hasTransitiveDependency(b.name, a.name);
  }
  _hasTransitiveDependency(from, to, visited = /* @__PURE__ */ new Set()) {
    if (visited.has(from)) return false;
    visited.add(from);
    const deps = this._dependencies.get(from) || /* @__PURE__ */ new Set();
    if (deps.has(to)) return true;
    for (const dep of deps) {
      if (this._hasTransitiveDependency(dep, to, visited)) {
        return true;
      }
    }
    return false;
  }
  _findAllCycles() {
    const visited = /* @__PURE__ */ new Set();
    const recursionStack = /* @__PURE__ */ new Set();
    const cycles = [];
    const dfs = /* @__PURE__ */ __name((node, path2) => {
      if (recursionStack.has(node)) {
        const cycleStart = path2.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path2.slice(cycleStart).concat([node]);
          cycles.push(cycle);
        }
        return;
      }
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      recursionStack.add(node);
      path2.push(node);
      const deps = this._dependencies.get(node) || /* @__PURE__ */ new Set();
      for (const dep of deps) {
        dfs(dep, [...path2]);
      }
      recursionStack.delete(node);
    }, "dfs");
    for (const node of this._tasks.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
    return cycles;
  }
};
var ChainMiddleware = class {
  constructor(name, execute, graph) {
    this.name = name;
    this.execute = execute;
    this.graph = graph;
  }
  static {
    __name(this, "ChainMiddleware");
  }
  before(name) {
    this.graph.before(this.name, name);
    if (this.name.startsWith("lifecycle-")) {
      return this;
    }
    const lifecycleName = lifecycleNames;
    if (lifecycleName.includes(name)) {
      const lastLifecycleName = lifecycleName[lifecycleName.indexOf(name) - 1];
      if (lastLifecycleName) {
        this.graph.after(this.name, lastLifecycleName);
      }
      return this;
    }
    return this;
  }
  after(name) {
    this.graph.after(this.name, name);
    if (this.name.startsWith("lifecycle-")) {
      return this;
    }
    const lifecycleName = lifecycleNames;
    if (lifecycleName.includes(name)) {
      const nextLifecycleName = lifecycleName[lifecycleName.indexOf(name) + 1];
      if (nextLifecycleName) {
        this.graph.before(this.name, nextLifecycleName);
      }
      return this;
    }
    return this;
  }
  run(session, options) {
    return this.execute(session, options);
  }
};
var DefaultChatChainSender = class {
  constructor(config) {
    this.config = config;
  }
  static {
    __name(this, "DefaultChatChainSender");
  }
  processElements(elements) {
    return elements.filter((element) => {
      if (!element) return false;
      if (element.type === "img") {
        const src = element.attrs?.["src"];
        return !(typeof src === "string" && src.startsWith("attachment"));
      }
      return true;
    }).map((element) => {
      if (element.children?.length) {
        element.children = this.processElements(element.children);
      }
      return element;
    });
  }
  async send(session, messages, context) {
    if (!messages?.length) return;
    if (isElementArray(messages?.[0]) && messages[0][1]?.type === "markdown-qq") {
      await this.sendAsQQMarkdown(session, messages[0][0]);
      return;
    }
    if (this.config.isForwardMsg && this.getMessageText(messages).length > this.config.forwardMsgMinLength) {
      await this.sendAsForward(session, messages);
      return;
    }
    await this.sendAsNormal(session, messages, context);
  }
  async sendAsQQMarkdown(session, message) {
    const { user } = session.event;
    await session.bot.internal.sendPrivateMessage(
      user.id,
      {
        msg_type: 2,
        msg_seq: 1,
        msg_id: session.messageId,
        markdown: {
          content: message.attrs["content"]
        }
      }
    );
  }
  async sendAsForward(session, messages) {
    const sendMessages = this.convertToForwardMessages(messages);
    if (sendMessages.length < 1 || sendMessages.length === 1 && sendMessages.join().length === 0) {
      return;
    }
    await session.sendQueued(
      (0, import_koishi2.h)("message", { forward: true }, ...sendMessages)
    );
  }
  convertToForwardMessages(messages) {
    const firstMsg = messages[0];
    if (Array.isArray(firstMsg)) {
      return messages.map((msg) => (0, import_koishi2.h)("message", ...msg));
    }
    if (typeof firstMsg === "object") {
      return [(0, import_koishi2.h)("message", ...messages)];
    }
    if (typeof firstMsg === "string") {
      return [import_koishi2.h.text(firstMsg)];
    }
    throw new Error(`Unsupported message type: ${typeof firstMsg}`);
  }
  async sendAsNormal(session, messages, context) {
    for (const message of messages) {
      const messageFragment = await this.buildMessageFragment(
        session,
        message,
        context
      );
      if (!messageFragment?.length) continue;
      const processedFragment = this.processElements(messageFragment);
      await session.sendQueued(processedFragment);
    }
  }
  async buildMessageFragment(session, message, context) {
    const start = context?.options?.startedAt;
    const elapsed = start ? Date.now() - start : 0;
    const threshold = (this.config.replyQuoteThreshold ?? 0) * 1e3;
    const shouldAddQuote = this.config.isReplyWithAt && session.isDirect === false && session.messageId && elapsed >= threshold;
    const messageContent = this.convertMessageToArray(message);
    if (messageContent == null || messageContent.length < 1 || messageContent.length === 1 && messageContent.join().length === 0) {
      return;
    }
    if (!shouldAddQuote) {
      return messageContent;
    }
    const quote = (0, import_koishi2.h)("quote", { id: session.messageId });
    const hasIncompatibleType = messageContent.some(
      (element) => element.type === "audio" || element.type === "message"
    );
    return hasIncompatibleType ? messageContent : [quote, ...messageContent];
  }
  convertMessageToArray(message) {
    if (Array.isArray(message)) {
      return message;
    }
    if (typeof message === "string") {
      return [import_koishi2.h.text(message)];
    }
    return [message];
  }
  getMessageText(message) {
    return message.map((element) => {
      if (typeof element === "string") {
        return element;
      }
      if (Array.isArray(element)) {
        return import_koishi2.h.select(element, "text").toString();
      }
      return element.toString();
    }).join(" ");
  }
};
function isElementArray(value) {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "object" && item.attrs && item.type
  );
}
__name(isElementArray, "isElementArray");

// src/services/chat.ts
var import_agent = require("koishi-plugin-chatluna/llm-core/agent");
var import_config = require("koishi-plugin-chatluna/llm-core/platform/config");
var import_model = require("koishi-plugin-chatluna/llm-core/platform/model");
var import_service = require("koishi-plugin-chatluna/llm-core/platform/service");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_preset = require("koishi-plugin-chatluna/preset");
var import_error3 = require("koishi-plugin-chatluna/utils/error");
var import_queue = require("koishi-plugin-chatluna/utils/queue");

// src/services/message_transform.ts
var import_koishi_plugin_chatluna = require("koishi-plugin-chatluna");
var import_error2 = require("koishi-plugin-chatluna/utils/error");
var import_string = require("koishi-plugin-chatluna/utils/string");
var MessageTransformer = class {
  constructor(_config) {
    this._config = _config;
  }
  static {
    __name(this, "MessageTransformer");
  }
  _beforeTransformFunctions = [];
  _transformFunctions = /* @__PURE__ */ new Map();
  async transform(session, elements, model, message = {
    content: "",
    name: session.username,
    additional_kwargs: {}
  }, options = {
    quote: false,
    includeQuoteReply: true
  }) {
    await this._runBeforeTransform(
      session,
      elements,
      message,
      model,
      options
    );
    const sourceElementString = elements.map((h2) => h2.toString(true)).join();
    const quoteElementString = ((session.quote && session.quote.elements) ?? []).map((h2) => h2.toString(true)).join();
    for (const element of elements) {
      await this._processElement(session, element, message, model);
    }
    if (session.quote && !options.quote && options.includeQuoteReply && sourceElementString !== quoteElementString) {
      const quoteMessage = await this.transform(
        session,
        session.quote.elements ?? [],
        model,
        {
          content: "",
          name: session.username,
          additional_kwargs: {}
        },
        {
          quote: true,
          includeQuoteReply: options.includeQuoteReply
        }
      );
      const extractText = /* @__PURE__ */ __name((content) => {
        if (typeof content === "string") return content;
        return Array.isArray(content) ? content.filter((item) => (0, import_string.isMessageContentText)(item)).map((item) => item.text).join("") : "";
      }, "extractText");
      const extractImages = /* @__PURE__ */ __name((content) => Array.isArray(content) ? content.filter((item) => (0, import_string.isMessageContentImageUrl)(item)) : [], "extractImages");
      const quoteText = extractText(quoteMessage.content);
      const quoteImages = extractImages(quoteMessage.content);
      const hasImages = extractImages(message.content).length > 0 || quoteImages.length > 0;
      const quoteUsername = session.quote.user?.name || session.quote.user?.id || "Unknown";
      const quoteTimestamp = session.quote.timestamp ? new Date(session.quote.timestamp).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }) : "";
      const quoteSaid = session.text("chatluna.quote_said");
      const quoteHeader = quoteTimestamp ? `${quoteTimestamp} ${quoteUsername}` : quoteUsername;
      if (hasImages) {
        if (typeof message.content === "string") {
          message.content = message.content.trim().length > 0 ? [{ type: "text", text: message.content }] : [];
        }
        if (quoteText && quoteText !== "[image]") {
          const currentText = extractText(message.content);
          const quotedContent = `Referenced message: [${quoteHeader} ${quoteSaid}："${quoteText}"]

User's message: ${currentText}`;
          message.content = message.content.filter(
            (item) => item.type !== "text"
          );
          message.content.unshift({
            type: "text",
            text: quotedContent
          });
        }
        message.content = [...quoteImages, ...message.content];
      } else if (quoteText && quoteText !== "[image]") {
        const currentText = extractText(message.content);
        message.content = `Referenced message: [${quoteHeader} ${quoteSaid}："${quoteText}"]

User's message: ${currentText}`;
      }
    }
    return message;
  }
  before(transformFunction, priority = 0) {
    const wrapper = {
      func: transformFunction,
      priority
    };
    const insertIndex = this._beforeTransformFunctions.findIndex(
      (item) => item.priority > priority
    );
    if (insertIndex === -1) {
      this._beforeTransformFunctions.push(wrapper);
    } else {
      this._beforeTransformFunctions.splice(insertIndex, 0, wrapper);
    }
    return () => {
      const index = this._beforeTransformFunctions.findIndex(
        (item) => item.func === transformFunction
      );
      if (index === -1) return;
      this._beforeTransformFunctions.splice(index, 1);
    };
  }
  intercept(type, transformFunction, priority = 0) {
    const functions = this._transformFunctions.get(type);
    if (type === "text" && functions?.length) {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.UNKNOWN_ERROR,
        new Error("text transform function already exists")
      );
    }
    const wrapper = {
      func: transformFunction,
      priority
    };
    if (!functions) {
      this._transformFunctions.set(type, [wrapper]);
    } else {
      const insertIndex = functions.findIndex(
        (item) => item.priority > priority
      );
      if (insertIndex === -1) {
        functions.push(wrapper);
      } else {
        functions.splice(insertIndex, 0, wrapper);
      }
    }
    return () => {
      const currentFunctions = this._transformFunctions.get(type);
      if (!currentFunctions) return;
      const index = currentFunctions.findIndex(
        (item) => item.func === transformFunction
      );
      if (index === -1) return;
      if (currentFunctions.length === 1) {
        this._transformFunctions.delete(type);
      } else {
        currentFunctions.splice(index, 1);
      }
    };
  }
  replace(type, transformFunction) {
    if (type === "text") {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.UNKNOWN_ERROR,
        new Error("text transform function cannot be replaced")
      );
    }
    const functions = this._transformFunctions.get(type);
    if (functions == null || functions.length === 0) {
      import_koishi_plugin_chatluna.logger?.warn(
        `transform function for ${type} not exists. Check your installed plugins.`
      );
    }
    this._transformFunctions.set(type, [
      { func: transformFunction, priority: 0 }
    ]);
    return () => {
      this._transformFunctions.delete(type);
    };
  }
  has(type) {
    const functions = this._transformFunctions.get(type);
    return functions != null && functions.length > 0;
  }
  async _processElement(session, element, message, model) {
    const transformFunctions = this._transformFunctions.get(element.type);
    if (!transformFunctions?.length) {
      if (element.children?.length) {
        await this.transform(
          session,
          element.children,
          model,
          message,
          {
            quote: false,
            includeQuoteReply: true
          }
        );
      }
      return;
    }
    const hasChildren = !!element.children?.length;
    for (const { func: transformFunction } of transformFunctions) {
      const result = await transformFunction(
        session,
        element,
        message,
        model
      );
      if (result !== false) return;
      if (hasChildren) {
        await this.transform(
          session,
          element.children,
          model,
          message,
          {
            quote: false,
            includeQuoteReply: true
          }
        );
        return;
      }
    }
    if (hasChildren) {
      await this.transform(session, element.children, model, message, {
        quote: false,
        includeQuoteReply: false
      });
    }
  }
  async _runBeforeTransform(session, elements, message, model, options) {
    for (const { func: transformFunction } of this._beforeTransformFunctions) {
      await transformFunction(session, elements, message, model, options);
    }
  }
};

// src/services/chat.ts
var import_request = require("koishi-plugin-chatluna/utils/request");
var import_koishi_plugin_chatluna3 = require("koishi-plugin-chatluna");
var import_promise = require("koishi-plugin-chatluna/utils/promise");
var import_in_memory = require("koishi-plugin-chatluna/llm-core/model/in_memory");

// src/services/prompt_renderer.ts
var import_messages = require("@langchain/core/messages");
var import_koishi3 = require("koishi");
var import_koishi_plugin_chatluna2 = require("koishi-plugin-chatluna");
var import_shared_prompt_renderer = require("@chatluna/shared-prompt-renderer");
var import_string2 = require("koishi-plugin-chatluna/utils/string");
var ChatLunaPromptRenderService = class {
  static {
    __name(this, "ChatLunaPromptRenderService");
  }
  _renderer;
  constructor() {
    this._renderer = new import_shared_prompt_renderer.ChatLunaPromptRenderer();
    this._initBuiltinFunctions();
  }
  _initBuiltinFunctions() {
    this.registerFunctionProvider("time_UTC", (args) => {
      const date = /* @__PURE__ */ new Date();
      const utcOffset = args[0] ? parseInt(args[0]) : 0;
      if (isNaN(utcOffset)) {
        import_koishi_plugin_chatluna2.logger.warn(`Invalid UTC offset: ${args[0]}`);
        return "Invalid UTC offset";
      }
      const offsetDate = new Date(+date + utcOffset * import_koishi3.Time.hour);
      return offsetDate.toISOString().replace("T", " ").slice(0, -5);
    });
    this.registerFunctionProvider("timeDiff", (args) => {
      return (0, import_string2.getTimeDiff)(args[0], args[1]);
    });
    this.registerFunctionProvider("date", () => {
      const date = /* @__PURE__ */ new Date();
      const offsetDate = new Date(
        +date - date.getTimezoneOffset() * import_koishi3.Time.minute
      );
      return offsetDate.toISOString().split("T")[0];
    });
    this.registerFunctionProvider("weekday", () => {
      const date = /* @__PURE__ */ new Date();
      return [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
      ][date.getDay()];
    });
    this.registerFunctionProvider("isotime", () => {
      const date = /* @__PURE__ */ new Date();
      const offsetDate = new Date(
        +date - date.getTimezoneOffset() * import_koishi3.Time.minute
      );
      return offsetDate.toISOString().slice(11, 19);
    });
    this.registerFunctionProvider("isodate", () => {
      const date = /* @__PURE__ */ new Date();
      const offsetDate = new Date(
        +date - date.getTimezoneOffset() * import_koishi3.Time.minute
      );
      return offsetDate.toISOString().split("T")[0];
    });
    this.registerFunctionProvider("random", (args) => {
      if (args.length === 2) {
        const [min, max] = args.map(Number);
        if (!isNaN(min) && !isNaN(max)) {
          return Math.floor(
            Math.random() * (max - min + 1) + min
          ).toString();
        }
      }
      return (0, import_string2.selectFromList)(args.join(","), false);
    });
    this.registerFunctionProvider("pick", (args) => {
      return (0, import_string2.selectFromList)(args.join(","), true);
    });
    this.registerFunctionProvider("roll", (args) => {
      return (0, import_string2.rollDice)(args[0]).toString();
    });
    this.registerFunctionProvider("url", async (args) => {
      return await (0, import_string2.fetchUrl)(
        args[1],
        args[0],
        args[2],
        parseInt(args[3] ?? "1000")
      );
    });
  }
  registerFunctionProvider(name, handler) {
    return this._renderer.registerFunctionProvider(name, handler);
  }
  registerVariableProvider(provider) {
    return this._renderer.registerVariableProvider(provider);
  }
  setVariable(name, value) {
    this._renderer.setStaticVariable(name, value);
  }
  getVariable(name) {
    return this._renderer.getStaticVariable(name);
  }
  removeVariable(name) {
    this._renderer.removeStaticVariable(name);
  }
  async renderTemplate(source, variables = {}, options) {
    return await this._renderer.render(source, variables, options);
  }
  async renderMessages(messages, variables = {}, options) {
    return await Promise.all(
      messages.map(async (message) => {
        const content = await this.renderTemplate(
          (0, import_string2.getMessageContent)(message.content),
          variables,
          options
        );
        const messageInstance = new {
          human: import_messages.HumanMessage,
          ai: import_messages.AIMessage,
          system: import_messages.SystemMessage
        }[message.getType()]({
          content: content.text,
          additional_kwargs: message.additional_kwargs
        });
        return messageInstance;
      })
    );
  }
  async renderPresetTemplate(presetTemplate, variables = {}, options) {
    const collectedVariables = /* @__PURE__ */ new Set();
    const formattedMessages = await Promise.all(
      presetTemplate.messages.map(async (message) => {
        const content = await this.renderTemplate(
          (0, import_string2.getMessageContent)(message.content),
          variables,
          options
        );
        const messageInstance = new {
          human: import_messages.HumanMessage,
          ai: import_messages.AIMessage,
          system: import_messages.SystemMessage
        }[message.getType()]({
          content: content.text,
          additional_kwargs: message.additional_kwargs
        });
        for (const variable of content.variables) {
          collectedVariables.add(variable);
        }
        return messageInstance;
      })
    );
    return {
      messages: formattedMessages,
      variables: Array.from(collectedVariables)
    };
  }
};

// src/services/chat.ts
var import_reactivity = require("@vue/reactivity");
var import_crypto = require("crypto");
var import_prompt = require("koishi-plugin-chatluna/llm-core/prompt");

// src/services/types.ts
var types_exports = {};
__reExport(types_exports, require("@chatluna/shared-prompt-renderer"));

// src/services/chat.ts
__reExport(chat_exports, types_exports, module.exports);

// src/llm-core/prompt/context_manager.ts
var import_messages2 = require("@langchain/core/messages");
var STAGE_ORDER = {
  system_prompts: 0,
  after_system_prompts: 50,
  chat_history: 100,
  long_history: 200,
  injections: 300,
  input: 400,
  scratchpad: 500,
  after_scratchpad: 600
};
var ChatLunaContextManagerService = class _ChatLunaContextManagerService {
  static {
    __name(this, "ChatLunaContextManagerService");
  }
  // -- injection middlewares (per-name, handles a single AnchoredInjection) --
  _middlewares = /* @__PURE__ */ new Map();
  // -- pipeline middlewares (per-stage, handles the whole stage) --
  _pipelineMiddlewares = [];
  // -- storage --
  _conversationPersistent = /* @__PURE__ */ new Map();
  _conversationQueue = /* @__PURE__ */ new Map();
  _skillProviders = /* @__PURE__ */ new Set();
  _coreRegistered = false;
  ensureCoreMiddlewares(register) {
    if (this._coreRegistered) return;
    this._coreRegistered = true;
    register();
  }
  constructor(ctx) {
    ctx.on("chatluna/clear-chat-history", async (conversationId) => {
      this.clearConversation(conversationId);
    });
  }
  // -----------------------------------------------------------------------
  // Pipeline middleware registration
  // -----------------------------------------------------------------------
  /**
   * Register a pipeline middleware for a given stage.
   *
   * Pipeline middlewares execute in `(stage-order, priority)` order.
   * Lower priority = earlier within the same stage.
   *
   * Returns a disposer function.
   */
  pipeline(stage, middleware, priority = 0) {
    const entry = { stage, middleware, priority };
    this._pipelineMiddlewares.push(entry);
    this._pipelineMiddlewares.sort((a, b) => {
      const sa = STAGE_ORDER[a.stage] ?? 999;
      const sb = STAGE_ORDER[b.stage] ?? 999;
      if (sa !== sb) return sa - sb;
      return a.priority - b.priority;
    });
    return () => {
      const idx = this._pipelineMiddlewares.indexOf(entry);
      if (idx !== -1) this._pipelineMiddlewares.splice(idx, 1);
    };
  }
  /**
   * Execute the full pipeline.  Each registered pipeline middleware is
   * called in order.  The `next()` function advances to the next
   * middleware.
   */
  async runPipeline(runtime) {
    const entries = [...this._pipelineMiddlewares];
    let index = -1;
    const dispatch = /* @__PURE__ */ __name(async (step) => {
      if (step <= index) {
        throw new Error("Pipeline middleware called next() twice");
      }
      index = step;
      const current = entries[step];
      if (!current) return;
      await current.middleware(runtime, () => dispatch(step + 1));
    }, "dispatch");
    await dispatch(0);
  }
  // -----------------------------------------------------------------------
  // Injection middleware registration (per-name, backward-compatible)
  // -----------------------------------------------------------------------
  intercept(name, middleware, priority = 0) {
    const wrappers = this._middlewares.get(name) ?? [];
    const wrapper = { middleware, priority };
    const insertAt = wrappers.findIndex((item) => item.priority > priority);
    if (insertAt === -1) {
      wrappers.push(wrapper);
    } else {
      wrappers.splice(insertAt, 0, wrapper);
    }
    this._middlewares.set(name, wrappers);
    return () => {
      const current = this._middlewares.get(name);
      if (!current) return;
      const idx = current.findIndex(
        (item) => item.middleware === middleware
      );
      if (idx === -1) return;
      if (current.length === 1) {
        this._middlewares.delete(name);
      } else {
        current.splice(idx, 1);
      }
    };
  }
  replace(name, middleware) {
    this._middlewares.set(name, [{ middleware, priority: 0 }]);
    return () => this._middlewares.delete(name);
  }
  has(name) {
    const wrappers = this._middlewares.get(name);
    return wrappers != null && wrappers.length > 0;
  }
  // -----------------------------------------------------------------------
  // Injection storage
  // -----------------------------------------------------------------------
  /**
   * Inject content into a conversation's context.
   *
   * Content can be anchored between two messages (by message ID).  As long
   * as both anchor messages exist in the assembled prompt, the injection
   * will be placed between them.
   *
   * If `once` is true the injection is consumed after one collection.
   * Otherwise it persists until the anchor messages are gone or it is
   * cleared.
   */
  inject(options) {
    const injection = this._createInjection(options);
    if (!options.conversationId) return;
    const store = options.once ? this._conversationQueue : this._conversationPersistent;
    this._addToStore(store, options.conversationId, injection);
  }
  /**
   * Remove a specific persistent injection by id.
   */
  removeInjection(conversationId, injectionId) {
    const list = this._conversationPersistent.get(conversationId);
    if (!list) return false;
    const idx = list.findIndex((item) => item.id === injectionId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    return true;
  }
  // -----------------------------------------------------------------------
  // Collecting injections for the current prompt render
  // -----------------------------------------------------------------------
  collectInjections({
    variables,
    configurable,
    afterUserMessage,
    currentMessages
  }) {
    const conversationId = configurable?.conversationId;
    for (const msg of currentMessages) {
      if (!msg.id) {
        msg.id = this._createId();
      }
    }
    const liveIds = new Set(
      currentMessages.map((m) => m.id).filter(Boolean)
    );
    const collected = [];
    if (conversationId) {
      const persistent = this._conversationPersistent.get(conversationId) ?? [];
      const alive = persistent.filter((inj) => {
        if (inj.beforeMessageId && !liveIds.has(inj.beforeMessageId)) {
          return false;
        }
        if (!inj.afterMessageId) return true;
        return liveIds.has(inj.afterMessageId);
      });
      if (alive.length !== persistent.length) {
        this._conversationPersistent.set(conversationId, alive);
      }
      collected.push(...alive);
      const queued = this._conversationQueue.get(conversationId) ?? [];
      if (queued.length > 0) {
        this._conversationQueue.delete(conversationId);
      }
      collected.push(...queued);
    }
    if (Array.isArray(variables?.["lore_books"]) && variables["lore_books"].length > 0) {
      collected.push(
        this._createInjection({
          name: "lore_books",
          value: variables["lore_books"],
          stage: "injections"
        })
      );
    }
    if (variables?.["authors_note"]) {
      collected.push(
        this._createInjection({
          name: "authors_note",
          value: variables["authors_note"],
          stage: "injections"
        })
      );
    }
    if (afterUserMessage) {
      collected.push(
        this._createInjection({
          name: "after_user_message",
          value: afterUserMessage,
          stage: "after_scratchpad"
        })
      );
    }
    collected.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt - b.createdAt;
    });
    return {
      beforeScratchpad: collected.filter(
        (item) => item.stage !== "after_scratchpad" && item.stage !== "scratchpad"
      ),
      afterScratchpad: collected.filter(
        (item) => item.stage === "after_scratchpad"
      )
    };
  }
  // -----------------------------------------------------------------------
  // Applying injections (runs per-name middleware chains)
  // -----------------------------------------------------------------------
  async applyInjections(injections, runtime) {
    for (const injection of injections) {
      await this._applySingleInjection(injection, runtime);
    }
    return runtime;
  }
  // -----------------------------------------------------------------------
  // Anchor helpers – find position by message ID
  // -----------------------------------------------------------------------
  /**
   * Find the index in `messages` where content anchored by
   * `afterMessageId` / `beforeMessageId` should be inserted.
   *
   * Matches against `BaseMessage.id`.  Returns the splice index.
   */
  static findAnchorIndex(messages, afterMessageId, beforeMessageId) {
    if (afterMessageId) {
      const idx = messages.findIndex((m) => m.id === afterMessageId);
      if (idx !== -1) return idx + 1;
    }
    if (beforeMessageId) {
      const idx = messages.findIndex((m) => m.id === beforeMessageId);
      if (idx !== -1) return idx;
    }
    return messages.length;
  }
  /**
   * Return true when all specified anchor messages are present in
   * `messages` (matched by `BaseMessage.id`).
   */
  static anchorsExist(messages, afterMessageId, beforeMessageId) {
    if (!afterMessageId && !beforeMessageId) return true;
    const ids = new Set(messages.map((m) => m.id).filter(Boolean));
    if (afterMessageId && !ids.has(afterMessageId)) return false;
    if (beforeMessageId && !ids.has(beforeMessageId)) return false;
    return true;
  }
  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------
  clearConversation(conversationId) {
    this._conversationQueue.delete(conversationId);
    this._conversationPersistent.delete(conversationId);
  }
  clearAll() {
    this._conversationQueue.clear();
    this._conversationPersistent.clear();
  }
  registerSkillProvider(provider) {
    this._skillProviders.add(provider);
    return () => {
      this._skillProviders.delete(provider);
    };
  }
  // -----------------------------------------------------------------------
  // Private helpers
  // -----------------------------------------------------------------------
  _createInjection(options) {
    return {
      id: this._createId(),
      name: options.name,
      value: options.value,
      afterMessageId: options.afterMessageId,
      beforeMessageId: options.beforeMessageId,
      stage: options.stage ?? this._resolveDefaultStage(options.name),
      createdAt: Date.now(),
      priority: options.priority ?? 0,
      once: options.once
    };
  }
  _resolveDefaultStage(name) {
    if (name === "after_user_message" || name === "tool_observation") {
      return "after_scratchpad";
    }
    return "injections";
  }
  _createId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
  _addToStore(store, key, injection) {
    const current = store.get(key);
    if (!current) {
      store.set(key, [injection]);
      return;
    }
    current.push(injection);
  }
  async _applySingleInjection(injection, runtime) {
    const wrappers = [
      ...this._middlewares.get("*") ?? [],
      ...this._middlewares.get(injection.name) ?? []
    ];
    const context = {
      injection,
      runtime,
      handled: false,
      markHandled: /* @__PURE__ */ __name(() => {
        context.handled = true;
      }, "markHandled"),
      appendMessages: /* @__PURE__ */ __name((input) => {
        const messages = toMessages(input);
        if (messages.length > 0) {
          runtime.result.push(...messages);
        }
        return messages;
      }, "appendMessages"),
      insertAtAnchor: /* @__PURE__ */ __name((input) => {
        const messages = Array.isArray(input) ? input : [input];
        if (messages.length === 0) return runtime.result.length;
        const idx = _ChatLunaContextManagerService.findAnchorIndex(
          runtime.result,
          injection.afterMessageId,
          injection.beforeMessageId
        );
        runtime.result.splice(idx, 0, ...messages);
        return idx;
      }, "insertAtAnchor")
    };
    if (wrappers.length > 0) {
      let index = -1;
      const dispatch = /* @__PURE__ */ __name(async (step) => {
        if (step <= index) {
          throw new Error(
            "Prompt context middleware called next() twice"
          );
        }
        index = step;
        const current = wrappers[step];
        if (!current) return;
        await current.middleware(context, () => dispatch(step + 1));
      }, "dispatch");
      await dispatch(0);
    }
    if (!context.handled) {
      const messages = toMessages(injection.value);
      if (messages.length > 0) {
        if (injection.afterMessageId || injection.beforeMessageId) {
          context.insertAtAnchor(messages);
        } else {
          runtime.result.push(...messages);
        }
      }
    }
  }
};
function toMessages(input) {
  if (input == null) return [];
  if (Array.isArray(input)) {
    return input.flatMap((item) => toMessages(item));
  }
  if (input instanceof import_messages2.BaseMessage) return [input];
  if (typeof input === "string") {
    if (input.trim().length < 1) return [];
    return [new import_messages2.HumanMessage(input)];
  }
  return [];
}
__name(toMessages, "toMessages");

// src/services/chat.ts
var ChatLunaService = class extends import_koishi4.Service {
  constructor(ctx, config) {
    super(ctx, "chatluna");
    this.ctx = ctx;
    this.config = config;
    this.currentConfig = config;
    this._chain = new ChatChain(ctx, config);
    this._keysCache = new Cache(this.ctx, config, "chatluna/keys");
    this._preset = new import_preset.PresetService(ctx, config);
    this._platformService = new import_service.PlatformService(ctx);
    this._messageTransformer = new MessageTransformer(config);
    this._renderer = new import_koishi_plugin_chatluna3.DefaultRenderer(ctx, config);
    this._promptRenderer = new ChatLunaPromptRenderService();
    this._contextManager = new import_prompt.ChatLunaContextManagerService(ctx);
    this._createTempDir();
    this._defineDatabase();
  }
  static {
    __name(this, "ChatLunaService");
  }
  _plugins = {};
  _chatInterfaceWrapper;
  _chain;
  _keysCache;
  _preset;
  _platformService;
  _messageTransformer;
  _renderer;
  _promptRenderer;
  _contextManager;
  _toolMaskResolvers = {};
  async installPlugin(plugin) {
    const platformName = plugin.platformName;
    if (this._plugins[platformName]) {
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.PLUGIN_ALREADY_REGISTERED,
        new Error(`Plugin ${platformName} already registered`)
      );
    }
    this._plugins[platformName] = plugin;
    this.ctx.logger.success(`Plugin %c installed`, platformName);
  }
  async awaitLoadPlatform(plugin, timeout = 3e4) {
    const pluginName = typeof plugin === "string" ? plugin : plugin.platformName;
    const { promise, resolve, reject } = (0, import_promise.withResolver)();
    const models = this._platformService.listPlatformModels(
      pluginName,
      import_types.ModelType.all
    );
    if (models.value.length > 0) {
      resolve();
      return promise;
    }
    let timeoutError = null;
    try {
      throw new Error(
        `Timeout waiting for platform ${pluginName} to load`
      );
    } catch (e) {
      timeoutError = e;
    }
    const timeoutId = this.ctx.setTimeout(() => {
      reject(timeoutError);
    }, timeout);
    const disposable = (0, import_reactivity.watch)(
      models,
      () => {
        if ((models.value?.length ?? 0) > 0) {
          resolve();
          timeoutId();
          disposable.stop();
        }
      },
      { deep: true }
    );
    this[import_koishi4.Context.origin].effect(() => () => disposable.stop());
    return promise;
  }
  uninstallPlugin(plugin) {
    const platformName = typeof plugin === "string" ? plugin : plugin.platformName;
    const targetPlugin = this._plugins[platformName];
    if (!targetPlugin) {
      return;
    }
    const platform = targetPlugin.platformName;
    this._chatInterfaceWrapper?.dispose(platform);
    delete this._plugins[platform];
    this.ctx.logger.success(
      "Plugin %c uninstalled",
      targetPlugin.platformName
    );
  }
  registerToolMaskResolver(name, resolver) {
    this._toolMaskResolvers[name] = resolver;
    return () => {
      delete this._toolMaskResolvers[name];
    };
  }
  async resolveToolMask(arg) {
    for (const name in this._toolMaskResolvers) {
      const mask = await this._toolMaskResolvers[name](arg);
      if (mask) {
        return mask;
      }
    }
  }
  getPlugin(platformName) {
    return this._plugins[platformName];
  }
  /**
   * @internal
   */
  chat(session, room, message, event, stream = false, variables = {}, postHandler, requestId = (0, import_crypto.randomUUID)(), toolMask) {
    const chatInterfaceWrapper = this._chatInterfaceWrapper ?? this._createChatInterfaceWrapper();
    return chatInterfaceWrapper.chat(
      session,
      room,
      message,
      event,
      stream,
      requestId,
      variables,
      postHandler,
      toolMask
    );
  }
  async stopChat(room, requestId) {
    const chatInterfaceWrapper = this.queryInterfaceWrapper(room, false);
    if (chatInterfaceWrapper == null) {
      return void 0;
    }
    return chatInterfaceWrapper.stopChat(requestId);
  }
  appendPendingMessage(conversationId, message, chatMode) {
    if (this._chatInterfaceWrapper == null) {
      return false;
    }
    return this._chatInterfaceWrapper.appendPendingMessage(
      conversationId,
      message,
      chatMode
    );
  }
  queryInterfaceWrapper(room, autoCreate = true) {
    return this._chatInterfaceWrapper ?? (autoCreate ? this._createChatInterfaceWrapper() : void 0);
  }
  async clearChatHistory(room) {
    const chatBridger = this._chatInterfaceWrapper ?? this._createChatInterfaceWrapper();
    return chatBridger.clearChatHistory(room);
  }
  async compressContext(room, force = false) {
    const chatBridger = this._chatInterfaceWrapper ?? this._createChatInterfaceWrapper();
    return chatBridger.compressContext(room, force);
  }
  getCachedInterfaceWrapper() {
    return this._chatInterfaceWrapper;
  }
  async clearCache(room) {
    const chatBridger = this._chatInterfaceWrapper ?? this._createChatInterfaceWrapper();
    return chatBridger.clearCache(room);
  }
  async createChatModel(platformName, model) {
    const service = this._platformService;
    if (model == null) {
      ;
      [platformName, model] = (0, import_count_tokens.parseRawModelName)(platformName);
    }
    const client = await service.getClient(platformName);
    return (0, import_reactivity.computed)(() => {
      if (client.value == null) {
        return void 0;
      }
      try {
        return client.value.createModel(model);
      } catch (error) {
        this.ctx.logger.warn(`The model ${model} not found`, error);
      }
      return void 0;
    });
  }
  async createEmbeddings(platformName, modelName) {
    const service = this._platformService;
    if (modelName == null) {
      ;
      [platformName, modelName] = (0, import_count_tokens.parseRawModelName)(platformName);
    }
    const client = await service.getClient(platformName);
    return (0, import_reactivity.computed)(() => {
      if (client.value == null) {
        if (platformName !== "无") {
          this.ctx.logger.warn(
            `The platform ${platformName} no available`
          );
        }
        return import_in_memory.emptyEmbeddings;
      }
      try {
        const model = client.value.createModel(modelName);
        if (model instanceof import_model.ChatLunaBaseEmbeddings) {
          return model;
        }
      } catch (error) {
        this.ctx.logger.warn(`The model ${modelName} not found`, error);
      }
      this.ctx.logger.warn(
        `The model ${modelName} is not embeddings, return empty embeddings`
      );
      return import_in_memory.emptyEmbeddings;
    });
  }
  get platform() {
    return this._platformService;
  }
  get cache() {
    return this._keysCache;
  }
  get preset() {
    return this._preset;
  }
  get chatChain() {
    return this._chain;
  }
  get messageTransformer() {
    return this._messageTransformer;
  }
  get renderer() {
    return this._renderer;
  }
  get promptRenderer() {
    return this._promptRenderer;
  }
  get contextManager() {
    return this._contextManager;
  }
  async stop() {
    this._chatInterfaceWrapper?.dispose();
    this._platformService.dispose();
    this._contextManager.clearAll();
  }
  _createTempDir() {
    const tempPath = import_path.default.resolve(this.ctx.baseDir, "data/chatluna/temp");
    if (!import_fs.default.existsSync(tempPath)) {
      import_fs.default.mkdirSync(tempPath, { recursive: true });
    }
  }
  _defineDatabase() {
    const ctx = this.ctx;
    ctx.database.extend(
      "chathub_conversation",
      {
        id: {
          type: "char",
          length: 255
        },
        latestId: {
          type: "char",
          length: 255,
          nullable: true
        },
        additional_kwargs: {
          type: "text",
          nullable: true
        },
        updatedAt: {
          type: "timestamp",
          nullable: false,
          initial: /* @__PURE__ */ new Date()
        }
      },
      {
        autoInc: false,
        primary: "id",
        unique: ["id"]
      }
    );
    ctx.database.extend(
      "chathub_message",
      {
        id: {
          type: "char",
          length: 255
        },
        text: {
          type: "text",
          nullable: true
        },
        content: {
          type: "binary",
          nullable: true
        },
        parent: {
          type: "char",
          length: 255,
          nullable: true
        },
        role: {
          type: "char",
          length: 20
        },
        conversation: {
          type: "char",
          length: 255
        },
        additional_kwargs: {
          type: "text",
          nullable: true
        },
        additional_kwargs_binary: {
          type: "binary",
          nullable: true
        },
        tool_call_id: "string",
        tool_calls: "json",
        name: {
          type: "char",
          length: 255,
          nullable: true
        },
        rawId: {
          type: "char",
          length: 255,
          nullable: true
        }
      },
      {
        autoInc: false,
        primary: "id",
        unique: ["id"]
        /*  foreign: {
            conversation: ['chathub_conversaion', 'id']
        } */
      }
    );
    ctx.database.extend(
      "chathub_room",
      {
        roomId: {
          type: "integer"
        },
        roomName: "string",
        conversationId: {
          type: "char",
          length: 255,
          nullable: true
        },
        roomMasterId: {
          type: "char",
          length: 255
        },
        visibility: {
          type: "char",
          length: 20
        },
        preset: {
          type: "char",
          length: 255
        },
        model: {
          type: "char",
          length: 100
        },
        chatMode: {
          type: "char",
          length: 20
        },
        password: {
          type: "char",
          length: 100
        },
        autoUpdate: {
          type: "boolean",
          initial: false
        },
        updatedTime: {
          type: "timestamp",
          nullable: false,
          initial: /* @__PURE__ */ new Date()
        }
      },
      {
        autoInc: false,
        primary: "roomId",
        unique: ["roomId"]
      }
    );
    ctx.database.extend(
      "chathub_room_member",
      {
        userId: {
          type: "string",
          length: 255
        },
        roomId: {
          type: "integer"
        },
        roomPermission: {
          type: "char",
          length: 50
        },
        mute: {
          type: "boolean",
          initial: false
        }
      },
      {
        autoInc: false,
        primary: ["userId", "roomId"]
      }
    );
    ctx.database.extend(
      "chathub_room_group_member",
      {
        groupId: {
          type: "char",
          length: 255
        },
        roomId: {
          type: "integer"
        },
        roomVisibility: {
          type: "char",
          length: 20
        }
      },
      {
        autoInc: false,
        primary: ["groupId", "roomId"]
      }
    );
    ctx.database.extend(
      "chathub_user",
      {
        userId: {
          type: "char",
          length: 255
        },
        defaultRoomId: {
          type: "integer"
        },
        groupId: {
          type: "char",
          length: 255,
          nullable: true
        }
      },
      {
        autoInc: false,
        primary: ["userId", "groupId"]
      }
    );
    ctx.database.extend(
      "chatluna_docstore",
      {
        key: {
          type: "char",
          length: 255
        },
        id: {
          type: "char",
          length: 255
        },
        pageContent: "text",
        metadata: "json",
        createdAt: "date"
      },
      {
        autoInc: false,
        primary: ["key", "id"]
      }
    );
  }
  _createChatInterfaceWrapper() {
    const chatBridger = new ChatInterfaceWrapper(this);
    this._chatInterfaceWrapper = chatBridger;
    return chatBridger;
  }
  static inject = ["database"];
};
var ChatLunaPlugin = class {
  constructor(ctx, config, platformName, createConfigPool = true) {
    this.ctx = ctx;
    this.config = config;
    this.platformName = platformName;
    ctx.on("dispose", async () => {
      ctx.chatluna.uninstallPlugin(this);
    });
    ctx.on("ready", async () => {
      ctx.chatluna.installPlugin(this);
    });
    if (createConfigPool) {
      if (config == null) {
        const error = new Error("Check Config!");
        this.ctx.scope.cancel(error);
        throw error;
      }
      this.platformConfigPool = new import_config.ClientConfigPool(
        ctx,
        config.configMode === "default" ? import_config.ClientConfigPoolMode.AlwaysTheSame : import_config.ClientConfigPoolMode.LoadBalancing
      );
    }
    this._platformService = ctx.chatluna.platform;
    const models = this._platformService.listPlatformModels(
      this.platformName,
      import_types.ModelType.llm
    );
    const watcher = (0, import_reactivity.watch)(
      models,
      () => {
        this._supportModels = (models.value ?? []).map(
          (model) => `${this.platformName}/${model.name}`
        );
      },
      { deep: true }
    );
    const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
    this.ctx.effect(() => stop);
  }
  static {
    __name(this, "ChatLunaPlugin");
  }
  _supportModels = [];
  platformConfigPool;
  _platformService;
  parseConfig(f) {
    const configs = f(this.config);
    for (const config of configs) {
      this.platformConfigPool.addConfig(config);
    }
  }
  createRunnableConfig() {
    const abortController = new AbortController();
    const abort = /* @__PURE__ */ __name(() => abortController.abort(
      new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.ABORTED, void 0, true)
    ), "abort");
    this.ctx.effect(() => abort);
    return {
      signal: abortController.signal
    };
  }
  async initClient() {
    let notification;
    let result;
    this.ctx.inject(["notifier"], (ctx) => {
      if (notification) return;
      if (result) {
        notification = ctx.notifier.create({
          content: result.content,
          type: result.type
        });
      } else {
        notification = ctx.notifier.create({
          content: `适配器 ${this.platformName} 加载中...`,
          type: "primary"
        });
      }
      ctx.effect(() => () => notification?.dispose());
    });
    try {
      await this._platformService.createClient(
        this.platformName,
        this.createRunnableConfig()
      );
      const content = `适配器 ${this.platformName} 加载成功，共加载了 ${this._supportModels.length} 个模型。`;
      if (notification) {
        notification.update({ content, type: "success" });
      } else {
        result = { type: "success", content };
      }
    } catch (e) {
      const content = `适配器 ${this.platformName} 加载失败: ${e.message}`;
      if (notification) {
        notification.update({ content, type: "danger" });
      } else {
        result = { type: "danger", content };
      }
      this.ctx.chatluna.uninstallPlugin(this);
      this.ctx.scope.cancel(e);
      throw e;
    }
  }
  get supportedModels() {
    return this._supportModels;
  }
  registerToService() {
    try {
      throw new Error("Please remove this method");
    } catch (e) {
      this.ctx.logger.warn(
        `Now the plugin support auto installation, Please remove call this method`,
        e
      );
    }
  }
  registerClient(func, platformName = this.platformName) {
    this.ctx.effect(
      () => this._platformService.registerClient(platformName, func)
    );
  }
  registerVectorStore(name, func) {
    this.ctx.effect(
      () => this._platformService.registerVectorStore(name, func)
    );
  }
  registerTool(name, tool) {
    this.ctx.effect(() => this._platformService.registerTool(name, tool));
  }
  registerChatChainProvider(name, description, func) {
    this.ctx.effect(
      () => this._platformService.registerChatChain(name, description, func)
    );
  }
  registerRenderer(name, renderer) {
    this.ctx.effect(
      () => this.ctx.chatluna.renderer.addRenderer(name, renderer)
    );
  }
  fetch(info, init, proxy) {
    if (proxy != null) {
      return (0, import_request.chatLunaFetch)(info, init, proxy);
    }
    const proxyMode = this.config.proxyMode;
    switch (proxyMode) {
      case "system":
        return (0, import_request.chatLunaFetch)(info, init);
      case "off":
        return (0, import_request.chatLunaFetch)(info, init, "null");
      case "on":
        return (0, import_request.chatLunaFetch)(info, init, this.config.proxyAddress);
      default:
        return (0, import_request.chatLunaFetch)(info, init);
    }
  }
  ws(url, options) {
    const proxyMode = this.config.proxyMode;
    let webSocket;
    switch (proxyMode) {
      case "system":
        webSocket = (0, import_request.ws)(url, options);
        break;
      case "off":
        webSocket = (0, import_request.ws)(url, options, "null");
        break;
      case "on":
        webSocket = (0, import_request.ws)(url, options, this.config.proxyAddress);
        break;
      default:
        webSocket = (0, import_request.ws)(url, options);
        break;
    }
    this.ctx.effect(() => webSocket.close);
    webSocket.on("error", (err) => {
      this.ctx.logger.error(err);
    });
    return webSocket;
  }
};
function createAbortError() {
  return new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.ABORTED, void 0, true);
}
__name(createAbortError, "createAbortError");
var ChatInterfaceWrapper = class {
  constructor(_service) {
    this._service = _service;
    this._platformService = _service.platform;
  }
  static {
    __name(this, "ChatInterfaceWrapper");
  }
  _conversations = new import_lru_cache.LRUCache({
    max: 20
  });
  _modelQueue = new import_queue.RequestIdQueue();
  _conversationQueue = new import_queue.RequestIdQueue();
  _platformService;
  _requestIdMap = /* @__PURE__ */ new Map();
  _activeRequests = /* @__PURE__ */ new Map();
  _platformToConversations = /* @__PURE__ */ new Map();
  async chat(session, room, message, event, stream, requestId, variables = {}, postHandler, toolMask) {
    const { conversationId, model: fullModelName } = room;
    const [platform] = (0, import_count_tokens.parseRawModelName)(fullModelName);
    const client = await this._platformService.getClient(platform);
    if (client.value == null) {
      await this._service.awaitLoadPlatform(platform);
    }
    if (client.value == null) {
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.UNKNOWN_ERROR,
        new Error(`Platform ${platform} is not available`)
      );
    }
    const config = client.value.configPool.getConfig(true).value;
    try {
      await Promise.all([
        this._conversationQueue.add(conversationId, requestId),
        this._modelQueue.add(platform, requestId)
      ]);
      const currentQueueLength = await this._conversationQueue.getQueueLength(conversationId);
      await event["llm-queue-waiting"](currentQueueLength);
      await Promise.all([
        this._conversationQueue.wait(conversationId, requestId, 0),
        this._modelQueue.wait(
          platform,
          requestId,
          config.concurrentMaxSize
        )
      ]);
      const conversationIds = this._platformToConversations.get(platform) ?? [];
      conversationIds.push(conversationId);
      this._platformToConversations.set(platform, conversationIds);
      const { chatInterface } = this._conversations.get(conversationId) ?? await this._createChatInterface(room);
      const abortController = new AbortController();
      const activeRequest = {
        requestId,
        abortController,
        chatMode: room.chatMode,
        messageQueue: new import_agent.MessageQueue(),
        roundDecisionResolvers: []
      };
      this._requestIdMap.set(requestId, abortController);
      this._activeRequests.set(conversationId, activeRequest);
      const humanMessage = new import_messages3.HumanMessage({
        content: message.content,
        name: message.name,
        id: session.userId,
        additional_kwargs: {
          ...message.additional_kwargs,
          preset: room.preset
        }
      });
      const mask = toolMask ?? await this._service.resolveToolMask({
        session,
        room
      });
      const chainValues = await chatInterface.chat({
        message: humanMessage,
        events: event,
        stream,
        conversationId,
        requestId,
        session,
        variables,
        signal: abortController.signal,
        postHandler,
        messageQueue: activeRequest.messageQueue,
        toolMask: mask,
        onAgentEvent: /* @__PURE__ */ __name(async (agentEvent) => {
          if (agentEvent.type === "round-decision") {
            activeRequest.lastDecision = agentEvent.canContinue;
            if (agentEvent.canContinue == null) {
              return;
            }
            for (const resolve of activeRequest.roundDecisionResolvers) {
              resolve(agentEvent.canContinue);
            }
            activeRequest.roundDecisionResolvers = [];
          }
        }, "onAgentEvent")
      });
      const aiMessage = chainValues.message;
      const reasoningContent = aiMessage.additional_kwargs?.reasoning_content;
      const reasoningTime = aiMessage.additional_kwargs?.reasoning_time;
      const usageMetadata = aiMessage.usage_metadata;
      const additionalReplyMessages = [];
      if (reasoningContent != null && reasoningContent.length > 0 && this._service.currentConfig.showThoughtMessage) {
        additionalReplyMessages.push({
          content: reasoningTime != null ? `Thought for ${reasoningTime / 1e3} seconds: 

${reasoningContent}` : `Thought: 

${reasoningContent}`
        });
      }
      if (usageMetadata != null && usageMetadata.total_tokens > 0 && this._service.currentConfig.showThoughtMessage) {
        additionalReplyMessages.push({
          content: formatUsageMetadataMessage(usageMetadata)
        });
      }
      return {
        content: aiMessage.content,
        additionalReplyMessages
      };
    } finally {
      await Promise.all([
        this._modelQueue.remove(platform, requestId),
        this._conversationQueue.remove(conversationId, requestId)
      ]);
      this._requestIdMap.delete(requestId);
      const active = this._activeRequests.get(conversationId);
      if (active?.requestId === requestId) {
        for (const resolve of active.roundDecisionResolvers) {
          resolve(false);
        }
        this._activeRequests.delete(conversationId);
      }
    }
  }
  stopChat(requestId) {
    const abortController = this._requestIdMap.get(requestId);
    if (!abortController) {
      return false;
    }
    abortController.abort(createAbortError());
    this._requestIdMap.delete(requestId);
    return true;
  }
  async appendPendingMessage(conversationId, message, chatMode) {
    if (chatMode != null && chatMode !== "plugin") {
      return false;
    }
    const activeRequest = this._activeRequests.get(conversationId);
    if (activeRequest == null) {
      return false;
    }
    if (activeRequest.chatMode !== "plugin") {
      return false;
    }
    if (activeRequest.lastDecision != null) {
      if (activeRequest.lastDecision) {
        activeRequest.messageQueue.push(message);
      }
      return activeRequest.lastDecision;
    }
    return new Promise((resolve) => {
      activeRequest.roundDecisionResolvers.push((canContinue) => {
        if (canContinue) {
          activeRequest.messageQueue.push(message);
        }
        resolve(canContinue);
      });
    });
  }
  async query(room, create = false) {
    const { conversationId } = room;
    const { chatInterface } = this._conversations.get(conversationId) ?? {};
    if (chatInterface == null && create) {
      return this._createChatInterface(room).then(
        (result) => result.chatInterface
      );
    }
    return chatInterface;
  }
  async clearChatHistory(room) {
    const { conversationId } = room;
    const requestId = (0, import_crypto.randomUUID)();
    try {
      await this._conversationQueue.add(conversationId, requestId);
      await this._conversationQueue.wait(conversationId, requestId, 0);
      const chatInterface = await this.query(room, true);
      await chatInterface.clearChatHistory();
    } finally {
      this._conversations.delete(conversationId);
      await this._conversationQueue.remove(conversationId, requestId);
    }
  }
  async compressContext(room, force = false) {
    const { conversationId, model: fullModelName } = room;
    const requestId = (0, import_crypto.randomUUID)();
    const modelRequestId = (0, import_crypto.randomUUID)();
    const [platform] = (0, import_count_tokens.parseRawModelName)(fullModelName);
    const client = await this._platformService.getClient(platform);
    if (client.value == null) {
      await this._service.awaitLoadPlatform(platform);
    }
    if (client.value == null) {
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.UNKNOWN_ERROR,
        new Error(`Platform ${platform} is not available`)
      );
    }
    const config = client.value.configPool.getConfig(true).value;
    try {
      await Promise.all([
        this._conversationQueue.add(conversationId, requestId),
        this._modelQueue.add(platform, modelRequestId)
      ]);
      await Promise.all([
        this._conversationQueue.wait(conversationId, requestId, 0),
        this._modelQueue.wait(
          platform,
          modelRequestId,
          config.concurrentMaxSize
        )
      ]);
      const chatInterface = await this.query(room, true);
      return await chatInterface.compressContext(force);
    } finally {
      await Promise.all([
        this._conversationQueue.remove(conversationId, requestId),
        this._modelQueue.remove(platform, modelRequestId)
      ]);
    }
  }
  async clearCache(room) {
    const { conversationId } = room;
    const requestId = (0, import_crypto.randomUUID)();
    try {
      await this._conversationQueue.add(conversationId, requestId);
      await this._conversationQueue.wait(conversationId, requestId, 0);
      const chatInterface = await this.query(room);
      await this._service.ctx.root.parallel(
        "chatluna/clear-chat-history",
        conversationId,
        chatInterface
      );
      return this._conversations.delete(conversationId);
    } finally {
      await this._conversationQueue.remove(conversationId, requestId);
    }
  }
  getCachedConversations() {
    return Array.from(this._conversations.entries());
  }
  async delete(room) {
    const { conversationId } = room;
    const requestId = (0, import_crypto.randomUUID)();
    try {
      await this._conversationQueue.add(conversationId, requestId);
      await this._conversationQueue.wait(conversationId, requestId, 1);
      const chatInterface = await this.query(room);
      if (!chatInterface) return;
      await chatInterface.delete(this._service.ctx, room);
      await this.clearCache(room);
    } finally {
      await this._conversationQueue.remove(conversationId, requestId);
    }
  }
  dispose(platform) {
    for (const controller of this._requestIdMap.values()) {
      controller.abort(createAbortError());
    }
    if (!platform) {
      this._conversations.clear();
      this._requestIdMap.clear();
      this._activeRequests.clear();
      this._platformToConversations.clear();
      return;
    }
    const conversationIds = this._platformToConversations.get(platform);
    if (!conversationIds?.length) return;
    for (const conversationId of conversationIds) {
      this._conversations.delete(conversationId);
      this._activeRequests.delete(conversationId);
    }
    this._platformToConversations.delete(platform);
  }
  async _createChatInterface(room) {
    const config = this._service.currentConfig;
    const chatInterface = new import_app.ChatInterface(this._service.ctx.root, {
      chatMode: room.chatMode,
      botName: config.botNames[0],
      preset: this._service.preset.getPreset(room.preset),
      model: room.model,
      conversationId: room.conversationId,
      embeddings: config.defaultEmbeddings && config.defaultEmbeddings.length > 0 ? config.defaultEmbeddings : void 0,
      vectorStoreName: config.defaultVectorStore && config.defaultVectorStore.length > 0 ? config.defaultVectorStore : void 0
    });
    const result = {
      chatInterface,
      room
    };
    this._conversations.set(room.conversationId, result);
    return result;
  }
};
function formatUsageMetadataMessage(usage) {
  const input = [
    ...usage.input_token_details?.audio != null ? [`audio=${usage.input_token_details.audio}`] : [],
    ...usage.input_token_details?.cache_read != null ? [`cache_read=${usage.input_token_details.cache_read}`] : [],
    ...usage.input_token_details?.cache_creation != null ? [`cache_creation=${usage.input_token_details.cache_creation}`] : []
  ];
  const output = [
    ...usage.output_token_details?.audio != null ? [`audio=${usage.output_token_details.audio}`] : [],
    ...usage.output_token_details?.reasoning != null ? [`reasoning=${usage.output_token_details.reasoning}`] : []
  ];
  return [
    "Token usage:",
    `- input: ${usage.input_tokens}`,
    `- output: ${usage.output_tokens}`,
    `- total: ${usage.total_tokens}`,
    ...input.length > 0 ? [`- input details: ${input.join(", ")}`] : [],
    ...output.length > 0 ? [`- output details: ${output.join(", ")}`] : []
  ].join("\n");
}
__name(formatUsageMetadataMessage, "formatUsageMetadataMessage");
((ChatLunaPlugin2) => {
  ChatLunaPlugin2.Config = import_koishi4.Schema.intersect([
    import_koishi4.Schema.object({
      chatConcurrentMaxSize: import_koishi4.Schema.number().min(1).max(8).default(3),
      chatTimeLimit: import_koishi4.Schema.computed(
        import_koishi4.Schema.number().min(1).max(2e3)
      ).default(200),
      configMode: import_koishi4.Schema.union([
        import_koishi4.Schema.const("default"),
        import_koishi4.Schema.const("balance")
      ]).default("default"),
      maxRetries: import_koishi4.Schema.number().min(1).max(6).default(3),
      timeout: import_koishi4.Schema.number().default(300 * 1e3),
      proxyMode: import_koishi4.Schema.union([
        import_koishi4.Schema.const("system"),
        import_koishi4.Schema.const("off"),
        import_koishi4.Schema.const("on")
      ]).default("system")
    }),
    import_koishi4.Schema.union([
      import_koishi4.Schema.object({
        proxyMode: import_koishi4.Schema.const("on").required(),
        proxyAddress: import_koishi4.Schema.string().default("")
      }),
      import_koishi4.Schema.object({
        proxyMode: import_koishi4.Schema.const("off").required()
      }),
      import_koishi4.Schema.object({
        proxyMode: import_koishi4.Schema.const("system")
      })
    ])
  ]).i18n({
    "zh-CN": require_zh_CN_schema_plugin(),
    "en-US": require_en_US_schema_plugin()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  });
})(ChatLunaPlugin || (ChatLunaPlugin = {}));
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatLunaContextManagerService,
  ChatLunaPlugin,
  ChatLunaPromptRenderService,
  ChatLunaService,
  MessageTransformer,
  STAGE_ORDER,
  toMessages
});
