import { Context } from 'koishi';
import { ClientConfig, ClientConfigPool } from 'koishi-plugin-chatluna/llm-core/platform/config';
import { ChatLunaBaseEmbeddings, ChatLunaChatModel } from 'koishi-plugin-chatluna/llm-core/platform/model';
import { FileHandlingConfig, ModelInfo, PlatformClientNames } from 'koishi-plugin-chatluna/llm-core/platform/types';
import { RunnableConfig } from '@langchain/core/runnables';
export type { FileHandlingConfig };
export declare abstract class BasePlatformClient<T extends ClientConfig = ClientConfig, R = ChatLunaChatModel | ChatLunaBaseEmbeddings> {
    ctx: Context;
    configPool: ClientConfigPool<T>;
    private _modelPool;
    protected _modelInfos: Record<string, ModelInfo>;
    private _lock;
    abstract platform: PlatformClientNames;
    constructor(ctx: Context, configPool: ClientConfigPool<T>);
    isAvailable(config?: RunnableConfig): Promise<boolean>;
    get config(): T | undefined;
    getModels(config?: RunnableConfig): Promise<ModelInfo[]>;
    init(config?: RunnableConfig): Promise<void>;
    abstract refreshModels(config?: RunnableConfig): Promise<ModelInfo[]>;
    /**
     * Returns file handling configuration for this platform, or `null` if the
     * platform does not support inline file uploads beyond basic image input.
     *
     * Override in subclasses to provide platform-specific MIME types, size
     * limits, and inline data support.
     */
    getFileHandlingConfig(): FileHandlingConfig | null;
    protected abstract _createModel(model: string): R;
    createModel(model: string): R;
}
export declare abstract class PlatformModelClient<T extends ClientConfig = ClientConfig> extends BasePlatformClient<T, ChatLunaChatModel> {
    clearContext(): Promise<void>;
}
export declare abstract class PlatformEmbeddingsClient<T extends ClientConfig = ClientConfig> extends BasePlatformClient<T, ChatLunaBaseEmbeddings> {
}
export declare abstract class PlatformModelAndEmbeddingsClient<T extends ClientConfig = ClientConfig> extends BasePlatformClient<T> {
}
