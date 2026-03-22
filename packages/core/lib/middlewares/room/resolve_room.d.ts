import { Context } from 'koishi';
import { Config } from '../../config';
import { ConversationRoom } from '../../types';
import { ChatChain } from '../../chains/chain';
export declare function apply(ctx: Context, config: Config, chain: ChatChain): void;
export type ChatMode = 'plugin' | 'chat' | 'browsing' | 'reply-agent';
declare module '../../chains/chain' {
    interface ChainMiddlewareContextOptions {
        room?: ConversationRoom;
    }
    interface ChainMiddlewareName {
        resolve_room: never;
    }
}
