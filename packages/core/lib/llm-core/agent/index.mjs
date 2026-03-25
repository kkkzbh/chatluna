var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/llm-core/agent/openai/index.ts
import {
  AIMessage as AIMessage2,
  AIMessageChunk as AIMessageChunk2,
  FunctionMessage,
  HumanMessage,
  ToolMessage
} from "@langchain/core/messages";
import {
  RunnableLambda,
  RunnablePassthrough,
  RunnableSequence
} from "@langchain/core/runnables";

// src/llm-core/agent/openai/output_parser.ts
import {
  AIMessage,
  AIMessageChunk,
  isBaseMessage
} from "@langchain/core/messages";
import {
  BaseOutputParser,
  OutputParserException
} from "@langchain/core/output_parsers";
import { getMessageContent } from "koishi-plugin-chatluna/utils/string";
var OpenAIFunctionsAgentOutputParser = class extends BaseOutputParser {
  static {
    __name(this, "OpenAIFunctionsAgentOutputParser");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  lc_namespace = ["@langchain/core/messages", "agents", "openai"];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static lc_name() {
    return "OpenAIFunctionsAgentOutputParser";
  }
  async parse(text) {
    throw new Error(
      `OpenAIFunctionsAgentOutputParser can only parse messages.
Passed input: ${text}`
    );
  }
  async parseResult(generations) {
    if ("message" in generations[0] && isBaseMessage(generations[0].message)) {
      return this.parseAIMessage(generations[0].message);
    }
    throw new Error(
      "parseResult on OpenAIFunctionsAgentOutputParser only works on ChatGeneration output"
    );
  }
  /**
   * Parses the output message into a FunctionsAgentAction or AgentFinish
   * object.
   * @param message The BaseMessage to parse.
   * @returns A FunctionsAgentAction or AgentFinish object.
   */
  parseAIMessage(message) {
    if (message.content && typeof message.content !== "string") {
      throw new Error(
        "This agent cannot parse non-string model responses."
      );
    }
    const content = getMessageContent(message.content) ?? "";
    const function_call = message.additional_kwargs.function_call;
    if (!function_call) {
      return {
        returnValues: { output: message.content, message },
        log: content
      };
    }
    try {
      const toolInput = function_call.arguments ? JSON.parse(function_call.arguments) : {};
      return {
        tool: function_call.name,
        toolInput,
        log: content?.length > 0 ? content : `Invoking "${function_call.name}" with ${function_call.arguments ?? "{}"}`,
        messageLog: [message],
        content: message.content
      };
    } catch (error) {
      throw new OutputParserException(
        `Failed to parse function arguments from chat model response. Text: "${function_call.arguments}". ${error}`
      );
    }
  }
  getFormatInstructions() {
    throw new Error(
      "getFormatInstructions not implemented inside OpenAIFunctionsAgentOutputParser."
    );
  }
};
var OpenAIToolsAgentOutputParser = class extends BaseOutputParser {
  static {
    __name(this, "OpenAIToolsAgentOutputParser");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  lc_namespace = ["@langchain/core/messages", "agents", "openai"];
  // eslint-disable-next-line @typescript-eslint/naming-convention
  static lc_name() {
    return "OpenAIToolsAgentOutputParser";
  }
  async parse(text) {
    throw new Error(
      `OpenAIFunctionsAgentOutputParser can only parse messages.
Passed input: ${text}`
    );
  }
  async parseResult(generations) {
    if ("message" in generations[0] && isBaseMessage(generations[0].message)) {
      return this.parseAIMessage(generations[0].message);
    }
    throw new Error(
      "parseResult on OpenAIFunctionsAgentOutputParser only works on ChatGeneration output"
    );
  }
  /**
   * Parses the output message into a ToolsAgentAction[] or AgentFinish
   * object.
   * @param message The BaseMessage to parse.
   * @returns A ToolsAgentAction[] or AgentFinish object.
   */
  parseAIMessage(message) {
    const content = getMessageContent(message.content);
    const agentFinish = {
      returnValues: { output: message.content, message },
      log: content ?? ""
    };
    if ((message instanceof AIMessageChunk || message instanceof AIMessage) && message.tool_calls?.length > 0) {
      const toolCalls = message.tool_calls;
      try {
        return toolCalls.map((toolCall, i) => {
          return {
            tool: toolCall.name,
            toolInput: toolCall.args,
            toolCallId: toolCall.id,
            log: content?.length > 0 ? content : `Invoking "${toolCall.name}" with ${JSON.stringify(toolCall.args) ?? "{}"}`,
            messageLog: i === 0 ? [message] : [],
            content: i === 0 ? message.content : void 0
          };
        });
      } catch (error) {
        throw new OutputParserException(
          `Failed to parse tool arguments from chat model response. Text: "${JSON.stringify(toolCalls)}". ${error}`
        );
      }
    }
    const { tool_calls: rawToolCalls } = message.additional_kwargs;
    if (Array.isArray(rawToolCalls) && rawToolCalls.length > 0) {
      const toolCalls = rawToolCalls;
      try {
        return toolCalls.map((toolCall, i) => {
          return {
            tool: toolCall.function.name,
            toolInput: toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {},
            toolCallId: toolCall.id,
            log: content?.length > 0 ? content : `Invoking "${toolCall.function.name}" with ${toolCall.function.arguments ?? "{}"}`,
            messageLog: i === 0 ? [message] : [],
            content: i === 0 ? message.content : void 0
          };
        });
      } catch (error) {
        throw new OutputParserException(
          `Failed to parse tool arguments from chat model response. Text: "${JSON.stringify(toolCalls)}". ${error}`
        );
      }
    }
    return agentFinish;
  }
  getFormatInstructions() {
    throw new Error(
      "getFormatInstructions not implemented inside OpenAIToolsAgentOutputParser."
    );
  }
};

// src/llm-core/agent/openai/index.ts
import { getMessageContent as getMessageContent2 } from "koishi-plugin-chatluna/utils/string";
function isFunctionsAgentAction(action) {
  return action.messageLog !== void 0;
}
__name(isFunctionsAgentAction, "isFunctionsAgentAction");
function isToolsAgentAction(action) {
  return action.toolCallId !== void 0;
}
__name(isToolsAgentAction, "isToolsAgentAction");
function _convertAgentStepToMessages(action, observation) {
  if (isToolsAgentAction(action) && action.toolCallId !== void 0) {
    const log = action.messageLog;
    if (observation.length < 1 || observation == null || observation === "null") {
      observation = `The tool ${action.tool} returned no output. Try again or stop the tool call, tell the user failed to execute the tool.`;
    }
    return log.concat(
      new ToolMessage({
        content: observation,
        name: action.tool,
        tool_call_id: action.toolCallId
      })
    );
  } else if (isFunctionsAgentAction(action) && action.messageLog !== void 0) {
    return action.messageLog?.concat(
      new FunctionMessage(
        getMessageContent2(observation),
        action.tool
      )
    );
  } else {
    return [new AIMessage2(action.log)];
  }
}
__name(_convertAgentStepToMessages, "_convertAgentStepToMessages");
function mergeHumanMessages(messages) {
  if (messages.length === 1) {
    return messages[0];
  }
  const base = messages[0];
  const content = [];
  for (const msg of messages) {
    if (content.length > 0) {
      content.push({ type: "text", text: "\n" });
    }
    if (typeof msg.content === "string") {
      content.push({ type: "text", text: msg.content });
      continue;
    }
    content.push(...msg.content);
  }
  return new HumanMessage({
    content,
    name: base.name,
    id: base.id,
    additional_kwargs: messages.reduce(
      (acc, msg) => Object.assign(acc, msg.additional_kwargs),
      Object.assign({}, base.additional_kwargs)
    )
  });
}
__name(mergeHumanMessages, "mergeHumanMessages");
function _formatIntermediateSteps(intermediateSteps) {
  return intermediateSteps.flatMap((step) => {
    if ("messages" in step) {
      return step.messages.length > 0 ? [mergeHumanMessages(step.messages)] : [];
    }
    return _convertAgentStepToMessages(step.action, step.observation);
  });
}
__name(_formatIntermediateSteps, "_formatIntermediateSteps");
function createOpenAIAgent({
  llm,
  tools,
  prompt
}) {
  const llmWithTools = llm.withConfig({
    tools
  });
  let outputParser = new OpenAIToolsAgentOutputParser();
  const agent = RunnableSequence.from([
    RunnablePassthrough.assign({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      agent_scratchpad: /* @__PURE__ */ __name((input) => _formatIntermediateSteps(input.scratchpadEntries ?? input.steps), "agent_scratchpad")
      /* // @ts-expect-error eslint-disable-next-line @typescript-eslint/naming-convention
      input_text: (input: { input: BaseMessage[] }) =>
          getMessageContent(input.input[0].content) */
    }),
    prompt,
    llmWithTools,
    RunnableLambda.from((input) => {
      if (input == null) {
        return [
          {
            tool: "_Exception",
            toolInput: "Something unknown error. Please try again.",
            log: "Input is null"
          }
        ];
      }
      const hasTools = input.additional_kwargs?.tool_calls?.length > 0 || (input instanceof AIMessageChunk2 || input instanceof AIMessage2) && input.tool_calls?.length > 0;
      const hasFunction = input.additional_kwargs?.function_call != null;
      if (hasTools && outputParser instanceof OpenAIFunctionsAgentOutputParser) {
        outputParser = new OpenAIToolsAgentOutputParser();
      } else if (hasFunction && outputParser instanceof OpenAIToolsAgentOutputParser) {
        outputParser = new OpenAIFunctionsAgentOutputParser();
      }
      return outputParser.parseResult([
        {
          message: input,
          text: getMessageContent2(input.content)
        }
      ]);
    })
  ]);
  return agent;
}
__name(createOpenAIAgent, "createOpenAIAgent");

// src/llm-core/agent/executor.ts
import {
  AIMessage as AIMessage3,
  HumanMessage as HumanMessage2,
  isBaseMessage as isBaseMessage2
} from "@langchain/core/messages";
import { OutputParserException as OutputParserException2 } from "@langchain/core/output_parsers";
import {
  patchConfig
} from "@langchain/core/runnables";
import {
  ToolInputParsingException
} from "@langchain/core/tools";
import { logger } from "koishi-plugin-chatluna";
import {
  BaseChain
} from "koishi-plugin-chatluna/llm-core/chain/base";
import {
  isMessageContentComplex,
  isMessageContentText
} from "koishi-plugin-chatluna/utils/langchain";

// src/llm-core/agent/types.ts
var MessageQueue = class {
  static {
    __name(this, "MessageQueue");
  }
  _queue = [];
  push(...messages) {
    this._queue.push(...messages);
    return true;
  }
  drain() {
    return this._queue.splice(0);
  }
  get pending() {
    return this._queue.length > 0;
  }
};
function applyToolMask(name, mask) {
  if (!mask || mask.mode === "all") {
    return true;
  }
  if (mask.mode === "allow") {
    return mask.allow.includes(name);
  }
  return !mask.deny.includes(name);
}
__name(applyToolMask, "applyToolMask");
function intersectToolMasks(toolNames, ...masks) {
  const activeMasks = masks.filter((mask) => mask != null);
  if (activeMasks.length < 1) {
    return void 0;
  }
  const allowed = toolNames.filter(
    (name) => activeMasks.every((mask) => applyToolMask(name, mask))
  );
  const toolCallMasks = activeMasks.map((mask) => mask.toolCallMask).filter((mask) => mask != null);
  return {
    mode: "allow",
    allow: allowed,
    deny: [],
    ...toolCallMasks.length > 0 ? {
      toolCallMask: intersectToolMasks(allowed, ...toolCallMasks)
    } : {}
  };
}
__name(intersectToolMasks, "intersectToolMasks");
function ensureToolMaskAllows(mask, toolNames) {
  if (mask == null || mask.mode !== "allow") {
    return mask;
  }
  const allow = Array.from(/* @__PURE__ */ new Set([...mask.allow, ...toolNames]));
  const toolCallMask = mask.toolCallMask == null || mask.toolCallMask.mode !== "allow" ? mask.toolCallMask : {
    ...mask.toolCallMask,
    allow: Array.from(
      /* @__PURE__ */ new Set([...mask.toolCallMask.allow, ...toolNames])
    )
  };
  return {
    ...mask,
    allow,
    toolCallMask
  };
}
__name(ensureToolMaskAllows, "ensureToolMaskAllows");

// src/llm-core/agent/executor.ts
async function executeTools(actions, toolMap, config, signal, handleParsingErrors, handleToolRuntimeErrors) {
  return Promise.all(
    actions.map(async (action) => {
      checkAborted(signal);
      if (action.tool === "_Exception") {
        return {
          action,
          observation: coerceToAgentObservation(
            typeof action.toolInput === "string" ? action.toolInput : JSON.stringify(action.toolInput) ?? ""
          ),
          outcome: "error"
        };
      }
      const tool = toolMap[action.tool?.toLowerCase()];
      if (tool == null) {
        return {
          action,
          observation: `${action.tool} is not a valid tool, try another one.`,
          outcome: "error"
        };
      }
      const mask = config?.configurable?.["toolMask"] ?? config?.configurable?.["subagentContext"]?.["toolMask"];
      if (mask && !applyToolMask(action.tool, mask)) {
        const allowed = Object.values(toolMap).map((item) => item.name).filter((name) => applyToolMask(name, mask));
        return {
          action,
          observation: `Tool '${action.tool}' is not allowed for the current sub-agent. Available tools: ${allowed.join(", ")}`,
          outcome: "error"
        };
      }
      const callMask = config?.configurable?.["toolMask"]?.toolCallMask ?? config?.configurable?.["subagentContext"]?.["toolMask"]?.toolCallMask;
      if (callMask && !applyToolMask(action.tool, callMask)) {
        return {
          action,
          observation: `You do not have permission to call tool '${action.tool}'. Try another tool.`,
          outcome: "error"
        };
      }
      try {
        const observation = await tool.invoke(action.toolInput, config);
        return {
          action,
          observation: coerceToAgentObservation(
            observation,
            tool.name
          ),
          outcome: "success"
        };
      } catch (e) {
        if (e instanceof ToolInputParsingException) {
          return {
            action,
            observation: coerceToAgentObservation(
              toToolInputErrorObservation(handleParsingErrors, e)
            ),
            outcome: "error"
          };
        }
        if (handleToolRuntimeErrors != null) {
          return {
            action,
            observation: coerceToAgentObservation(
              handleToolRuntimeErrors(e),
              tool.name
            ),
            outcome: "error"
          };
        }
        return {
          action,
          observation: coerceToAgentObservation(
            `Something went wrong. Please Try Again. ${String(e)}`,
            tool.name
          ),
          outcome: "error"
        };
      }
    })
  );
}
__name(executeTools, "executeTools");
async function plan(agent, input, steps, scratchpad, config) {
  const planConfig = buildAgentPlanningConfig(input, config);
  const stream = await agent.stream(
    {
      ...input,
      steps,
      scratchpadEntries: scratchpad
    },
    planConfig
  );
  let result;
  for await (const chunk of stream) {
    if (result !== void 0) {
      throw new Error("Multiple outputs from agent stream");
    }
    result = chunk;
  }
  if (result == null) {
    throw new Error("No output from agent stream");
  }
  if (isAgentFinish(result)) {
    return result;
  }
  return Array.isArray(result) ? result : [result];
}
__name(plan, "plan");
var AGENT_MODEL_CALL_OPTION_KEYS = [
  "model",
  "temperature",
  "maxTokens",
  "maxTokenLimit",
  "topP",
  "frequencyPenalty",
  "presencePenalty",
  "n",
  "logitBias",
  "id",
  "variables",
  "variables_hide",
  "overrideRequestParams",
  "stream",
  "tool_choice",
  "stop",
  "timeout"
];
function buildAgentPlanningConfig(input, config) {
  const modelCallOptions = {};
  for (const key of AGENT_MODEL_CALL_OPTION_KEYS) {
    const value = input[key];
    if (value !== void 0) {
      modelCallOptions[key] = value;
    }
  }
  if (Object.keys(modelCallOptions).length < 1) {
    return config;
  }
  return {
    ...config ?? {},
    ...modelCallOptions
  };
}
__name(buildAgentPlanningConfig, "buildAgentPlanningConfig");
var MAX_FINISH_CONTRACT_RETRY = 2;
function buildFinishContractViolationMessage(finishContract, output, retryCount) {
  const previousOutput = toOutput(
    output.returnValues["output"] ?? output.returnValues["message"]?.content ?? ""
  ).trim();
  const retryNotice = retryCount >= MAX_FINISH_CONTRACT_RETRY ? "This is the final retry." : "Retry immediately.";
  const lines = [
    `Protocol violation: you finished without calling ${finishContract.toolName}.`,
    "Do not speak to the user directly.",
    `You must end by calling ${finishContract.toolName}.`,
    "Use JSON arguments only.",
    'Required format: {"summary":"后台研究结论摘要"}.',
    retryNotice
  ];
  if (previousOutput.length > 0) {
    lines.push(`Your previous direct reply was: ${JSON.stringify(previousOutput)}`);
  }
  return new HumanMessage2({
    content: lines.join("\n")
  });
}
__name(buildFinishContractViolationMessage, "buildFinishContractViolationMessage");
function normalizeFinalResponseContract(rawSchema, rawInstruction) {
  if (rawSchema == null || typeof rawSchema !== "object" || Array.isArray(rawSchema)) {
    return null;
  }
  const instruction = typeof rawInstruction === "string" && rawInstruction.trim().length > 0 ? rawInstruction.trim() : void 0;
  return {
    schema: rawSchema,
    name: "qqbot_structured_reply_v1",
    instruction
  };
}
__name(normalizeFinalResponseContract, "normalizeFinalResponseContract");
function buildFinalResponseOverrideRequestParams(contract, rawOverride) {
  const base = rawOverride != null && typeof rawOverride === "object" && !Array.isArray(rawOverride) ? { ...rawOverride } : {};
  return {
    ...base,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: contract.name ?? "qqbot_structured_reply_v1",
        strict: true,
        schema: contract.schema
      }
    }
  };
}
__name(buildFinalResponseOverrideRequestParams, "buildFinalResponseOverrideRequestParams");
function tryParseJsonText(text) {
  const trimmed = text.trim();
  if (trimmed.length < 2 || !(trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    return text;
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    return text;
  }
}
__name(tryParseJsonText, "tryParseJsonText");
function normalizeAgentFinishLogValue(value) {
  if (typeof value === "string") {
    return tryParseJsonText(value);
  }
  return value;
}
__name(normalizeAgentFinishLogValue, "normalizeAgentFinishLogValue");
var AGENT_INPUT_PREVIEW_MAX_LENGTH = 200;
var AGENT_HISTORY_PREVIEW_LIMIT = 2;
var AGENT_VARIABLE_KEY_LIMIT = 12;
var AGENT_SCHEMA_KEY_LIMIT = 12;
function isLogRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}
__name(isLogRecord, "isLogRecord");
function compactWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
__name(compactWhitespace, "compactWhitespace");
function summarizeTextValue(value, maxLength) {
  const normalized = compactWhitespace(value);
  if (normalized.length <= maxLength) {
    return {
      preview: normalized,
      length: normalized.length,
      truncated: false
    };
  }
  return {
    preview: `${normalized.slice(0, Math.max(0, maxLength - 3))}...`,
    length: normalized.length,
    truncated: true
  };
}
__name(summarizeTextValue, "summarizeTextValue");
function summarizeStringList(values, maxLength) {
  const uniqueValues = [...new Set(values.filter((value) => value.length > 0))];
  return {
    values: uniqueValues.slice(0, maxLength),
    omittedCount: Math.max(0, uniqueValues.length - maxLength)
  };
}
__name(summarizeStringList, "summarizeStringList");
function summarizeMessageContent(content) {
  if (typeof content === "string") {
    const summary = summarizeTextValue(content, AGENT_INPUT_PREVIEW_MAX_LENGTH);
    return {
      ...summary,
      contentKind: "string",
      textPartCount: summary.length > 0 ? 1 : 0,
      imageCount: 0,
      contentTypes: [],
      omittedContentTypeCount: 0
    };
  }
  if (!Array.isArray(content)) {
    return null;
  }
  const textParts = [];
  const contentTypes = [];
  let imageCount = 0;
  for (const item of content) {
    if (typeof item === "string") {
      textParts.push(item);
      continue;
    }
    if (!isMessageContentComplex(item)) {
      continue;
    }
    contentTypes.push(item.type);
    if (isMessageContentText(item) && typeof item.text === "string") {
      textParts.push(item.text);
    } else if (item.type === "image_url") {
      imageCount += 1;
    }
  }
  const textSummary = textParts.length > 0 ? summarizeTextValue(
    textParts.join("\n"),
    AGENT_INPUT_PREVIEW_MAX_LENGTH
  ) : null;
  const typeSummary = summarizeStringList(contentTypes, AGENT_SCHEMA_KEY_LIMIT);
  return {
    preview: textSummary?.preview ?? (typeSummary.values.length > 0 ? `[${typeSummary.values.join(", ")}]` : ""),
    length: textSummary?.length ?? 0,
    truncated: textSummary?.truncated ?? false,
    contentKind: "array",
    textPartCount: textParts.length,
    imageCount,
    contentTypes: typeSummary.values,
    omittedContentTypeCount: typeSummary.omittedCount
  };
}
__name(summarizeMessageContent, "summarizeMessageContent");
function summarizeAgentLogMessagePreview(message) {
  const contentSummary = summarizeMessageContent(message.content);
  const toolCallCount = "tool_calls" in message && Array.isArray(message.tool_calls) ? message.tool_calls.length : 0;
  const summary = {
    type: message.getType(),
    preview: contentSummary?.preview ?? "",
    length: contentSummary?.length ?? 0
  };
  if (contentSummary?.truncated) {
    summary["truncated"] = true;
  }
  if (contentSummary?.contentTypes != null && contentSummary.contentTypes.length > 0) {
    summary["contentTypes"] = contentSummary.contentTypes;
  }
  if ((contentSummary?.omittedContentTypeCount ?? 0) > 0) {
    summary["omittedContentTypeCount"] = contentSummary.omittedContentTypeCount;
  }
  if (typeof contentSummary?.contentKind === "string") {
    summary["contentKind"] = contentSummary.contentKind;
  }
  if ((contentSummary?.textPartCount ?? 0) > 0) {
    summary["textPartCount"] = contentSummary.textPartCount;
  }
  if ((contentSummary?.imageCount ?? 0) > 0) {
    summary["imageCount"] = contentSummary.imageCount;
  }
  if (toolCallCount > 0) {
    summary["toolCallCount"] = toolCallCount;
  }
  const replyMode = message.additional_kwargs?.qqbot_reply_mode;
  if (typeof replyMode === "string" && replyMode.length > 0) {
    summary["replyMode"] = replyMode;
  }
  return summary;
}
__name(summarizeAgentLogMessagePreview, "summarizeAgentLogMessagePreview");
function summarizeChatHistory(history) {
  if (!Array.isArray(history)) {
    return {
      count: 0
    };
  }
  const messages = history.filter(isBaseMessage2);
  return {
    count: messages.length,
    latest: messages.slice(-AGENT_HISTORY_PREVIEW_LIMIT).map((message) => summarizeAgentLogMessagePreview(message))
  };
}
__name(summarizeChatHistory, "summarizeChatHistory");
function summarizeVariables(value) {
  if (!isLogRecord(value)) {
    return {
      keys: []
    };
  }
  const keySummary = summarizeStringList(
    Object.keys(value).filter((key) => key !== "variables_hide"),
    AGENT_VARIABLE_KEY_LIMIT
  );
  return {
    keys: keySummary.values,
    omittedKeyCount: keySummary.omittedCount
  };
}
__name(summarizeVariables, "summarizeVariables");
function summarizeResponseContract(input) {
  const rawSchema = input["qqbot_final_response_schema"];
  const overrideRequestParams = input["overrideRequestParams"];
  const responseFormat = isLogRecord(overrideRequestParams) ? overrideRequestParams["response_format"] : null;
  const jsonSchema = isLogRecord(responseFormat) ? responseFormat["json_schema"] : null;
  const summary = {
    hasSchema: isLogRecord(rawSchema)
  };
  if (isLogRecord(responseFormat) && typeof responseFormat["type"] === "string") {
    summary["responseFormatType"] = responseFormat["type"];
  }
  if (isLogRecord(jsonSchema) && typeof jsonSchema["name"] === "string") {
    summary["schemaName"] = jsonSchema["name"];
  }
  if (!isLogRecord(rawSchema)) {
    return summary;
  }
  if (typeof rawSchema["type"] === "string") {
    summary["schemaTopLevelType"] = rawSchema["type"];
  }
  const requiredSummary = summarizeStringList(
    Array.isArray(rawSchema["required"]) ? rawSchema["required"].filter(
      (value) => typeof value === "string"
    ) : [],
    AGENT_SCHEMA_KEY_LIMIT
  );
  summary["required"] = requiredSummary.values;
  if (requiredSummary.omittedCount > 0) {
    summary["omittedRequiredCount"] = requiredSummary.omittedCount;
  }
  const properties = rawSchema["properties"];
  const propertySummary = summarizeStringList(
    isLogRecord(properties) ? Object.keys(properties) : [],
    AGENT_SCHEMA_KEY_LIMIT
  );
  summary["propertyKeys"] = propertySummary.values;
  if (propertySummary.omittedCount > 0) {
    summary["omittedPropertyCount"] = propertySummary.omittedCount;
  }
  return summary;
}
__name(summarizeResponseContract, "summarizeResponseContract");
function summarizeAgentTurnInput(args) {
  const message = args.input["input"];
  return {
    conversationId: typeof args.conversationId === "string" && args.conversationId.length > 0 ? args.conversationId : null,
    input: isBaseMessage2(message) ? summarizeAgentLogMessagePreview(message) : {
      type: typeof message,
      preview: typeof message === "string" ? summarizeTextValue(
        message,
        AGENT_INPUT_PREVIEW_MAX_LENGTH
      ).preview : "",
      length: typeof message === "string" ? message.length : 0
    },
    chatHistory: summarizeChatHistory(args.input["chat_history"]),
    variables: summarizeVariables(args.input["variables"]),
    responseContract: summarizeResponseContract(args.input),
    runtime: {
      stepsCount: args.steps.length,
      scratchpadCount: args.scratchpad.length
    }
  };
}
__name(summarizeAgentTurnInput, "summarizeAgentTurnInput");
function formatAgentLogBlock(label, record) {
  return `${label}
${JSON.stringify(
    normalizeAgentLogValue(record),
    null,
    2
  )}`;
}
__name(formatAgentLogBlock, "formatAgentLogBlock");
function logStructuredAgentFinish(output, conversationId) {
  const message = output.returnValues["message"];
  const payload = output.returnValues["output"] ?? message?.content ?? output.log ?? "";
  const record = {
    conversationId: typeof conversationId === "string" && conversationId.length > 0 ? conversationId : null,
    output: normalizeAgentFinishLogValue(payload)
  };
  logger.info(formatAgentLogBlock("[agent-finish]", record));
}
__name(logStructuredAgentFinish, "logStructuredAgentFinish");
function serializeAgentLogMessage(message) {
  const payload = {
    type: message.getType(),
    content: message.content
  };
  if (message.id != null) {
    payload["id"] = message.id;
  }
  if (message.name != null) {
    payload["name"] = message.name;
  }
  if (message.additional_kwargs != null && Object.keys(message.additional_kwargs).length > 0) {
    payload["additional_kwargs"] = message.additional_kwargs;
  }
  if ("tool_calls" in message && Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    payload["tool_calls"] = message.tool_calls;
  }
  return payload;
}
__name(serializeAgentLogMessage, "serializeAgentLogMessage");
function normalizeAgentLogValue(value, seen = /* @__PURE__ */ new WeakSet()) {
  if (isBaseMessage2(value)) {
    return normalizeAgentLogValue(serializeAgentLogMessage(value), seen);
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeAgentLogValue(item, seen));
  }
  if (value == null || typeof value !== "object") {
    return value;
  }
  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);
  const normalized = Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== "variables_hide" && key !== "configurable"
    ).map(([key, item]) => [key, normalizeAgentLogValue(item, seen)])
  );
  seen.delete(value);
  return normalized;
}
__name(normalizeAgentLogValue, "normalizeAgentLogValue");
function logAgentTurnInput(args) {
  const record = summarizeAgentTurnInput(args);
  logger.info(formatAgentLogBlock("[agent-input]", record));
}
__name(logAgentTurnInput, "logAgentTurnInput");
function shouldLogAgentTurnInput(input, finalResponseContract) {
  if (finalResponseContract != null) {
    return true;
  }
  const message = input["input"];
  if (!isBaseMessage2(message)) {
    return false;
  }
  return message.additional_kwargs?.qqbot_reply_mode === "agent";
}
__name(shouldLogAgentTurnInput, "shouldLogAgentTurnInput");
async function* runAgent(options) {
  const steps = [];
  const scratchpad = [];
  const signal = options.signal ?? options.config?.signal;
  const config = signal == null ? options.config : patchConfig(options.config, { signal });
  const toolMap = Object.fromEntries(
    options.tools.map((tool) => [tool.name.toLowerCase(), tool])
  );
  const maxIterations = options.maxIterations ?? 105;
  const handleParsingErrors = options.handleParsingErrors ?? true;
  const finishContract = options.finishContract;
  const finalResponseContract = normalizeFinalResponseContract(
    options.input["qqbot_final_response_schema"],
    options.input["qqbot_final_response_instruction"]
  );
  let finishContractRetryCount = 0;
  let hasLoggedInitialInput = false;
  let iterations = 0;
  while (iterations < maxIterations) {
    checkAborted(signal);
    const pending = options.messageQueue?.drain() ?? [];
    if (pending.length > 0) {
      scratchpad.push({
        type: "human_update",
        messages: pending
      });
      yield {
        type: "human-update",
        messages: pending
      };
    }
    yield {
      type: "round-decision"
    };
    let output;
    const planningInput = finalResponseContract != null ? {
      ...options.input,
      overrideRequestParams: buildFinalResponseOverrideRequestParams(
        finalResponseContract,
        options.input["overrideRequestParams"]
      )
    } : options.input;
    if (!hasLoggedInitialInput && shouldLogAgentTurnInput(options.input, finalResponseContract)) {
      logAgentTurnInput({
        input: planningInput,
        steps,
        scratchpad,
        conversationId: config?.configurable?.["conversationId"]
      });
      hasLoggedInitialInput = true;
    }
    try {
      output = await plan(
        options.agent,
        planningInput,
        steps,
        scratchpad,
        config
      );
    } catch (e) {
      if (!(e instanceof OutputParserException2)) {
        throw e;
      }
      output = [toParsingErrorAction(handleParsingErrors, e)];
    }
    checkAborted(signal);
    if (isAgentFinish(output)) {
      if (finishContract != null) {
        finishContractRetryCount += 1;
        if (finishContractRetryCount > MAX_FINISH_CONTRACT_RETRY) {
          throw new Error(
            finishContract.errorMessage ?? `Agent finished without calling ${finishContract.toolName}.`
          );
        }
        const violationMessage = buildFinishContractViolationMessage(
          finishContract,
          output,
          finishContractRetryCount
        );
        scratchpad.push({
          type: "human_update",
          messages: [violationMessage]
        });
        yield {
          type: "human-update",
          messages: [violationMessage]
        };
        continue;
      }
      const message = output.returnValues["message"];
      if (finalResponseContract != null) {
        logStructuredAgentFinish(
          output,
          config?.configurable?.["conversationId"]
        );
      }
      yield {
        type: "round-decision",
        canContinue: false
      };
      const pending2 = options.messageQueue?.drain() ?? [];
      if (pending2.length > 0) {
        yield {
          type: "human-update",
          messages: pending2
        };
      }
      yield {
        type: "done",
        output: toOutput(output.returnValues["output"]),
        log: output.log,
        steps,
        message
      };
      return;
    }
    if (output.length > 0) {
      const last2 = output[output.length - 1];
      const tool2 = toolMap[last2.tool?.toLowerCase()];
      yield {
        type: "round-decision",
        canContinue: !tool2?.returnDirect
      };
      yield {
        type: "tool-call",
        actions: output
      };
    }
    const newSteps = await executeTools(
      output,
      toolMap,
      config,
      signal,
      handleParsingErrors,
      options.handleToolRuntimeErrors
    );
    steps.push(...newSteps);
    scratchpad.push(...newSteps);
    if (newSteps.length > 0) {
      yield {
        type: "tool-result",
        steps: newSteps
      };
    }
    const last = newSteps[newSteps.length - 1];
    const tool = last ? toolMap[last.action.tool?.toLowerCase()] : void 0;
    if (tool?.returnDirect && last != null) {
      const message = new AIMessage3({
        content: toOutput(last.observation),
        additional_kwargs: {
          chatluna_agent_terminal_tool: {
            name: last.action.tool,
            input: last.action.toolInput
          }
        }
      });
      const pending2 = options.messageQueue?.drain() ?? [];
      if (pending2.length > 0) {
        yield {
          type: "human-update",
          messages: pending2
        };
      }
      yield {
        type: "done",
        output: toOutput(last.observation),
        log: last.action.log,
        steps,
        message
      };
      return;
    }
    iterations += 1;
  }
  yield {
    type: "round-decision",
    canContinue: false
  };
  yield {
    type: "done",
    output: "Agent stopped due to iteration limit.",
    log: "",
    steps
  };
}
__name(runAgent, "runAgent");
var AgentExecutor = class _AgentExecutor extends BaseChain {
  static {
    __name(this, "AgentExecutor");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  lc_serializable = false;
  agent;
  tools;
  returnIntermediateSteps = false;
  maxIterations;
  handleParsingErrors;
  handleToolRuntimeErrors;
  finishContract;
  constructor(fields) {
    super(fields);
    this.agent = fields.agent;
    this.tools = fields.tools;
    this.returnIntermediateSteps = fields.returnIntermediateSteps ?? false;
    this.maxIterations = fields.maxIterations;
    this.handleParsingErrors = fields.handleParsingErrors;
    this.handleToolRuntimeErrors = fields.handleToolRuntimeErrors;
    this.finishContract = fields.finishContract;
  }
  get inputKeys() {
    return ["input"];
  }
  get outputKeys() {
    return ["output"];
  }
  static fromAgentAndTools(fields) {
    return new _AgentExecutor(fields);
  }
  async _call(inputs, runManager, config) {
    const configurable = config?.configurable ?? {};
    const runner = runAgent({
      agent: this.agent,
      tools: this.tools,
      input: inputs,
      messageQueue: configurable.messageQueue,
      signal: config?.signal,
      maxIterations: this.maxIterations,
      handleParsingErrors: this.handleParsingErrors,
      handleToolRuntimeErrors: this.handleToolRuntimeErrors,
      config,
      finishContract: this.finishContract
    });
    for await (const event of runner) {
      if (event.type === "tool-call") {
        for (const action of event.actions) {
          await runManager?.handleAgentAction(action);
        }
      }
      await configurable.onAgentEvent?.(event);
      if (event.type === "done") {
        const returnValues = event.message ? {
          output: event.output,
          message: event.message
        } : {
          output: event.output
        };
        await runManager?.handleAgentEnd({
          returnValues,
          log: event.log
        });
        return {
          output: event.output,
          ...this.returnIntermediateSteps ? {
            intermediateSteps: event.steps
          } : {},
          message: event.message ?? new AIMessage3(event.output)
        };
      }
    }
    throw new Error("Agent executor did not return a final output");
  }
  _chainType() {
    return "agent_executor";
  }
};
function isAgentObservation(value) {
  if (typeof value === "string") {
    return true;
  }
  if (!Array.isArray(value)) {
    return false;
  }
  return value.every((item) => isMessageContentComplex(item));
}
__name(isAgentObservation, "isAgentObservation");
function coerceToAgentObservation(observation, toolName) {
  if (isAgentObservation(observation)) {
    if (Array.isArray(observation) && observation.every(isMessageContentText)) {
      return observation.map((item) => item.text).join("");
    }
    return observation;
  }
  logger.warn(
    `Tool ${toolName ?? "unknown"} returned unsupported observation type`,
    observation
  );
  try {
    return JSON.stringify(observation) ?? String(observation);
  } catch {
    return String(observation);
  }
}
__name(coerceToAgentObservation, "coerceToAgentObservation");
function toToolInputErrorObservation(handleParsingErrors, error) {
  if (handleParsingErrors === true || handleParsingErrors === false) {
    return "Invalid or incomplete tool input." + error.message + " " + error.output + "Please try again.";
  }
  if (typeof handleParsingErrors === "string") {
    return handleParsingErrors;
  }
  return handleParsingErrors(error);
}
__name(toToolInputErrorObservation, "toToolInputErrorObservation");
function toOutput(value) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.every(isMessageContentText)) {
    return value.map((item) => item.text).join("");
  }
  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}
__name(toOutput, "toOutput");
function isAgentFinish(output) {
  return !Array.isArray(output) && "returnValues" in output;
}
__name(isAgentFinish, "isAgentFinish");
function checkAborted(signal) {
  if (!signal?.aborted) {
    return;
  }
  throw signal.reason ?? new Error("Aborted");
}
__name(checkAborted, "checkAborted");
function toParsingErrorAction(handleParsingErrors, error) {
  let observation;
  let text = error.message;
  if (handleParsingErrors === true) {
    observation = coerceToAgentObservation(error.observation);
    text = error.llmOutput ?? "";
  } else if (typeof handleParsingErrors === "string") {
    observation = handleParsingErrors;
  } else if (typeof handleParsingErrors === "function") {
    observation = handleParsingErrors(error);
  } else {
    throw error;
  }
  return {
    tool: "_Exception",
    toolInput: typeof observation === "string" ? observation : JSON.stringify(observation) ?? "",
    log: text
  };
}
__name(toParsingErrorAction, "toParsingErrorAction");

// src/llm-core/agent/react/index.ts
import { PromptTemplate } from "@langchain/core/prompts";
import {
  RunnableLambda as RunnableLambda2,
  RunnablePassthrough as RunnablePassthrough2,
  RunnableSequence as RunnableSequence2
} from "@langchain/core/runnables";

// src/llm-core/agent/react/output_parser.ts
import { renderTemplate } from "@langchain/core/prompts";
import {
  BaseOutputParser as BaseOutputParser2,
  OutputParserException as OutputParserException3
} from "@langchain/core/output_parsers";

// src/llm-core/agent/react/prompt.ts
var FORMAT_INSTRUCTIONS = `You are an expert assistant who can solve any task using tool calls. You will be given a task to solve as best you can.
To do so, you have been given access to the following tools: {tool_names}

The tool calls you write are actions: after the tools are executed, you will get the results of the tool calls as "observations".
At each step, you should first explain your reasoning towards solving the task and the tools that you want to use within <thought> tags.
Then you should write one or more valid JSON tool calls within <tool_calling> tags.
This Thought/Tool_calling/Observation cycle can repeat N times, you should take several steps when needed.

Here are the output format:

<thought>
Your reasoning and thought process for the current step
</thought>

<tool_calling>
[
  {{
    "name": "tool_name",
    "arguments": {{"param1": "value1", "param2": "value2"}}
   }}
]
</tool_calling>

You can call multiple tools at once by including multiple tool objects in the JSON array within the <tool_calling> tags.

ONLY output within the <thought> and <tool_calling> sequences. You will get the Observation from the tool calls. Do not output the Observation yourself.

To provide the final answer to the task, use a tool call with "name": "final_answer". It is the only way to complete the task, else you will be stuck on a loop. So your final output should look like this:

<thought>
I have gathered all the necessary information and can now provide the final answer.
</thought>

<tool_calling>
[
  {{
    "name": "final_answer",
    "arguments": {{"answer": "insert your final answer here"}}
  }}
]
</tool_calling>

Here are a few examples using notional tools:
---
Task: "What is the result of the following operation: 5 + 3 + 1294.678?"

<thought>
I need to calculate the sum of 5 + 3 + 1294.678. I'll use the python_interpreter tool to execute this calculation.
</thought>

<tool_calling>
[
  {{
    "name": "python_interpreter",
    "arguments": {{"code": "5 + 3 + 1294.678"}}
  }}
]
</tool_calling>

Observation: 1302.678

<thought>
I have calculated the result. Now I can provide the final answer.
</thought>

<tool_calling>
[
  {{
    "name": "final_answer",
    "arguments": {{"answer": "1302.678"}}
  }}
]
</tool_calling>

---
Task: "Which city has the highest population, Guangzhou or Shanghai?"

<thought>
I need to search for the population data of both Guangzhou and Shanghai to compare them. I'll search for both cities' population information simultaneously.
</thought>

<tool_calling>
[
  {{
    "name": "search",
    "arguments": {{"query": "Population Guangzhou 2023"}}
  }},
  {{
    "name": "search",
    "arguments": {{"query": "Population Shanghai 2023"}}
  }}
]
</tool_calling>

Observation: ['Guangzhou has a population of 15 million inhabitants as of 2021.'] and ['Shanghai has a population of 26 million (2019)']

<thought>
Based on the search results, Shanghai has a population of 26 million while Guangzhou has 15 million. Therefore, Shanghai has the higher population.
</thought>

<tool_calling>
[
  {{
    "name": "final_answer",
    "arguments": {{"answer": "Shanghai has the highest population with 26 million people, compared to Guangzhou's 15 million people."}}
  }}
]
</tool_calling>

Above examples were using notional tools that might not exist for you. You only have access to these tools:

{tool_descriptions}

Here are the rules you should always follow to solve your task:
1. ALWAYS provide tool calls within <tool_calling> tags, else you will fail.
2. Always use the right arguments for the tools. Never use variable names as the action arguments, use the actual values instead.
3. You can call multiple tools at once if it makes sense for efficiency.
4. Call tools only when needed: do not call the search agent if you do not need information, try to solve the task yourself.
If no tool call is needed, use final_answer tool to return your answer.
5. Never re-do a tool call that you previously did with the exact same parameters.
6. ALWAYS include your reasoning in <thought> tags before making any tool calls.

Now Begin! If you solve the task correctly, you will receive a reward of $1,000,000.`;

// src/llm-core/agent/react/output_parser.ts
var ReActMultiInputOutputParser = class extends BaseOutputParser2 {
  static {
    __name(this, "ReActMultiInputOutputParser");
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  lc_namespace = ["langchain", "agents", "react"];
  toolNames;
  constructor(fields) {
    super(fields);
    this.toolNames = fields.toolNames;
  }
  /**
   * Parses the given text into an AgentAction[] or AgentFinish object.
   * @param text Text to parse.
   * @returns Promise that resolves to an AgentAction[] or AgentFinish object.
   */
  async parse(text) {
    const thoughtRegex = /<thought>(.*?)<\/thought>/s;
    const toolCallingRegex = /<tool_calling>(.*?)<\/tool_calling>/s;
    const thoughtMatch = text.match(thoughtRegex);
    const toolCallingMatch = text.match(toolCallingRegex);
    if (toolCallingMatch) {
      const [, toolCallingContent] = toolCallingMatch;
      const [, thoughts] = thoughtMatch || ["", ""];
      const cleanedContent = toolCallingContent.trim();
      return this.parseActions(cleanedContent, thoughts.trim());
    }
    return {
      returnValues: {
        output: text.trim()
      },
      log: text.trim()
    };
  }
  parseActions(toolCallingContent, thoughts) {
    try {
      const parsedActions = JSON.parse(toolCallingContent);
      if (!Array.isArray(parsedActions)) {
        throw new OutputParserException3(
          `Tool calling content must be an array: ${toolCallingContent}`
        );
      }
      const finalAnswerAction = parsedActions.find(
        (action) => action.name === "final_answer"
      );
      if (finalAnswerAction) {
        return {
          returnValues: {
            output: finalAnswerAction.arguments["answer"]
          },
          log: thoughts
        };
      }
      return parsedActions.map((action) => {
        if (action.name == null || action.arguments == null) {
          throw new OutputParserException3(
            `Invalid action format: ${JSON.stringify(action)}`
          );
        }
        return {
          tool: action.name,
          toolInput: action.arguments || {},
          log: thoughts
        };
      });
    } catch (e) {
      throw new OutputParserException3(
        `Could not parse tool calling content: ${toolCallingContent}. Error: ${e}`
      );
    }
  }
  /**
   * Returns the format instructions as a string.
   * @param options Options for getting the format instructions.
   * @returns Format instructions as a string.
   */
  getFormatInstructions() {
    return renderTemplate(FORMAT_INSTRUCTIONS, "f-string", {
      tool_names: this.toolNames.join(", ")
    });
  }
};

// src/llm-core/agent/render.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import {
  isOpenAITool
} from "@langchain/core/language_models/base";
function renderTextDescriptionAndArgs(tools) {
  if (tools.every(isOpenAITool)) {
    return tools.map(
      (tool) => `${tool.function.name}${tool.function.description ? `: ${tool.function.description}` : ""}, args: ${JSON.stringify(tool.function.parameters)}`
    ).join("\n");
  }
  return tools.map(
    (tool) => `${tool.name}: ${tool.description}, args: ${JSON.stringify(
      zodToJsonSchema(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tool.schema
      ).properties
    )}`
  ).join("\n\n");
}
__name(renderTextDescriptionAndArgs, "renderTextDescriptionAndArgs");

// src/llm-core/agent/react/index.ts
import { getMessageContent as getMessageContent3 } from "koishi-plugin-chatluna/utils/string";
function createReactAgent({
  llm,
  tools,
  prompt,
  instructions
}) {
  const toolNames = tools.map((tool) => tool.name);
  const toolDescriptions = renderTextDescriptionAndArgs(tools);
  const outputParser = new ReActMultiInputOutputParser({
    toolNames
  });
  const instructionsFormat = PromptTemplate.fromTemplate(
    instructions ?? FORMAT_INSTRUCTIONS
  ).format({
    tool_descriptions: toolDescriptions,
    tool_names: toolNames.join(", ")
  });
  prompt = prompt.partialSync({
    instructions: /* @__PURE__ */ __name(() => instructionsFormat, "instructions")
  });
  const agent = RunnableSequence2.from(
    [
      RunnablePassthrough2.assign({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        agent_scratchpad: /* @__PURE__ */ __name((input) => formatLogToString(input.steps), "agent_scratchpad")
      }),
      prompt,
      llm,
      RunnableLambda2.from(async (input) => {
        const result = await outputParser.parse(
          getMessageContent3(input.content) ?? ""
        );
        if (!Array.isArray(result) && "returnValues" in result) {
          return {
            ...result,
            returnValues: {
              ...result.returnValues,
              message: input
            }
          };
        }
        return result;
      })
    ],
    "ReactAgent"
  );
  return agent;
}
__name(createReactAgent, "createReactAgent");
function formatLogToString(intermediateSteps, observationPrefix = "Observation: ", llmPrefix = "") {
  const formattedSteps = intermediateSteps.reduce(
    (thoughts, { action, observation }) => {
      const buffer = [];
      if (action.log) {
        buffer.push(`<thought>${action.log}</thought>`);
      }
      if (action.toolInput) {
        buffer.push(
          `<tool_calling>${JSON.stringify({
            name: action.tool,
            arguments: action.toolInput
          })}</tool_calling>`
        );
      }
      return thoughts + [...buffer, `
${observationPrefix}${observation}
`].join(
        "\n\n"
      );
    },
    ""
  );
  return formattedSteps;
}
__name(formatLogToString, "formatLogToString");

// src/llm-core/agent/creator.ts
import { computed, shallowRef } from "@vue/reactivity";
function createAgentConfig(options) {
  if (options.agentMode === "react") {
    const agent2 = computed(() => {
      const llm = options.llm.value;
      const tools = options.tools.value;
      const instructions = options.instructions?.value ?? void 0;
      return createReactAgent({
        llm,
        tools,
        prompt: options.prompt,
        instructions
      });
    });
    return computed(() => ({
      agent: agent2.value,
      tools: options.tools.value,
      agentMode: "react"
    }));
  }
  const agent = computed(
    () => createOpenAIAgent({
      llm: options.llm.value,
      tools: options.tools.value,
      prompt: options.prompt
    })
  );
  return computed(() => ({
    agent: agent.value,
    tools: options.tools.value,
    agentMode: "tool-calling"
  }));
}
__name(createAgentConfig, "createAgentConfig");
function createAgentExecutor(options) {
  const cfg = createAgentConfig(options);
  return computed(
    () => AgentExecutor.fromAgentAndTools({
      agent: cfg.value.agent,
      tools: cfg.value.tools,
      returnIntermediateSteps: options.returnIntermediateSteps,
      handleParsingErrors: options.handleParsingErrors,
      finishContract: options.finishContract
    })
  );
}
__name(createAgentExecutor, "createAgentExecutor");
function createToolsRef(options) {
  const activeTools = shallowRef([]);
  const tools = computed(() => {
    return activeTools.value.map((tool) => {
      try {
        return tool.createTool({
          embeddings: options.embeddings
        });
      } catch (error) {
        console.error(`Error creating tool ${tool.id}:`, error);
      }
    }).filter(Boolean);
  });
  const getActiveTools = /* @__PURE__ */ __name((session, messages, toolMask) => {
    const toolsRef = options.tools.value;
    const oldActiveTools = activeTools.value;
    const newActiveTools = toolsRef.filter((tool) => {
      if (!applyToolMask(tool.name, toolMask ?? options.toolMask)) {
        return false;
      }
      const selected = tool.selector(messages);
      return tool.authorization ? tool.authorization(session) && selected : selected;
    });
    const oldToolIds = new Set(oldActiveTools.map((t) => t.id));
    const hasChanges = newActiveTools.length !== oldActiveTools.length || newActiveTools.some((tool) => !oldToolIds.has(tool.id));
    return [newActiveTools, hasChanges];
  }, "getActiveTools");
  const update = /* @__PURE__ */ __name((session, messages, toolMask) => {
    const [newActiveTools, recreate] = getActiveTools(
      session,
      messages,
      toolMask
    );
    activeTools.value = newActiveTools;
    return recreate;
  }, "update");
  return {
    update,
    tools
  };
}
__name(createToolsRef, "createToolsRef");
export {
  AgentExecutor,
  MessageQueue,
  _formatIntermediateSteps,
  applyToolMask,
  coerceToAgentObservation,
  createAgentConfig,
  createAgentExecutor,
  createOpenAIAgent,
  createReactAgent,
  createToolsRef,
  ensureToolMaskAllows,
  formatLogToString,
  intersectToolMasks,
  runAgent,
  toToolInputErrorObservation
};
