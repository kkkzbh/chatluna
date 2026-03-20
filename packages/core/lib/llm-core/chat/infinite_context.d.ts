import { ComputedRef } from '@vue/reactivity';
import { ChatLunaLLMChainWrapper } from 'koishi-plugin-chatluna/llm-core/chain/base';
import { KoishiChatMessageHistory } from 'koishi-plugin-chatluna/llm-core/memory/message';
import { PresetTemplate } from 'koishi-plugin-chatluna/llm-core/prompt';
export interface CompressContextResult {
    inputTokens: number;
    outputTokens: number;
    reducedTokens: number;
    reducedPercent: number;
    compressed: boolean;
}
export interface InfiniteContextManagerOptions {
    chatHistory: KoishiChatMessageHistory;
    conversationId: string;
    preset?: ComputedRef<PresetTemplate>;
    threshold?: number;
}
export declare class InfiniteContextManager {
    private readonly options;
    private _chain?;
    constructor(options: InfiniteContextManagerOptions);
    compressIfNeeded(wrapper: ChatLunaLLMChainWrapper, force?: boolean): Promise<CompressContextResult>;
    private _rewriteChatHistory;
    private _countMessagesTokens;
    private _ensureInfiniteContextChain;
}
