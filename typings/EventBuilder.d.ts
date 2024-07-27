import { ClientEvents, Awaitable } from "discord.js";
import { RegistrationClient } from "./RegistrationClient";
/**
 * Giao diện cơ bản cho EventBuilderOptions
 */
interface BaseEventBuilderOptions {
    /**
     * Tên tùy chỉnh của sự kiện
     */
    eventCustomName: string;
    /**
     * Chỉ chạy sự kiện một lần
     */
    eventOnce: boolean;
}
/**
 * Giao diện nâng cao mở rộng từ BaseEventBuilderOptions
 * @template E - Tên sự kiện trong ClientEvents
 */
interface EventBuilderOptions<Event extends keyof ClientEvents> extends BaseEventBuilderOptions {
    /**
     * Tên sự kiện Discord.Events
     */
    eventName: Event;
    /**
     * Hàm thực thi sự kiện khi được yêu cầu
     * @param client - Client đã đăng ký
     * @param args - Các đối số của sự kiện
     */
    executeEvents: (client: RegistrationClient, ...args: ClientEvents[Event]) => Awaitable<void>;
}
/**
 * Xây dựng sự kiện cho Discord Client
 * @template Event - Tên sự kiện trong ClientEvents
 * @example
 * const { EventBuilder, Discord } = require("blackcat.js");
 * module.exports = new EventBuilder({
 *    eventCustomName: "Tên của event",
 *    eventName: Discord.Events.etc,
 *    eventOnce: false,
 *    executeEvents: function(client, ...) {
 *      
 *    },
 * });
 */
export declare class EventBuilder<Event extends keyof ClientEvents> {
    constructor(options: EventBuilderOptions<Event>);
    /**
     * Chuyển đổi thể hiện EventBuilder thành một đối tượng JSON
     * @returns {object} Đối tượng JSON của EventBuilder
     */
    public toJSON(): object;
}
