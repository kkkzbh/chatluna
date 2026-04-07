import { AIMessage } from '@langchain/core/messages';
import { ComputedRef } from '@vue/reactivity';
import { Context } from 'koishi';
import { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model';
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service';
import { ModelInfo } from 'koishi-plugin-chatluna/llm-core/platform/types';
export type ChatLunaRequestMode = 'chat_completions' | 'responses';
export interface ChatModelInitDescriptor {
    platform: string;
    canonicalModel: string;
    transportModel: string;
    requestMode: ChatLunaRequestMode;
}
export declare function createDisplayResponse(responseMessage: AIMessage): AIMessage;
export declare function resolveChatModelInitDescriptor(args: {
    model: string;
    requestMode?: string | null;
    transportModel?: string | null;
    additionalKwargs?: Record<string, unknown> | null;
}): ChatModelInitDescriptor;
export declare function buildChatModelInitCacheKey(descriptor: ChatModelInitDescriptor): string;
export declare function initEmbeddings(service: PlatformService, model: string | undefined): Promise<ComputedRef<import("koishi-plugin-chatluna/llm-core/model/in_memory").EmptyEmbeddings>>;
export declare function initModel(ctx: Context, service: PlatformService, descriptor: ChatModelInitDescriptor): Promise<[
    ComputedRef<ChatLunaChatModel>,
    ComputedRef<ModelInfo | undefined>
]>;
export declare function supportChatMode(modelInfo: ModelInfo, chatMode: string): boolean;
