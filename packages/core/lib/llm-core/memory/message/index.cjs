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

// src/llm-core/memory/message/index.ts
var message_exports = {};
__export(message_exports, {
  KoishiChatMessageHistory: () => KoishiChatMessageHistory
});
module.exports = __toCommonJS(message_exports);

// src/llm-core/memory/message/database_history.ts
var import_messages = require("@langchain/core/messages");
var import_chat_history = require("@langchain/core/chat_history");
var import_string = require("koishi-plugin-chatluna/utils/string");
var import_crypto = require("crypto");
async function serializeMessage(message, conversationId, parent) {
  let additionalArgs = Object.assign({}, message.additional_kwargs);
  delete additionalArgs["preset"];
  delete additionalArgs["raw_content"];
  delete additionalArgs["type"];
  if (Object.keys(additionalArgs).length === 0) {
    additionalArgs = null;
  }
  return {
    id: (0, import_crypto.randomUUID)(),
    content: await (0, import_string.gzipEncode)(JSON.stringify(message.content)).then(
      (buf) => (0, import_string.bufferToArrayBuffer)(buf)
    ),
    parent: parent ?? null,
    role: message.getType(),
    name: message.name,
    tool_calls: message["tool_calls"],
    tool_call_id: message["tool_call_id"],
    additional_kwargs_binary: additionalArgs && Object.keys(additionalArgs).length > 0 ? await (0, import_string.gzipEncode)(JSON.stringify(additionalArgs)).then(
      (buf) => (0, import_string.bufferToArrayBuffer)(buf)
    ) : null,
    rawId: message.id ?? null,
    conversation: conversationId
  };
}
__name(serializeMessage, "serializeMessage");
function createAgentToolMessages(steps) {
  return [
    new import_messages.AIMessage({
      content: "",
      tool_calls: steps.map((step) => ({
        id: step.action.toolCallId,
        name: step.action.tool,
        args: typeof step.action.toolInput !== "string" ? step.action.toolInput : { input: step.action.toolInput }
      }))
    }),
    ...steps.map(
      (step) => new import_messages.ToolMessage({
        content: step.observation,
        tool_call_id: step.action.toolCallId,
        name: step.action.tool
      })
    )
  ];
}
__name(createAgentToolMessages, "createAgentToolMessages");
var KoishiChatMessageHistory = class extends import_chat_history.BaseChatMessageHistory {
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
    const humanMessage = new import_messages.HumanMessage(message);
    await this.addMessage(humanMessage);
  }
  async addAIChatMessage(message) {
    const aiMessage = new import_messages.AIMessage(message);
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
        item.additional_kwargs_binary ? await (0, import_string.gzipDecode)(item.additional_kwargs_binary) : item.additional_kwargs ?? "{}"
      );
      let content;
      try {
        content = JSON.parse(
          item.content ? await (0, import_string.gzipDecode)(item.content) : item.text
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
        return new import_messages.SystemMessage(fields);
      } else if (item.role === "human") {
        return new import_messages.HumanMessage(fields);
      } else if (item.role === "ai") {
        return new import_messages.AIMessage(fields);
      } else if (item.role === "function") {
        return new import_messages.FunctionMessage(fields);
      } else if (item.role === "tool") {
        return new import_messages.ToolMessage(fields);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  KoishiChatMessageHistory
});
