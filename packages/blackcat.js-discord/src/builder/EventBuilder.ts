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
     * Tên event Discord.
     * Phải thuộc `keyof ClientEvents`.
     */
    eventName: K;
    /**
     * Xác định event chỉ chạy **một lần** (`client.once`)
     * hay chạy mỗi lần event được emit (`client.on`).
     *
     * @default false
     */
    once?: boolean;
    /**
     * Hàm xử lý khi event được kích hoạt.
     * Tham số sẽ được suy ra tự động từ `ClientEvents[K]`.
     */
    execute: (client: Client, ...args: ClientEvents[K]) => Promise<any> | any;
}

/**
 * Builder dùng để định nghĩa một **Discord Client Event**.
 *
 * Class này giúp tạo event theo cấu trúc rõ ràng và có **TypeScript type inference**
 * dựa trên `ClientEvents` của `discord.js`.
 *
 * @template K Tên event thuộc `keyof ClientEvents`
 *
 * @example
 * ```ts
 * import { EventBuilder } from "blackcat.js-discord";
 *
 * const readyEvent = new EventBuilder({
 *   eventName: "ready",
 *   once: true,
 *   execute: (client) => {
 *     console.log(`Bot đã đăng nhập với tên ${client.user?.tag}`);
 *   }
 * });
 *
 * export default readyEvent;
 * ```
 *
 * @remarks
 * - `eventName` phải là một key hợp lệ của `ClientEvents`
 * - `once` xác định event chỉ chạy **một lần** hay **mỗi lần emit**
 */
export class EventBuilder<K extends keyof ClientEvents> {
    /**
     * Tên event Discord.
     * Phải thuộc `keyof ClientEvents`.
     */
    public readonly eventName: K;
    /**
     * Xác định event chỉ chạy **một lần** (`client.once`)
     * hay chạy mỗi lần event được emit (`client.on`).
     *
     * @default false
     */
    public readonly once: boolean;
    /**
     * Hàm xử lý khi event được kích hoạt.
     * Tham số sẽ được suy ra tự động từ `ClientEvents[K]`.
     */
    public readonly execute: EventBuilderOptions<K>["execute"];
    /**
     * Tạo một EventBuilder mới.
     *
     * @param options Cấu hình event
     */
    constructor(options: EventBuilderOptions<K>) {
        this.eventName = options.eventName;
        this.once = options.once ?? false;
        this.execute = options.execute;
    }
}
