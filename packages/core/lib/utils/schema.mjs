var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/utils/schema.ts
import { h, Schema } from "koishi";
import { computed, watch } from "@vue/reactivity";
import { ModelType } from "koishi-plugin-chatluna/llm-core/platform/types";
function modelSchema(ctx, createNotification = false) {
  const modelNames = getModelSchemas(ctx.chatluna.platform);
  const notification = createNotification ? ctx.notifier?.create({
    content: h.parse(
      "您当前没有配置模型，请前往 https://chatluna.chat/guide/configure-model-platform/introduction.html 了解如何安装模型适配器。"
    ),
    type: "warning"
  }) : void 0;
  const watcher = watch(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("model", Schema.union(modelNames2));
      if (modelNames2.length > 1 && notification) {
        notification?.update({
          content: `当前共加载了 ${modelNames2.length} 个模型。`,
          type: "success"
        });
      } else {
        notification?.update({
          content: h.parse(
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
    ModelType.embeddings
  );
  const watcher = watch(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("embeddings", Schema.union(modelNames2));
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
  const watcher = watch(
    modelNames,
    (modelNames2) => {
      ctx.schema.set("chat-mode", Schema.union(modelNames2));
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
  const watcher = watch(
    vectorStoreNames,
    (vectorStoreNames2) => {
      ctx.schema.set("vector-store", Schema.union(vectorStoreNames2));
    },
    {
      immediate: true
    }
  );
  const stop = /* @__PURE__ */ __name(() => watcher.stop(), "stop");
  ctx.effect(() => stop);
}
__name(vectorStoreSchema, "vectorStoreSchema");
function listModelNames(service, type = ModelType.llm, includeNone = false) {
  const models = service.listAllModels(type);
  return computed(() => {
    const names = models.value.map(
      (model) => model.platform + "/" + model.name
    );
    return includeNone ? ["无"].concat(names) : names;
  });
}
__name(listModelNames, "listModelNames");
function getModelSchemas(service, type = ModelType.llm) {
  const models = listModelNames(service, type, true);
  return computed(
    () => models.value.map((model) => Schema.const(model).description(model))
  );
}
__name(getModelSchemas, "getModelSchemas");
function getVectorStores(ctx, service) {
  const vectorStoreNamesRef = service.vectorStores;
  return computed(
    () => ["无"].concat(vectorStoreNamesRef.value).map((name) => Schema.const(name).description(name))
  );
}
__name(getVectorStores, "getVectorStores");
function getChatChainNames(service) {
  const chains = service.chatChains;
  return computed(
    () => chains.value.map(
      (info) => Schema.const(info.name).i18n(info.description)
    )
  );
}
__name(getChatChainNames, "getChatChainNames");
export {
  chatChainSchema,
  embeddingsSchema,
  listModelNames,
  modelSchema,
  vectorStoreSchema
};
