import { MessageType } from '@langchain/core/messages';
import { type TiktokenModel } from 'js-tiktoken/lite';
import { resolveKnownModelContextSize } from './model_context_size';
export { resolveKnownModelContextSize };
export declare const getModelNameForTiktoken: (modelName: string) => TiktokenModel;
export declare const getEmbeddingContextSize: (modelName?: string) => number;
interface CalculateMaxTokenProps {
    prompt: string;
    modelName: TiktokenModel;
}
export declare const calculateMaxTokens: ({ prompt, modelName }: CalculateMaxTokenProps) => Promise<number>;
export declare function messageTypeToOpenAIRole(type: MessageType): string;
export declare const getModelContextSize: (modelName: string) => number;
export declare function resolveModelContextSize(modelName: string, maxTokens?: number | null): number;
export declare function parseRawModelName(modelName: string): [string, string];
