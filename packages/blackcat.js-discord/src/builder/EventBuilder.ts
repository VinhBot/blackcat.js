import type { ClientEvents } from "discord.js";
import type { Client } from "..";

/**
 * Cấu hình cho EventBuilder
 * 
 * @typeParam K Tên event (key của ClientEvents)
 * 
 * @remarks
 * Interface này định nghĩa cấu trúc options dùng để khởi tạo {@link EventBuilder}.
 *
 * Mỗi event trong Discord sẽ có signature riêng (args khác nhau),
 * vì vậy generic `K` sẽ giúp TypeScript infer chính xác tham số của `execute`.
 * 
 * @example
 * ```ts
 * const options: EventBuilderOptions<"messageCreate"> = {
 *   eventName: "messageCreate",
 *   execute: (client, message) => {
 *     console.log(message.content);
 *   }
 * };
 * ```
 */
export interface EventBuilderOptions<K extends keyof ClientEvents = keyof ClientEvents> {
    /**
     * Tên event Discord
     */
    eventName: K;
    /**
     * Chỉ chạy 1 lần hay không
     * 
     * @defaultValue false
     */
    once?: boolean;
    /**
     * Hàm xử lý event
     * 
     * @remarks
     * Signature phụ thuộc vào `eventName`
     */
    execute: (client: Client, ...args: ClientEvents[K]) => Promise<any> | any;
}

/**
 * Builder dùng để tạo và cấu hình Discord Event
 * 
 * @typeParam K Tên event (key của ClientEvents)
 * 
 * @example
 * ```ts
 * const event = new EventBuilder()
 *   .setEventName("ready")
 *   .setOnce(true)
 *   .setExecute((client) => {
 *     console.log("Bot is ready!");
 *   });
 * ```
 * 
 * @example
 * ```ts
 * const event = new EventBuilder({
 *   eventName: "messageCreate",
 *   execute: (client, message) => {
 *     console.log(message.content);
 *   }
 * });
 * ```
 */
export class EventBuilder<K extends keyof ClientEvents = keyof ClientEvents> {
    /**
     * Tên event Discord
     */
    public eventName?: K;
    /**
     * Chỉ chạy 1 lần hay không
     */
    public once: boolean = false;
    /**
     * Hàm xử lý event
     */
    public execute?: (client: Client, ...args: ClientEvents[K]) => Promise<any> | any;
    /**
     * Tạo EventBuilder
     * 
     * @param options Cấu hình ban đầu
     * 
     * @remarks
     * Có thể khởi tạo rỗng rồi dùng setter hoặc truyền options ngay từ đầu.
     */
    constructor(options?: Partial<EventBuilderOptions<K>>) {
        if (!options) return;
        if (options.eventName) this.eventName = options.eventName;
        if (options.once !== undefined) this.once = options.once;
        if (options.execute) this.execute = options.execute;
    }
    /**
     * Thiết lập tên event
     * 
     * @typeParam T Tên event mới
     * @param eventName Tên event
     * 
     * @returns EventBuilder<T>
     * 
     * @remarks
     * Method này sẽ đổi generic của builder để phù hợp với event mới.
     * 
     * ⚠️ Sau khi đổi eventName, bạn nên gọi lại `setExecute`
     * để đảm bảo signature đúng với event mới.
     * 
     * @example
     * ```ts
     * const builder = new EventBuilder()
     *   .setEventName("guildCreate");
     * ```
     */
    public setEventName<T extends keyof ClientEvents>(eventName: T): EventBuilder<T> {
        (this as unknown as EventBuilder<T>).eventName = eventName;
        return this as unknown as EventBuilder<T>;
    }
    /**
     * Thiết lập chế độ chạy một lần
     * 
     * @param once true nếu chỉ chạy 1 lần
     * @returns this
     */
    public setOnce(once: boolean): this {
        this.once = once;
        return this;
    }
    /**
     * Thiết lập hàm xử lý event
     * 
     * @param execute Hàm handler
     * @returns this
     * 
     * @remarks
     * Signature của `execute` phụ thuộc vào generic `K` hiện tại.
     * 
     * @example
     * ```ts
     * new EventBuilder<"messageCreate">()
     *   .setExecute((client, message) => {
     *     console.log(message.content);
     *   });
     * ```
     */
    public setExecute(execute: (client: Client, ...args: ClientEvents[K]) => Promise<any> | any): this {
        this.execute = execute;
        return this;
    }
}