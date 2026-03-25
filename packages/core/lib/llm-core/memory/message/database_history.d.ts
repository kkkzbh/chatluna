import { Context } from 'koishi';
import { AIMessage, BaseMessage, MessageContent, MessageType } from '@langchain/core/messages';
import { BaseChatMessageHistory } from '@langchain/core/chat_history';
import type { AgentStep } from '../../agent/types';
export declare const INTERNAL_ADDITIONAL_ARG_PREFIX = "__chatluna_internal_";
export declare const TOOL_MEMORY_STORAGE_KEY = "__chatluna_internal_tool_memory_v1";
export declare const DEFAULT_TOOL_MEMORY_MAX_ENTRIES = 3;
export interface ToolMemoryEntry {
    turnId: string;
    createdAt: string;
    toolName: string;
    inputDigest: string;
    snippetFormat: 'text' | 'json';
    snippet: string;
    freshnessHint: string;
}
export interface ToolMemoryStoreOptions {
    storageKey?: string;
    maxEntries?: number;
}
export declare function parseToolMemoryEntries(raw: string | null | undefined): ToolMemoryEntry[];
export declare function buildToolMemoryEntriesFromSteps(steps: AgentStep[], options: {
    turnId: string;
    createdAt?: Date;
    finishToolName?: string;
}): ToolMemoryEntry[];
export interface ResearchReplyHistoryNormalizationResult {
    deletedMessageIds: string[];
    latestId: string | null;
    normalizedMessageId: string | null;
    normalizedText: string;
}
export declare class KoishiChatMessageHistory extends BaseChatMessageHistory {
    private _maxMessagesCount;
    lc_namespace: string[];
    conversationId: string;
    private _ctx;
    private _latestId;
    private _serializedChatHistory;
    private _chatHistory;
    private _additional_kwargs;
    private _updatedAt;
    constructor(ctx: Context, conversationId: string, _maxMessagesCount: number);
    get additionalArgs(): Record<string, string>;
    getMessages(): Promise<BaseMessage[]>;
    addUserMessage(message: string): Promise<void>;
    addAIChatMessage(message: string): Promise<void>;
    addMessage(message: BaseMessage): Promise<void>;
    addMessages(messages: BaseMessage[]): Promise<void>;
    addAgentToolBatch(steps: AgentStep[]): Promise<void>;
    normalizeResearchReplyHistory(finalVisibleText: string, updatedAt?: Date): Promise<ResearchReplyHistoryNormalizationResult>;
    clear(): Promise<void>;
    delete(): Promise<void>;
    updateAdditionalArg(key: string, value: string): Promise<void>;
    getAdditionalArg(key: string): Promise<string>;
    getAdditionalArgs(): Promise<{
        [key: string]: string;
    }>;
    deleteAdditionalArg(key: string): Promise<void>;
    storeToolMemoryEntries(entries: ToolMemoryEntry[], options?: ToolMemoryStoreOptions): Promise<void>;
    removeAllToolAndFunctionMessages(): Promise<void>;
    overrideAdditionalArgs(kwargs: {
        [key: string]: string;
    }): Promise<void>;
    private getLatestUpdateTime;
    private _loadMessages;
    private _loadConversation;
    loadConversation(): Promise<void>;
    private _trimMessages;
    private _saveConversation;
}
declare module 'koishi' {
    interface Tables {
        chathub_conversation: ChatLunaConversation;
        chathub_message: ChatLunaMessage;
    }
}
export interface ChatLunaMessage {
    text?: MessageContent;
    content?: ArrayBuffer;
    id: string;
    rawId?: string;
    role: MessageType;
    conversation: string;
    name?: string;
    tool_call_id?: string;
    tool_calls?: AIMessage['tool_calls'];
    additional_kwargs?: string;
    additional_kwargs_binary?: ArrayBuffer;
    parent?: string;
}
export interface ChatLunaConversation {
    id: string;
    latestId?: string;
    additional_kwargs?: string;
    updatedAt?: Date;
}
