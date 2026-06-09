import { CallbackManagerForChainRun } from '@langchain/core/callbacks/manager'
import {
    BaseMessage,
    AIMessage,
    AIMessageChunk,
    HumanMessage,
    isBaseMessage
} from '@langchain/core/messages'
import { OutputParserException } from '@langchain/core/output_parsers'
import {
    patchConfig,
    Runnable,
    type RunnableConfig
} from '@langchain/core/runnables'
import {
    StructuredTool,
    ToolInputParsingException
} from '@langchain/core/tools'
import type { ChainValues } from '@langchain/core/utils/types'
import { logger } from 'koishi-plugin-chatluna'
import {
    BaseChain,
    ChainInputs
} from 'koishi-plugin-chatluna/llm-core/chain/base'
import {
    isMessageContentComplex,
    isMessageContentText
} from 'koishi-plugin-chatluna/utils/langchain'
import {
    AgentAction,
    AgentEvent,
    AgentFinalResponseContract,
    AgentFinish,
    AgentFinishContract,
    AgentObservation,
    AgentStep,
    applyToolMask,
    MessageQueue,
    ScratchpadEntry
} from './types'

async function executeTools(
    actions: AgentAction[],
    toolMap: Record<string, StructuredTool>,
    config: RunnableConfig | undefined,
    signal: AbortSignal | undefined,
    handleParsingErrors: boolean | string | ((e: Error) => string),
    handleToolRuntimeErrors?: (e: Error) => string
) {
    return Promise.all(
        actions.map(async (action) => {
            checkAborted(signal)

            if (action.tool === '_Exception') {
                return {
                    action,
                    observation: coerceToAgentObservation(
                        typeof action.toolInput === 'string'
                            ? action.toolInput
                            : (JSON.stringify(action.toolInput) ?? '')
                    ),
                    outcome: 'error'
                } as AgentStep
            }

            const tool = toolMap[action.tool?.toLowerCase()]

            if (tool == null) {
                return {
                    action,
                    observation: `${action.tool} is not a valid tool, try another one.`
                    ,
                    outcome: 'error'
                } as AgentStep
            }

            const mask =
                config?.configurable?.['toolMask'] ??
                config?.configurable?.['subagentContext']?.['toolMask']
            if (mask && !applyToolMask(action.tool, mask)) {
                const allowed = Object.values(toolMap)
                    .map((item) => item.name)
                    .filter((name) => applyToolMask(name, mask))

                return {
                    action,
                    observation: `Tool '${action.tool}' is not allowed for the current sub-agent. Available tools: ${allowed.join(', ')}`
                    ,
                    outcome: 'error'
                } as AgentStep
            }

            const callMask =
                config?.configurable?.['toolMask']?.toolCallMask ??
                config?.configurable?.['subagentContext']?.['toolMask']
                    ?.toolCallMask
            if (callMask && !applyToolMask(action.tool, callMask)) {
                return {
                    action,
                    observation: `You do not have permission to call tool '${action.tool}'. Try another tool.`
                    ,
                    outcome: 'error'
                } as AgentStep
            }

            try {
                const observation = await tool.invoke(action.toolInput, config)
                return {
                    action,
                    observation: coerceToAgentObservation(
                        observation,
                        tool.name
                    ),
                    outcome: 'success'
                } as AgentStep
            } catch (e) {
                if (e instanceof ToolInputParsingException) {
                    return {
                        action,
                        observation: coerceToAgentObservation(
                            toToolInputErrorObservation(handleParsingErrors, e)
                        ),
                        outcome: 'error'
                    } as AgentStep
                }

                if (handleToolRuntimeErrors != null) {
                    return {
                        action,
                        observation: coerceToAgentObservation(
                            handleToolRuntimeErrors(e as Error),
                            tool.name
                        ),
                        outcome: 'error'
                    } as AgentStep
                }

                return {
                    action,
                    observation: coerceToAgentObservation(
                        `Something went wrong. Please Try Again. ${String(e)}`,
                        tool.name
                    ),
                    outcome: 'error'
                } as AgentStep
            }
        })
    )
}

async function plan(
    agent: Runnable,
    input: ChainValues,
    steps: AgentStep[],
    scratchpad: ScratchpadEntry[],
    config: RunnableConfig | undefined
) {
    const planConfig = buildAgentPlanningConfig(input, config)
    const stream = await agent.stream(
        {
            ...input,
            steps,
            scratchpadEntries: scratchpad
        },
        planConfig
    )

    let result: AgentAction[] | AgentAction | AgentFinish | undefined

    for await (const chunk of stream) {
        if (result !== undefined) {
            throw new Error('Multiple outputs from agent stream')
        }

        result = chunk as AgentAction[] | AgentAction | AgentFinish
    }

    if (result == null) {
        throw new Error('No output from agent stream')
    }

    if (isAgentFinish(result)) {
        return result
    }

    return Array.isArray(result) ? result : [result]
}

const AGENT_MODEL_CALL_OPTION_KEYS = [
    'model',
    'temperature',
    'maxTokens',
    'maxTokenLimit',
    'topP',
    'frequencyPenalty',
    'presencePenalty',
    'n',
    'logitBias',
    'id',
    'variables',
    'variables_hide',
    'overrideRequestParams',
    'stream',
    'tool_choice',
    'stop',
    'timeout'
] as const

function buildAgentPlanningConfig(
    input: ChainValues,
    config: RunnableConfig | undefined
): RunnableConfig | undefined {
    const modelCallOptions: Record<string, unknown> = {}

    for (const key of AGENT_MODEL_CALL_OPTION_KEYS) {
        const value = input[key]
        if (value !== undefined) {
            modelCallOptions[key] = value
        }
    }

    if (Object.keys(modelCallOptions).length < 1) {
        return config
    }

    return {
        ...(config ?? {}),
        ...modelCallOptions
    }
}

const MAX_FINISH_CONTRACT_RETRY = 2

function buildFinishContractViolationMessage(
    finishContract: AgentFinishContract,
    output: AgentFinish,
    retryCount: number
) {
    const previousOutput = toOutput(
        output.returnValues['output'] ??
            output.returnValues['message']?.content ??
            ''
    ).trim()
    const retryNotice =
        retryCount >= MAX_FINISH_CONTRACT_RETRY
            ? 'This is the final retry.'
            : 'Retry immediately.'

    const lines = [
        `Protocol violation: you finished without calling ${finishContract.toolName}.`,
        'Do not speak to the user directly.',
        `You must end by calling ${finishContract.toolName}.`,
        'Use JSON arguments only.',
        'Required format: {"summary":"后台研究结论摘要"}.',
        retryNotice
    ]

    if (previousOutput.length > 0) {
        lines.push(`Your previous direct reply was: ${JSON.stringify(previousOutput)}`)
    }

    return new HumanMessage({
        content: lines.join('\n')
    })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeFinalResponseContract(rawContract: unknown): AgentFinalResponseContract | null {
    if (!isPlainRecord(rawContract)) {
        return null
    }

    const rawSchema = rawContract['schema']
    const schema = isPlainRecord(rawSchema) ? rawSchema : null
    const instruction =
        typeof rawContract['instruction'] === 'string' &&
        rawContract['instruction'].trim().length > 0
            ? rawContract['instruction'].trim()
            : undefined
    const name =
        typeof rawContract['name'] === 'string' && rawContract['name'].trim().length > 0
            ? rawContract['name'].trim()
            : undefined

    if (schema == null && instruction == null) {
        return null
    }

    return {
        schema,
        name,
        instruction
    }
}

function buildFinalResponseOverrideRequestParams(
    contract: AgentFinalResponseContract,
    rawOverride: unknown
) {
    const base =
        isPlainRecord(rawOverride)
            ? { ...(rawOverride as Record<string, unknown>) }
            : {}

    if (!isPlainRecord(contract.schema)) {
        return base
    }

    if (base['qqbot_request_mode'] === 'responses') {
        return {
            ...base,
            text: {
                format: {
                    type: 'json_schema',
                    name: contract.name ?? 'qqbot_structured_reply_v1',
                    strict: true,
                    schema: contract.schema
                }
            }
        }
    }

    return {
        ...base,
        response_format: {
            type: 'json_schema',
            json_schema: {
                name: contract.name ?? 'qqbot_structured_reply_v1',
                strict: true,
                schema: contract.schema
            }
        }
    }
}

function mergeFinalResponseInstructionAfterUserMessage(
    existing: unknown,
    instruction: string | undefined
): unknown {
    const normalizedInstruction = instruction?.trim()
    if (!normalizedInstruction) {
        return existing
    }

    if (existing == null) {
        return normalizedInstruction
    }

    if (typeof existing === 'string') {
        const normalizedExisting = existing.trim()
        if (!normalizedExisting) {
            return normalizedInstruction
        }
        return `${normalizedExisting}\n\n${normalizedInstruction}`
    }

    if (Array.isArray(existing)) {
        return [...existing, normalizedInstruction]
    }

    return [existing, normalizedInstruction]
}

function tryParseJsonText(text: string): unknown {
    const trimmed = text.trim()

    if (
        trimmed.length < 2 ||
        !(
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        )
    ) {
        return text
    }

    try {
        return JSON.parse(trimmed)
    } catch {
        return text
    }
}

function normalizeAgentFinishLogValue(value: unknown): unknown {
    if (typeof value === 'string') {
        return tryParseJsonText(value)
    }

    return value
}

const AGENT_INPUT_PREVIEW_MAX_LENGTH = 200
const AGENT_HISTORY_PREVIEW_LIMIT = 2
const AGENT_VARIABLE_KEY_LIMIT = 12
const AGENT_SCHEMA_KEY_LIMIT = 12

function isLogRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === 'object' && !Array.isArray(value)
}

function compactWhitespace(value: string) {
    return value.replace(/\s+/g, ' ').trim()
}

function summarizeTextValue(value: string, maxLength: number) {
    const normalized = compactWhitespace(value)
    if (normalized.length <= maxLength) {
        return {
            preview: normalized,
            length: normalized.length,
            truncated: false
        }
    }

    return {
        preview: `${normalized.slice(0, Math.max(0, maxLength - 3))}...`,
        length: normalized.length,
        truncated: true
    }
}

function summarizeStringList(values: string[], maxLength: number) {
    const uniqueValues = [...new Set(values.filter((value) => value.length > 0))]
    return {
        values: uniqueValues.slice(0, maxLength),
        omittedCount: Math.max(0, uniqueValues.length - maxLength)
    }
}

function summarizeMessageContent(content: unknown) {
    if (typeof content === 'string') {
        const summary = summarizeTextValue(content, AGENT_INPUT_PREVIEW_MAX_LENGTH)
        return {
            ...summary,
            contentKind: 'string',
            textPartCount: summary.length > 0 ? 1 : 0,
            imageCount: 0,
            contentTypes: [] as string[],
            omittedContentTypeCount: 0
        }
    }

    if (!Array.isArray(content)) {
        return null
    }

    const textParts: string[] = []
    const contentTypes: string[] = []
    let imageCount = 0

    for (const item of content) {
        if (typeof item === 'string') {
            textParts.push(item)
            continue
        }

        if (!isMessageContentComplex(item)) {
            continue
        }

        contentTypes.push(item.type)

        if (isMessageContentText(item) && typeof item.text === 'string') {
            textParts.push(item.text)
        } else if (item.type === 'image_url') {
            imageCount += 1
        }
    }

    const textSummary =
        textParts.length > 0
            ? summarizeTextValue(
                  textParts.join('\n'),
                  AGENT_INPUT_PREVIEW_MAX_LENGTH
              )
            : null
    const typeSummary = summarizeStringList(contentTypes, AGENT_SCHEMA_KEY_LIMIT)

        return {
            preview:
                textSummary?.preview ??
                (typeSummary.values.length > 0
                    ? `[${typeSummary.values.join(', ')}]`
                    : ''),
            length: textSummary?.length ?? 0,
            truncated: textSummary?.truncated ?? false,
            contentKind: 'array',
            textPartCount: textParts.length,
            imageCount,
            contentTypes: typeSummary.values,
            omittedContentTypeCount: typeSummary.omittedCount
        }
}

function summarizeAgentLogMessagePreview(message: BaseMessage) {
    const contentSummary = summarizeMessageContent(message.content)
    const toolCallCount =
        'tool_calls' in message &&
        Array.isArray((message as AIMessage | AIMessageChunk).tool_calls)
            ? (message as AIMessage | AIMessageChunk).tool_calls!.length
            : 0
    const summary: Record<string, unknown> = {
        type: message.getType(),
        preview: contentSummary?.preview ?? '',
        length: contentSummary?.length ?? 0
    }

    if (contentSummary?.truncated) {
        summary['truncated'] = true
    }

    if (
        contentSummary?.contentTypes != null &&
        contentSummary.contentTypes.length > 0
    ) {
        summary['contentTypes'] = contentSummary.contentTypes
    }

    if ((contentSummary?.omittedContentTypeCount ?? 0) > 0) {
        summary['omittedContentTypeCount'] =
            contentSummary!.omittedContentTypeCount
    }

    if (typeof contentSummary?.contentKind === 'string') {
        summary['contentKind'] = contentSummary.contentKind
    }

    if ((contentSummary?.textPartCount ?? 0) > 0) {
        summary['textPartCount'] = contentSummary!.textPartCount
    }

    if ((contentSummary?.imageCount ?? 0) > 0) {
        summary['imageCount'] = contentSummary!.imageCount
    }

    if (toolCallCount > 0) {
        summary['toolCallCount'] = toolCallCount
    }

    const replyMode = message.additional_kwargs?.qqbot_reply_mode
    if (typeof replyMode === 'string' && replyMode.length > 0) {
        summary['replyMode'] = replyMode
    }

    return summary
}

function summarizeChatHistory(history: unknown) {
    if (!Array.isArray(history)) {
        return {
            count: 0
        }
    }

    const messages = history.filter(isBaseMessage)

    return {
        count: messages.length,
        latest: messages
            .slice(-AGENT_HISTORY_PREVIEW_LIMIT)
            .map((message) => summarizeAgentLogMessagePreview(message))
    }
}

function summarizeVariables(value: unknown) {
    if (!isLogRecord(value)) {
        return {
            keys: []
        }
    }

    const keySummary = summarizeStringList(
        Object.keys(value).filter((key) => key !== 'variables_hide'),
        AGENT_VARIABLE_KEY_LIMIT
    )

    return {
        keys: keySummary.values,
        omittedKeyCount: keySummary.omittedCount
    }
}

function summarizeResponseContract(input: ChainValues) {
    const rawContract = input['qqbot_final_response_contract']
    const contract = isLogRecord(rawContract) ? rawContract : null
    const rawSchema = isLogRecord(contract?.['schema'])
        ? contract['schema']
        : null
    const overrideRequestParams = input['overrideRequestParams']
    const responseFormat = isLogRecord(overrideRequestParams)
        ? overrideRequestParams['response_format']
        : null
    const jsonSchema = isLogRecord(responseFormat)
        ? responseFormat['json_schema']
        : null
    const summary: Record<string, unknown> = {
        hasContract: contract != null,
        hasSchema: isLogRecord(rawSchema),
        hasInstruction:
            typeof contract?.['instruction'] === 'string' &&
            contract['instruction'].trim().length > 0
    }

    if (typeof contract?.['protocol'] === 'string') {
        summary['protocol'] = contract['protocol']
    }

    if (typeof contract?.['requestMode'] === 'string') {
        summary['requestMode'] = contract['requestMode']
    }

    if (isLogRecord(responseFormat) && typeof responseFormat['type'] === 'string') {
        summary['responseFormatType'] = responseFormat['type']
    }

    if (isLogRecord(jsonSchema) && typeof jsonSchema['name'] === 'string') {
        summary['schemaName'] = jsonSchema['name']
    }

    if (!isLogRecord(rawSchema)) {
        return summary
    }

    if (typeof rawSchema['type'] === 'string') {
        summary['schemaTopLevelType'] = rawSchema['type']
    }

    const requiredSummary = summarizeStringList(
        Array.isArray(rawSchema['required'])
            ? rawSchema['required'].filter(
                  (value): value is string => typeof value === 'string'
              )
            : [],
        AGENT_SCHEMA_KEY_LIMIT
    )
    summary['required'] = requiredSummary.values
    if (requiredSummary.omittedCount > 0) {
        summary['omittedRequiredCount'] = requiredSummary.omittedCount
    }

    const properties = rawSchema['properties']
    const propertySummary = summarizeStringList(
        isLogRecord(properties) ? Object.keys(properties) : [],
        AGENT_SCHEMA_KEY_LIMIT
    )
    summary['propertyKeys'] = propertySummary.values
    if (propertySummary.omittedCount > 0) {
        summary['omittedPropertyCount'] = propertySummary.omittedCount
    }

    return summary
}

function summarizeAgentTurnInput(args: {
    input: ChainValues
    steps: AgentStep[]
    scratchpad: ScratchpadEntry[]
    conversationId: unknown
}) {
    const message = args.input['input']

    return {
        conversationId:
            typeof args.conversationId === 'string' &&
            args.conversationId.length > 0
                ? args.conversationId
                : null,
        input: isBaseMessage(message)
            ? summarizeAgentLogMessagePreview(message)
            : {
                  type: typeof message,
                  preview:
                      typeof message === 'string'
                          ? summarizeTextValue(
                                message,
                                AGENT_INPUT_PREVIEW_MAX_LENGTH
                            ).preview
                          : '',
                  length: typeof message === 'string' ? message.length : 0
              },
        chatHistory: summarizeChatHistory(args.input['chat_history']),
        variables: summarizeVariables(args.input['variables']),
        responseContract: summarizeResponseContract(args.input),
        runtime: {
            stepsCount: args.steps.length,
            scratchpadCount: args.scratchpad.length
        }
    }
}

function formatAgentLogBlock(
    label: '[agent-input]' | '[agent-finish]',
    record: Record<string, unknown>
) {
    return `${label}\n${JSON.stringify(
        normalizeAgentLogValue(record),
        null,
        2
    )}`
}

function logStructuredAgentFinish(
    output: AgentFinish,
    conversationId: unknown
) {
    const message = output.returnValues['message'] as
        | AIMessage
        | AIMessageChunk
        | undefined
    const payload =
        output.returnValues['output'] ?? message?.content ?? output.log ?? ''
    const record = {
        conversationId:
            typeof conversationId === 'string' && conversationId.length > 0
                ? conversationId
                : null,
        output: normalizeAgentFinishLogValue(payload)
    }

    logger.info(formatAgentLogBlock('[agent-finish]', record))
}

function serializeAgentLogMessage(message: BaseMessage) {
    const payload: Record<string, unknown> = {
        type: message.getType(),
        content: message.content
    }

    if (message.id != null) {
        payload['id'] = message.id
    }

    if (message.name != null) {
        payload['name'] = message.name
    }

    if (
        message.additional_kwargs != null &&
        Object.keys(message.additional_kwargs).length > 0
    ) {
        payload['additional_kwargs'] = message.additional_kwargs
    }

    if (
        'tool_calls' in message &&
        Array.isArray((message as AIMessage | AIMessageChunk).tool_calls) &&
        (message as AIMessage | AIMessageChunk).tool_calls!.length > 0
    ) {
        payload['tool_calls'] = (message as AIMessage | AIMessageChunk).tool_calls
    }

    return payload
}

function normalizeAgentLogValue(
    value: unknown,
    seen = new WeakSet<object>()
): unknown {
    if (isBaseMessage(value)) {
        return normalizeAgentLogValue(serializeAgentLogMessage(value), seen)
    }

    if (Array.isArray(value)) {
        return value.map((item) => normalizeAgentLogValue(item, seen))
    }

    if (value == null || typeof value !== 'object') {
        return value
    }

    if (seen.has(value)) {
        return '[Circular]'
    }

    seen.add(value)

    const normalized = Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
            .filter(
                ([key]) =>
                    key !== 'variables_hide' && key !== 'configurable'
            )
            .map(([key, item]) => [key, normalizeAgentLogValue(item, seen)])
    )

    seen.delete(value)

    return normalized
}

function logAgentTurnInput(args: {
    input: ChainValues
    steps: AgentStep[]
    scratchpad: ScratchpadEntry[]
    conversationId: unknown
}) {
    const record = summarizeAgentTurnInput(args)

    logger.info(formatAgentLogBlock('[agent-input]', record))
}

function shouldLogAgentTurnInput(
    input: ChainValues,
    finalResponseContract: AgentFinalResponseContract | null
) {
    if (finalResponseContract != null) {
        return true
    }

    const message = input['input']
    if (!isBaseMessage(message)) {
        return false
    }

    return message.additional_kwargs?.qqbot_reply_mode === 'agent'
}

// eslint-disable-next-line generator-star-spacing
export async function* runAgent(
    options: RunAgentOptions
): AsyncGenerator<AgentEvent> {
    const steps: AgentStep[] = []
    const scratchpad: ScratchpadEntry[] = []
    const signal =
        options.signal ?? (options.config?.signal as AbortSignal | undefined)
    const config =
        signal == null
            ? options.config
            : patchConfig(options.config, { signal })
    const toolMap = Object.fromEntries(
        options.tools.map((tool) => [tool.name.toLowerCase(), tool])
    )
    const maxIterations = options.maxIterations ?? 105
    const handleParsingErrors = options.handleParsingErrors ?? true
    const finishContract = options.finishContract
    const finalResponseContract = normalizeFinalResponseContract(
        options.input['qqbot_final_response_contract']
    )
    let finishContractRetryCount = 0
    let hasLoggedInitialInput = false

    let iterations = 0

    while (iterations < maxIterations) {
        checkAborted(signal)

        const pending = options.messageQueue?.drain() ?? []
        if (pending.length > 0) {
            scratchpad.push({
                type: 'human_update',
                messages: pending
            })

            yield {
                type: 'human-update',
                messages: pending
            }
        }

        yield {
            type: 'round-decision'
        }

        let output: AgentAction[] | AgentFinish

        const planningInput =
            finalResponseContract != null
                ? {
                      ...options.input,
                      after_user_message:
                          mergeFinalResponseInstructionAfterUserMessage(
                              options.input['after_user_message'],
                              finalResponseContract.instruction
                          ),
                      overrideRequestParams:
                          buildFinalResponseOverrideRequestParams(
                              finalResponseContract,
                              options.input['overrideRequestParams']
                          )
                  }
                : options.input

        if (
            !hasLoggedInitialInput &&
            shouldLogAgentTurnInput(options.input, finalResponseContract)
        ) {
            logAgentTurnInput({
                input: planningInput,
                steps,
                scratchpad,
                conversationId: config?.configurable?.['conversationId']
            })
            hasLoggedInitialInput = true
        }

        try {
            output = await plan(
                options.agent,
                planningInput,
                steps,
                scratchpad,
                config
            )
        } catch (e) {
            if (!(e instanceof OutputParserException)) {
                throw e
            }

            output = [toParsingErrorAction(handleParsingErrors, e)]
        }

        checkAborted(signal)

        if (isAgentFinish(output)) {
            if (finishContract != null) {
                finishContractRetryCount += 1

                if (finishContractRetryCount > MAX_FINISH_CONTRACT_RETRY) {
                    throw new Error(
                        finishContract.errorMessage ??
                            `Agent finished without calling ${finishContract.toolName}.`
                    )
                }

                const violationMessage = buildFinishContractViolationMessage(
                    finishContract,
                    output,
                    finishContractRetryCount
                )

                scratchpad.push({
                    type: 'human_update',
                    messages: [violationMessage]
                })

                yield {
                    type: 'human-update',
                    messages: [violationMessage]
                }

                continue
            }

            const message = output.returnValues['message'] as AIMessageChunk
            if (finalResponseContract != null) {
                logStructuredAgentFinish(
                    output,
                    config?.configurable?.['conversationId']
                )
            }

            yield {
                type: 'round-decision',
                canContinue: false
            }

            const pending = options.messageQueue?.drain() ?? []
            if (pending.length > 0) {
                yield {
                    type: 'human-update',
                    messages: pending
                }
            }

            yield {
                type: 'done',
                output: toOutput(output.returnValues['output']),
                log: output.log,
                steps,
                message
            }

            return
        }

        if (output.length > 0) {
            const last = output[output.length - 1]
            const tool = toolMap[last.tool?.toLowerCase()]

            yield {
                type: 'round-decision',
                canContinue: !tool?.returnDirect
            }

            yield {
                type: 'tool-call',
                actions: output
            }
        }

        const newSteps = await executeTools(
            output,
            toolMap,
            config,
            signal,
            handleParsingErrors,
            options.handleToolRuntimeErrors
        )

        steps.push(...newSteps)
        scratchpad.push(...newSteps)

        if (newSteps.length > 0) {
            yield {
                type: 'tool-result',
                steps: newSteps
            }
        }

        const last = newSteps[newSteps.length - 1]
        const tool = last ? toolMap[last.action.tool?.toLowerCase()] : undefined

        if (tool?.returnDirect && last != null) {
            const message = new AIMessage({
                content: toOutput(last.observation),
                additional_kwargs: {
                    chatluna_agent_terminal_tool: {
                        name: last.action.tool,
                        input: last.action.toolInput
                    }
                }
            })
            const pending = options.messageQueue?.drain() ?? []
            if (pending.length > 0) {
                yield {
                    type: 'human-update',
                    messages: pending
                }
            }

            yield {
                type: 'done',
                output: toOutput(last.observation),
                log: last.action.log,
                steps,
                message
            }

            return
        }

        iterations += 1
    }

    yield {
        type: 'round-decision',
        canContinue: false
    }

    yield {
        type: 'done',
        output: 'Agent stopped due to iteration limit.',
        log: '',
        steps
    }
}

export class AgentExecutor extends BaseChain<ChainValues, AgentExecutorOutput> {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    lc_serializable = false

    agent: Runnable

    tools: StructuredTool[]

    returnIntermediateSteps = false

    maxIterations?: number

    handleParsingErrors?: boolean | string | ((e: Error) => string)

    handleToolRuntimeErrors?: (e: Error) => string

    finishContract?: AgentFinishContract

    constructor(fields: AgentExecutorInput) {
        super(fields)
        this.agent = fields.agent
        this.tools = fields.tools
        this.returnIntermediateSteps = fields.returnIntermediateSteps ?? false
        this.maxIterations = fields.maxIterations
        this.handleParsingErrors = fields.handleParsingErrors
        this.handleToolRuntimeErrors = fields.handleToolRuntimeErrors
        this.finishContract = fields.finishContract
    }

    get inputKeys() {
        return ['input']
    }

    get outputKeys() {
        return ['output']
    }

    static fromAgentAndTools(fields: AgentExecutorInput) {
        return new AgentExecutor(fields)
    }

    async _call(
        inputs: ChainValues,
        runManager?: CallbackManagerForChainRun,
        config?: RunnableConfig
    ): Promise<AgentExecutorOutput> {
        const configurable = (config?.configurable ?? {}) as {
            messageQueue?: MessageQueue
            onAgentEvent?: (event: AgentEvent) => Promise<void> | void
        }

        const runner = runAgent({
            agent: this.agent,
            tools: this.tools,
            input: inputs,
            messageQueue: configurable.messageQueue,
            signal: config?.signal as AbortSignal | undefined,
            maxIterations: this.maxIterations,
            handleParsingErrors: this.handleParsingErrors,
            handleToolRuntimeErrors: this.handleToolRuntimeErrors,
            config,
            finishContract: this.finishContract
        })

        for await (const event of runner) {
            if (event.type === 'tool-call') {
                for (const action of event.actions) {
                    await runManager?.handleAgentAction(action)
                }
            }

            await configurable.onAgentEvent?.(event)

            if (event.type === 'done') {
                const returnValues = event.message
                    ? {
                          output: event.output,
                          message: event.message
                      }
                    : {
                          output: event.output
                      }

                await runManager?.handleAgentEnd({
                    returnValues,
                    log: event.log
                })

                return {
                    output: event.output,
                    ...(this.returnIntermediateSteps
                        ? {
                              intermediateSteps: event.steps
                          }
                        : {}),
                    message: event.message ?? new AIMessage(event.output)
                }
            }
        }

        throw new Error('Agent executor did not return a final output')
    }

    _chainType() {
        return 'agent_executor' as const
    }
}

export interface RunAgentOptions {
    agent: Runnable
    tools: StructuredTool[]
    input: ChainValues
    messageQueue?: MessageQueue
    signal?: AbortSignal
    maxIterations?: number
    handleParsingErrors?: boolean | string | ((e: Error) => string)
    handleToolRuntimeErrors?: (e: Error) => string
    config?: RunnableConfig
    finishContract?: AgentFinishContract
}

export interface AgentExecutorInput extends ChainInputs {
    agent: Runnable
    tools: StructuredTool[]
    returnIntermediateSteps?: boolean
    maxIterations?: number
    handleParsingErrors?: boolean | string | ((e: Error) => string)
    handleToolRuntimeErrors?: (e: Error) => string
    finishContract?: AgentFinishContract
}

export interface AgentExecutorOutput extends ChainValues {
    output: string
    intermediateSteps?: AgentStep[]
    message: AIMessage
}

function isAgentObservation(value: unknown): value is AgentObservation {
    if (typeof value === 'string') {
        return true
    }

    if (!Array.isArray(value)) {
        return false
    }

    return value.every((item) => isMessageContentComplex(item))
}

export function coerceToAgentObservation(
    observation: unknown,
    toolName?: string
): AgentObservation {
    if (isAgentObservation(observation)) {
        if (
            Array.isArray(observation) &&
            observation.every(isMessageContentText)
        ) {
            return observation.map((item) => item.text).join('')
        }

        return observation
    }

    logger.warn(
        `Tool ${toolName ?? 'unknown'} returned unsupported observation type`,
        observation
    )

    try {
        return JSON.stringify(observation) ?? String(observation)
    } catch {
        return String(observation)
    }
}

export function toToolInputErrorObservation(
    handleParsingErrors: boolean | string | ((e: Error) => string),
    error: ToolInputParsingException
): AgentObservation {
    if (handleParsingErrors === true || handleParsingErrors === false) {
        return (
            'Invalid or incomplete tool input.' +
            error.message +
            ' ' +
            error.output +
            'Please try again.'
        )
    }

    if (typeof handleParsingErrors === 'string') {
        return handleParsingErrors
    }

    return handleParsingErrors(error)
}

function toOutput(value: unknown): string {
    if (typeof value === 'string') {
        return value
    }

    if (Array.isArray(value) && value.every(isMessageContentText)) {
        return value.map((item) => item.text).join('')
    }

    try {
        return JSON.stringify(value) ?? String(value)
    } catch {
        return String(value)
    }
}

function isAgentFinish(
    output: AgentAction[] | AgentAction | AgentFinish
): output is AgentFinish {
    return !Array.isArray(output) && 'returnValues' in output
}

function checkAborted(signal?: AbortSignal) {
    if (!signal?.aborted) {
        return
    }

    throw signal.reason ?? new Error('Aborted')
}

function toParsingErrorAction(
    handleParsingErrors: boolean | string | ((e: Error) => string),
    error: OutputParserException
): AgentAction {
    let observation: AgentObservation
    let text = error.message

    if (handleParsingErrors === true) {
        observation = coerceToAgentObservation(error.observation)
        text = error.llmOutput ?? ''
    } else if (typeof handleParsingErrors === 'string') {
        observation = handleParsingErrors
    } else if (typeof handleParsingErrors === 'function') {
        observation = handleParsingErrors(error)
    } else {
        throw error
    }

    return {
        tool: '_Exception',
        toolInput:
            typeof observation === 'string'
                ? observation
                : (JSON.stringify(observation) ?? ''),
        log: text
    }
}
