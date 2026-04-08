var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/llm-core/memory/message/database_history.ts
import {
  AIMessage as AIMessage2,
  FunctionMessage as FunctionMessage2,
  HumanMessage as HumanMessage2,
  SystemMessage as SystemMessage2,
  ToolMessage as ToolMessage2
} from "@langchain/core/messages";
import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import {
  bufferToArrayBuffer,
  gzipDecode,
  gzipEncode
} from "koishi-plugin-chatluna/utils/string";
import { randomUUID } from "crypto";

// src/llm-core/memory/message/history_attachment.ts
import {
  AIMessage,
  FunctionMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage
} from "@langchain/core/messages";
var HISTORY_ATTACHMENT_REF_KEY = "qqbot_attachment_refs";
var RAW_ATTACHMENT_KWARG_KEYS = ["images", "__file_total_size"];
function normalizeText(value) {
  return String(value ?? "").trim();
}
__name(normalizeText, "normalizeText");
function isTextPart(part) {
  return part != null && typeof part === "object" && part.type === "text" && typeof part.text === "string";
}
__name(isTextPart, "isTextPart");
function toContentParts(content) {
  if (content == null) {
    return [];
  }
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content }] : [];
  }
  return Array.isArray(content) ? content.filter(Boolean) : [];
}
__name(toContentParts, "toContentParts");
function normalizeAttachmentRef(input) {
  if (input == null || typeof input !== "object") {
    return null;
  }
  const candidate = input;
  const refId = normalizeText(candidate.refId);
  const kind = normalizeText(candidate.kind);
  if (!refId || !kind) {
    return null;
  }
  return {
    refId,
    kind,
    filename: normalizeText(candidate.filename) || null,
    mimeType: normalizeText(candidate.mimeType) || null,
    storageFileId: normalizeText(candidate.storageFileId) || null,
    storageUrl: normalizeText(candidate.storageUrl) || null,
    byteSize: typeof candidate.byteSize === "number" && Number.isFinite(candidate.byteSize) ? candidate.byteSize : null,
    hash: normalizeText(candidate.hash) || null,
    createdAt: typeof candidate.createdAt === "number" && Number.isFinite(candidate.createdAt) ? candidate.createdAt : null,
    senderId: normalizeText(candidate.senderId) || null,
    senderName: normalizeText(candidate.senderName) || null
  };
}
__name(normalizeAttachmentRef, "normalizeAttachmentRef");
function normalizeAttachmentRefs(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  const result = [];
  for (const item of value) {
    const ref = normalizeAttachmentRef(item);
    if (!ref || seen.has(ref.refId)) {
      continue;
    }
    seen.add(ref.refId);
    result.push(ref);
  }
  return result;
}
__name(normalizeAttachmentRefs, "normalizeAttachmentRefs");
function mergeAttachmentRefs(base, incoming) {
  const merged = /* @__PURE__ */ new Map();
  for (const ref of [...base, ...incoming]) {
    if (!ref?.refId) {
      continue;
    }
    merged.set(ref.refId, {
      ...merged.get(ref.refId) ?? {},
      ...ref
    });
  }
  return Array.from(merged.values());
}
__name(mergeAttachmentRefs, "mergeAttachmentRefs");
function formatAttachmentMarker(ref) {
  const fields = [`ref=${ref.refId}`, `kind=${ref.kind}`];
  if (ref.filename) {
    fields.push(`name=${JSON.stringify(ref.filename)}`);
  }
  return `[attachment ${fields.join(" ")}]`;
}
__name(formatAttachmentMarker, "formatAttachmentMarker");
function formatFallbackMarker(kind) {
  return `[attachment kind=${kind}]`;
}
__name(formatFallbackMarker, "formatFallbackMarker");
function buildFallbackMarkers(parts) {
  const markers = /* @__PURE__ */ new Set();
  for (const part of parts) {
    if (part == null || typeof part !== "object" || part.type === "text") {
      continue;
    }
    const type = normalizeText(part.type);
    if (!type) {
      continue;
    }
    if (type === "image_url") {
      markers.add(formatFallbackMarker("image"));
    } else if (type === "audio_url") {
      markers.add(formatFallbackMarker("audio"));
    } else if (type === "video_url") {
      markers.add(formatFallbackMarker("video"));
    } else if (type === "file_url") {
      markers.add(formatFallbackMarker("file"));
    }
  }
  return Array.from(markers);
}
__name(buildFallbackMarkers, "buildFallbackMarkers");
function sanitizeTextContent(text, refs) {
  let result = text;
  for (const ref of refs) {
    if (ref.storageUrl) {
      result = result.split(ref.storageUrl).join(ref.refId);
    }
  }
  return result.trim();
}
__name(sanitizeTextContent, "sanitizeTextContent");
function sanitizeHistoryContent(content, refs) {
  if (typeof content === "string") {
    const text = sanitizeTextContent(content, refs);
    if (!text && refs.length > 0) {
      return refs.map(formatAttachmentMarker).join("\n");
    }
    if (text && refs.length > 0 && !refs.every((ref) => text.includes(ref.refId))) {
      return `${text}
${refs.map(formatAttachmentMarker).join("\n")}`;
    }
    return text;
  }
  const parts = toContentParts(content);
  const textParts = parts.filter(isTextPart).map((part) => part.text);
  const baseText = sanitizeTextContent(textParts.join(""), refs);
  const markers = refs.length > 0 ? refs.map(formatAttachmentMarker) : buildFallbackMarkers(parts);
  if (!baseText) {
    return markers.join("\n");
  }
  if (markers.length < 1) {
    return baseText;
  }
  const hasAllRefMarkers = refs.length > 0 && refs.every((ref) => baseText.includes(ref.refId));
  if (hasAllRefMarkers) {
    return baseText;
  }
  return `${baseText}
${markers.join("\n")}`.trim();
}
__name(sanitizeHistoryContent, "sanitizeHistoryContent");
function sanitizeHistoryAdditionalKwargs(additionalKwargs, refs) {
  const kwargs = Object.assign({}, additionalKwargs ?? {});
  for (const key of RAW_ATTACHMENT_KWARG_KEYS) {
    delete kwargs[key];
  }
  if (refs.length > 0) {
    kwargs[HISTORY_ATTACHMENT_REF_KEY] = refs;
  } else {
    delete kwargs[HISTORY_ATTACHMENT_REF_KEY];
  }
  return kwargs;
}
__name(sanitizeHistoryAdditionalKwargs, "sanitizeHistoryAdditionalKwargs");
function cloneMessageWithFields(message, content, additionalKwargs) {
  const candidate = message;
  const fields = {
    content,
    id: message.id ?? void 0,
    name: message.name ?? void 0,
    additional_kwargs: additionalKwargs
  };
  if (candidate.response_metadata != null) {
    fields.response_metadata = Object.assign({}, candidate.response_metadata);
  }
  if (candidate.usage_metadata != null) {
    fields.usage_metadata = candidate.usage_metadata;
  }
  if (message.getType() === "ai") {
    fields.tool_calls = message.tool_calls;
    return new AIMessage(fields);
  }
  if (message.getType() === "tool") {
    fields.tool_call_id = message.tool_call_id;
    return new ToolMessage(fields);
  }
  if (message.getType() === "function") {
    return new FunctionMessage(fields);
  }
  if (message.getType() === "system") {
    return new SystemMessage(fields);
  }
  return new HumanMessage(fields);
}
__name(cloneMessageWithFields, "cloneMessageWithFields");
async function collectArchivedRefs(ctx, conversationId, message) {
  const attachmentArchiver = ctx.qqbotAttachment;
  if (attachmentArchiver?.archiveMessageAttachments == null) {
    return [];
  }
  try {
    const archived = await attachmentArchiver.archiveMessageAttachments({
      conversationId,
      message
    });
    if (Array.isArray(archived)) {
      return normalizeAttachmentRefs(archived);
    }
    if (archived != null && typeof archived === "object") {
      return normalizeAttachmentRefs(archived.refs);
    }
  } catch (error) {
    ctx.logger.warn(
      `Failed to archive message attachments for %s: %s`,
      conversationId,
      error.message
    );
  }
  return [];
}
__name(collectArchivedRefs, "collectArchivedRefs");
async function prepareMessageForHistory(ctx, conversationId, message) {
  const existingRefs = normalizeAttachmentRefs(
    message.additional_kwargs?.[HISTORY_ATTACHMENT_REF_KEY]
  );
  const archivedRefs = await collectArchivedRefs(ctx, conversationId, message);
  const refs = mergeAttachmentRefs(existingRefs, archivedRefs);
  const content = sanitizeHistoryContent(message.content, refs);
  const additionalKwargs = sanitizeHistoryAdditionalKwargs(
    message.additional_kwargs,
    refs
  );
  return cloneMessageWithFields(message, content, additionalKwargs);
}
__name(prepareMessageForHistory, "prepareMessageForHistory");
function sanitizeLoadedHistoryFields(content, additionalKwargs) {
  const refs = normalizeAttachmentRefs(additionalKwargs?.[HISTORY_ATTACHMENT_REF_KEY]);
  return {
    content: sanitizeHistoryContent(content, refs),
    additionalKwargs: sanitizeHistoryAdditionalKwargs(additionalKwargs, refs)
  };
}
__name(sanitizeLoadedHistoryFields, "sanitizeLoadedHistoryFields");

// src/llm-core/memory/message/database_history.ts
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
    new AIMessage2({
      content: "",
      tool_calls: steps.map((step) => ({
        id: step.action.toolCallId,
        name: step.action.tool,
        args: typeof step.action.toolInput !== "string" ? step.action.toolInput : { input: step.action.toolInput }
      }))
    }),
    ...steps.map(
      (step) => new ToolMessage2({
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
    const humanMessage = new HumanMessage2(message);
    await this.addMessage(humanMessage);
  }
  async addAIChatMessage(message) {
    const aiMessage = new AIMessage2(message);
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
    const preparedMessages = [];
    let parent = this._latestId;
    for (const message of messages) {
      const preparedMessage = await prepareMessageForHistory(
        this._ctx,
        this.conversationId,
        message
      );
      const serializedMessage = await serializeMessage(
        preparedMessage,
        this.conversationId,
        parent
      );
      serializedMessages.push(serializedMessage);
      preparedMessages.push(preparedMessage);
      parent = serializedMessage.id;
    }
    await this._ctx.database.upsert("chathub_message", serializedMessages);
    this._serializedChatHistory.push(...serializedMessages);
    this._chatHistory.push(...preparedMessages);
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
            new AIMessage2(normalizedText2),
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
        new AIMessage2(normalizedText),
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
      const sanitizedFields = sanitizeLoadedHistoryFields(
        content,
        args
      );
      const fields = {
        content: sanitizedFields.content,
        id: item.rawId ?? void 0,
        name: item.name ?? void 0,
        tool_calls: item.tool_calls ?? void 0,
        tool_call_id: item.tool_call_id ?? void 0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        additional_kwargs: sanitizedFields.additionalKwargs
      };
      if (item.role === "system") {
        return new SystemMessage2(fields);
      } else if (item.role === "human") {
        return new HumanMessage2(fields);
      } else if (item.role === "ai") {
        return new AIMessage2(fields);
      } else if (item.role === "function") {
        return new FunctionMessage2(fields);
      } else if (item.role === "tool") {
        return new ToolMessage2(fields);
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
