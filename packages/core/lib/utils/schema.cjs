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

// src/utils/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatChainSchema: () => chatChainSchema,
  embeddingsSchema: () => embeddingsSchema,
  listModelNames: () => listModelNames,
  modelSchema: () => modelSchema,
  vectorStoreSchema: () => vectorStoreSchema
});
module.exports = __toCommonJS(schema_exports);
var import_koishi = require("koishi");
var import_reactivity = require("@vue/reactivity");
var import_types = require("koishi-plugin-chatluna/llm-core/platform/types");
function modelSchema(ctx, createNotification = false) {
  const modelNames = getModelSchemas(ctx.chatluna.platform);
  const notification = createNotification ? ctx.notifier?.create({
    content: import_koishi.h.parse(
      "您当前没有配置模型，请前往 https://chatluna.chat/guide/configure-model-platform/introduction.html 了解如何安装模型适配器。"
    ),
    type: "warning"
  }) : void 0;
  const watcher = (0, import_reactivity.watch)(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("model", import_koishi.Schema.union(modelNames2));
      if (modelNames2.length > 1 && notification) {
        notification?.update({
          content: `当前共加载了 ${modelNames2.length} 个模型。`,
          type: "success"
        });
      } else {
        notification?.update({
          content: import_koishi.h.parse(
            "您当前没有配置模型，请前往 https://chatluna.chat/guide/configure-model-platform/introduction.html 了解如何安装模型适配器。"
          ),
          type: "warning"
        });
      }
    },
    {
      immediate: true
    }
  );
  const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
  ctx.effect(() => stop);
}
__name(modelSchema, "modelSchema");
function embeddingsSchema(ctx) {
  const modelNames = getModelSchemas(
    ctx.chatluna.platform,
    import_types.ModelType.embeddings
  );
  const watcher = (0, import_reactivity.watch)(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("embeddings", import_koishi.Schema.union(modelNames2));
    },
    {
      immediate: true
    }
  );
  const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
  ctx.effect(() => stop);
}
__name(embeddingsSchema, "embeddingsSchema");
function chatChainSchema(ctx) {
  const modelNames = getChatChainNames(ctx.chatluna.platform);
  const watcher = (0, import_reactivity.watch)(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("chat-mode", import_koishi.Schema.union(modelNames2));
    },
    {
      immediate: true
    }
  );
  const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
  ctx.effect(() => stop);
}
__name(chatChainSchema, "chatChainSchema");
function vectorStoreSchema(ctx) {
  const vectorStoreNames = getVectorStores(ctx, ctx.chatluna.platform);
  const watcher = (0, import_reactivity.watch)(
    vectorStoreNames,
    (vectorStoreNames2) => {
      ctx.schema.set("vector-store", import_koishi.Schema.union(vectorStoreNames2));
    },
    {
      immediate: true
    }
  );
  const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
  ctx.effect(() => stop);
}
__name(vectorStoreSchema, "vectorStoreSchema");
function listModelNames(service, type = import_types.ModelType.llm, includeNone = false) {
  const models = service.listAllModels(type);
  return (0, import_reactivity.computed)(() => {
    const names = models.value.map(
      (model) => model.platform + "/" + model.name
    );
    return includeNone ? ["无"].concat(names) : names;
  });
}
__name(listModelNames, "listModelNames");
function getModelSchemas(service, type = import_types.ModelType.llm) {
  const models = listModelNames(service, type, true);
  return (0, import_reactivity.computed)(
    () => models.value.map((model) => import_koishi.Schema.const(model).description(model))
  );
}
__name(getModelSchemas, "getModelSchemas");
function getVectorStores(ctx, service) {
  const vectorStoreNamesRef = service.vectorStores;
  return (0, import_reactivity.computed)(
    () => ["无"].concat(vectorStoreNamesRef.value).map((name) => import_koishi.Schema.const(name).description(name))
  );
}
__name(getVectorStores, "getVectorStores");
function getChatChainNames(service) {
  const chains = service.chatChains;
  return (0, import_reactivity.computed)(
    () => chains.value.map(
      (info) => import_koishi.Schema.const(info.name).i18n(info.description)
    )
  );
}
__name(getChatChainNames, "getChatChainNames");
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  chatChainSchema,
  embeddingsSchema,
  listModelNames,
  modelSchema,
  vectorStoreSchema
});
