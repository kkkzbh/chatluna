var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/llm-core/memory/message/database_history.ts
import {
  AIMessage,
  FunctionMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import {
  bufferToArrayBuffer,
  gzipDecode,
  gzipEncode
} from "koishi-plugin-chatluna/utils/string";
import { randomUUID } from "crypto";
async function serializeMessage(message, conversationId, parent) {
  let additionalArgs = Object.assign({}, message.additional_kwargs);
  delete additionalArgs["preset"];
  delete additionalArgs["raw_content"];
  delete additionalArgs["type"];
  if (Object.keys(additionalArgs).length === 0) {
    additionalArgs = null;
  }
  return {
    id: randomUUID(),
    content: await gzipEncode(JSON.stringify(message.content)).then(
      (buf) => bufferToArrayBuffer(buf)
    ),
    parent: parent ?? null,
    role: message.getType(),
    name: message.name,
    tool_calls: message["tool_calls"],
    tool_call_id: message["tool_call_id"],
    additional_kwargs_binary: additionalArgs && Object.keys(additionalArgs).length > 0 ? await gzipEncode(JSON.stringify(additionalArgs)).then(
      (buf) => bufferToArrayBuffer(buf)
    ) : null,
    rawId: message.id ?? null,
    conversation: conversationId
  };
}
__name(serializeMessage, "serializeMessage");
function createAgentToolMessages(steps) {
  return [
    new AIMessage({
      content: "",
      tool_calls: steps.map((step) => ({
        id: step.action.toolCallId,
        name: step.action.tool,
        args: typeof step.action.toolInput !== "string" ? step.action.toolInput : { input: step.action.toolInput }
      }))
    }),
    ...steps.map(
      (step) => new ToolMessage({
        content: step.observation,
        tool_call_id: step.action.toolCallId,
        name: step.action.tool
      })
    )
  ];
}
__name(createAgentToolMessages, "createAgentToolMessages");
function isReplyAgentTailRole(role) {
  return role === "ai" || role === "tool" || role === "function";
}
__name(isReplyAgentTailRole, "isReplyAgentTailRole");
function isConversationBoundaryRole(role) {
  return role === "human" || role === "system";
}
__name(isConversationBoundaryRole, "isConversationBoundaryRole");
var INTERNAL_ADDITIONAL_ARG_PREFIX = "__chatluna_internal_";
var TOOL_MEMORY_STORAGE_KEY = `${INTERNAL_ADDITIONAL_ARG_PREFIX}tool_memory_v1`;
var DEFAULT_TOOL_MEMORY_MAX_ENTRIES = 3;
var TOOL_MEMORY_SNIPPET_MAX_CHARS = 1200;
var TOOL_MEMORY_INPUT_DIGEST_MAX_CHARS = 240;
function truncateText(value, maxChars) {
  if (value.length <= maxChars) {
    return value;
  }
  return `${value.slice(0, maxChars - 1)}…`;
}
__name(truncateText, "truncateText");
function stableStringify(value) {
  if (typeof value === "string") {
    return value.trim();
  }
  try {
    return JSON.stringify(value, null, 2).trim();
  } catch {
    return String(value ?? "").trim();
  }
}
__name(stableStringify, "stableStringify");
function isSemanticallyEmptySnippet(snippet) {
  if (!snippet) {
    return true;
  }
  if (["[]", "{}", "null", '""'].includes(snippet)) {
    return true;
  }
  try {
    const parsed = JSON.parse(snippet);
    if (Array.isArray(parsed)) {
      return parsed.length === 0;
    }
    if (parsed != null && typeof parsed === "object" && Object.keys(parsed).length === 0) {
      return true;
    }
  } catch {
  }
  return false;
}
__name(isSemanticallyEmptySnippet, "isSemanticallyEmptySnippet");
function serializeToolObservation(observation) {
  if (typeof observation === "string") {
    const snippet = observation.trim();
    if (isSemanticallyEmptySnippet(snippet)) {
      return null;
    }
    return {
      snippetFormat: "text",
      snippet: truncateText(snippet, TOOL_MEMORY_SNIPPET_MAX_CHARS)
    };
  }
  if (Array.isArray(observation)) {
    if (observation.length === 0) {
      return null;
    }
    const snippet = stableStringify(observation);
    if (isSemanticallyEmptySnippet(snippet)) {
      return null;
    }
    return {
      snippetFormat: "json",
      snippet: truncateText(snippet, TOOL_MEMORY_SNIPPET_MAX_CHARS)
    };
  }
  return null;
}
__name(serializeToolObservation, "serializeToolObservation");
function parseToolMemoryEntries(raw) {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((entry) => {
    if (entry == null || typeof entry !== "object") {
      return null;
    }
    const candidate = entry;
    const turnId = String(candidate.turnId ?? "").trim();
    const createdAt = String(candidate.createdAt ?? "").trim();
    const toolName = String(candidate.toolName ?? "").trim();
    const inputDigest = String(candidate.inputDigest ?? "").trim();
    const snippetFormat = candidate.snippetFormat === "json" ? "json" : "text";
    const snippet = String(candidate.snippet ?? "").trim();
    const freshnessHint = String(candidate.freshnessHint ?? "").trim();
    if (!turnId || !createdAt || !toolName || !snippet) {
      return null;
    }
    return {
      turnId,
      createdAt,
      toolName,
      inputDigest,
      snippetFormat,
      snippet,
      freshnessHint: freshnessHint || createdAt
    };
  }).filter((entry) => entry != null);
}
__name(parseToolMemoryEntries, "parseToolMemoryEntries");
function mergeToolMemoryEntries(currentEntries, newEntries, maxEntries) {
  const merged = [...currentEntries];
  for (const entry of newEntries) {
    const duplicateIndex = merged.findIndex(
      (item) => item.toolName === entry.toolName && item.inputDigest === entry.inputDigest
    );
    if (duplicateIndex >= 0) {
      merged.splice(duplicateIndex, 1);
    }
    merged.unshift(entry);
  }
  return merged.slice(0, maxEntries);
}
__name(mergeToolMemoryEntries, "mergeToolMemoryEntries");
function buildToolMemoryEntriesFromSteps(steps, options) {
  const createdAt = (options.createdAt ?? /* @__PURE__ */ new Date()).toISOString();
  const finishToolName = options.finishToolName?.trim().toLowerCase();
  const entries = [];
  for (const step of steps) {
    if (step.outcome !== "success") {
      continue;
    }
    const toolName = step.action.tool?.trim();
    if (!toolName) {
      continue;
    }
    if (finishToolName != null && toolName.toLowerCase() === finishToolName) {
      continue;
    }
    const serialized = serializeToolObservation(step.observation);
    if (serialized == null) {
      continue;
    }
    entries.push({
      turnId: options.turnId,
      createdAt,
      toolName,
      inputDigest: truncateText(
        stableStringify(step.action.toolInput),
        TOOL_MEMORY_INPUT_DIGEST_MAX_CHARS
      ),
      snippetFormat: serialized.snippetFormat,
      snippet: serialized.snippet,
      freshnessHint: createdAt
    });
  }
  return entries;
}
__name(buildToolMemoryEntriesFromSteps, "buildToolMemoryEntriesFromSteps");
var KoishiChatMessageHistory = class extends BaseChatMessageHistory {
  constructor(ctx, conversationId, _maxMessagesCount) {
    super();
    this._maxMessagesCount = _maxMessagesCount;
    this.conversationId = conversationId;
    this._ctx = ctx;
    this._chatHistory = [];
    this._additional_kwargs = {};
    this._updatedAt = /* @__PURE__ */ new Date(0);
  }
  static {
    __name(this, "KoishiChatMessageHistory");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  lc_namespace = ["llm-core", "memory", "message"];
  conversationId;
  _ctx;
  _latestId;
  _serializedChatHistory;
  _chatHistory;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  _additional_kwargs;
  _updatedAt;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  get additionalArgs() {
    return this._additional_kwargs;
  }
  async getMessages() {
    const latestUpdateTime = await this.getLatestUpdateTime();
    if (latestUpdateTime > this._updatedAt || this._chatHistory.length === 0) {
      this._chatHistory = await this._loadMessages();
    }
    return this._chatHistory;
  }
  async addUserMessage(message) {
    const humanMessage = new HumanMessage(message);
    await this.addMessage(humanMessage);
  }
  async addAIChatMessage(message) {
    const aiMessage = new AIMessage(message);
    await this.addMessage(aiMessage);
  }
  async addMessage(message) {
    await this.addMessages([message]);
  }
  async addMessages(messages) {
    if (messages.length === 0) {
      return;
    }
    await this.loadConversation();
    const serializedMessages = [];
    let parent = this._latestId;
    for (const message of messages) {
      const serializedMessage = await serializeMessage(
        message,
        this.conversationId,
        parent
      );
      serializedMessages.push(serializedMessage);
      parent = serializedMessage.id;
    }
    await this._ctx.database.upsert("chathub_message", serializedMessages);
    this._serializedChatHistory.push(...serializedMessages);
    this._chatHistory.push(...messages);
    this._latestId = serializedMessages[serializedMessages.length - 1].id;
    const updatedAt = /* @__PURE__ */ new Date();
    await this._trimMessages();
    this._updatedAt = updatedAt;
    await this._saveConversation(updatedAt);
  }
  async addAgentToolBatch(steps) {
    if (steps.length === 0) {
      return;
    }
    await this.addMessages(createAgentToolMessages(steps));
  }
  async normalizeResearchReplyHistory(finalVisibleText, updatedAt = /* @__PURE__ */ new Date()) {
    await this.loadConversation();
    const latestId = this._latestId;
    if (latestId == null) {
      throw new Error(
        `research reply history normalization failed: conversation has no latestId (${this.conversationId})`
      );
    }
    const messageMap = new Map(
      this._serializedChatHistory.map((message) => [message.id, message])
    );
    let current = messageMap.get(latestId);
    if (!current) {
      throw new Error(
        `research reply history normalization failed: latest message missing (${this.conversationId})`
      );
    }
    const deletedMessageIds = [];
    let boundaryParentId = null;
    const latestRole = current.role;
    while (current) {
      if (isConversationBoundaryRole(current.role)) {
        boundaryParentId = current.id;
        break;
      }
      if (!isReplyAgentTailRole(current.role)) {
        throw new Error(
          `research reply history normalization failed: unsupported tail role ${String(current.role ?? "")} (${this.conversationId})`
        );
      }
      deletedMessageIds.push(current.id);
      if (current.parent == null) {
        current = void 0;
        break;
      }
      const parent = messageMap.get(current.parent);
      if (!parent) {
        throw new Error(
          `research reply history normalization failed: broken parent chain at ${current.id} (${this.conversationId})`
        );
      }
      current = parent;
    }
    if (deletedMessageIds.length === 0) {
      if (isConversationBoundaryRole(latestRole)) {
        const normalizedText2 = finalVisibleText.trim();
        let normalizedMessageId2 = null;
        if (normalizedText2.length > 0) {
          const normalizedMessage = await serializeMessage(
            new AIMessage(normalizedText2),
            this.conversationId,
            boundaryParentId
          );
          normalizedMessageId2 = normalizedMessage.id;
          await this._ctx.database.upsert("chathub_message", [
            normalizedMessage
          ]);
        }
        this._latestId = normalizedMessageId2 ?? boundaryParentId;
        this._updatedAt = updatedAt;
        await this._saveConversation(updatedAt);
        this._chatHistory = await this._loadMessages();
        return {
          deletedMessageIds,
          latestId: this._latestId,
          normalizedMessageId: normalizedMessageId2,
          normalizedText: normalizedText2
        };
      }
      throw new Error(
        `research reply history normalization failed: no research tail found (${this.conversationId})`
      );
    }
    const normalizedText = finalVisibleText.trim();
    await this._ctx.database.remove("chathub_message", {
      id: deletedMessageIds
    });
    let normalizedMessageId = null;
    if (normalizedText.length > 0) {
      const normalizedMessage = await serializeMessage(
        new AIMessage(normalizedText),
        this.conversationId,
        boundaryParentId
      );
      normalizedMessageId = normalizedMessage.id;
      await this._ctx.database.upsert("chathub_message", [
        normalizedMessage
      ]);
    }
    this._latestId = normalizedMessageId ?? boundaryParentId;
    this._updatedAt = updatedAt;
    await this._saveConversation(updatedAt);
    this._chatHistory = await this._loadMessages();
    return {
      deletedMessageIds,
      latestId: this._latestId,
      normalizedMessageId,
      normalizedText
    };
  }
  async clear() {
    await this._ctx.database.remove("chathub_message", {
      conversation: this.conversationId
    });
    await this._ctx.database.upsert("chathub_conversation", [
      {
        id: this.conversationId,
        latestId: null
      }
    ]);
    this._serializedChatHistory = [];
    this._chatHistory = [];
    this._latestId = null;
  }
  async delete() {
    await this._ctx.database.remove("chathub_conversation", {
      id: this.conversationId
    });
  }
  async updateAdditionalArg(key, value) {
    await this.loadConversation();
    this._additional_kwargs[key] = value;
    await this._saveConversation();
  }
  async getAdditionalArg(key) {
    await this.loadConversation();
    return this._additional_kwargs[key];
  }
  async getAdditionalArgs() {
    await this.loadConversation();
    return this._additional_kwargs;
  }
  async deleteAdditionalArg(key) {
    await this.loadConversation();
    delete this._additional_kwargs[key];
    await this._saveConversation();
  }
  async storeToolMemoryEntries(entries, options = {}) {
    if (entries.length === 0) {
      return;
    }
    await this.loadConversation();
    const storageKey = options.storageKey ?? TOOL_MEMORY_STORAGE_KEY;
    const maxEntries = Math.max(
      1,
      Math.floor(options.maxEntries ?? DEFAULT_TOOL_MEMORY_MAX_ENTRIES)
    );
    const currentEntries = parseToolMemoryEntries(
      this._additional_kwargs[storageKey]
    );
    const nextEntries = mergeToolMemoryEntries(
      currentEntries,
      entries,
      maxEntries
    );
    this._additional_kwargs[storageKey] = JSON.stringify(nextEntries);
    await this._saveConversation();
  }
  async removeAllToolAndFunctionMessages() {
    await this.loadConversation();
    const toolAndFunctionMessages = this._serializedChatHistory.filter(
      (msg) => msg.role === "tool" || msg.role === "function"
    );
    if (toolAndFunctionMessages.length === 0) {
      return;
    }
    const messageIds = toolAndFunctionMessages.map((msg) => msg.id);
    await this._ctx.database.remove("chathub_message", {
      id: messageIds
    });
    this._serializedChatHistory = this._serializedChatHistory.filter(
      (msg) => msg.role !== "tool" && msg.role !== "function"
    );
    for (let i = 0; i < this._serializedChatHistory.length; i++) {
      const currentMsg = this._serializedChatHistory[i];
      const prevMsg = this._serializedChatHistory[i - 1];
      if (prevMsg) {
        currentMsg.parent = prevMsg.id;
      } else {
        currentMsg.parent = null;
      }
    }
    if (this._serializedChatHistory.length > 0) {
      const updatedMessages = this._serializedChatHistory.map((msg) => ({
        id: msg.id,
        parent: msg.parent,
        content: msg.content,
        role: msg.role,
        conversation: msg.conversation,
        name: msg.name,
        tool_call_id: msg.tool_call_id,
        tool_calls: msg.tool_calls,
        additional_kwargs_binary: msg.additional_kwargs_binary,
        rawId: msg.rawId
      }));
      await this._ctx.database.upsert("chathub_message", updatedMessages);
      this._latestId = this._serializedChatHistory[this._serializedChatHistory.length - 1].id;
    } else {
      this._latestId = null;
    }
    await this._saveConversation();
    this._chatHistory = await this._loadMessages();
  }
  async overrideAdditionalArgs(kwargs) {
    await this.loadConversation();
    this._additional_kwargs = Object.assign(this._additional_kwargs, kwargs);
    await this._saveConversation();
  }
  async getLatestUpdateTime() {
    const conversation = (await this._ctx.database.get(
      "chathub_conversation",
      {
        id: this.conversationId
      },
      ["updatedAt"]
    ))?.[0];
    return conversation?.updatedAt ?? /* @__PURE__ */ new Date(0);
  }
  async _loadMessages() {
    const queried = await this._ctx.database.get("chathub_message", {
      conversation: this.conversationId
    });
    const sorted = [];
    let currentMessageId = this._latestId;
    let isBad = false;
    if (currentMessageId == null && queried.length > 0) {
      isBad = true;
    }
    while (currentMessageId != null && !isBad) {
      const currentMessage = queried.find(
        (item) => item.id === currentMessageId
      );
      if (!currentMessage) {
        isBad = true;
        break;
      }
      sorted.unshift(currentMessage);
      currentMessageId = currentMessage.parent;
    }
    if (isBad) {
      this._ctx.logger.warn(
        `Bad conversation detected for %s`,
        this.conversationId
      );
      sorted.length = 0;
      await this.clear();
    }
    this._serializedChatHistory = sorted;
    const promises = sorted.map(async (item) => {
      const args = JSON.parse(
        item.additional_kwargs_binary ? await gzipDecode(item.additional_kwargs_binary) : item.additional_kwargs ?? "{}"
      );
      let content;
      try {
        content = JSON.parse(
          item.content ? await gzipDecode(item.content) : item.text
        );
      } catch {
        this._ctx.logger.warn(
          `Failed to deserialize message content for %s in %s, using fallback text.`,
          item.id,
          this.conversationId
        );
        content = typeof item.text === "string" ? item.text : "";
      }
      const fields = {
        content,
        id: item.rawId ?? void 0,
        name: item.name ?? void 0,
        tool_calls: item.tool_calls ?? void 0,
        tool_call_id: item.tool_call_id ?? void 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additional_kwargs: args
      };
      if (item.role === "system") {
        return new SystemMessage(fields);
      } else if (item.role === "human") {
        return new HumanMessage(fields);
      } else if (item.role === "ai") {
        return new AIMessage(fields);
      } else if (item.role === "function") {
        return new FunctionMessage(fields);
      } else if (item.role === "tool") {
        return new ToolMessage(fields);
      } else {
        throw new Error("Unknown role");
      }
    });
    return await Promise.all(promises);
  }
  async _loadConversation() {
    const conversation = (await this._ctx.database.get("chathub_conversation", {
      id: this.conversationId
    }))?.[0];
    if (conversation) {
      this._latestId = conversation.latestId;
      this._additional_kwargs = conversation.additional_kwargs != null ? JSON.parse(conversation.additional_kwargs) : {};
    } else {
      await this._ctx.database.create("chathub_conversation", {
        id: this.conversationId
      });
    }
    if (!this._serializedChatHistory) {
      await this._loadMessages();
      this._updatedAt = conversation?.updatedAt ?? /* @__PURE__ */ new Date(0);
    }
  }
  async loadConversation() {
    if (!this._serializedChatHistory) {
      await this._loadConversation();
    }
  }
  async _trimMessages() {
    if (this._serializedChatHistory.length > this._maxMessagesCount) {
      const toDeleted = this._serializedChatHistory.splice(
        0,
        this._serializedChatHistory.length - this._maxMessagesCount
      );
      while (this._serializedChatHistory[0] != null && ["ai", "function", "tool"].includes(
        this._serializedChatHistory[0].role
      )) {
        const message = this._serializedChatHistory.shift();
        if (message) {
          toDeleted.push(message);
        }
      }
      await this._ctx.database.remove("chathub_message", {
        id: toDeleted.map((item) => item.id)
      });
      const firstMessage = this._serializedChatHistory[0];
      this._latestId = this._serializedChatHistory[this._serializedChatHistory.length - 1]?.id ?? null;
      if (firstMessage) {
        firstMessage.parent = null;
        await this._ctx.database.upsert("chathub_message", [
          firstMessage
        ]);
      }
      this._chatHistory = await this._loadMessages();
    }
  }
  async _saveConversation(time = /* @__PURE__ */ new Date()) {
    const hasKwargs = this._additional_kwargs && Object.keys(this._additional_kwargs).length > 0;
    await this._ctx.database.upsert("chathub_conversation", [
      {
        id: this.conversationId,
        latestId: this._latestId,
        additional_kwargs: hasKwargs ? JSON.stringify(this._additional_kwargs) : null,
        updatedAt: time
      }
    ]);
  }
};
export {
  DEFAULT_TOOL_MEMORY_MAX_ENTRIES,
  INTERNAL_ADDITIONAL_ARG_PREFIX,
  KoishiChatMessageHistory,
  TOOL_MEMORY_STORAGE_KEY,
  buildToolMemoryEntriesFromSteps,
  parseToolMemoryEntries
};
