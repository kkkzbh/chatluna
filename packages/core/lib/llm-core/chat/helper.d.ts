import { Embeddings } from '@langchain/core/embeddings';
import { AIMessage } from '@langchain/core/messages';
import { ComputedRef } from '@vue/reactivity';
import { Context } from 'koishi';
import { ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model';
import { PlatformService } from 'koishi-plugin-chatluna/llm-core/platform/service';
import { ModelInfo } from 'koishi-plugin-chatluna/llm-core/platform/types';
export declare function createDisplayResponse(responseMessage: AIMessage): AIMessage;
export declare function initEmbeddings(service: PlatformService, model: string | undefined): Promise<ComputedRef<Embeddings<number[]>>>;
export declare function initModel(ctx: Context, service: PlatformService, llmPlatform: string, llmModelName: string): Promise<[
    ComputedRef<ChatLunaChatModel>,
    ComputedRef<ModelInfo | undefined>
]>;
export declare function supportChatMode(modelInfo: ModelInfo, chatMode: string): boolean;
