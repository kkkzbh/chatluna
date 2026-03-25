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

// src/llm-core/chat/app.ts
var app_exports = {};
__export(app_exports, {
  ChatInterface: () => ChatInterface
});
module.exports = __toCommonJS(app_exports);
var import_reactivity2 = require("@vue/reactivity");
var import_count_tokens2 = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_langchain = require("koishi-plugin-chatluna/llm-core/memory/langchain");
var import_koishi_plugin_chatluna3 = require("koishi-plugin-chatluna");
var import_message = require("koishi-plugin-chatluna/llm-core/memory/message");
var import_string3 = require("koishi-plugin-chatluna/utils/string");
var import_error3 = require("koishi-plugin-chatluna/utils/error");

// src/llm-core/chat/helper.ts
var import_messages = require("@langchain/core/messages");
var import_reactivity = require("@vue/reactivity");
var import_koishi_plugin_chatluna = require("koishi-plugin-chatluna");
var import_in_memory = require("koishi-plugin-chatluna/llm-core/model/in_memory");
var import_client = require("koishi-plugin-chatluna/llm-core/platform/client");
var import_model = require("koishi-plugin-chatluna/llm-core/platform/model");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
var import_count_tokens = require("koishi-plugin-chatluna/llm-core/utils/count_tokens");
var import_error = require("koishi-plugin-chatluna/utils/error");
function createDisplayResponse(responseMessage) {
  const msg = new import_messages.AIMessage({
    content: responseMessage.content
  });
  msg.additional_kwargs = responseMessage.additional_kwargs;
  return msg;
}
__name(createDisplayResponse, "createDisplayResponse");
async function initEmbeddings(service, model) {
  const [platform, modelName] = (0, import_count_tokens.parseRawModelName)(model);
  if (model == null || model.length < 1 || model === "无") {
    return (0, import_reactivity.computed)(() => import_in_memory.emptyEmbeddings);
  }
  const clientRef = await service.getClient(platform);
  return (0, import_reactivity.computed)(() => {
    const client = clientRef.value;
    import_koishi_plugin_chatluna.logger.info(`Init embeddings for %c`, model);
    if (client == null || client instanceof import_client.PlatformModelClient) {
      import_koishi_plugin_chatluna.logger.warn(
        `Platform ${platform} is not supported, falling back to fake embeddings`
      );
      return import_in_memory.emptyEmbeddings;
    }
    if (client instanceof import_client.PlatformEmbeddingsClient) {
      return client.createModel(modelName);
    }
    if (client instanceof import_client.PlatformModelAndEmbeddingsClient) {
      const ref = client.createModel(modelName);
      if (ref instanceof import_model.ChatLunaChatModel) {
        import_koishi_plugin_chatluna.logger.warn(
          `Model ${modelName} is not an embeddings model, falling back to fake embeddings`
        );
        return import_in_memory.emptyEmbeddings;
      }
      return ref;
    }
    return import_in_memory.emptyEmbeddings;
  });
}
__name(initEmbeddings, "initEmbeddings");
async function initModel(ctx, service, llmPlatform, llmModelName) {
  const llmInfo = service.findModel(llmPlatform, llmModelName);
  const llmModel = await ctx.chatluna.createChatModel(
    llmPlatform,
    llmModelName
  );
  if (llmModel.value instanceof import_model.ChatLunaChatModel) {
    return [llmModel, llmInfo];
  }
  throw new import_error.ChatLunaError(
    import_error.ChatLunaErrorCode.MODEL_INIT_ERROR,
    new Error(`Model ${llmModelName} is not a chat model`)
  );
}
__name(initModel, "initModel");
function supportChatMode(modelInfo, chatMode) {
  if (!modelInfo.capabilities.includes(import_types.ModelCapabilities.ToolCall) && chatMode === "plugin") {
    return false;
  }
  return true;
}
__name(supportChatMode, "supportChatMode");

// src/llm-core/chat/infinite_context.ts
var import_messages2 = require("@langchain/core/messages");
var import_koishi_plugin_chatluna2 = require("koishi-plugin-chatluna");
var import_string2 = require("koishi-plugin-chatluna/utils/string");

// src/llm-core/chain/infinite_context_chain.ts
var import_prompts = require("@langchain/core/prompts");
var import_base = require("koishi-plugin-chatluna/llm-core/chain/base");
var import_error2 = require("koishi-plugin-chatluna/utils/error");
var import_string = require("koishi-plugin-chatluna/utils/string");
var ChatLunaInfiniteContextChain = class _ChatLunaInfiniteContextChain extends import_base.ChatLunaLLMChainWrapper {
  static {
    __name(this, "ChatLunaInfiniteContextChain");
  }
  historyMemory;
  chain;
  constructor({
    historyMemory,
    chain
  }) {
    super();
    this.historyMemory = historyMemory;
    this.chain = chain;
  }
  static fromLLM(llm, { historyMemory }) {
    const prompt = import_prompts.PromptTemplate.fromTemplate(`You are a helpful AI assistant tasked with summarizing conversations.

When asked to summarize, provide a detailed but concise summary of the conversation.
Focus on information that would be helpful for continuing the conversation, including:
- What was done
- What is currently being worked on
- Which files are being modified
- What needs to be done next
- Key user requests, constraints, or preferences that should persist
- Important technical decisions and why they were made

Your summary should be comprehensive enough to provide context but concise enough to be quickly understood.

Do not respond to any questions in the conversation, only output the summary.

Conversation:
{conversation_chunk}`);
    const chain = new import_base.ChatLunaLLMChain({ llm, prompt });
    return new _ChatLunaInfiniteContextChain({
      historyMemory,
      chain
    });
  }
  async compressChunk({
    chunk,
    conversationId,
    signal
  }) {
    const trimmedChunk = chunk?.trim();
    if (!trimmedChunk) {
      return null;
    }
    const result = await this.chain.invoke({
      conversation_chunk: trimmedChunk,
      id: conversationId,
      stream: false,
      signal
    });
    const rawMessage = result["message"] ?? null;
    const text = (result["text"] ?? "").toString().trim() || (rawMessage ? (0, import_string.getMessageContent)(rawMessage.content).trim() : "");
    if (!text) {
      return null;
    }
    return {
      text,
      usageMetadata: rawMessage?.usage_metadata
    };
  }
  async call(arg) {
    const chunk = arg["chunk"] ?? (0, import_string.getMessageContent)(arg.message.content);
    if (!chunk?.trim()) {
      throw new import_error2.ChatLunaError(
        import_error2.ChatLunaErrorCode.UNKNOWN_ERROR,
        new Error(
          "Empty context chunk passed to Infinite Context chain"
        )
      );
    }
    return this.chain.invoke({
      conversation_chunk: chunk,
      id: arg.conversationId,
      stream: arg.stream,
      signal: arg.signal,
      maxTokens: arg.maxToken
    });
  }
  get model() {
    return this.chain.llm;
  }
};

// src/llm-core/chat/infinite_context.ts
function formatTranscript(messages) {
  return messages.map((message) => {
    const role = message.getType().toUpperCase();
    const name = message.name ? ` (${message.name})` : "";
    const content = (0, import_string2.getMessageContent)(message.content).trim();
    return `[${role}${name}]
${content || "(empty)"}`;
  }).join("\n\n---\n\n");
}
__name(formatTranscript, "formatTranscript");
var InfiniteContextManager = class {
  constructor(options) {
    this.options = options;
  }
  static {
    __name(this, "InfiniteContextManager");
  }
  _chain;
  async compressIfNeeded(wrapper, force = false) {
    const model = wrapper.model;
    if (!model) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        reducedTokens: 0,
        reducedPercent: 0,
        compressed: false
      };
    }
    const messages = await this.options.chatHistory.getMessages();
    if (messages.length === 0) {
      return {
        inputTokens: 0,
        outputTokens: 0,
        reducedTokens: 0,
        reducedPercent: 0,
        compressed: false
      };
    }
    const inputTokens = await this._countMessagesTokens(model, messages);
    let presetTokens = 0;
    let threshold;
    if (!force) {
      const invocation = model.invocationParams();
      const maxTokenLimit = invocation.maxTokenLimit && invocation.maxTokenLimit > 0 ? invocation.maxTokenLimit : model.getModelMaxContextSize();
      if (!maxTokenLimit || maxTokenLimit <= 0) {
        return {
          inputTokens,
          outputTokens: inputTokens,
          reducedTokens: 0,
          reducedPercent: 0,
          compressed: false
        };
      }
      const presetMessages = Array.isArray(
        this.options.preset?.value?.messages
      ) ? this.options.preset?.value.messages : [];
      presetTokens = await this._countMessagesTokens(
        model,
        presetMessages
      );
      threshold = Math.floor(
        maxTokenLimit * (this.options.threshold ?? 0.85)
      );
      if (inputTokens + presetTokens <= threshold) {
        return {
          inputTokens,
          outputTokens: inputTokens,
          reducedTokens: 0,
          reducedPercent: 0,
          compressed: false
        };
      }
      import_koishi_plugin_chatluna2.logger.info(
        "[InfiniteContext] Start compression with history tokens: %d, total tokens: %d, threshold: %d",
        inputTokens,
        inputTokens + presetTokens,
        threshold
      );
    } else {
      import_koishi_plugin_chatluna2.logger.info(
        "[InfiniteContext] Start manual compression with history tokens: %d",
        inputTokens
      );
    }
    const transcript = formatTranscript(messages);
    if (!transcript.trim()) {
      return {
        inputTokens,
        outputTokens: inputTokens,
        reducedTokens: 0,
        reducedPercent: 0,
        compressed: false
      };
    }
    const summary = await this._ensureInfiniteContextChain(
      wrapper
    ).compressChunk({
      chunk: transcript,
      conversationId: this.options.conversationId
    });
    if (!summary?.text.trim()) {
      return {
        inputTokens,
        outputTokens: inputTokens,
        reducedTokens: 0,
        reducedPercent: 0,
        compressed: false
      };
    }
    const message = new import_messages2.HumanMessage({
      content: summary.text.trim(),
      name: "infinite_context",
      additional_kwargs: {
        source: "infinite-context"
      }
    });
    await this._rewriteChatHistory([message]);
    const outputTokens = summary.usageMetadata?.output_tokens ?? 0;
    const reducedTokens = inputTokens - outputTokens;
    const reducedPercent = inputTokens > 0 ? reducedTokens / inputTokens * 100 : 0;
    import_koishi_plugin_chatluna2.logger.info(
      "[InfiniteContext] Compressed history from %d to %d (-%d, %s%%)",
      inputTokens,
      outputTokens,
      reducedTokens,
      reducedPercent.toFixed(2)
    );
    if (threshold != null && outputTokens + presetTokens > threshold) {
      import_koishi_plugin_chatluna2.logger.warn(
        "[InfiniteContext] Tokens remain above threshold after compression: %d > %d",
        outputTokens + presetTokens,
        threshold
      );
    }
    return {
      inputTokens,
      outputTokens,
      reducedTokens,
      reducedPercent,
      compressed: true
    };
  }
  async _rewriteChatHistory(messages) {
    const additionalArgs = {
      ...await this.options.chatHistory.getAdditionalArgs()
    };
    await this.options.chatHistory.clear();
    for (const message of messages) {
      await this.options.chatHistory.addMessage(message);
    }
    if (Object.keys(additionalArgs).length > 0) {
      await this.options.chatHistory.overrideAdditionalArgs(
        additionalArgs
      );
    }
    await this.options.chatHistory.loadConversation();
  }
  async _countMessagesTokens(model, messages) {
    let total = 0;
    for (const message of messages) {
      total += await model.countMessageTokens(message);
    }
    return total;
  }
  _ensureInfiniteContextChain(wrapper) {
    if (!this._chain || this._chain.model !== wrapper.model) {
      this._chain = ChatLunaInfiniteContextChain.fromLLM(wrapper.model, {
        historyMemory: wrapper.historyMemory
      });
    }
    return this._chain;
  }
};

// src/llm-core/chat/app.ts
function filterPromptVisibleAdditionalArgs(additionalArgs) {
  return Object.fromEntries(
    Object.entries(additionalArgs).filter(
      ([key]) => !key.startsWith(import_message.INTERNAL_ADDITIONAL_ARG_PREFIX)
    )
  );
}
__name(filterPromptVisibleAdditionalArgs, "filterPromptVisibleAdditionalArgs");
var ChatInterface = class {
  constructor(ctx, input) {
    this.ctx = ctx;
    this._input = input;
    ctx.on("dispose", () => {
      this._chain = void 0;
      this._embeddings = void 0;
      this._historyMemory = void 0;
      this._infiniteContextManager = void 0;
    });
  }
  static {
    __name(this, "ChatInterface");
  }
  _input;
  _chatHistory;
  _chain;
  _embeddings;
  _historyMemory;
  _infiniteContextManager;
  _chatCount = 0;
  async handleChatError(arg, wrapper, error, throwError = true) {
    await this.ctx.parallel(
      "chatluna/after-chat-error",
      error,
      arg.conversationId,
      arg.message,
      arg.variables,
      this,
      wrapper,
      arg.requestId
    );
    if (!throwError) {
      return;
    }
    if (error instanceof import_error3.ChatLunaError && error.errorCode === import_error3.ChatLunaErrorCode.API_UNSAFE_CONTENT) {
      throw error;
    }
    if (error instanceof import_error3.ChatLunaError) {
      throw error;
    }
    throw new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.UNKNOWN_ERROR, error);
  }
  async chat(arg) {
    let wrapper;
    try {
      wrapper = await this.getChatLunaLLMChainWrapper();
    } catch (error) {
      await this.handleChatError(arg, wrapper, error);
      throw error;
    }
    try {
      arg.variables = arg.variables ?? {};
      await this.ctx.parallel(
        "chatluna/before-chat",
        arg.conversationId,
        arg.message,
        arg.variables,
        this,
        arg.session
      );
    } catch (error) {
      import_koishi_plugin_chatluna3.logger.error("Something went wrong when calling before-chat hook:");
      import_koishi_plugin_chatluna3.logger.error(error);
    }
    try {
      const additionalArgs = filterPromptVisibleAdditionalArgs(
        await this._chatHistory.getAdditionalArgs()
      );
      arg.variables = arg.variables ?? {};
      if (arg.postHandler?.variables) {
        for (const key in arg.postHandler.variables) {
          arg.variables[key] = "";
        }
      }
      arg.variables = { ...additionalArgs, ...arg.variables };
      const response = await this.processChat(arg, wrapper);
      return response;
    } catch (error) {
      await this.handleChatError(arg, wrapper, error);
    }
  }
  async processChat(arg, wrapper) {
    let hasSavedUser = false;
    const historyPolicy = wrapper.getHistoryPersistencePolicy();
    const collectedToolSteps = [];
    const saveUser = /* @__PURE__ */ __name(async () => {
      if (hasSavedUser) {
        return;
      }
      await this._chatHistory.addMessage(arg.message);
      hasSavedUser = true;
    }, "saveUser");
    try {
      if (this.ctx.chatluna.currentConfig.infiniteContext) {
        const manager = this._ensureInfiniteContextManager();
        await manager?.compressIfNeeded(wrapper);
      }
    } catch (error) {
      import_koishi_plugin_chatluna3.logger.error("Error compressing context:", error);
    }
    const response = await wrapper.call({
      ...arg,
      maxToken: this.preset?.value?.config?.maxOutputToken,
      messageQueue: arg.messageQueue,
      onAgentEvent: /* @__PURE__ */ __name(async (event) => {
        if (event.type === "tool-result") {
          collectedToolSteps.push(...event.steps);
          await saveUser();
          if (historyPolicy.persistIntermediateAgentMessages) {
            await this._chatHistory.addAgentToolBatch(event.steps);
          }
        }
        if (event.type === "human-update") {
          await saveUser();
          if (historyPolicy.persistIntermediateAgentMessages) {
            await this._chatHistory.addMessages(event.messages);
          }
        }
        await arg.onAgentEvent?.(event);
      }, "onAgentEvent")
    });
    const responseMessage = response.message;
    const displayResponse = createDisplayResponse(responseMessage);
    this._chatCount++;
    if (arg.postHandler) {
      const handlerResult = await this.handlePostProcessing(
        arg,
        displayResponse
      );
      displayResponse.content = handlerResult.displayContent;
      await this._chatHistory.overrideAdditionalArgs(
        handlerResult.variables
      );
    }
    const messageContent = (0, import_string3.getMessageContent)(displayResponse.content);
    if (messageContent.trim().length > 0) {
      await saveUser();
      let saveMessage = responseMessage;
      if (!this.ctx.chatluna.currentConfig.rawOnCensor) {
        saveMessage = displayResponse;
      }
      await this._chatHistory.addMessage(saveMessage);
    }
    if (historyPolicy.toolMemory?.enabled) {
      const toolMemoryEntries = (0, import_message.buildToolMemoryEntriesFromSteps)(
        collectedToolSteps,
        {
          turnId: arg.requestId,
          createdAt: /* @__PURE__ */ new Date(),
          finishToolName: historyPolicy.toolMemory.finishToolName
        }
      );
      await this._chatHistory.storeToolMemoryEntries(toolMemoryEntries, {
        storageKey: historyPolicy.toolMemory.storageKey,
        maxEntries: historyPolicy.toolMemory.maxEntries
      });
    }
    try {
      await this.ctx.parallel(
        "chatluna/after-chat",
        arg.conversationId,
        arg.message,
        displayResponse,
        { ...arg.variables, chatCount: this._chatCount },
        this,
        arg.session
      );
    } catch (error) {
      await this.handleChatError(arg, wrapper, error, false);
    }
    return { message: displayResponse };
  }
  async handlePostProcessing(arg, message) {
    import_koishi_plugin_chatluna3.logger.debug(`Original content: %c`, message.content);
    return await arg.postHandler.handler(
      arg.session,
      (0, import_string3.getMessageContent)(message.content)
    );
  }
  async getChatLunaLLMChainWrapper() {
    if (this._chain) {
      const chainValue = this._chain.value;
      if (chainValue) {
        return chainValue;
      }
    }
    await this.createChatLunaLLMChainWrapper();
    return this._chain.value;
  }
  async createChatLunaLLMChainWrapper() {
    if (this._chain) {
      return;
    }
    const service = this.ctx.chatluna.platform;
    const [llmPlatform, llmModelName] = (0, import_count_tokens2.parseRawModelName)(this._input.model);
    let llm;
    let modelInfo;
    let historyMemory;
    try {
      this._embeddings = await initEmbeddings(
        service,
        this._input.embeddings
      );
    } catch (error) {
      if (error instanceof import_error3.ChatLunaError) {
        throw error;
      }
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.EMBEDDINGS_INIT_ERROR,
        error
      );
    }
    try {
      ;
      [llm, modelInfo] = await initModel(
        this.ctx,
        service,
        llmPlatform,
        llmModelName
      );
    } catch (error) {
      if (error instanceof import_error3.ChatLunaError) {
        throw error;
      }
      throw new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.MODEL_INIT_ERROR, error);
    }
    try {
      await this._createChatHistory();
    } catch (error) {
      if (error instanceof import_error3.ChatLunaError) {
        throw error;
      }
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.CHAT_HISTORY_INIT_ERROR,
        error
      );
    }
    try {
      historyMemory = this._createHistoryMemory();
    } catch (error) {
      if (error instanceof import_error3.ChatLunaError) {
        throw error;
      }
      throw new import_error3.ChatLunaError(import_error3.ChatLunaErrorCode.UNKNOWN_ERROR, error);
    }
    this._chain = (0, import_reactivity2.computed)(() => {
      if (llm.value == null) {
        return void 0;
      }
      return service.createChatChain(this._input.chatMode, {
        botName: this._input.botName,
        model: llm.value,
        embeddings: this._embeddings.value,
        historyMemory,
        preset: this._input.preset,
        vectorStoreName: this._input.vectorStoreName,
        supportChatChain: modelInfo?.value != null && supportChatMode(modelInfo.value, this._input.chatMode)
      });
    });
  }
  get chatHistory() {
    return this._chatHistory;
  }
  get chatMode() {
    return this._input.chatMode;
  }
  get embeddings() {
    return this._embeddings;
  }
  get preset() {
    return this._input.preset;
  }
  async delete(ctx, room) {
    await this.clearChatHistory();
    this._chain = void 0;
    await ctx.database.remove("chathub_conversation", {
      id: room.conversationId
    });
    await ctx.database.remove("chathub_room", {
      roomId: room.roomId
    });
    await ctx.database.remove("chathub_room_member", {
      roomId: room.roomId
    });
    await ctx.database.remove("chathub_room_group_member", {
      roomId: room.roomId
    });
    await ctx.database.remove("chathub_user", {
      defaultRoomId: room.roomId
    });
    await ctx.database.remove("chathub_message", {
      conversation: room.conversationId
    });
  }
  async clearChatHistory() {
    if (this._chatHistory == null) {
      await this._createChatHistory();
    }
    await this.ctx.root.parallel(
      "chatluna/clear-chat-history",
      this._input.conversationId,
      this
    );
    await this._chatHistory.clear();
    await this._chain?.value?.model.clearContext(this._input.conversationId);
  }
  async normalizeResearchReplyHistory(finalVisibleText, updatedAt = /* @__PURE__ */ new Date()) {
    if (this._chatHistory == null) {
      await this._createChatHistory();
    }
    return this._chatHistory.normalizeResearchReplyHistory(
      finalVisibleText,
      updatedAt
    );
  }
  async compressContext(force = false) {
    const wrapper = await this.getChatLunaLLMChainWrapper();
    const manager = this._ensureInfiniteContextManager();
    if (!manager) {
      throw new import_error3.ChatLunaError(
        import_error3.ChatLunaErrorCode.CHAT_HISTORY_INIT_ERROR,
        new Error("Chat history is not initialized")
      );
    }
    return manager.compressIfNeeded(wrapper, force);
  }
  async _createChatHistory() {
    if (this._chatHistory != null) {
      return this._chatHistory;
    }
    this._chatHistory = new import_message.KoishiChatMessageHistory(
      this.ctx,
      this._input.conversationId,
      1e4
    );
    await this._chatHistory.loadConversation();
    return this._chatHistory;
  }
  _createHistoryMemory() {
    if (this._historyMemory) {
      return this._historyMemory;
    }
    this._historyMemory = new import_langchain.BufferMemory({
      returnMessages: true,
      inputKey: "input",
      outputKey: "output",
      chatHistory: this._chatHistory,
      humanPrefix: "user",
      aiPrefix: this._input.botName
    });
    return this._historyMemory;
  }
  _ensureInfiniteContextManager() {
    if (!this._chatHistory) {
      return void 0;
    }
    if (!this._infiniteContextManager) {
      this._infiniteContextManager = new InfiniteContextManager({
        chatHistory: this._chatHistory,
        conversationId: this._input.conversationId,
        preset: this._input.preset,
        threshold: this.ctx.chatluna.currentConfig.infiniteContextThreshold
      });
    }
    return this._infiniteContextManager;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ChatInterface
});
