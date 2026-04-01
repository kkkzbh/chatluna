var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/chains/index.ts
var chains_exports = {};
__export(chains_exports, {
  ChainMiddleware: () => ChainMiddleware,
  ChainMiddlewareRunStatus: () => ChainMiddlewareRunStatus,
  ChatChain: () => ChatChain,
  addConversationRoomToGroup: () => addConversationRoomToGroup,
  checkAdmin: () => checkAdmin,
  checkConversationRoomAvailability: () => checkConversationRoomAvailability,
  createConversationRoom: () => createConversationRoom,
  deleteConversationRoom: () => deleteConversationRoom,
  deleteConversationRoomByRoomId: () => deleteConversationRoomByRoomId,
  fixConversationRoomAvailability: () => fixConversationRoomAvailability,
  getAllJoinedConversationRoom: () => getAllJoinedConversationRoom,
  getConversationRoomCount: () => getConversationRoomCount,
  getConversationRoomUser: () => getConversationRoomUser,
  getTemplateConversationRoom: () => getTemplateConversationRoom,
  joinConversationRoom: () => joinConversationRoom,
  kickUserFromConversationRoom: () => kickUserFromConversationRoom,
  leaveConversationRoom: () => leaveConversationRoom,
  muteUserFromConversationRoom: () => muteUserFromConversationRoom,
  queryConversationRoom: () => queryConversationRoom,
  queryJoinedConversationRoom: () => queryJoinedConversationRoom,
  queryPublicConversationRoom: () => queryPublicConversationRoom,
  queryPublicConversationRooms: () => queryPublicConversationRooms,
  resolveConversationRoom: () => resolveConversationRoom,
  setUserPermission: () => setUserPermission,
  switchConversationRoom: () => switchConversationRoom,
  transferConversationRoom: () => transferConversationRoom,
  updateChatTime: () => updateChatTime
});
module.exports = __toCommonJS(chains_exports);

// src/chains/chain.ts
var import_events = require("events");
var import_koishi = require("koishi");
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
      if (state?.chatluna?.suppressErrorNotice === true) {
        return;
      }
      if (state?.qqReplyTransport?.suppressErrorNotice === true) {
        return;
      }
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
    const dfs = /* @__PURE__ */ __name((node, path) => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        if (cycleStart !== -1) {
          const cycle = path.slice(cycleStart).concat([node]);
          cycles.push(cycle);
        }
        return;
      }
      if (visited.has(node)) {
        return;
      }
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      const deps = this._dependencies.get(node) || /* @__PURE__ */ new Set();
      for (const dep of deps) {
        dfs(dep, [...path]);
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
      (0, import_koishi.h)("message", { forward: true }, ...sendMessages)
    );
  }
  convertToForwardMessages(messages) {
    const firstMsg = messages[0];
    if (Array.isArray(firstMsg)) {
      return messages.map((msg) => (0, import_koishi.h)("message", ...msg));
    }
    if (typeof firstMsg === "object") {
      return [(0, import_koishi.h)("message", ...messages)];
    }
    if (typeof firstMsg === "string") {
      return [import_koishi.h.text(firstMsg)];
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
    const quote = (0, import_koishi.h)("quote", { id: session.messageId });
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
      return [import_koishi.h.text(message)];
    }
    return [message];
  }
  getMessageText(message) {
    return message.map((element) => {
      if (typeof element === "string") {
        return element;
      }
      if (Array.isArray(element)) {
        return import_koishi.h.select(element, "text").toString();
      }
      return element.toString();
    }).join(" ");
  }
};
var ChainMiddlewareRunStatus = /* @__PURE__ */ ((ChainMiddlewareRunStatus2) => {
  ChainMiddlewareRunStatus2[ChainMiddlewareRunStatus2["SKIPPED"] = 0] = "SKIPPED";
  ChainMiddlewareRunStatus2[ChainMiddlewareRunStatus2["STOP"] = 1] = "STOP";
  ChainMiddlewareRunStatus2[ChainMiddlewareRunStatus2["CONTINUE"] = 2] = "CONTINUE";
  return ChainMiddlewareRunStatus2;
})(ChainMiddlewareRunStatus || {});
function isElementArray(value) {
  return Array.isArray(value) && value.every(
    (item) => typeof item === "object" && item.attrs && item.type
  );
}
__name(isElementArray, "isElementArray");

// src/chains/rooms.ts
var import_crypto = require("crypto");
var import_koishi2 = require("koishi");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_error2 = require("koishi-plugin-chatluna/utils/error");
var import_chunk = require("koishi-plugin-chatluna/llm-core/utils/chunk");
async function queryJoinedConversationRoom(ctx, session, name) {
  if (name != null) {
    const joinedRooms = await getAllJoinedConversationRoom(ctx, session);
    return joinedRooms.find(
      (it) => it.roomName === name || it.roomId === parseInt(name)
    );
  }
  const userRoomInfoList = await ctx.database.get("chathub_user", {
    userId: session.userId,
    groupId: session.isDirect ? "0" : session.guildId
  });
  if (userRoomInfoList.length > 1) {
    throw new import_error2.ChatLunaError(
      import_error2.ChatLunaErrorCode.UNKNOWN_ERROR,
      new Error("User has multiple default rooms, this is impossible!")
    );
  } else if (userRoomInfoList.length === 0) {
    return void 0;
  }
  const userRoomInfo = userRoomInfoList[0];
  return await resolveConversationRoom(ctx, userRoomInfo.defaultRoomId);
}
__name(queryJoinedConversationRoom, "queryJoinedConversationRoom");
function queryPublicConversationRooms(ctx, session) {
  if (session.isDirect) {
    return Promise.resolve([]);
  }
  return ctx.database.get("chathub_room_group_member", {
    groupId: session.guildId,
    roomVisibility: {
      // TODO: better type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      $in: ["template_clone", "public"]
      //    $in: ['template_clone', 'public']
    }
  });
}
__name(queryPublicConversationRooms, "queryPublicConversationRooms");
async function queryPublicConversationRoom(ctx, session) {
  const groupRoomInfoList = await queryPublicConversationRooms(ctx, session);
  const templateCloneRoom = groupRoomInfoList.find(
    (it) => it.roomVisibility === "template_clone"
  );
  let roomId;
  if (templateCloneRoom != null) {
    roomId = templateCloneRoom.roomId;
  } else if (groupRoomInfoList.length < 1) {
    return void 0;
  } else if (groupRoomInfoList.length === 1) {
    roomId = groupRoomInfoList[0].roomId;
  } else {
    const groupRoomInfo = groupRoomInfoList[(0, import_crypto.randomInt)(groupRoomInfoList.length)];
    roomId = groupRoomInfo.roomId;
  }
  const room = await resolveConversationRoom(ctx, roomId);
  if (room == null && roomId !== 0) {
    await deleteConversationRoomByRoomId(ctx, roomId);
    return void 0;
  }
  await joinConversationRoom(ctx, session, room);
  return room;
}
__name(queryPublicConversationRoom, "queryPublicConversationRoom");
async function checkConversationRoomAvailability(ctx, room) {
  const platformService = ctx.chatluna.platform;
  const presetService = ctx.chatluna.preset;
  if (room.model == null) {
    return false;
  }
  const [platformName, modelName] = (0, import_count_tokens.parseRawModelName)(room.model);
  if (platformName == null || modelName == null) {
    return false;
  }
  const platformModels = platformService.listPlatformModels(
    platformName,
    import_types.ModelType.llm
  ).value;
  if (platformModels.length < 1) {
    return false;
  }
  if (!platformModels.some((it) => it.name === modelName)) {
    return false;
  }
  if (!presetService.getPreset(room.preset, false).value) {
    return false;
  }
  return true;
}
__name(checkConversationRoomAvailability, "checkConversationRoomAvailability");
async function fixConversationRoomAvailability(ctx, config, room) {
  const platformService = ctx.chatluna.platform;
  const presetService = ctx.chatluna.preset;
  const [platformName, modelName] = (0, import_count_tokens.parseRawModelName)(room.model);
  const platformModels = platformService.listPlatformModels(
    platformName,
    import_types.ModelType.llm
  ).value;
  if (platformModels.length < 1) {
    room.model = (await getTemplateConversationRoom(ctx, config)).model;
  } else if (!platformModels.some((it) => it.name === modelName)) {
    room.model = platformName + "/" + platformModels[0].name;
  }
  if (!presetService.getPreset(room.preset, false).value) {
    room.preset = presetService.getDefaultPreset().value.triggerKeyword[0];
  }
  await ctx.database.upsert("chathub_room", [room]);
  return await checkConversationRoomAvailability(ctx, room);
}
__name(fixConversationRoomAvailability, "fixConversationRoomAvailability");
async function getTemplateConversationRoom(ctx, config) {
  const models = ctx.chatluna.platform.listAllModels(import_types.ModelType.llm);
  config = ctx.scope.parent.config;
  const selectModelAndPreset = /* @__PURE__ */ __name(async () => {
    if (config.defaultModel === "无" || config.defaultModel == null || config.defaultModel === "") {
      const model = models.value.find(
        (model2) => model2.name.includes("nano") || model2.name.includes("flash") || model2.name.includes("mini")
      ) ?? models.value[0];
      config.defaultModel = model?.toModelName();
    } else {
      const [platformName, modelName] = (0, import_count_tokens.parseRawModelName)(
        config.defaultModel
      );
      const platformModels = ctx.chatluna.platform.listPlatformModels(
        platformName,
        import_types.ModelType.llm
      ).value;
      if (platformModels.length < 1) {
        const model = models.value.find(
          (model2) => model2.name.includes("nano") || model2.name.includes("flash") || model2.name.includes("mini")
        ) ?? models.value[0];
        config.defaultModel = model?.toModelName();
      } else if (!platformModels.some((model) => model.name === modelName)) {
        const modelInfo = platformModels.find(
          (model) => model.name === modelName
        );
        if (modelInfo == null) {
          config.defaultModel = null;
        } else {
          const model = platformName + "/" + modelInfo.name;
          config.defaultModel = model;
        }
      }
    }
    if (config.defaultPreset == null) {
      const preset = ctx.chatluna.preset.getDefaultPreset().value;
      config.defaultPreset = preset.triggerKeyword[0];
    }
    ctx.scope.parent.scope.update(config, true);
  }, "selectModelAndPreset");
  if (config.defaultChatMode == null || config.defaultModel === "无" || config.defaultModel == null || config.defaultPreset == null) {
    if (config.defaultChatMode == null) {
      throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_TEMPLATE_INVALID);
    }
    await selectModelAndPreset();
  }
  let room = {
    roomId: 0,
    roomName: "模板房间",
    roomMasterId: "0",
    preset: config.defaultPreset,
    conversationId: "0",
    chatMode: config.defaultChatMode,
    password: "",
    model: config.defaultModel,
    visibility: "public",
    autoUpdate: true,
    updatedTime: /* @__PURE__ */ new Date()
  };
  if (!await checkConversationRoomAvailability(ctx, room)) {
    await selectModelAndPreset();
    room = {
      roomId: 0,
      roomName: "模板房间",
      roomMasterId: "0",
      preset: config.defaultPreset,
      conversationId: "0",
      chatMode: config.defaultChatMode,
      password: "",
      model: config.defaultModel,
      visibility: "public",
      autoUpdate: true,
      updatedTime: /* @__PURE__ */ new Date()
    };
  }
  return room;
}
__name(getTemplateConversationRoom, "getTemplateConversationRoom");
async function getConversationRoomCount(ctx) {
  const count = await ctx.database.select("chathub_room").execute((row) => import_koishi2.$.max(row.roomId));
  return count;
}
__name(getConversationRoomCount, "getConversationRoomCount");
async function transferConversationRoom(ctx, session, room, userId) {
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_FOUND);
  }
  await ctx.database.upsert("chathub_room", [
    { roomId: room.roomId, roomMasterId: userId }
  ]);
  const oldMaster = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    roomPermission: "owner"
  });
  if (oldMaster.length === 1) {
    await ctx.database.upsert("chathub_room_member", [
      {
        userId: oldMaster[0].userId,
        roomId: room.roomId,
        roomPermission: "member"
      }
    ]);
  } else {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_FOUND_MASTER);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, roomPermission: "owner" }
  ]);
  await ctx.database.upsert("chathub_user", [
    {
      userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
}
__name(transferConversationRoom, "transferConversationRoom");
async function switchConversationRoom(ctx, session, id) {
  let joinedRoom = await getAllJoinedConversationRoom(ctx, session);
  const parsedId = typeof id === "number" ? id : parseInt(id);
  let room = joinedRoom.find((it) => it.roomId === parsedId);
  if (room != null) {
    await ctx.database.upsert("chathub_user", [
      {
        userId: session.userId,
        defaultRoomId: room.roomId,
        groupId: session.isDirect ? "0" : session.guildId
      }
    ]);
    return room;
  }
  joinedRoom = joinedRoom.filter((it) => it.roomName === id);
  if (joinedRoom.length > 1) {
    throw new import_error2.ChatLunaError(
      import_error2.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
    );
  } else if (joinedRoom.length === 0) {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_FOUND);
  } else {
    room = joinedRoom[0];
  }
  await ctx.database.upsert("chathub_user", [
    {
      userId: session.userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
  return room;
}
__name(switchConversationRoom, "switchConversationRoom");
async function getAllJoinedConversationRoom(ctx, session, queryAll = false) {
  const conversationRoomList = (0, import_chunk.chunkArray)(
    await ctx.database.get("chathub_room_member", {
      userId: session.userId
    }),
    35
  );
  const rooms = [];
  for (const conversationRoomChunk of conversationRoomList) {
    const roomIds = conversationRoomChunk.map((it) => it.roomId);
    const roomList = await ctx.database.get("chathub_room", {
      roomId: { $in: roomIds }
    });
    let memberList = [];
    if (queryAll === false) {
      memberList = await ctx.database.get("chathub_room_group_member", {
        roomId: { $in: roomIds },
        // 设置 undefined 来全量搜索
        groupId: session.guildId ?? void 0
      });
    }
    for (const room of roomList) {
      const memberOfTheRoom = memberList.some(
        (it) => it.roomId === room.roomId
      );
      if (
        // 模版克隆房间或者公共房间需要指定房间的范围不能干预到私聊的
        !session.isDirect && memberOfTheRoom || // 同上
        session.isDirect && room.visibility !== "template_clone" || // 私有房间跨群
        room.visibility === "private" || // 模版克隆房间需要指定非群聊
        room.visibility === "template_clone" && !session.isDirect && !memberOfTheRoom || queryAll === true
      ) {
        rooms.push(room);
      }
    }
  }
  return rooms;
}
__name(getAllJoinedConversationRoom, "getAllJoinedConversationRoom");
async function leaveConversationRoom(ctx, session, room) {
  await ctx.database.remove("chathub_room_member", {
    userId: session.userId,
    roomId: room.roomId
  });
  await ctx.database.remove("chathub_user", {
    userId: session.userId,
    defaultRoomId: room.roomId,
    groupId: session.isDirect ? "0" : session.guildId
  });
}
__name(leaveConversationRoom, "leaveConversationRoom");
async function queryConversationRoom(ctx, session, name) {
  const roomId = typeof name === "number" ? name : parseInt(name);
  const roomName = typeof name === "string" ? name : void 0;
  const roomList = Number.isNaN(roomId) ? await ctx.database.get("chathub_room", { roomName }) : await ctx.database.get("chathub_room", { roomId });
  if (roomList.length === 1) {
    return roomList[0];
  } else if (roomList.length > 1) {
    if (session.isDirect || Number.isNaN(roomId)) {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
      );
    }
    const groupRoomList = await ctx.database.get(
      "chathub_room_group_member",
      {
        groupId: session.guildId,
        roomId: { $in: roomList.map((it) => it.roomId) }
      }
    );
    if (groupRoomList.length === 1) {
      return roomList.find((it) => it.roomId === groupRoomList[0].roomId);
    } else if (groupRoomList.length > 1) {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
      );
    }
  } else if (roomList.length === 0) {
    return void 0;
  }
}
__name(queryConversationRoom, "queryConversationRoom");
async function resolveConversationRoom(ctx, roomId) {
  const roomList = await ctx.database.get("chathub_room", { roomId });
  if (roomList.length > 1) {
    throw new import_error2.ChatLunaError(
      import_error2.ChatLunaErrorCode.THE_NAME_FIND_IN_MULTIPLE_ROOMS
    );
  } else if (roomList.length === 0) {
    return void 0;
  }
  return roomList[0];
}
__name(resolveConversationRoom, "resolveConversationRoom");
async function deleteConversationRoom(ctx, room) {
  const chatBridger = ctx.chatluna.queryInterfaceWrapper(room, false);
  await chatBridger?.clearChatHistory(room);
  await deleteConversationRoomByRoomId(ctx, room.roomId);
  await ctx.database.remove("chathub_message", {
    conversation: room.conversationId
  });
  await ctx.database.remove("chathub_conversation", {
    id: room.conversationId
  });
}
__name(deleteConversationRoom, "deleteConversationRoom");
async function deleteConversationRoomByRoomId(ctx, roomId) {
  await ctx.database.remove("chathub_room", { roomId });
  await ctx.database.remove("chathub_room_member", { roomId });
  await ctx.database.remove("chathub_room_group_member", { roomId });
  await ctx.database.remove("chathub_user", { defaultRoomId: roomId });
}
__name(deleteConversationRoomByRoomId, "deleteConversationRoomByRoomId");
async function joinConversationRoom(ctx, session, roomId, isDirect = session.isDirect, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  await ctx.database.upsert("chathub_user", [
    {
      userId,
      defaultRoomId: room.roomId,
      groupId: session.isDirect ? "0" : session.guildId
    }
  ]);
  if (isDirect === false) {
    const groupMemberList = await ctx.database.get(
      "chathub_room_group_member",
      { groupId: session.guildId, roomId: room.roomId }
    );
    if (groupMemberList.length === 0) {
      await ctx.database.create("chathub_room_group_member", {
        groupId: session.guildId,
        roomId: room.roomId,
        roomVisibility: room.visibility
      });
    }
  }
  const memberList = await ctx.database.get("chathub_room_member", {
    userId,
    roomId: room.roomId
  });
  if (memberList.length === 0) {
    await ctx.database.create("chathub_room_member", {
      userId,
      roomId: room.roomId,
      roomPermission: userId === room.roomMasterId ? "owner" : "member"
    });
  }
}
__name(joinConversationRoom, "joinConversationRoom");
async function getConversationRoomUser(ctx, session, roomId, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  return memberList?.[0];
}
__name(getConversationRoomUser, "getConversationRoomUser");
async function setUserPermission(ctx, session, roomId, permission, userId = session.userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_FOUND);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, roomPermission: permission }
  ]);
}
__name(setUserPermission, "setUserPermission");
async function addConversationRoomToGroup(ctx, session, roomId, groupId = session.guildId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_group_member", {
    roomId: room.roomId,
    groupId
  });
  if (memberList.length === 0) {
    await ctx.database.create("chathub_room_group_member", {
      roomId: room.roomId,
      groupId,
      roomVisibility: room.visibility
    });
  }
}
__name(addConversationRoomToGroup, "addConversationRoomToGroup");
async function muteUserFromConversationRoom(ctx, session, roomId, userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_JOINED);
  }
  await ctx.database.upsert("chathub_room_member", [
    { userId, roomId: room.roomId, mute: memberList[0].mute !== true }
  ]);
}
__name(muteUserFromConversationRoom, "muteUserFromConversationRoom");
async function kickUserFromConversationRoom(ctx, session, roomId, userId) {
  const room = typeof roomId === "number" ? await resolveConversationRoom(ctx, roomId) : roomId;
  const memberList = await ctx.database.get("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  if (memberList.length === 0) {
    throw new import_error2.ChatLunaError(import_error2.ChatLunaErrorCode.ROOM_NOT_JOINED);
  }
  await ctx.database.remove("chathub_room_member", {
    roomId: room.roomId,
    userId
  });
  await ctx.database.remove("chathub_user", {
    userId,
    defaultRoomId: room.roomId
  });
}
__name(kickUserFromConversationRoom, "kickUserFromConversationRoom");
async function checkAdmin(session) {
  const tested = await session.app.permissions.test("chatluna:admin", session);
  if (tested) {
    return true;
  }
  const user = await session.getUser(session.userId, [
    "authority"
  ]);
  return user?.authority >= 3;
}
__name(checkAdmin, "checkAdmin");
async function updateChatTime(ctx, room) {
  await ctx.database.upsert("chathub_room", [
    { roomId: room.roomId, updatedTime: /* @__PURE__ */ new Date() }
  ]);
}
__name(updateChatTime, "updateChatTime");
async function createConversationRoom(ctx, session, room) {
  await ctx.database.create("chathub_room", room);
  await ctx.database.create("chathub_room_member", {
    userId: session.userId,
    roomId: room.roomId,
    roomPermission: session.userId === room.roomMasterId ? "owner" : "member"
  });
  await joinConversationRoom(ctx, session, room);
}
__name(createConversationRoom, "createConversationRoom");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChainMiddleware,
  ChainMiddlewareRunStatus,
  ChatChain,
  addConversationRoomToGroup,
  checkAdmin,
  checkConversationRoomAvailability,
  createConversationRoom,
  deleteConversationRoom,
  deleteConversationRoomByRoomId,
  fixConversationRoomAvailability,
  getAllJoinedConversationRoom,
  getConversationRoomCount,
  getConversationRoomUser,
  getTemplateConversationRoom,
  joinConversationRoom,
  kickUserFromConversationRoom,
  leaveConversationRoom,
  muteUserFromConversationRoom,
  queryConversationRoom,
  queryJoinedConversationRoom,
  queryPublicConversationRoom,
  queryPublicConversationRooms,
  resolveConversationRoom,
  setUserPermission,
  switchConversationRoom,
  transferConversationRoom,
  updateChatTime
});
