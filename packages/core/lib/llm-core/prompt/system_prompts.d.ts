import { BaseMessage } from '@langchain/core/messages';
import { ChatLunaContextManagerService, PromptPipelineMiddleware } from './context_manager';
export declare function countMessageTokens(message: BaseMessage, tokenCounter: (text: string) => Promise<number>): Promise<number>;
export declare function countMessagesTokens(messages: BaseMessage[], tokenCounter: (text: string) => Promise<number>): Promise<number>;
/**
 * Renders the preset template into system messages and pushes them onto
 * the result list.  Also handles the optional `instructions` partial.
 *
 * Populates `runtime._conversationSummaryPrompt` for later use by the
 * long_history middleware.
 */
export declare function createSystemPromptsMiddleware(): PromptPipelineMiddleware;
/**
 * Register the system_prompts pipeline middleware on the context manager.
 */
export declare function registerSystemPromptsMiddleware(contextManager: ChatLunaContextManagerService): () => void;
