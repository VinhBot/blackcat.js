import { ClientEvents, Awaitable } from "discord.js";
import { RegistrationClient } from "./RegistrationClient";
/**
 * @example
 * const events = new EventBuilder({
 *      eventCustomName: "events.js",
 *      eventName: Discord.Events,
 *      eventOnce: false,
 *      executeEvents: (client, ...) => {
 *          // code ở đây
 *      }
 * });
 */

export declare class EventBuilder<Event extends keyof ClientEvents> {
    constructor(options: {
        /**
         * Tên tùy chỉnh của sự kiện 
         */
        eventCustomName: string;
        /**
         * Tên sự kiện Discord.Events
         */
        eventName: Event;
        /**
         * Chỉ chạy events 1 lần
         */
        eventOnce: boolean;
        /**
         * Hàm thực thi sự kiện khi được yêu cầu
         */
        executeEvents: (client: RegistrationClient, ...args: ClientEvents[Event]) => Awaitable<void>;
    })
    /**
     * Chuyển đổi thể hiện EventBuilders thành một đối tượng JSON.
     * @returns {object} đưa EventBuilder thành dạng json.
     */
    public toJSON(): Object;
}