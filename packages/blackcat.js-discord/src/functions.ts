import { Message, InteractionCollector, ChatInputCommandInteraction, InteractionReplyOptions, MessageEditOptions } from "discord.js";
import type { MessageComponentType, ButtonInteraction, ChannelSelectMenuInteraction, MentionableSelectMenuInteraction, RoleSelectMenuInteraction, StringSelectMenuInteraction, UserSelectMenuInteraction, } from "discord.js";
/**
 * @hidden
 */
export type CollectorTarget = Message | ChatInputCommandInteraction;
/**
 * @hidden
 */
export type CollectorInteraction = | ButtonInteraction | StringSelectMenuInteraction | UserSelectMenuInteraction | RoleSelectMenuInteraction | MentionableSelectMenuInteraction | ChannelSelectMenuInteraction;

/**
 * Cấu hình cho `createComponentCollector`.
 */
export interface CreateComponentCollector {
    /**
     * Thời gian tồn tại tối đa của collector (seconds).
     *
     * Khi hết thời gian, collector sẽ tự động stop với reason `"time"`.
     */
    time?: number | string;
    /**
     * Thời gian tối đa không có interaction nào trước khi collector stop.
     *
     * Nếu không có interaction trong khoảng thời gian này
     * collector sẽ stop với reason `"idle"`.
     */
    idle?: number | string;
    /**
     * Số interaction tối đa collector có thể nhận.
     *
     * Khi đạt giới hạn này collector sẽ stop.
     */
    max?: number;
    /**
     * Số user khác nhau tối đa có thể interact.
     */
    maxUsers?: number;
    /**
     * Giới hạn loại component collector nhận.
     *
     * Ví dụ:
     * - `ComponentType.Button`
     * - `ComponentType.StringSelect`
     */
    componentType?: MessageComponentType;
    /**
     * Hàm lọc interaction trước khi collector nhận.
     *
     * Nếu trả về `false` interaction sẽ bị bỏ qua.
     */
    filter?: (i: CollectorInteraction) => boolean;
    /**
     * Callback được gọi mỗi khi collector nhận interaction.
     *
     * @param ctx - Context chứa thông tin interaction và collector.
     */
    onCollector?: (ctx: {
        /**
         * Interaction gốc từ Discord.
         */
        interaction: CollectorInteraction;
        /**
         * Custom ID của component.
         */
        customId: string;
        /**
         * ID của user đã thực hiện interaction.
         */
        userId: string;
        /**
         * Giá trị được chọn (chỉ tồn tại với Select Menu).
         */
        values?: string[];
        /**
         * Message chứa component.
         */
        message: Message;
        /**
         * Hàm dừng collector thủ công.
         */
        stop: () => void;
        /**
         * Collector instance gốc của discord.js.
         */
        collector: InteractionCollector<CollectorInteraction>;
    }) => void | Promise<void>;
    /**
     * Callback được gọi khi collector kết thúc.
     *
     * @param ctx - Context chứa thông tin kết thúc collector.
     */
    onEnd?: (ctx: {
        /**
         * Message chứa component collector.
         */
        message: Message;
        /**
         * Lý do collector dừng.
         *
         * Ví dụ:
         * - `"time"`
         * - `"idle"`
         * - `"limit"`
         * - `"user"`
         * - `"manual"`
         */
        reason: string;
        /**
         * Tổng số interaction collector đã nhận.
         */
        total: number;
        /**
         * Helper để chỉnh sửa message gốc.
         */
        edit: (options: MessageEditOptions | InteractionReplyOptions) => Promise<any>;
    }) => void | Promise<void>;
}

export const functions = {
    /**
     * Tạo `MessageComponentCollector` với context đơn giản hóa.
     *
     * Hỗ trợ:
     * - Button
     * - Select Menu
     * - Các Message Component khác của Discord
     *
     * Collector sẽ tự động:
     * - Lấy message từ `Message` hoặc `ChatInputCommandInteraction`
     * - Map interaction thành context (`ctx`)
     * - Gọi `onCollector` khi có interaction
     * - Gọi `onEnd` khi collector kết thúc
     *
     * @param target Message hoặc Slash Command Interaction chứa component
     * @param options Cấu hình collector
     *
     * @returns InteractionCollector<MessageComponentInteraction>
     *
     * @example
     * ```ts
     * const msg = await message.reply({
     *   content: "Test collector",
     *   components: [row]
     * });
     *
     * await functions.createComponentCollector(msg | interaction, {
     *   componentType: ComponentType.Button, // Giới hạn loại component
     *   time: "5s", // Thời gian collector tồn tại (ms)
     *   idle: "5s", // Thời gian tối đa không có interaction
     *   max: 5, // Số interaction tối đa
     *   maxUsers: 1, // Giới hạn số user khác nhau
     *   filter: (i) => i.user.id === message.author.id,
     *   onCollector: async (ctx) => {
     *       // logic code
     *   }
     * });
     * ```
     *
     * @example
     * Ví dụ Select Menu
     * ```ts
     * await functions.createComponentCollector(msg | interaction, {
     *   componentType: ComponentType.StringSelect,
     *   time: 10000,
     *   onCollector: async (ctx) => {
     *     // logic code
     *   }
     * });
     * ```
     */
    createComponentCollector: async (target: CollectorTarget, options: CreateComponentCollector = {}) => {
        const message = target instanceof Message ? target : await target.fetchReply();
        const collector = message.createMessageComponentCollector({
            time: functions.parseTime(options.time || "5s"),
            idle: functions.parseTime(options.idle || "15s"),
            max: options.max,
            maxUsers: options.maxUsers,
            componentType: options.componentType,
            filter: options.filter
        });

        collector.on("collect", async (interaction) => {
            if (!options.onCollector) return;
            await options.onCollector({
                interaction,
                customId: interaction.customId,
                userId: interaction.user.id,
                values: "values" in interaction ? interaction.values : undefined,
                message: message,
                collector: collector,
                stop: () => collector.stop(),
            });
        });

        collector.on("end", async (collected, reason) => {
            if (!options.onEnd) return;
            await options.onEnd({
                message,
                reason,
                total: collected.size,
                edit: (editOptions: MessageEditOptions | InteractionReplyOptions) => message.edit(editOptions as MessageEditOptions)
            });
        });
        return collector;
    },
    /**
     * Phân tích (parse) một chuỗi thời gian dễ đọc hoặc số thành **milliseconds**.
     *
     * Hỗ trợ nhiều đơn vị thời gian, alias (tên thay thế), số thập phân và
     * các biểu thức thời gian kết hợp.
     *
     * Nếu truyền vào **number** hoặc **chuỗi số**, giá trị sẽ được hiểu là **giây**.
     *
     * Các đơn vị được hỗ trợ:
     * - ms, millisecond, milliseconds
     * - s, sec, secs, second, seconds
     * - m, min, mins, minute, minutes
     * - h, hr, hrs, hour, hours
     * - d, day, days
     * - mo, month, months
     * - y, yr, yrs, year, years
     *
     * Hỗ trợ biểu thức kết hợp:
     * `1h 30m`, `2day 5hour`, `1year 2month`
     *
     * Hỗ trợ số thập phân:
     * `1.5h`, `2.25day`
     *
     * @param input Giá trị thời gian cần chuyển đổi.  
     * Nếu là `number` hoặc chuỗi số → sẽ được hiểu là **giây**.
     *
     * @returns Thời gian sau khi chuyển đổi sang **milliseconds**
     *
     * @throws {Error} Nếu gặp đơn vị thời gian không hợp lệ.
     *
     * @example
     * ```ts
     * parseTime("60") // 60000
     * parseTime(120) // 120000
     *
     * parseTime("5sec") // 5000
     * parseTime("2min") // 120000
     * parseTime("1hour") // 3600000
     * parseTime("3day") // 259200000
     *
     * parseTime("1hour 30min") // 5400000
     * parseTime("2day 5hour") // 190800000
     * parseTime("1year 2month") // 36720000000
     *
     * parseTime("1.5h") // 5400000
     * ```
     */
    parseTime: (input: string | number): number => {
        const UNIT_VALUES: Record<"ms" | "s" | "m" | "h" | "d" | "mo" | "y", number> = {
            ms: 1,
            s: 1000,
            m: 60 * 1000,
            h: 60 * 60 * 1000,
            d: 24 * 60 * 60 * 1000,
            mo: 30 * 24 * 60 * 60 * 1000,
            y: 365 * 24 * 60 * 60 * 1000,
        };
        const UNIT_ALIASES: Record<string, "ms" | "s" | "m" | "h" | "d" | "mo" | "y"> = {
            // millisecond
            ms: "ms",
            millisecond: "ms",
            milliseconds: "ms",
            // seconds
            s: "s",
            sec: "s",
            secs: "s",
            second: "s",
            seconds: "s",
            // minutes
            m: "m",
            min: "m",
            mins: "m",
            minute: "m",
            minutes: "m",
            // hours
            h: "h",
            hr: "h",
            hrs: "h",
            hour: "h",
            hours: "h",
            // days
            d: "d",
            day: "d",
            days: "d",
            // months
            mo: "mo",
            month: "mo",
            months: "mo",
            // years
            y: "y",
            yr: "y",
            yrs: "y",
            year: "y",
            years: "y",
        };
        if (typeof input === "number") return input * UNIT_VALUES.s;
        const str = input.trim().toLowerCase();
        // auto detect: "60" -> 60s
        if (/^\d+(\.\d+)?$/.test(str)) return parseFloat(str) * UNIT_VALUES.s;
        let total = 0;
        const regex = /(\d+(?:\.\d+)?)\s*([a-z]+)/g;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(str)) !== null) {
            const value = parseFloat(match[1]);
            const unitRaw = match[2];
            const unit = UNIT_ALIASES[unitRaw];
            if (!unit) {
                throw new Error(`Unknown time unit: ${unitRaw}`);
            }
            total += value * UNIT_VALUES[unit];
        }
        return total;
    }

}