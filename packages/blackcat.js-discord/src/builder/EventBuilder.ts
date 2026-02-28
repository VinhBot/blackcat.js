import type { ClientEvents } from "discord.js";
import type { Client } from "..";

/**
 * Cấu hình cho Event Builder.
 *
 * @template K - Tên event của Discord Client.
 * Mặc định là union của toàn bộ keys trong ClientEvents.
 */
export interface EventBuilderOptions<K extends keyof ClientEvents = keyof ClientEvents> {
    /**
     * Tên event cần lắng nghe.
     *
     * Ví dụ:
     * - "ready"
     * - "interactionCreate"
     * - "guildMemberAdd"
     */
    eventName: K;
    /**
     * Xác định event chỉ chạy một lần hay không.
     *
     * - true  → sử dụng client.once(...)
     * - false → sử dụng client.on(...)
     *
     * Mặc định là false.
     */
    once?: boolean;
    /**
     * Hàm xử lý khi event được emit.
     *
     * @param {Client} client - Instance Discord client.
     * @param {ClientEvents[K]} args - Danh sách tham số do Discord cung cấp, được suy ra chính xác theo eventName (ClientEvents[K]).
     *
     * Ví dụ:
     * - K = "ready"               → args = [Client]
     * - K = "interactionCreate"   → args = [Interaction]
     */
    execute: (client: Client, ...args: ClientEvents[K]) => Promise<void> | void;
}

export class EventBuilder<K extends keyof ClientEvents> {
    public readonly eventName: K;
    public readonly once: boolean;
    public readonly execute: EventBuilderOptions<K>["execute"];
    constructor(options: EventBuilderOptions<K>) {
        this.eventName = options.eventName;
        this.once = options.once ?? false;
        this.execute = options.execute;
    }
}
