import { ComputedRef } from '@vue/reactivity';
import { ChatLunaBaseEmbeddings, type ChatLunaChatModel } from '../platform/model';
import { StructuredTool } from '@langchain/core/tools';
import type { ChatLunaChatPrompt } from '../chain/prompt';
import { ChatLunaTool } from '../platform/types';
import { BaseMessage } from '@langchain/core/messages';
import { Session } from 'koishi';
import type { Runnable } from '@langchain/core/runnables';
import { AgentExecutor } from './executor';
import { ToolMask, type AgentFinishContract } from './types';
export interface CreateAgentConfigOptions {
    llm: ComputedRef<ChatLunaChatModel>;
    tools: ComputedRef<StructuredTool[]>;
    prompt: ChatLunaChatPrompt;
    agentMode: 'react' | 'tool-calling';
    instructions?: ComputedRef<string>;
}
export interface AgentConfig {
    agent: Runnable;
    tools: StructuredTool[];
    agentMode: 'react' | 'tool-calling';
}
export interface CreateAgentExecutorOptions {
    llm: ComputedRef<ChatLunaChatModel>;
    tools: ComputedRef<StructuredTool[]>;
    prompt: ChatLunaChatPrompt;
    agentMode: 'react' | 'tool-calling';
    returnIntermediateSteps?: boolean;
    handleParsingErrors?: boolean;
    instructions?: ComputedRef<string>;
    finishContract?: AgentFinishContract;
}
export declare function createAgentConfig(options: CreateAgentConfigOptions): ComputedRef<AgentConfig>;
export declare function createAgentExecutor(options: CreateAgentExecutorOptions): ComputedRef<AgentExecutor>;
export interface CreateToolsRefOptions {
    tools: ComputedRef<ChatLunaTool[]>;
    embeddings: ChatLunaBaseEmbeddings;
    toolMask?: ToolMask;
}
export declare function createToolsRef(options: CreateToolsRefOptions): {
    update: (session: Session, messages: BaseMessage[], toolMask?: ToolMask) => boolean;
    tools: ComputedRef<StructuredTool<import("@langchain/core/tools").ToolSchemaBase, any, any, any>[]>;
};
